'use client';

import React from 'react';
import { NoiseReading, NoiseStats } from '@/types/simora';
import { SlidersHorizontal, AlertTriangle } from 'lucide-react';

interface MobileDashboardViewProps {
  readings: NoiseReading[];
  stats: NoiseStats | null;
  threshold: number;
  onThresholdChange: (val: number) => void;
}

export function MobileDashboardView({
  readings,
  stats,
  threshold,
  onThresholdChange,
}: MobileDashboardViewProps) {
  // Aggregate latest reading per location
  const spaces = Array.from(new Set(readings.map((r) => r.location)));
  const locationSummary = spaces.map((loc) => {
    const locReadings = readings.filter((r) => r.location === loc);
    const latest = locReadings[0];
    const avg = locReadings.reduce((sum, r) => sum + r.decibels, 0) / locReadings.length;
    return {
      location: loc,
      currentDb: latest ? latest.decibels : 0,
      classification: latest ? latest.classification : 'Silencioso',
      avgDb: Math.round(avg * 10) / 10,
      timestamp: latest ? latest.timestamp : '',
    };
  });

  // Recent 18 readings for sparkline
  const chartData = [...readings].slice(0, 18).reverse();

  // SVG dimensions for minimal sparkline
  const chartWidth = 340;
  const chartHeight = 110;
  const minDb = 30;
  const maxDb = 95;

  const getY = (db: number) => {
    const clamped = Math.max(minDb, Math.min(maxDb, db));
    const ratio = (clamped - minDb) / (maxDb - minDb);
    return chartHeight - ratio * chartHeight;
  };

  const getX = (idx: number) => {
    if (chartData.length <= 1) return 0;
    return (idx / (chartData.length - 1)) * chartWidth;
  };

  const points = chartData.map((d, i) => `${getX(i)},${getY(d.decibels)}`).join(' ');
  const thresholdY = getY(threshold);

  return (
    <div className="flex flex-col space-y-5 pb-6">
      {/* KPI Ticker - Restrained & Typographic */}
      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-[#1b202a] bg-[#101319] p-4 text-center">
        <div>
          <span className="block text-[11px] font-medium text-[#677080]">Promedio</span>
          <div className="mt-1 flex items-baseline justify-center gap-0.5">
            <span className="font-mono text-2xl font-light text-white tabular-nums">
              {stats ? stats.avgDecibels.toFixed(1) : '--'}
            </span>
            <span className="text-[10px] text-[#677080]">dB</span>
          </div>
        </div>
        <div className="border-x border-[#1a1f29]">
          <span className="block text-[11px] font-medium text-[#677080]">Pico Máx.</span>
          <div className="mt-1 flex items-baseline justify-center gap-0.5">
            <span className="font-mono text-2xl font-light text-white tabular-nums">
              {stats ? stats.maxDecibels.toFixed(1) : '--'}
            </span>
            <span className="text-[10px] text-[#677080]">dB</span>
          </div>
        </div>
        <div>
          <span className="block text-[11px] font-medium text-[#677080]">Alertas</span>
          <div className="mt-1 flex items-baseline justify-center gap-0.5">
            <span className={`font-mono text-2xl font-light tabular-nums ${
              stats && stats.alertCount > 0 ? 'text-rose-400 font-normal' : 'text-white'
            }`}>
              {stats ? stats.alertCount : 0}
            </span>
            <span className="text-[10px] text-[#677080]">evt</span>
          </div>
        </div>
      </div>

      {/* Threshold Controller Slider */}
      <div className="rounded-2xl border border-[#1b202a] bg-[#101319] p-4">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-[#8891a1]">
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Límite de Alerta</span>
          </div>
          <span className="font-mono text-white font-medium tabular-nums">
            {threshold} dB
          </span>
        </div>
        <div className="mt-2.5">
          <input
            type="range"
            min="50"
            max="85"
            step="1"
            value={threshold}
            onChange={(e) => onThresholdChange(Number(e.target.value))}
            className="w-full accent-white cursor-pointer h-1.5 bg-[#202531] rounded-lg"
            aria-label="Ajustar umbral acústico"
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] font-mono text-[#525968]">
          <span>50 dB (Biblioteca)</span>
          <span>70 dB (Aula normal)</span>
          <span>85 dB (Peligro)</span>
        </div>
      </div>

      {/* Minimalist Acoustic Sparkline */}
      <div className="rounded-2xl border border-[#1b202a] bg-[#101319] p-4">
        <div className="flex items-center justify-between text-xs mb-3">
          <span className="font-medium text-white">Evolución de Ruido</span>
          <span className="text-[11px] text-[#677080]">Últimas {chartData.length} lecturas</span>
        </div>

        <div className="relative w-full overflow-hidden py-1">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-24 overflow-visible"
            role="img"
            aria-label="Gráfico de evolución de decibeles"
          >
            {/* Threshold dashed reference */}
            <line
              x1="0"
              y1={thresholdY}
              x2={chartWidth}
              y2={thresholdY}
              stroke="#f87171"
              strokeDasharray="3 3"
              strokeWidth="1"
              opacity="0.6"
            />
            {/* Signal curve */}
            <polyline
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
            {/* Alert point highlights */}
            {chartData.map((d, i) => {
              if (d.decibels >= threshold) {
                return (
                  <circle
                    key={d.id}
                    cx={getX(i)}
                    cy={getY(d.decibels)}
                    r="3"
                    fill="#f87171"
                  />
                );
              }
              return null;
            })}
          </svg>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-[#555d6e]">
          <span>Pasado</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-3 bg-white inline-block" /> dB
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="h-0.5 w-3 border-b border-dashed border-rose-400 inline-block" /> Umbral
            </span>
          </div>
          <span>Ahora</span>
        </div>
      </div>

      {/* Acoustic Quality Distribution (Single Segmented Bar) */}
      {stats && stats.totalReadings > 0 && (
        <div className="rounded-2xl border border-[#1b202a] bg-[#101319] p-4">
          <span className="block text-xs font-medium text-white mb-2">
            Distribución según Directrices OMS
          </span>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#1e232e] flex">
            <div
              style={{ width: `${(stats.distribution.silencioso / stats.totalReadings) * 100}%` }}
              className="bg-[#4ade80]"
              title="Silencioso"
            />
            <div
              style={{ width: `${(stats.distribution.moderado / stats.totalReadings) * 100}%` }}
              className="bg-[#f59e0b]"
              title="Moderado"
            />
            <div
              style={{ width: `${(stats.distribution.ruidoso / stats.totalReadings) * 100}%` }}
              className="bg-[#f87171]"
              title="Ruidoso"
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-[#717a8c]">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" />
              {Math.round((stats.distribution.silencioso / stats.totalReadings) * 100)}% Silencio
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
              {Math.round((stats.distribution.moderado / stats.totalReadings) * 100)}% Moderado
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f87171]" />
              {Math.round((stats.distribution.ruidoso / stats.totalReadings) * 100)}% Ruido
            </span>
          </div>
        </div>
      )}

      {/* Spaces Telemetry List */}
      <div className="space-y-2">
        <span className="block text-xs font-medium text-[#7d8697] px-1">
          Espacios Monitoreados
        </span>
        <div className="space-y-2">
          {locationSummary.map((item) => {
            const isHigh = item.currentDb >= threshold;
            return (
              <div
                key={item.location}
                className="flex items-center justify-between rounded-2xl border border-[#1b202a] bg-[#101319] p-3.5 transition-colors"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        item.classification === 'Silencioso'
                          ? 'bg-[#4ade80]'
                          : item.classification === 'Moderado'
                          ? 'bg-[#f59e0b]'
                          : 'bg-[#f87171]'
                      }`}
                    />
                    <h4 className="text-xs font-semibold text-white truncate">
                      {item.location}
                    </h4>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#636c7e] pl-4">
                    Promedio: {item.avgDb} dB
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-baseline justify-end gap-1">
                    <span
                      className={`font-mono text-base font-light tabular-nums ${
                        isHigh ? 'text-rose-400 font-normal' : 'text-white'
                      }`}
                    >
                      {item.currentDb.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-[#636c7e]">dB</span>
                  </div>
                  {isHigh && (
                    <div className="flex items-center justify-end gap-1 text-[10px] text-rose-400">
                      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                      <span>Alerta</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
