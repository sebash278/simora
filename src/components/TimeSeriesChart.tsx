'use client';

import React, { useState } from 'react';
import { NoiseReading } from '@/types/simora';
import { TrendingUp, AlertTriangle } from 'lucide-react';

interface TimeSeriesChartProps {
  readings: NoiseReading[];
  threshold?: number;
}

export function TimeSeriesChart({
  readings,
  threshold = 70,
}: TimeSeriesChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<NoiseReading | null>(null);

  // Take the most recent 25 readings and order chronologically (oldest to newest)
  const displayData = [...readings].slice(0, 25).reverse();

  if (displayData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
        No hay datos suficientes para graficar la serie temporal.
      </div>
    );
  }

  // Chart dimensions
  const width = 650;
  const height = 240;
  const padding = { top: 25, right: 30, bottom: 40, left: 45 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const minDb = 30;
  const maxDb = 95;

  const getX = (index: number) => {
    if (displayData.length <= 1) return padding.left;
    return padding.left + (index / (displayData.length - 1)) * innerWidth;
  };

  const getY = (db: number) => {
    const clamped = Math.max(minDb, Math.min(maxDb, db));
    const ratio = (clamped - minDb) / (maxDb - minDb);
    return padding.top + innerHeight - ratio * innerHeight;
  };

  // Generate SVG path points
  const points = displayData.map((d, i) => `${getX(i)},${getY(d.decibels)}`).join(' ');
  const thresholdY = getY(threshold);

  // Area path for gradient background fill
  const areaPoints = `${getX(0)},${padding.top + innerHeight} ${points} ${getX(
    displayData.length - 1
  )},${padding.top + innerHeight}`;

  return (
    <div className="relative rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-white">
              Histórico Temporal en Tiempo Real
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Evolución del nivel de decibeles de las últimas {displayData.length} lecturas
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span>Lecturas dB</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 border-b-2 border-dashed border-rose-400" />
            <span className="text-rose-300">Umbral ({threshold} dB)</span>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[500px] h-auto overflow-visible select-none"
          role="img"
          aria-label="Gráfico de línea de decibeles versus tiempo"
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="70%" stopColor="#10b981" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines and Y-axis labels */}
          {[35, 50, 70, 85].map((val) => {
            const y = getY(val);
            return (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#334155"
                  strokeDasharray="3 3"
                  strokeWidth="0.8"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  fill="#94a3b8"
                  fontSize="10"
                  textAnchor="end"
                  className="font-mono tabular-nums"
                >
                  {val} dB
                </text>
              </g>
            );
          })}

          {/* Threshold alert guideline */}
          <line
            x1={padding.left}
            y1={thresholdY}
            x2={width - padding.right}
            y2={thresholdY}
            stroke="#f43f5e"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />

          {/* Shaded Area fill */}
          <polygon points={areaPoints} fill="url(#areaGradient)" />

          {/* Data Polyline */}
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          {/* Data Circles */}
          {displayData.map((d, i) => {
            const cx = getX(i);
            const cy = getY(d.decibels);
            const isPointAlert = d.decibels >= threshold;

            return (
              <g
                key={d.id}
                className="cursor-pointer transition-transform hover:scale-125"
                onMouseEnter={() => setHoveredPoint(d)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={isPointAlert ? 4.5 : 3.5}
                  fill={isPointAlert ? '#f43f5e' : '#10b981'}
                  stroke="#0f172a"
                  strokeWidth="2"
                />
              </g>
            );
          })}

          {/* X Axis Time Labels (sample 5 timestamps) */}
          {displayData.map((d, i) => {
            if (i % Math.ceil(displayData.length / 5) === 0 || i === displayData.length - 1) {
              const x = getX(i);
              const date = new Date(d.timestamp);
              const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date
                .getMinutes()
                .toString()
                .padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;

              return (
                <text
                  key={`time-${d.id}`}
                  x={x}
                  y={height - padding.bottom + 20}
                  fill="#64748b"
                  fontSize="9"
                  textAnchor="middle"
                  className="font-mono"
                >
                  {timeStr}
                </text>
              );
            }
            return null;
          })}
        </svg>
      </div>

      {/* Tooltip Box */}
      {hoveredPoint && (
        <div className="absolute bottom-4 right-6 z-10 rounded-lg border border-slate-700 bg-slate-950/95 p-2.5 text-xs shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                hoveredPoint.decibels >= threshold ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
            />
            <span className="font-mono font-bold text-white tabular-nums">
              {hoveredPoint.decibels} dB
            </span>
            <span className="text-slate-400">· {hoveredPoint.classification}</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            <span>{hoveredPoint.location}</span> ·{' '}
            <span>{new Date(hoveredPoint.timestamp).toLocaleTimeString()}</span>
          </div>
          {hoveredPoint.decibels >= threshold && (
            <div className="mt-1 flex items-center gap-1 text-[10px] text-rose-400 font-semibold">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              <span>Superó umbral de ruido</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
