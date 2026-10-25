'use client';

import React from 'react';
import { NoiseClassification } from '@/types/simora';

interface AcousticMeterProps {
  decibels: number;
  classification: NoiseClassification;
  isActive: boolean;
  threshold?: number;
}

export function AcousticMeter({
  decibels,
  classification,
  isActive,
  threshold = 70,
}: AcousticMeterProps) {
  const isAlert = decibels >= threshold;

  // Generate 20 reactive equalizer bars for audio spectrum aesthetic
  const barCount = 18;
  const normalizedLevel = Math.max(0, Math.min(1, (decibels - 30) / 60));

  const getStatusColor = () => {
    if (!isActive) {
      return {
        pill: 'text-[#858d9d] border-[#222733] bg-[#12151c]',
        label: 'Sensor inactivo',
        accentBar: 'bg-[#2b313e]',
      };
    }
    if (classification === 'Silencioso') {
      return {
        pill: 'text-[#4ade80] border-[#1f382a] bg-[#0f2319]',
        label: 'Confort acústico · Silencioso',
        accentBar: 'bg-[#4ade80]',
      };
    }
    if (classification === 'Moderado') {
      return {
        pill: 'text-[#f59e0b] border-[#382b18] bg-[#241a0b]',
        label: 'Actividad moderada · Aceptable',
        accentBar: 'bg-[#f59e0b]',
      };
    }
    return {
      pill: 'text-[#f87171] border-[#3c1d22] bg-[#291115]',
      label: 'Umbral superado · Ruido alto',
      accentBar: 'bg-[#f87171]',
    };
  };

  const status = getStatusColor();

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-3xl border p-8 transition-colors ${
        isAlert && isActive
          ? 'border-[#4a2228] bg-[#130d10]'
          : 'border-[#1e232d] bg-[#10131a]'
      }`}
    >
      {/* Top subtle classification indicator */}
      <div
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium tracking-tight transition-colors ${status.pill}`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            isActive
              ? classification === 'Ruidoso'
                ? 'bg-rose-400 animate-ping'
                : 'bg-current'
              : 'bg-[#555d6e]'
          }`}
        />
        <span>{status.label}</span>
      </div>

      {/* Hero Decibel Readout */}
      <div className="my-6 flex items-baseline justify-center">
        <span className="font-mono text-7xl font-light tracking-tight text-white tabular-nums sm:text-8xl">
          {isActive ? decibels.toFixed(1) : '--.-'}
        </span>
        <span className="ml-2 text-xl font-light tracking-normal text-[#6f7887]">
          dB
        </span>
      </div>

      {/* Acoustic Spectrum Micro-bars */}
      <div className="flex h-10 w-full max-w-[280px] items-end justify-center gap-1.5 px-4">
        {Array.from({ length: barCount }).map((_, i) => {
          // Calculate bar height based on relative position and decibels
          const centerDist = Math.abs(i - barCount / 2) / (barCount / 2);
          const factor = Math.max(0.15, 1 - centerDist * 0.6);
          const rawHeight = isActive
            ? Math.min(100, Math.max(12, normalizedLevel * factor * 100 + (Math.sin(i * 1.5) * 8)))
            : 10;

          return (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-150 ease-out ${
                isActive ? status.accentBar : 'bg-[#212631]'
              }`}
              style={{
                height: `${rawHeight}%`,
                opacity: isActive ? 0.35 + (rawHeight / 100) * 0.65 : 0.25,
              }}
            />
          );
        })}
      </div>

      {/* Scale Reference Footer */}
      <div className="mt-6 flex w-full max-w-[280px] items-center justify-between text-[11px] font-mono text-[#5b6374]">
        <span>30 dB</span>
        <span className={decibels >= threshold && isActive ? 'text-rose-400 font-bold' : ''}>
          70 dB (Límite OMS)
        </span>
        <span>100 dB</span>
      </div>
    </div>
  );
}
