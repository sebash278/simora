'use client';

import React from 'react';
import { Volume2, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { NoiseClassification } from '@/types/simora';

interface GaugeMeterProps {
  decibels: number;
  classification: NoiseClassification;
  threshold?: number;
  locationName?: string;
}

export function GaugeMeter({
  decibels,
  classification,
  threshold = 70,
  locationName = 'Espacio Académico',
}: GaugeMeterProps) {
  // Normalize db to 0-100% across range 30 dB - 100 dB
  const minDb = 30;
  const maxDb = 100;
  const clampedDb = Math.max(minDb, Math.min(maxDb, decibels));
  const percentage = (clampedDb - minDb) / (maxDb - minDb);

  // SVG Gauge calculations (semi-circle from 180deg to 0deg)
  const radius = 80;
  const strokeWidth = 14;
  const circumference = Math.PI * radius; // 180 degree arc
  const strokeDashoffset = circumference * (1 - percentage);

  const isAlert = decibels >= threshold;

  const getStatusColor = () => {
    switch (classification) {
      case 'Silencioso':
        return {
          text: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20',
          gradient: '#10b981',
          accent: 'text-emerald-300',
        };
      case 'Moderado':
        return {
          text: 'text-amber-400',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/20',
          gradient: '#f59e0b',
          accent: 'text-amber-300',
        };
      case 'Ruidoso':
      default:
        return {
          text: 'text-rose-400',
          bg: 'bg-rose-500/10',
          border: 'border-rose-500/20',
          gradient: '#f43f5e',
          accent: 'text-rose-300',
        };
    }
  };

  const statusStyle = getStatusColor();

  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-slate-900/80 p-6 shadow-xl backdrop-blur-md transition-all ${
      isAlert ? 'border-rose-500/40 shadow-rose-950/20' : 'border-slate-800 shadow-slate-950/50'
    }`}>
      {/* Alert Banner if exceeded */}
      {isAlert && (
        <div className="absolute top-0 left-0 right-0 flex items-center justify-center gap-1.5 bg-rose-500/20 py-1 text-xs font-semibold text-rose-300 border-b border-rose-500/30">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>¡Umbral de ruido excedido (&gt;{threshold} dB)!</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Nivel Acústico Actual
          </span>
          <h3 className="text-sm font-semibold text-slate-200 truncate max-w-[200px]">
            {locationName}
          </h3>
        </div>
        <div
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}
        >
          {classification === 'Silencioso' && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
          {classification === 'Moderado' && <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />}
          {classification === 'Ruidoso' && <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}
          <span>{classification}</span>
        </div>
      </div>

      {/* Semi-circular dial SVG */}
      <div className="relative mt-4 flex flex-col items-center justify-center">
        <svg
          viewBox="0 0 200 115"
          className="w-56 h-32 overflow-visible"
          role="img"
          aria-label={`Medidor de ruido: ${decibels} decibeles, clasificado como ${classification}`}
        >
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
          </defs>

          {/* Background track */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Active progress track */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300 ease-out"
          />
        </svg>

        {/* Center dB Value */}
        <div className="absolute bottom-2 flex flex-col items-center">
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-4xl font-extrabold tracking-tight text-white tabular-nums">
              {decibels.toFixed(1)}
            </span>
            <span className="text-sm font-semibold text-slate-400">dB</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Escala aproximada dB SPL
          </p>
        </div>
      </div>

      {/* Scale markers */}
      <div className="mt-3 flex justify-between text-[11px] text-slate-500 font-mono">
        <span>30 dB (Silencio)</span>
        <span>50 dB</span>
        <span>70 dB (Umbral)</span>
        <span>100 dB (Peligro)</span>
      </div>

      {/* Guide description */}
      <div className="mt-4 rounded-xl bg-slate-950/60 p-3 text-xs border border-slate-800/80">
        <div className="flex items-center gap-2 text-slate-300">
          <Volume2 className="h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
          <span className="leading-snug">
            {classification === 'Silencioso' && 'Nivel óptimo para lectura, concentración y estudio profundo.'}
            {classification === 'Moderado' && 'Ambiente tolerable para trabajo en grupo o debate en salón.'}
            {classification === 'Ruidoso' && 'Nivel perjudicial que dificulta la concentración y genera fatiga.'}
          </span>
        </div>
      </div>
    </div>
  );
}
