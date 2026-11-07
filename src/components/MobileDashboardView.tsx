'use client';

import React, { useState, useMemo } from 'react';
import { NoiseReading, NoiseStats, MonitoredSpace } from '@/types/simora';
import { SlidersHorizontal, AlertTriangle } from 'lucide-react';

interface MobileDashboardViewProps {
  readings: NoiseReading[];
  stats: NoiseStats | null;
  spaces: MonitoredSpace[];
  threshold: number;
  onThresholdChange: (val: number) => void;
}

function formatRelativeAgo(isoTimestamp: string): string {
  if (!isoTimestamp) return 'Sin lecturas';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(isoTimestamp).getTime()) / 1000));
  if (diffSec < 5) return 'Ahora mismo';
  if (diffSec < 60) return `Hace ${diffSec} s`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  return `Hace ${hours} h`;
}

export function MobileDashboardView({
  readings,
  stats,
  spaces,
  threshold,
  onThresholdChange,
}: MobileDashboardViewProps) {
  const [selectedSpace, setSelectedSpace] = useState<string>('all');
  const [inspectedIdx, setInspectedIdx] = useState<number | null>(null);

  const spaceNames = useMemo(() => {
    const set = new Set<string>();
    for (const s of spaces) set.add(s.name);
    for (const r of readings) set.add(r.location);
    return Array.from(set);
  }, [spaces, readings]);

  const scopedReadings = useMemo(() => {
    if (selectedSpace === 'all') return readings;
    return readings.filter((r) => r.location === selectedSpace);
  }, [readings, selectedSpace]);

  const scopedStats = useMemo(() => {
    if (selectedSpace === 'all' && stats) {
      return stats;
    }
    if (scopedReadings.length === 0) {
      return {
        avgDecibels: 0,
        maxDecibels: 0,
        alertCount: 0,
        totalReadings: 0,
        distribution: { silencioso: 0, moderado: 0, ruidoso: 0 },
      };
    }

    let sum = 0;
    let max = -Infinity;
    let alertCount = 0;
    let silencioso = 0;
    let moderado = 0;
    let ruidoso = 0;

    for (const r of scopedReadings) {
      sum += r.decibels;
      if (r.decibels > max) max = r.decibels;
      if (r.decibels >= threshold) alertCount++;
      if (r.classification === 'Silencioso') silencioso++;
      else if (r.classification === 'Moderado') moderado++;
      else ruidoso++;
    }

    return {
      avgDecibels: Math.round((sum / scopedReadings.length) * 10) / 10,
      maxDecibels: max,
      alertCount,
      totalReadings: scopedReadings.length,
      distribution: { silencioso, moderado, ruidoso },
    };
  }, [selectedSpace, stats, scopedReadings, threshold]);

  const locationSummary = useMemo(() => {
    return spaceNames.map((loc) => {
      const locReadings = readings.filter((r) => r.location === loc);
      const latest = locReadings[0];
      const avg =
        locReadings.length > 0
          ? locReadings.reduce((sum, r) => sum + r.decibels, 0) / locReadings.length
          : 0;
      const spaceMeta = spaces.find((s) => s.name === loc);
      return {
        location: loc,
        category: spaceMeta?.category,
        currentDb: latest ? latest.decibels : 0,
        classification: latest ? latest.classification : 'Silencioso',
        avgDb: Math.round(avg * 10) / 10,
        timestamp: latest ? latest.timestamp : '',
        hasData: locReadings.length > 0,
      };
    });
  }, [spaceNames, readings, spaces]);

  // Últimas 20 lecturas para la curva vectorial
  const chartData = useMemo(
    () => [...scopedReadings].slice(0, 20).reverse(),
    [scopedReadings]
  );

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
    if (chartData.length <= 1) return chartWidth / 2;
    return (idx / (chartData.length - 1)) * chartWidth;
  };

  const points = chartData.map((d, i) => `${getX(i)},${getY(d.decibels)}`).join(' ');
  const thresholdY = getY(threshold);

  const activePoint =
    inspectedIdx !== null && chartData[inspectedIdx] ? chartData[inspectedIdx] : null;

  const latestAlertReading =
    scopedReadings.length > 0 && scopedReadings[0].decibels >= threshold
      ? scopedReadings[0]
      : null;

  return (
    <div className="flex flex-col space-y-5 pb-6">
      {/* Space Scope Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => {
            setSelectedSpace('all');
            setInspectedIdx(null);
          }}
          className={`rounded-xl px-3 py-1.5 text-xs whitespace-nowrap border transition-colors ${
            selectedSpace === 'all'
              ? 'border-[#3b4354] bg-[#1a1e28] text-white font-medium'
              : 'border-[#1b1f29] bg-[#0f1218] text-[#717a8c] hover:text-white'
          }`}
        >
          Todos los espacios
        </button>
        {spaceNames.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => {
              setSelectedSpace(name);
              setInspectedIdx(null);
            }}
            className={`rounded-xl px-3 py-1.5 text-xs whitespace-nowrap border transition-colors ${
              selectedSpace === name
                ? 'border-[#3b4354] bg-[#1a1e28] text-white font-medium'
                : 'border-[#1b1f29] bg-[#0f1218] text-[#717a8c] hover:text-white'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Live Threshold Exceeded Banner */}
      {latestAlertReading && (
        <div className="flex items-center justify-between rounded-2xl border border-[#4a2228] bg-[#160d10] px-4 py-2.5 text-xs text-rose-300">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
            <span className="truncate">
              Umbral superado en <strong>{latestAlertReading.location}</strong>
            </span>
          </div>
          <span className="font-mono font-medium text-rose-400 tabular-nums shrink-0 ml-2">
            {latestAlertReading.decibels.toFixed(1)} dB
          </span>
        </div>
      )}

      {/* KPI Ticker */}
      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-[#1b202a] bg-[#101319] p-4 text-center">
        <div>
          <span className="block text-[11px] font-medium text-[#677080]">Promedio</span>
          <div className="mt-1 flex items-baseline justify-center gap-0.5">
            <span className="font-mono text-2xl font-light text-white tabular-nums">
              {scopedStats.totalReadings > 0 ? scopedStats.avgDecibels.toFixed(1) : '--'}
            </span>
            <span className="text-[10px] text-[#677080]">dB</span>
          </div>
        </div>
        <div className="border-x border-[#1a1f29]">
          <span className="block text-[11px] font-medium text-[#677080]">Pico Máx.</span>
          <div className="mt-1 flex items-baseline justify-center gap-0.5">
            <span className="font-mono text-2xl font-light text-white tabular-nums">
              {scopedStats.totalReadings > 0 ? scopedStats.maxDecibels.toFixed(1) : '--'}
            </span>
            <span className="text-[10px] text-[#677080]">dB</span>
          </div>
        </div>
        <div>
          <span className="block text-[11px] font-medium text-[#677080]">Alertas</span>
          <div className="mt-1 flex items-baseline justify-center gap-0.5">
            <span
              className={`font-mono text-2xl font-light tabular-nums ${
                scopedStats.alertCount > 0 ? 'text-rose-400 font-normal' : 'text-white'
              }`}
            >
              {scopedStats.alertCount}
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
            <span>Límite de Alerta Acústica</span>
          </div>
          <span className="font-mono text-white font-medium tabular-nums">
            {threshold} dB
          </span>
        </div>
        <div className="mt-2.5">
          <input
            type="range"
            min="45"
            max="85"
            step="1"
            value={threshold}
            onChange={(e) => onThresholdChange(Number(e.target.value))}
            className="w-full accent-white cursor-pointer h-1.5 bg-[#202531] rounded-lg"
            aria-label="Ajustar umbral acústico"
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] font-mono text-[#525968]">
          <span>45 dB (Biblioteca)</span>
          <span>65 dB (Aula)</span>
          <span>85 dB (Crítico)</span>
        </div>
      </div>

      {/* Minimalist Interactive Acoustic Sparkline */}
      <div className="rounded-2xl border border-[#1b202a] bg-[#101319] p-4">
        <div className="flex items-center justify-between text-xs mb-3">
          <span className="font-medium text-white">Evolución de Ruido</span>
          {activePoint ? (
            <span className="font-mono text-[11px] text-[#d0d7e3] tabular-nums">
              {activePoint.decibels.toFixed(1)} dB ·{' '}
              {new Date(activePoint.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          ) : (
            <span className="text-[11px] text-[#677080]">
              Últimas {chartData.length} lecturas
            </span>
          )}
        </div>

        {chartData.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#555d6e]">
            Sin lecturas registradas para este espacio.
          </div>
        ) : (
          <div
            className="relative w-full overflow-hidden py-1"
            onMouseLeave={() => setInspectedIdx(null)}
          >
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
              {chartData.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={points}
                />
              )}

              {/* Interactive Data Points */}
              {chartData.map((d, i) => {
                const isPointAlert = d.decibels >= threshold;
                const isSelected = inspectedIdx === i;
                return (
                  <g key={d.id}>
                    {(isPointAlert || isSelected || chartData.length === 1) && (
                      <circle
                        cx={getX(i)}
                        cy={getY(d.decibels)}
                        r={isSelected ? '4.5' : '3'}
                        fill={isPointAlert ? '#f87171' : '#ffffff'}
                      />
                    )}
                    <circle
                      cx={getX(i)}
                      cy={getY(d.decibels)}
                      r="12"
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setInspectedIdx(i)}
                      onClick={() => setInspectedIdx(i === inspectedIdx ? null : i)}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        <div className="mt-2 flex items-center justify-between text-[11px] text-[#555d6e]">
          <span>Pasado</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-3 bg-white inline-block" /> dB
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="h-0.5 w-3 border-b border-dashed border-rose-400 inline-block" />{' '}
              Umbral
            </span>
          </div>
          <span>Ahora</span>
        </div>
      </div>

      {/* Acoustic Quality Distribution (Single Segmented Bar) */}
      {scopedStats.totalReadings > 0 && (
        <div className="rounded-2xl border border-[#1b202a] bg-[#101319] p-4">
          <span className="block text-xs font-medium text-white mb-2">
            Distribución según Directrices OMS
          </span>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#1e232e] flex">
            <div
              style={{
                width: `${(scopedStats.distribution.silencioso / scopedStats.totalReadings) * 100}%`,
              }}
              className="bg-[#4ade80] transition-all"
              title="Silencioso"
            />
            <div
              style={{
                width: `${(scopedStats.distribution.moderado / scopedStats.totalReadings) * 100}%`,
              }}
              className="bg-[#f59e0b] transition-all"
              title="Moderado"
            />
            <div
              style={{
                width: `${(scopedStats.distribution.ruidoso / scopedStats.totalReadings) * 100}%`,
              }}
              className="bg-[#f87171] transition-all"
              title="Ruidoso"
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-[#717a8c]">
            <span className="flex items-center gap-1 tabular-nums">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" />
              {Math.round(
                (scopedStats.distribution.silencioso / scopedStats.totalReadings) * 100
              )}
              % Silencio
            </span>
            <span className="flex items-center gap-1 tabular-nums">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
              {Math.round(
                (scopedStats.distribution.moderado / scopedStats.totalReadings) * 100
              )}
              % Moderado
            </span>
            <span className="flex items-center gap-1 tabular-nums">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f87171]" />
              {Math.round(
                (scopedStats.distribution.ruidoso / scopedStats.totalReadings) * 100
              )}
              % Ruido
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
            const isHigh = item.hasData && item.currentDb >= threshold;
            const isSelected = selectedSpace === item.location;

            return (
              <button
                key={item.location}
                type="button"
                onClick={() =>
                  setSelectedSpace(isSelected ? 'all' : item.location)
                }
                className={`w-full text-left flex items-center justify-between rounded-2xl border p-3.5 transition-colors ${
                  isSelected
                    ? 'border-[#384152] bg-[#161a24]'
                    : 'border-[#1b202a] bg-[#101319] hover:border-[#262d3b]'
                }`}
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        !item.hasData
                          ? 'bg-[#434a59]'
                          : item.classification === 'Silencioso'
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
                    {item.hasData
                      ? `Promedio: ${item.avgDb} dB · ${formatRelativeAgo(item.timestamp)}`
                      : 'Sin telemetría reciente'}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-baseline justify-end gap-1">
                    <span
                      className={`font-mono text-base font-light tabular-nums ${
                        isHigh ? 'text-rose-400 font-normal' : 'text-white'
                      }`}
                    >
                      {item.hasData ? item.currentDb.toFixed(1) : '--.-'}
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
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
