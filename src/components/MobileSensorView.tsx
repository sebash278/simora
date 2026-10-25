'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AcousticMeter } from '@/components/AcousticMeter';
import { createAudioMeter, AudioMeterController } from '@/lib/audio-meter';
import { classifyNoise } from '@/types/simora';
import { ShieldCheck, MapPin, Radio, AlertCircle } from 'lucide-react';

interface MobileSensorViewProps {
  onReadingSent: () => void;
}

export function MobileSensorView({ onReadingSent }: MobileSensorViewProps) {
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'mic' | 'sim'>('mic');
  const [currentDb, setCurrentDb] = useState(38.0);
  const [location, setLocation] = useState('Salón 301 - Lab IoT');
  const [deviceId, setDeviceId] = useState('nodo-movil');
  const [sentCount, setSentCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const audioMeterRef = useRef<AudioMeterController | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const simTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentDbRef = useRef<number>(38.0);
  currentDbRef.current = currentDb;

  useEffect(() => {
    const saved = localStorage.getItem('simora_device_id');
    if (saved) {
      setDeviceId(saved);
    } else {
      const generated = `nodo-${Math.random().toString(36).substring(2, 6)}`;
      setDeviceId(generated);
      localStorage.setItem('simora_device_id', generated);
    }
  }, []);

  const transmitReading = useCallback(async (dbValue: number) => {
    try {
      const res = await fetch('/api/readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          deviceName: `Sensor Móvil (${deviceId})`,
          location,
          decibels: dbValue,
          timestamp: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        setSentCount((prev) => prev + 1);
        onReadingSent();
      }
    } catch (err) {
      console.error('Error transmitiendo telemetría:', err);
    }
  }, [deviceId, location, onReadingSent]);

  const startMicCapture = async () => {
    setErrorMessage(null);
    try {
      const meter = createAudioMeter((level) => {
        setCurrentDb(level);
      });
      await meter.start();
      audioMeterRef.current = meter;
      setIsActive(true);

      timerRef.current = setInterval(() => {
        transmitReading(currentDbRef.current);
      }, 2500);
    } catch (err: unknown) {
      console.error('Micrófono inaccesible:', err);
      const msg = err instanceof Error ? err.message : 'No se pudo acceder al micrófono.';
      setErrorMessage(`${msg} Puedes usar el modo "Simulador" para evaluar sin micrófono.`);
      setIsActive(false);
    }
  };

  const startSimulation = () => {
    setErrorMessage(null);
    setIsActive(true);

    const base = location.includes('Biblioteca') ? 43 : 58;
    simTimerRef.current = setInterval(() => {
      const fluctuation = (Math.random() - 0.5) * 8;
      const spike = Math.random() > 0.88 ? Math.random() * 20 : 0;
      const calculated = Math.round(Math.max(32, Math.min(94, base + fluctuation + spike)) * 10) / 10;
      setCurrentDb(calculated);
    }, 350);

    timerRef.current = setInterval(() => {
      transmitReading(currentDbRef.current);
    }, 2500);
  };

  const stopCapture = useCallback(() => {
    setIsActive(false);
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
  }, []);

  const toggleSensor = () => {
    if (isActive) {
      stopCapture();
    } else {
      if (mode === 'mic') {
        startMicCapture();
      } else {
        startSimulation();
      }
    }
  };

  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, [stopCapture]);

  const classification = classifyNoise(currentDb);

  const spaces = [
    'Salón 301 - Lab IoT',
    'Biblioteca - Sala de Lectura',
    'Sala de Estudio B',
    'Cafetería Central',
  ];

  return (
    <div className="flex flex-col space-y-5 pb-6">
      {/* Top Selector Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-[#828a9b]">
          <span className="font-mono text-[#abb4c4]">{deviceId}</span>
          <span>·</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            En línea
          </span>
        </div>

        {/* Minimal Segmented Control */}
        <div className="flex rounded-xl border border-[#212632] bg-[#10131a] p-0.5 text-xs">
          <button
            type="button"
            disabled={isActive}
            onClick={() => setMode('mic')}
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
            onClick={() => setMode('sim')}
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

      {/* Location Picker Pill Selection */}
      <div className="space-y-1.5">
        <label htmlFor="space-select" className="flex items-center gap-1.5 text-xs text-[#70798a]">
          <MapPin className="h-3.5 w-3.5 text-[#525a6b]" aria-hidden="true" />
          <span>Ubicación del sensor</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {spaces.map((sp) => (
            <button
              key={sp}
              type="button"
              disabled={isActive}
              onClick={() => setLocation(sp)}
              className={`rounded-xl px-3 py-1.5 text-xs transition-colors border ${
                location === sp
                  ? 'border-[#3b4354] bg-[#1a1e28] text-white font-medium'
                  : 'border-[#1b1f29] bg-[#0f1218] text-[#717a8c] hover:text-white'
              } ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {sp}
            </button>
          ))}
        </div>
      </div>

      {/* Main Acoustic Meter */}
      <AcousticMeter
        decibels={currentDb}
        classification={classification}
        isActive={isActive}
        threshold={70}
      />

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-950/60 bg-rose-950/20 p-3 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Ergonomic Big Primary Action Button */}
      <div className="pt-2">
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
            <span>Muestreo activo (cada 2.5s)</span>
          </div>
          <span className="font-mono text-white tabular-nums">
            {sentCount} {sentCount === 1 ? 'lectura' : 'lecturas'}
          </span>
        </div>
      )}

      {/* Clean Privacy Notice */}
      <div className="flex items-center gap-2 rounded-2xl border border-[#171b24] bg-[#0d0f14] p-3 text-[11px] text-[#636c7c]">
        <ShieldCheck className="h-4 w-4 shrink-0 text-[#7c8698]" aria-hidden="true" />
        <p className="leading-tight">
          <strong>Privacidad local:</strong> El cálculo RMS se ejecuta únicamente en memoria. Jamás se graban ni se envían audios a la red.
        </p>
      </div>
    </div>
  );
}
