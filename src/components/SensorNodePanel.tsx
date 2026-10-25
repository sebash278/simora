'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  Send,
  ShieldCheck,
  Settings,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { createAudioMeter, AudioMeterController } from '@/lib/audio-meter';
import { classifyNoise } from '@/types/simora';

interface SensorNodePanelProps {
  onReadingSent: () => void;
}

interface TransmitLogEntry {
  id: string;
  time: string;
  decibels: number;
  status: 'enviado' | 'error';
  classification: string;
}

export function SensorNodePanel({ onReadingSent }: SensorNodePanelProps) {
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'mic' | 'sim'>('mic');
  const [currentDb, setCurrentDb] = useState(38.0);
  const [location, setLocation] = useState('Salón 301 - Lab IoT');
  const [customLocation, setCustomLocation] = useState('');
  const [deviceId, setDeviceId] = useState('sensor-smartphone-01');
  const [intervalSec, setIntervalSec] = useState(3);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logs, setLogs] = useState<TransmitLogEntry[]>([]);
  const [sentCount, setSentCount] = useState(0);

  const audioMeterRef = useRef<AudioMeterController | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const simTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentDbRef = useRef<number>(38.0);

  // Sync ref with state
  currentDbRef.current = currentDb;

  // Initialize random persistent-like deviceId on client
  useEffect(() => {
    const saved = localStorage.getItem('simora_device_id');
    if (saved) {
      setDeviceId(saved);
    } else {
      const generated = `node-${Math.random().toString(36).substring(2, 7)}`;
      setDeviceId(generated);
      localStorage.setItem('simora_device_id', generated);
    }
  }, []);

  const transmitReading = useCallback(async (dbValue: number) => {
    const targetLocation = customLocation.trim() || location;
    try {
      const res = await fetch('/api/readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          deviceName: `Nodo Virtual (${deviceId})`,
          location: targetLocation,
          decibels: dbValue,
          timestamp: new Date().toISOString(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSentCount((prev) => prev + 1);
        const classification = classifyNoise(dbValue);
        const newLog: TransmitLogEntry = {
          id: `tx-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          decibels: dbValue,
          status: 'enviado',
          classification,
        };
        setLogs((prev) => [newLog, ...prev.slice(0, 7)]);
        onReadingSent();
      } else {
        throw new Error(json.error || 'Error al enviar');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fallo en la red';
      const errorLog: TransmitLogEntry = {
        id: `tx-${Date.now()}`,
        time: new Date().toLocaleTimeString(),
        decibels: dbValue,
        status: 'error',
        classification: msg,
      };
      setLogs((prev) => [errorLog, ...prev.slice(0, 7)]);
    }
  }, [customLocation, deviceId, location, onReadingSent]);

  // Start Real Microphone Capture
  const startMicCapture = async () => {
    setErrorMessage(null);
    try {
      const meter = createAudioMeter((level) => {
        setCurrentDb(level);
      });
      await meter.start();
      audioMeterRef.current = meter;
      setIsActive(true);

      // Start periodic transmission loop
      timerRef.current = setInterval(() => {
        transmitReading(currentDbRef.current);
      }, intervalSec * 1000);
    } catch (err: unknown) {
      console.error('Error starting microphone:', err);
      const msg =
        err instanceof Error
          ? err.message
          : 'No se pudo acceder al micrófono del navegador.';
      setErrorMessage(
        `${msg} Puedes usar el "Simulador IoT" si tu navegador restringe el micrófono.`
      );
      setIsActive(false);
    }
  };

  // Start Simulation Mode
  const startSimulation = () => {
    setErrorMessage(null);
    setIsActive(true);

    // Realistic sound generator
    let base = location.includes('Biblioteca') ? 42 : 58;
    simTimerRef.current = setInterval(() => {
      // Natural noise fluctuation with occasional speech or chairs
      const fluctuation = (Math.random() - 0.5) * 8;
      const spike = Math.random() > 0.85 ? Math.random() * 22 : 0;
      const calculated = Math.round(Math.max(32, Math.min(94, base + fluctuation + spike)) * 10) / 10;
      setCurrentDb(calculated);
    }, 400);

    // Transmission timer
    timerRef.current = setInterval(() => {
      transmitReading(currentDbRef.current);
    }, intervalSec * 1000);
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, [stopCapture]);

  const classification = classifyNoise(currentDb);
  const vuPercent = Math.min(100, Math.max(0, ((currentDb - 30) / 70) * 100));

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Sensor Control Center */}
      <div className="space-y-6 lg:col-span-7">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-md">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {mode === 'mic' ? (
                  <Mic className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-6 w-6" aria-hidden="true" />
                )}
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  Nodo Sensor Móvil (Edge IoT)
                </h2>
                <p className="text-xs text-slate-400">
                  Transforma este dispositivo en un sensor de borde acústico
                </p>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
              <button
                type="button"
                disabled={isActive}
                onClick={() => setMode('mic')}
                className={`rounded-lg px-3 py-1 font-medium transition-all ${
                  mode === 'mic'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                } ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label="Modo Micrófono Real Web Audio API"
              >
                Micrófono Real
              </button>
              <button
                type="button"
                disabled={isActive}
                onClick={() => setMode('sim')}
                className={`rounded-lg px-3 py-1 font-medium transition-all ${
                  mode === 'sim'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                } ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label="Modo Simulador de Flujo IoT"
              >
                Simulador IoT
              </button>
            </div>
          </div>

          {/* Privacy Guarantee Banner */}
          <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-teal-950/40 border border-teal-800/40 p-3 text-xs text-teal-200">
            <ShieldCheck className="h-5 w-5 shrink-0 text-teal-400" aria-hidden="true" />
            <p className="leading-relaxed">
              <strong>Privacidad Garantizada:</strong> SIMORA calcula los decibeles (RMS) en la memoria local del navegador mediante la Web Audio API. Nunca se graba, almacena ni transmite audio crudo por la red.
            </p>
          </div>

          {errorMessage && (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-rose-950/50 border border-rose-800/50 p-3 text-xs text-rose-200">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" aria-hidden="true" />
              <p>{errorMessage}</p>
            </div>
          )}

          {/* Live Audio Level Visualizer */}
          <div className="mt-6 rounded-2xl bg-slate-950/70 p-5 border border-slate-800/80">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Lectura Instantánea
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-mono text-5xl font-black text-white tabular-nums tracking-tight">
                    {currentDb.toFixed(1)}
                  </span>
                  <span className="text-lg font-bold text-slate-400">dB</span>
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    classification === 'Silencioso'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : classification === 'Moderado'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-current" />
                  {classification}
                </span>
                <p className="mt-1 text-[11px] text-slate-500 font-mono">
                  Transmisión cada {intervalSec}s
                </p>
              </div>
            </div>

            {/* VU Meter Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mb-1">
                <span>30 dB</span>
                <span>50 dB</span>
                <span>70 dB (Umbral)</span>
                <span>100 dB</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full transition-all duration-150 ease-out"
                  style={{
                    width: `${vuPercent}%`,
                    background:
                      currentDb >= 70
                        ? '#f43f5e'
                        : currentDb >= 50
                        ? '#f59e0b'
                        : '#10b981',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Configuration Settings */}
          <div className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="space-select" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Espacio a Monitorear
                </label>
                <select
                  id="space-select"
                  disabled={isActive}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50"
                >
                  <option value="Salón 301 - Lab IoT">Salón 301 - Lab IoT</option>
                  <option value="Biblioteca - Sala de Lectura">Biblioteca - Sala de Lectura</option>
                  <option value="Sala de Estudio B">Sala de Estudio B</option>
                  <option value="Cafetería Central">Cafetería Central</option>
                  <option value="custom">Otro (Personalizado)…</option>
                </select>
              </div>

              <div>
                <label htmlFor="interval-select" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Frecuencia de Envío IoT
                </label>
                <select
                  id="interval-select"
                  disabled={isActive}
                  value={intervalSec}
                  onChange={(e) => setIntervalSec(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50"
                >
                  <option value={1}>Cada 1 segundo (Alta resolución)</option>
                  <option value={2}>Cada 2 segundos (Recomendado)</option>
                  <option value={3}>Cada 3 segundos (Equilibrado)</option>
                  <option value={5}>Cada 5 segundos (Bajo consumo)</option>
                </select>
              </div>
            </div>

            {location === 'custom' && (
              <div>
                <label htmlFor="custom-location-input" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Nombre del espacio personalizado
                </label>
                <input
                  id="custom-location-input"
                  type="text"
                  placeholder="Ej: Auditorio Bloque A…"
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  disabled={isActive}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50"
                />
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="mt-6 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={toggleSensor}
              className={`w-full flex items-center justify-center gap-2.5 rounded-xl py-3.5 px-4 text-sm font-semibold transition-all shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                isActive
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 ring-2 ring-rose-400'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
              }`}
              aria-label={isActive ? 'Detener transmisión del sensor' : 'Iniciar captura y transmisión del sensor'}
            >
              {isActive ? (
                <>
                  <MicOff className="h-5 w-5" aria-hidden="true" />
                  <span>Detener Captura del Sensor</span>
                </>
              ) : (
                <>
                  <Radio className="h-5 w-5" aria-hidden="true" />
                  <span>Iniciar Sensor Móvil SIMORA</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Edge Telemetry Logs & Status */}
      <div className="space-y-6 lg:col-span-5">
        {/* Node Metadata Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Settings className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-white">
              Estado del Nodo Sensor
            </h3>
          </div>
          <div className="mt-3 space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Identificador IoT:</span>
              <span className="font-mono text-emerald-400 font-semibold">{deviceId}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Estado de Enlace:</span>
              <span className="flex items-center gap-1.5 font-medium">
                {isActive ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-400">Transmitiendo</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-slate-500" />
                    <span className="text-slate-400">En espera</span>
                  </>
                )}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Lecturas Enviadas (Sesión):</span>
              <span className="font-mono text-white font-semibold tabular-nums">{sentCount}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">API Endpoint:</span>
              <span className="font-mono text-slate-300">POST /api/readings</span>
            </div>
          </div>
        </div>

        {/* Live Packet Transmission Log */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-white">
                Telemetría en Vivo (Paquetes)
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              HTTP Rest
            </span>
          </div>

          <div className="mt-3 space-y-2 max-h-[220px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Presiona &quot;Iniciar Sensor&quot; para comenzar la transmisión de telemetría hacia el backend.
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-lg bg-slate-950/80 px-3 py-2 text-xs border border-slate-800/80"
                >
                  <div className="flex items-center gap-2">
                    {log.status === 'enviado' ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" aria-hidden="true" />
                    )}
                    <span className="font-mono text-slate-400 text-[11px]">{log.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white tabular-nums">
                      {log.decibels.toFixed(1)} dB
                    </span>
                    <span className="text-[10px] text-slate-400">({log.classification})</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
