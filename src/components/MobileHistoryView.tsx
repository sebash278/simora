'use client';

import React, { useState } from 'react';
import { NoiseReading } from '@/types/simora';
import { Download, RotateCcw } from 'lucide-react';

interface MobileHistoryViewProps {
  readings: NoiseReading[];
  onRefresh: () => void;
  onReset: () => void;
}

export function MobileHistoryView({
  readings,
  onRefresh,
  onReset,
}: MobileHistoryViewProps) {
  const [filter, setFilter] = useState<'all' | 'alert'>('all');
  const [isResetting, setIsResetting] = useState(false);

  const filtered = readings.filter((r) => {
    if (filter === 'alert') return r.isAlert;
    return true;
  });

  const exportCSV = () => {
    const headers = ['Hora', 'Espacio', 'Dispositivo', 'Decibeles_dB', 'Clasificacion', 'Alerta'];
    const rows = filtered.map((r) => [
      r.timestamp,
      `"${r.location}"`,
      r.deviceId,
      r.decibels,
      r.classification,
      r.isAlert ? 'SI' : 'NO',
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `simora_telemetria_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = async () => {
    if (window.confirm('¿Reiniciar lecturas a valores iniciales?')) {
      setIsResetting(true);
      await onReset();
      setIsResetting(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4 pb-6">
      {/* Header and Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-xl border border-[#212632] bg-[#10131a] p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-lg px-3 py-1 transition-colors ${
              filter === 'all'
                ? 'bg-[#222835] text-white font-medium'
                : 'text-[#70798a] hover:text-white'
            }`}
          >
            Todas ({readings.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('alert')}
            className={`rounded-lg px-3 py-1 transition-colors ${
              filter === 'alert'
                ? 'bg-[#222835] text-white font-medium'
                : 'text-[#70798a] hover:text-white'
            }`}
          >
            Alertas ({readings.filter((r) => r.isAlert).length})
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-1 rounded-xl border border-[#212632] bg-[#10131a] px-2.5 py-1 text-xs text-[#abb4c4] hover:text-white hover:bg-[#1a1f2b] transition-colors"
            aria-label="Exportar datos a CSV"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>CSV</span>
          </button>
          <button
            type="button"
            disabled={isResetting}
            onClick={handleReset}
            className="flex items-center justify-center rounded-xl border border-[#261d20] bg-[#140e11] p-1 text-xs text-[#a25a67] hover:text-rose-300 transition-colors disabled:opacity-40"
            aria-label="Reiniciar histórico de telemetría"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isResetting ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Feed of Telemetry Items */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#525968]">
            No hay registros para mostrar.
          </div>
        ) : (
          filtered.slice(0, 30).map((r) => {
            const date = new Date(r.timestamp);
            const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date
              .getMinutes()
              .toString()
              .padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;

            return (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-2xl border border-[#1b202a] bg-[#101319] px-4 py-2.5 transition-colors"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[#abb4c4] tabular-nums">
                      {timeStr}
                    </span>
                    <span className="text-[11px] text-[#555d6e]">·</span>
                    <span className="text-xs text-white truncate max-w-[150px]">
                      {r.location}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#525a6b] font-mono">
                    {r.deviceName || r.deviceId}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`font-mono text-sm font-light tabular-nums ${
                      r.isAlert ? 'text-rose-400 font-normal' : 'text-white'
                    }`}
                  >
                    {r.decibels.toFixed(1)} dB
                  </span>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      r.classification === 'Silencioso'
                        ? 'bg-[#4ade80]'
                        : r.classification === 'Moderado'
                        ? 'bg-[#f59e0b]'
                        : 'bg-[#f87171]'
                    }`}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
