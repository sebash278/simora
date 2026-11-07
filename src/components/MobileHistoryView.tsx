'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { NoiseReading, MonitoredSpace } from '@/types/simora';
import { Download, RotateCcw, Calendar, FileJson } from 'lucide-react';

interface MobileHistoryViewProps {
  readings: NoiseReading[];
  spaces: MonitoredSpace[];
  threshold: number;
  onRefresh: () => void;
  onReset: () => Promise<void>;
}

type PeriodFilter = 'recent' | '1h' | 'today' | 'custom';

export function MobileHistoryView({
  readings,
  spaces,
  threshold,
  onReset,
}: MobileHistoryViewProps) {
  const [filter, setFilter] = useState<'all' | 'alert'>('all');
  const [selectedSpace, setSelectedSpace] = useState<string>('all');
  const [period, setPeriod] = useState<PeriodFilter>('recent');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [queriedReadings, setQueriedReadings] = useState<NoiseReading[] | null>(null);
  const [isLoadingQuery, setIsLoadingQuery] = useState(false);

  const [confirmReset, setConfirmReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const spaceOptions = useMemo(() => {
    const names = new Set<string>();
    for (const s of spaces) names.add(s.name);
    for (const r of readings) names.add(r.location);
    return Array.from(names);
  }, [spaces, readings]);

  useEffect(() => {
    if (period === 'recent') {
      return;
    }

    let active = true;
    const runQuery = async () => {
      await Promise.resolve();
      if (!active) return;
      setIsLoadingQuery(true);
      try {
        const params = new URLSearchParams();
        params.set('limit', '500');
        params.set('threshold', String(threshold));

        if (selectedSpace !== 'all') {
          params.set('location', selectedSpace);
        }

        const now = new Date();
        if (period === '1h') {
          params.set('from', new Date(now.getTime() - 60 * 60 * 1000).toISOString());
        } else if (period === 'today') {
          const startOfToday = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            0,
            0,
            0
          );
          params.set('from', startOfToday.toISOString());
        } else if (period === 'custom') {
          if (fromDate) params.set('from', fromDate);
          if (toDate) params.set('to', toDate);
        }

        const res = await fetch(`/api/readings?${params.toString()}`);
        if (res.ok && active) {
          const json = await res.json();
          if (json.success) {
            setQueriedReadings(json.data);
          }
        }
      } catch (err) {
        console.error('Error consultando histórico filtrado:', err);
      } finally {
        if (active) {
          setIsLoadingQuery(false);
        }
      }
    };

    void runQuery();
    return () => {
      active = false;
    };
  }, [period, selectedSpace, fromDate, toDate, threshold]);

  const baseReadings =
    period !== 'recent' && queriedReadings !== null ? queriedReadings : readings;

  const filtered = useMemo(() => {
    return baseReadings.filter((r) => {
      if (selectedSpace !== 'all' && r.location !== selectedSpace) return false;
      if (filter === 'alert' && !r.isAlert) return false;
      return true;
    });
  }, [baseReadings, selectedSpace, filter]);

  const alertTotalInScope = useMemo(() => {
    return baseReadings.filter(
      (r) => (selectedSpace === 'all' || r.location === selectedSpace) && r.isAlert
    ).length;
  }, [baseReadings, selectedSpace]);

  const allTotalInScope = useMemo(() => {
    return baseReadings.filter(
      (r) => selectedSpace === 'all' || r.location === selectedSpace
    ).length;
  }, [baseReadings, selectedSpace]);

  const exportCSV = () => {
    const headers = [
      'Fecha_ISO',
      'Espacio',
      'ID_Nodo',
      'Nombre_Sensor',
      'Decibeles_dB',
      'Clasificacion_OMS',
      'Alerta',
    ];
    const rows = filtered.map((r) => [
      r.timestamp,
      `"${r.location.replace(/"/g, '""')}"`,
      r.deviceId,
      `"${(r.deviceName || r.deviceId).replace(/"/g, '""')}"`,
      r.decibels.toFixed(1),
      r.classification,
      r.isAlert ? 'SI' : 'NO',
    ]);

    // BOM UTF-8 (\uFEFF) garantiza acentos correctos al abrir en Microsoft Excel
    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `simora_telemetria_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      thresholdDb: threshold,
      count: filtered.length,
      readings: filtered,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `simora_respaldo_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    await onReset();
    setQueriedReadings(null);
    setPeriod('recent');
    setConfirmReset(false);
    setIsResetting(false);
  };

  return (
    <div className="flex flex-col space-y-4 pb-6">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 rounded-xl border border-[#212632] bg-[#10131a] p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-lg px-2.5 py-1 transition-colors tabular-nums ${
              filter === 'all'
                ? 'bg-[#222835] text-white font-medium'
                : 'text-[#70798a] hover:text-white'
            }`}
          >
            Todas ({allTotalInScope})
          </button>
          <button
            type="button"
            onClick={() => setFilter('alert')}
            className={`rounded-lg px-2.5 py-1 transition-colors tabular-nums ${
              filter === 'alert'
                ? 'bg-[#222835] text-white font-medium'
                : 'text-[#70798a] hover:text-white'
            }`}
          >
            Alertas ({alertTotalInScope})
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={filtered.length === 0}
            onClick={exportCSV}
            className="flex items-center gap-1 rounded-xl border border-[#212632] bg-[#10131a] px-2.5 py-1 text-xs text-[#abb4c4] hover:text-white hover:bg-[#1a1f2b] transition-colors disabled:opacity-40"
            aria-label="Exportar datos a CSV"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>CSV</span>
          </button>
          <button
            type="button"
            disabled={filtered.length === 0}
            onClick={exportJSON}
            className="flex items-center gap-1 rounded-xl border border-[#212632] bg-[#10131a] px-2 py-1 text-xs text-[#abb4c4] hover:text-white hover:bg-[#1a1f2b] transition-colors disabled:opacity-40"
            aria-label="Exportar respaldo JSON"
            title="Descargar respaldo JSON"
          >
            <FileJson className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={isResetting}
            onClick={() => setConfirmReset((prev) => !prev)}
            className="flex items-center justify-center rounded-xl border border-[#261d20] bg-[#140e11] p-1.5 text-xs text-[#a25a67] hover:text-rose-300 transition-colors disabled:opacity-40"
            aria-label="Reiniciar histórico de telemetría"
          >
            <RotateCcw
              className={`h-3.5 w-3.5 ${isResetting ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {/* Inline Reset Confirmation */}
      {confirmReset && (
        <div className="flex items-center justify-between rounded-2xl border border-[#3d1f25] bg-[#160d10] px-3.5 py-2.5 text-xs text-rose-200">
          <span>¿Restablecer lecturas al estado inicial?</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="rounded-lg px-2.5 py-1 text-[#8d96a8] hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isResetting}
              onClick={handleConfirmReset}
              className="rounded-lg bg-rose-600 px-2.5 py-1 font-medium text-white hover:bg-rose-500 disabled:opacity-50"
            >
              {isResetting ? 'Reiniciando…' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}

      {/* Space & Period Filters */}
      <div className="rounded-2xl border border-[#1b202a] bg-[#101319] p-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-[11px]">
            {(
              [
                { id: 'recent', label: 'Recientes' },
                { id: '1h', label: '1 hora' },
                { id: 'today', label: 'Hoy' },
                { id: 'custom', label: 'Fechas' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`rounded-lg px-2.5 py-1 transition-colors ${
                  period === p.id
                    ? 'bg-[#202634] text-white font-medium'
                    : 'text-[#6c7587] hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <select
            aria-label="Filtrar por espacio"
            value={selectedSpace}
            onChange={(e) => setSelectedSpace(e.target.value)}
            className="rounded-xl border border-[#222836] bg-[#090b0e] px-2.5 py-1 text-xs text-[#c7cfde] focus:outline-none max-w-[180px]"
          >
            <option value="all">Todos los espacios</option>
            {spaceOptions.map((sp) => (
              <option key={sp} value={sp}>
                {sp}
              </option>
            ))}
          </select>
        </div>

        {period === 'custom' && (
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#181d27]">
            <div>
              <label
                htmlFor="history-from"
                className="flex items-center gap-1 text-[10px] text-[#6d7688] mb-1"
              >
                <Calendar className="h-3 w-3" />
                <span>Desde</span>
              </label>
              <input
                id="history-from"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-xl border border-[#222836] bg-[#090b0e] px-2.5 py-1.5 text-xs text-white focus:outline-none [color-scheme:dark]"
              />
            </div>
            <div>
              <label
                htmlFor="history-to"
                className="flex items-center gap-1 text-[10px] text-[#6d7688] mb-1"
              >
                <Calendar className="h-3 w-3" />
                <span>Hasta</span>
              </label>
              <input
                id="history-to"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-xl border border-[#222836] bg-[#090b0e] px-2.5 py-1.5 text-xs text-white focus:outline-none [color-scheme:dark]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Feed of Telemetry Items */}
      <div className="space-y-2">
        {isLoadingQuery ? (
          <div className="py-10 text-center text-xs text-[#677080]">
            Consultando registros…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#525968]">
            No hay registros que coincidan con el filtro seleccionado.
          </div>
        ) : (
          filtered.slice(0, 60).map((r) => {
            const date = new Date(r.timestamp);
            const dateStr = date.toLocaleDateString('es-CO', {
              day: '2-digit',
              month: 'short',
            });
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
                    <span className="font-mono text-xs text-[#abb4c4] tabular-nums shrink-0">
                      {timeStr}
                    </span>
                    <span className="text-[11px] text-[#555d6e]">·</span>
                    <span className="text-xs text-white truncate">
                      {r.location}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#525a6b] font-mono">
                    <span>{dateStr}</span>
                    <span>·</span>
                    <span className="truncate">{r.deviceName || r.deviceId}</span>
                  </div>
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
