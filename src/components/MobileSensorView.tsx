'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AcousticMeter } from '@/components/AcousticMeter';
import { createAudioMeter, AudioMeterController } from '@/lib/audio-meter';
import {
  classifyNoise,
  MonitoredSpace,
  SpaceCategory,
} from '@/types/simora';
import {
  ShieldCheck,
  MapPin,
  Radio,
  AlertCircle,
  SlidersHorizontal,
  Plus,
  X,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';

interface MobileSensorViewProps {
  spaces: MonitoredSpace[];
  threshold: number;
  onReadingSent: () => void;
  onSpaceCreated: (space: MonitoredSpace) => void;
  onStreamingChange?: (streaming: boolean) => void;
}

const FALLBACK_SPACES: MonitoredSpace[] = [
  { id: 'sp-1', name: 'Salón 301 - Lab IoT', category: 'Aula', recommendedThreshold: 65 },
  { id: 'sp-2', name: 'Biblioteca - Sala de Lectura', category: 'Biblioteca', recommendedThreshold: 45 },
  { id: 'sp-3', name: 'Sala de Estudio B', category: 'Estudio', recommendedThreshold: 50 },
  { id: 'sp-4', name: 'Cafetería Central', category: 'Común', recommendedThreshold: 70 },
];

const CATEGORIES: SpaceCategory[] = ['Biblioteca', 'Estudio', 'Aula', 'Común'];
const INTERVAL_OPTIONS = [
  { label: '1.0 s', ms: 1000 },
  { label: '2.5 s', ms: 2500 },
  { label: '5.0 s', ms: 5000 },
];

export function MobileSensorView({
  spaces,
  threshold,
  onReadingSent,
  onSpaceCreated,
  onStreamingChange,
}: MobileSensorViewProps) {
  const availableSpaces = spaces.length > 0 ? spaces : FALLBACK_SPACES;

  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'mic' | 'sim'>('mic');
  const [currentDb, setCurrentDb] = useState(38.0);
  const [rawDb, setRawDb] = useState(38.0);
  const [spectrumBands, setSpectrumBands] = useState<number[] | undefined>(undefined);

  const [location, setLocation] = useState('Salón 301 - Lab IoT');
  const [deviceId, setDeviceId] = useState('nodo-movil');
  const [deviceName, setDeviceName] = useState('');
  const [calibrationOffset, setCalibrationOffset] = useState(0);
  const [sampleIntervalMs, setSampleIntervalMs] = useState(2500);

  const [sentCount, setSentCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCalibration, setShowCalibration] = useState(false);

  // Estado para registrar nuevo espacio
  const [showNewSpace, setShowNewSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceCategory, setNewSpaceCategory] = useState<SpaceCategory>('Aula');
  const [creatingSpace, setCreatingSpace] = useState(false);

  const audioMeterRef = useRef<AudioMeterController | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const simTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentDbRef = useRef<number>(38.0);

  useEffect(() => {
    currentDbRef.current = currentDb;
  }, [currentDb]);

  useEffect(() => {
    queueMicrotask(() => {
      const savedId = localStorage.getItem('simora_device_id');
      if (savedId) {
        setDeviceId(savedId);
      } else {
        const generated = `nodo-${Math.random().toString(36).substring(2, 6)}`;
        setDeviceId(generated);
        localStorage.setItem('simora_device_id', generated);
      }

      const savedName = localStorage.getItem('simora_device_name');
      if (savedName) setDeviceName(savedName);

      const savedOffset = localStorage.getItem('simora_cal_offset');
      if (savedOffset) {
        const parsed = Number(savedOffset);
        if (!Number.isNaN(parsed) && parsed >= -15 && parsed <= 15) {
          setCalibrationOffset(parsed);
        }
      }

      const savedInterval = localStorage.getItem('simora_sample_ms');
      if (savedInterval) {
        const parsedMs = Number(savedInterval);
        if ([1000, 2500, 5000].includes(parsedMs)) {
          setSampleIntervalMs(parsedMs);
        }
      }
    });
  }, []);

  const handleOffsetChange = (nextOffset: number) => {
    const rounded = Math.round(Math.max(-15, Math.min(15, nextOffset)) * 10) / 10;
    setCalibrationOffset(rounded);
    localStorage.setItem('simora_cal_offset', String(rounded));
    if (audioMeterRef.current) {
      audioMeterRef.current.setCalibrationOffset(rounded);
    }
  };

  const handleCalibrateSilence = () => {
    // Ajusta la lectura actual en silencio al piso típico interior de 38.0 dB
    const targetFloor = 38.0;
    const baseRaw = audioMeterRef.current ? audioMeterRef.current.getRawDecibels() : rawDb;
    const computedOffset = Math.round((targetFloor - baseRaw) * 10) / 10;
    handleOffsetChange(computedOffset);
  };

  const handleNameChange = (val: string) => {
    setDeviceName(val);
    localStorage.setItem('simora_device_name', val);
  };

  const handleIntervalSelect = (ms: number) => {
    setSampleIntervalMs(ms);
    localStorage.setItem('simora_sample_ms', String(ms));
  };

  const transmitReading = useCallback(
    async (dbValue: number) => {
      const effectiveName = deviceName.trim() || `Sensor Móvil (${deviceId})`;
      try {
        const res = await fetch('/api/readings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId,
            deviceName: effectiveName,
            location,
            decibels: dbValue,
            timestamp: new Date().toISOString(),
            calibrationOffset,
            alertThreshold: threshold,
          }),
        });
        if (res.ok) {
          setSentCount((prev) => prev + 1);
          onReadingSent();
        }
      } catch (err) {
        console.error('Error transmitiendo telemetría:', err);
      }
    },
    [deviceId, deviceName, location, calibrationOffset, threshold, onReadingSent]
  );

  const stopCapture = useCallback(() => {
    setIsActive(false);
    setSpectrumBands(undefined);
    onStreamingChange?.(false);

    if (audioMeterRef.current) {
      audioMeterRef.current.stop();
      audioMeterRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
  }, [onStreamingChange]);

  const startMicCapture = async () => {
    setErrorMessage(null);
    try {
      const meter = createAudioMeter((level, bands, uncalibrated) => {
        setCurrentDb(level);
        setSpectrumBands(bands);
        setRawDb(uncalibrated);
      }, calibrationOffset);

      await meter.start();
      audioMeterRef.current = meter;
      setIsActive(true);
      onStreamingChange?.(true);

      timerRef.current = setInterval(() => {
        transmitReading(currentDbRef.current);
      }, sampleIntervalMs);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'No se pudo acceder al micrófono.';
      setErrorMessage(msg);
      setIsActive(false);
      onStreamingChange?.(false);
    }
  };

  const startSimulation = () => {
    setErrorMessage(null);
    setSpectrumBands(undefined);
    setIsActive(true);
    onStreamingChange?.(true);

    const selectedSpace = availableSpaces.find((s) => s.name === location);
    const base =
      selectedSpace?.category === 'Biblioteca'
        ? 42
        : selectedSpace?.category === 'Estudio'
        ? 48
        : selectedSpace?.category === 'Común'
        ? 66
        : 57;

    simTimerRef.current = setInterval(() => {
      const fluctuation = (Math.random() - 0.5) * 9;
      const spike = Math.random() > 0.87 ? Math.random() * 19 : 0;
      const simulatedRaw = base + fluctuation + spike + calibrationOffset;
      const calculated = Math.round(Math.max(30, Math.min(98, simulatedRaw)) * 10) / 10;
      setCurrentDb(calculated);
    }, 350);

    timerRef.current = setInterval(() => {
      transmitReading(currentDbRef.current);
    }, sampleIntervalMs);
  };

  const toggleSensor = () => {
    if (isActive) {
      stopCapture();
    } else if (mode === 'mic') {
      startMicCapture();
    } else {
      startSimulation();
    }
  };

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSpaceName.trim();
    if (trimmed.length < 2) return;

    setCreatingSpace(true);
    try {
      const res = await fetch('/api/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmed,
          category: newSpaceCategory,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        onSpaceCreated(json.data);
        setLocation(json.data.name);
        setNewSpaceName('');
        setShowNewSpace(false);
      }
    } catch (err) {
      console.error('Error creando espacio:', err);
    } finally {
      setCreatingSpace(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, [stopCapture]);

  const classification = classifyNoise(currentDb);

  return (
    <div className="flex flex-col space-y-5 pb-6">
      {/* Top Selector Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-[#828a9b] min-w-0">
          <span className="font-mono text-[#abb4c4] truncate max-w-[140px]">
            {deviceName.trim() || deviceId}
          </span>
          <span>·</span>
          <span className="flex items-center gap-1 text-emerald-400 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {isActive ? 'Transmitiendo' : 'Listo'}
          </span>
        </div>

        {/* Minimal Segmented Control */}
        <div className="flex rounded-xl border border-[#212632] bg-[#10131a] p-0.5 text-xs shrink-0">
          <button
            type="button"
            disabled={isActive}
            onClick={() => {
              setMode('mic');
              setErrorMessage(null);
            }}
            className={`rounded-lg px-2.5 py-1 transition-all ${
              mode === 'mic'
                ? 'bg-[#222835] text-white font-medium shadow-sm'
                : 'text-[#6a7384] hover:text-white'
            } ${isActive ? 'opacity-40 cursor-not-allowed' : ''}`}
            aria-label="Seleccionar modo micrófono físico"
          >
            Micrófono
          </button>
          <button
            type="button"
            disabled={isActive}
            onClick={() => {
              setMode('sim');
              setErrorMessage(null);
            }}
            className={`rounded-lg px-2.5 py-1 transition-all ${
              mode === 'sim'
                ? 'bg-[#222835] text-white font-medium shadow-sm'
                : 'text-[#6a7384] hover:text-white'
            } ${isActive ? 'opacity-40 cursor-not-allowed' : ''}`}
            aria-label="Seleccionar modo simulación IoT"
          >
            Simulador
          </button>
        </div>
      </div>

      {/* Location Picker Pill Selection + Dynamic Creation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-[#70798a]">
            <MapPin className="h-3.5 w-3.5 text-[#525a6b]" aria-hidden="true" />
            <span>Ubicación del sensor</span>
          </span>

          {!isActive && (
            <button
              type="button"
              onClick={() => setShowNewSpace((prev) => !prev)}
              className="flex items-center gap-1 text-[11px] text-[#8d96a8] hover:text-white transition-colors"
            >
              {showNewSpace ? (
                <>
                  <X className="h-3 w-3" />
                  <span>Cancelar</span>
                </>
              ) : (
                <>
                  <Plus className="h-3 w-3" />
                  <span>Nuevo espacio</span>
                </>
              )}
            </button>
          )}
        </div>

        {showNewSpace && !isActive && (
          <form
            onSubmit={handleCreateSpace}
            className="rounded-2xl border border-[#222836] bg-[#10131a] p-3 space-y-2.5"
          >
            <input
              type="text"
              value={newSpaceName}
              onChange={(e) => setNewSpaceName(e.target.value)}
              placeholder="Ej. Laboratorio Electrónica 204"
              maxLength={80}
              className="w-full rounded-xl border border-[#232938] bg-[#090b0e] px-3 py-2 text-xs text-white placeholder-[#525a6b] focus:border-[#4b5568] focus:outline-none"
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewSpaceCategory(cat)}
                    className={`rounded-lg px-2 py-1 text-[11px] border transition-colors ${
                      newSpaceCategory === cat
                        ? 'border-[#3b4354] bg-[#1d222e] text-white'
                        : 'border-[#1b202b] bg-[#0c0f14] text-[#6d7688]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={creatingSpace || newSpaceName.trim().length < 2}
                className="rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-[#e5e8ef] disabled:opacity-40 shrink-0"
              >
                {creatingSpace ? 'Guardando…' : 'Agregar'}
              </button>
            </div>
          </form>
        )}

        <div className="flex flex-wrap gap-1.5">
          {availableSpaces.map((sp) => (
            <button
              key={sp.id || sp.name}
              type="button"
              disabled={isActive}
              onClick={() => setLocation(sp.name)}
              className={`rounded-xl px-3 py-1.5 text-xs transition-colors border ${
                location === sp.name
                  ? 'border-[#3b4354] bg-[#1a1e28] text-white font-medium'
                  : 'border-[#1b1f29] bg-[#0f1218] text-[#717a8c] hover:text-white'
              } ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {sp.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Acoustic Meter */}
      <AcousticMeter
        decibels={currentDb}
        classification={classification}
        isActive={isActive}
        threshold={threshold}
        spectrumBands={mode === 'mic' ? spectrumBands : undefined}
        calibrationOffset={calibrationOffset}
      />

      {/* Actionable Microphone Error Card */}
      {errorMessage && (
        <div className="rounded-2xl border border-rose-950/70 bg-[#170d10] p-3.5 text-xs text-rose-200 space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" aria-hidden="true" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
          <div className="flex items-center justify-between pt-1 pl-6">
            <span className="text-[11px] text-rose-300/70">
              Verifica HTTPS o los permisos del navegador
            </span>
            <button
              type="button"
              onClick={() => {
                setMode('sim');
                setErrorMessage(null);
              }}
              className="rounded-lg border border-rose-800/60 bg-rose-950/50 px-2.5 py-1 text-[11px] font-medium text-rose-200 hover:bg-rose-900/50 transition-colors"
            >
              Usar Simulador
            </button>
          </div>
        </div>
      )}

      {/* Ergonomic Primary Action Button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={toggleSensor}
          className={`w-full rounded-2xl py-4 px-6 text-sm font-semibold tracking-wide transition-all shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${
            isActive
              ? 'bg-[#291316] text-rose-400 border border-[#522129] hover:bg-[#381a1f] active:scale-[0.99]'
              : 'bg-white text-black hover:bg-[#e8ebf0] active:scale-[0.99]'
          }`}
          aria-label={isActive ? 'Detener captura del micrófono' : 'Iniciar captura del sensor'}
        >
          {isActive ? 'Detener Transmisión' : 'Activar Sensor Móvil'}
        </button>
      </div>

      {/* Status Summary & Telemetry Counter */}
      {isActive && (
        <div className="flex items-center justify-between rounded-2xl border border-[#1b202a] bg-[#101319] px-4 py-2.5 text-xs text-[#7e8798]">
          <div className="flex items-center gap-2">
            <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" aria-hidden="true" />
            <span>Muestreo activo (cada {(sampleIntervalMs / 1000).toFixed(1)} s)</span>
          </div>
          <span className="font-mono text-white tabular-nums">
            {sentCount} {sentCount === 1 ? 'lectura' : 'lecturas'}
          </span>
        </div>
      )}

      {/* Collapsible Calibration & Node Configuration Panel */}
      <div className="rounded-2xl border border-[#1b202a] bg-[#101319] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowCalibration((prev) => !prev)}
          className="flex w-full items-center justify-between px-4 py-3 text-xs text-[#abb4c4] hover:text-white transition-colors"
          aria-expanded={showCalibration}
        >
          <span className="flex items-center gap-2 font-medium">
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#70798a]" aria-hidden="true" />
            <span>Calibración acústica y ajustes del nodo</span>
          </span>
          <ChevronDown
            className={`h-4 w-4 text-[#646d7e] transition-transform ${
              showCalibration ? 'rotate-180' : ''
            }`}
          />
        </button>

        {showCalibration && (
          <div className="border-t border-[#191e28] px-4 py-3.5 space-y-4 text-xs">
            {/* Relative Calibration Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#828b9c]">Compensación de micrófono</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-white tabular-nums">
                    {calibrationOffset > 0
                      ? `+${calibrationOffset.toFixed(1)}`
                      : calibrationOffset.toFixed(1)}{' '}
                    dB
                  </span>
                  {calibrationOffset !== 0 && (
                    <button
                      type="button"
                      onClick={() => handleOffsetChange(0)}
                      className="text-[#687285] hover:text-white"
                      aria-label="Restablecer compensación a 0 dB"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              <input
                type="range"
                min="-15"
                max="15"
                step="0.5"
                value={calibrationOffset}
                onChange={(e) => handleOffsetChange(Number(e.target.value))}
                className="w-full accent-white cursor-pointer h-1.5 bg-[#202531] rounded-lg"
                aria-label="Compensación de calibración en decibeles"
              />
              <div className="flex items-center justify-between text-[10px] font-mono text-[#555e70]">
                <span>-15 dB</span>
                <span>0 dB (Base)</span>
                <span>+15 dB</span>
              </div>

              {isActive && mode === 'mic' && (
                <button
                  type="button"
                  onClick={handleCalibrateSilence}
                  className="mt-1.5 w-full rounded-xl border border-[#252c3b] bg-[#151923] py-2 text-[11px] font-medium text-[#c5cddb] hover:bg-[#1c2230] hover:text-white transition-colors"
                >
                  Calibrar silencio ambiental actual (38.0 dB)
                </button>
              )}
            </div>

            {/* Sampling Interval Selector */}
            <div className="space-y-1.5">
              <span className="block text-[#828b9c]">Intervalo de envío de telemetría</span>
              <div className="grid grid-cols-3 gap-1.5">
                {INTERVAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.ms}
                    type="button"
                    disabled={isActive}
                    onClick={() => handleIntervalSelect(opt.ms)}
                    className={`rounded-xl py-1.5 font-mono text-[11px] border transition-colors ${
                      sampleIntervalMs === opt.ms
                        ? 'border-[#3b4354] bg-[#1b202c] text-white'
                        : 'border-[#1b202a] bg-[#0c0f14] text-[#6d7688] hover:text-white'
                    } ${isActive ? 'opacity-45 cursor-not-allowed' : ''}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Node Name */}
            <div className="space-y-1.5">
              <label htmlFor="node-alias" className="block text-[#828b9c]">
                Nombre identificativo del sensor
              </label>
              <input
                id="node-alias"
                type="text"
                maxLength={50}
                value={deviceName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={`Sensor Móvil (${deviceId})`}
                className="w-full rounded-xl border border-[#222836] bg-[#090b0e] px-3 py-2 text-xs text-white placeholder-[#51596a] focus:border-[#4b5568] focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Clean Privacy Notice */}
      <div className="flex items-center gap-2 rounded-2xl border border-[#171b24] bg-[#0d0f14] p-3 text-[11px] text-[#636c7c]">
        <ShieldCheck className="h-4 w-4 shrink-0 text-[#7c8698]" aria-hidden="true" />
        <p className="leading-tight">
          <strong>Privacidad local:</strong> El cálculo RMS y espectral se ejecuta únicamente en memoria. Jamás se graban ni se envían audios a la red.
        </p>
      </div>
    </div>
  );
}
