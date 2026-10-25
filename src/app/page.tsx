'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MobileNavigation, TabType } from '@/components/MobileNavigation';
import { MobileSensorView } from '@/components/MobileSensorView';
import { MobileDashboardView } from '@/components/MobileDashboardView';
import { MobileHistoryView } from '@/components/MobileHistoryView';
import { MobileInfoView } from '@/components/MobileInfoView';
import { NoiseReading, NoiseStats } from '@/types/simora';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabType>('sensor');
  const [readings, setReadings] = useState<NoiseReading[]>([]);
  const [stats, setStats] = useState<NoiseStats | null>(null);
  const [threshold, setThreshold] = useState<number>(70);

  const fetchData = useCallback(async () => {
    try {
      const [readingsRes, statsRes] = await Promise.all([
        fetch('/api/readings?limit=60'),
        fetch('/api/stats'),
      ]);

      if (readingsRes.ok) {
        const readingsJson = await readingsRes.json();
        if (readingsJson.success) {
          setReadings(readingsJson.data);
        }
      }

      if (statsRes.ok) {
        const statsJson = await statsRes.json();
        if (statsJson.success) {
          setStats(statsJson.data);
        }
      }
    } catch (err) {
      console.error('Error sincronizando telemetría SIMORA:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2500);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleResetData = async () => {
    try {
      const res = await fetch('/api/readings', { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Error al reiniciar datos:', err);
    }
  };

  return (
    <div className="min-h-dvh bg-[#090b0e] text-[#f0f3f6] flex flex-col justify-between selection:bg-white selection:text-black">
      {/* Mobile Canvas Container */}
      <div className="mx-auto w-full max-w-md px-4 pt-3 pb-24 flex-1 flex flex-col">
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
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-medium text-[#abb4c4]">
              {stats ? `${stats.activeSensors} sensor(es)` : 'Conectando…'}
            </span>
          </div>
        </header>

        {/* View Router */}
        <main className="flex-1 mt-1">
          {activeTab === 'sensor' && (
            <MobileSensorView onReadingSent={fetchData} />
          )}

          {activeTab === 'monitoring' && (
            <MobileDashboardView
              readings={readings}
              stats={stats}
              threshold={threshold}
              onThresholdChange={setThreshold}
            />
          )}

          {activeTab === 'history' && (
            <MobileHistoryView
              readings={readings}
              onRefresh={fetchData}
              onReset={handleResetData}
            />
          )}

          {activeTab === 'info' && (
            <MobileInfoView />
          )}
        </main>
      </div>

      {/* Fixed Bottom Navigation (Mobile Native Feel) */}
      <MobileNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isStreaming={activeTab === 'sensor'}
      />
    </div>
  );
}
