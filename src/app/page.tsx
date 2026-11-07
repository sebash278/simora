'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MobileNavigation, TabType } from '@/components/MobileNavigation';
import { MobileSensorView } from '@/components/MobileSensorView';
import { MobileDashboardView } from '@/components/MobileDashboardView';
import { MobileHistoryView } from '@/components/MobileHistoryView';
import { MobileInfoView } from '@/components/MobileInfoView';
import {
  NoiseReading,
  NoiseStats,
  MonitoredSpace,
  PersistenceEngine,
  RealtimeEvent,
} from '@/types/simora';

function computeClientStats(
  list: NoiseReading[],
  engine: PersistenceEngine,
  threshold: number
): NoiseStats {
  if (list.length === 0) {
    return {
      currentDecibels: 0,
      avgDecibels: 0,
      maxDecibels: 0,
      minDecibels: 0,
      totalReadings: 0,
      alertCount: 0,
      activeSensors: 0,
      distribution: { silencioso: 0, moderado: 0, ruidoso: 0 },
      persistenceEngine: engine,
    };
  }

  let sum = 0;
  let max = -Infinity;
  let min = Infinity;
  let alertCount = 0;
  let silencioso = 0;
  let moderado = 0;
  let ruidoso = 0;
  const devices = new Set<string>();

  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    sum += r.decibels;
    if (r.decibels > max) max = r.decibels;
    if (r.decibels < min) min = r.decibels;
    if (r.decibels >= threshold) alertCount++;
    devices.add(r.deviceId);

    if (r.classification === 'Silencioso') silencioso++;
    else if (r.classification === 'Moderado') moderado++;
    else ruidoso++;
  }

  return {
    currentDecibels: list[0].decibels,
    avgDecibels: Math.round((sum / list.length) * 10) / 10,
    maxDecibels: max,
    minDecibels: min,
    totalReadings: list.length,
    alertCount,
    activeSensors: devices.size,
    distribution: { silencioso, moderado, ruidoso },
    persistenceEngine: engine,
  };
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabType>('sensor');
  const [rawReadings, setRawReadings] = useState<NoiseReading[]>([]);
  const [spaces, setSpaces] = useState<MonitoredSpace[]>([]);
  const [threshold, setThreshold] = useState<number>(70);
  const [streamConnected, setStreamConnected] = useState<boolean>(false);
  const [persistenceEngine, setPersistenceEngine] =
    useState<PersistenceEngine>('local-json');
  const [isSensorStreaming, setIsSensorStreaming] = useState<boolean>(false);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);

  const thresholdRef = useRef<number>(70);

  useEffect(() => {
    thresholdRef.current = threshold;
  }, [threshold]);

  useEffect(() => {
    const savedThreshold = localStorage.getItem('simora_alert_threshold');
    if (savedThreshold) {
      const parsed = Number(savedThreshold);
      if (!Number.isNaN(parsed) && parsed >= 45 && parsed <= 90) {
        queueMicrotask(() => setThreshold(parsed));
      }
    }
  }, []);

  const readings = React.useMemo(
    () =>
      rawReadings.map((r) => ({
        ...r,
        isAlert: r.decibels >= threshold,
      })),
    [rawReadings, threshold]
  );

  const stats = React.useMemo(
    () =>
      hasLoaded || rawReadings.length > 0
        ? computeClientStats(readings, persistenceEngine, threshold)
        : null,
    [hasLoaded, rawReadings.length, readings, persistenceEngine, threshold]
  );

  const handleThresholdChange = useCallback((val: number) => {
    setThreshold(val);
    localStorage.setItem('simora_alert_threshold', String(val));
  }, []);

  const fetchData = useCallback(async (customThreshold?: number) => {
    const activeThreshold = customThreshold ?? thresholdRef.current;
    try {
      const [readingsRes, statsRes, spacesRes] = await Promise.all([
        fetch(`/api/readings?limit=120&threshold=${activeThreshold}`),
        fetch(`/api/stats?threshold=${activeThreshold}`),
        fetch('/api/spaces'),
      ]);

      if (readingsRes.ok) {
        const readingsJson = await readingsRes.json();
        if (readingsJson.success) {
          setRawReadings(readingsJson.data);
          setHasLoaded(true);
        }
      }

      if (statsRes.ok) {
        const statsJson = await statsRes.json();
        if (statsJson.success && statsJson.data?.persistenceEngine) {
          setPersistenceEngine(statsJson.data.persistenceEngine);
          setHasLoaded(true);
        }
      }

      if (spacesRes.ok) {
        const spacesJson = await spacesRes.json();
        if (spacesJson.success) {
          setSpaces(spacesJson.data);
        }
      }
    } catch (err) {
      console.error('Error sincronizando telemetría SIMORA:', err);
    }
  }, []);

  // Carga inicial y suscripción SSE en tiempo real
  useEffect(() => {
    void fetchData();

    let eventSource: EventSource | null = null;
    if (typeof EventSource !== 'undefined') {
      eventSource = new EventSource('/api/stream');

      eventSource.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data) as RealtimeEvent;

          if (event.type === 'connected') {
            setStreamConnected(true);
            setPersistenceEngine(event.engine);
          } else if (event.type === 'reading:new') {
            setRawReadings((prev) => {
              if (prev.some((r) => r.id === event.reading.id)) return prev;
              return [event.reading, ...prev].slice(0, 200);
            });
            setHasLoaded(true);
          } else if (event.type === 'space:new') {
            setSpaces((prev) => {
              if (prev.some((s) => s.name === event.space.name)) return prev;
              return [...prev, event.space];
            });
          } else if (event.type === 'reading:reset') {
            void fetchData();
          }
        } catch {
          // Ignorar tramas no válidas
        }
      };

      eventSource.onerror = () => {
        setStreamConnected(false);
      };
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [fetchData]);

  // Respaldo de sincronización cuando SSE no está conectado
  useEffect(() => {
    if (streamConnected) return;
    const fallbackTimer = setInterval(() => {
      void fetchData();
    }, 4500);
    return () => clearInterval(fallbackTimer);
  }, [streamConnected, fetchData]);

  const handleResetData = async () => {
    try {
      const res = await fetch('/api/readings', { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Error al reiniciar datos:', err);
    }
  };

  const handleSpaceCreated = useCallback((space: MonitoredSpace) => {
    setSpaces((prev) => {
      if (prev.some((s) => s.name.toLowerCase() === space.name.toLowerCase())) {
        return prev;
      }
      return [...prev, space];
    });
  }, []);

  return (
    <div className="min-h-dvh bg-[#090b0e] text-[#f0f3f6] flex flex-col justify-between selection:bg-white selection:text-black">
      {/* Mobile-First Instrumental Container */}
      <div className="mx-auto w-full max-w-md md:max-w-xl px-4 pt-3 pb-24 flex-1 flex flex-col">
        {/* Minimalist Mobile App Header */}
        <header className="flex items-center justify-between pb-4 pt-1">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold tracking-tight text-white">
              SIMORA
            </h1>
            <span className="rounded-md bg-[#161a22] px-1.5 py-0.5 text-[10px] font-mono text-[#747e90] border border-[#232734]">
              IoT Edge
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#70798a]">
            <span
              className={`h-2 w-2 rounded-full ${
                streamConnected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span className="text-[11px] font-medium text-[#abb4c4] tabular-nums">
              {stats
                ? `${streamConnected ? 'En vivo' : ' Activo'} · ${stats.activeSensors} ${
                    stats.activeSensors === 1 ? 'nodo' : 'nodos'
                  }`
                : 'Conectando…'}
            </span>
          </div>
        </header>

        {/* View Router - Sensor stays mounted to preserve active audio stream across tabs */}
        <main className="flex-1 mt-1">
          <div className={activeTab === 'sensor' ? 'block' : 'hidden'}>
            <MobileSensorView
              spaces={spaces}
              threshold={threshold}
              onReadingSent={() => {
                if (!streamConnected) fetchData();
              }}
              onSpaceCreated={handleSpaceCreated}
              onStreamingChange={setIsSensorStreaming}
            />
          </div>

          {activeTab === 'monitoring' && (
            <MobileDashboardView
              readings={readings}
              stats={stats}
              spaces={spaces}
              threshold={threshold}
              onThresholdChange={handleThresholdChange}
            />
          )}

          {activeTab === 'history' && (
            <MobileHistoryView
              readings={readings}
              spaces={spaces}
              threshold={threshold}
              onRefresh={() => fetchData()}
              onReset={handleResetData}
            />
          )}

          {activeTab === 'info' && (
            <MobileInfoView
              persistenceEngine={persistenceEngine}
              streamConnected={streamConnected}
              activeSensors={stats?.activeSensors ?? 0}
            />
          )}
        </main>
      </div>

      {/* Fixed Bottom Navigation */}
      <MobileNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isStreaming={isSensorStreaming}
      />
    </div>
  );
}
