'use client';

import React, { useState } from 'react';
import { NoiseReading } from '@/types/simora';
import { Download, RefreshCw, Filter, AlertTriangle } from 'lucide-react';

interface HistoricalTableProps {
  readings: NoiseReading[];
  onRefresh: () => void;
  onReset: () => void;
}

export function HistoricalTable({
  readings,
  onRefresh,
  onReset,
}: HistoricalTableProps) {
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterClassification, setFilterClassification] = useState('all');
  const [isResetting, setIsResetting] = useState(false);

  // Unique locations list
  const uniqueLocations = Array.from(new Set(readings.map((r) => r.location)));

  const filteredReadings = readings.filter((r) => {
    if (filterLocation !== 'all' && r.location !== filterLocation) {
      return false;
    }
    if (filterClassification !== 'all' && r.classification !== filterClassification) {
      return false;
    }
    return true;
  });

  const exportCSV = () => {
    const headers = ['ID', 'Fecha_Hora', 'Dispositivo', 'Espacio', 'Decibeles_dB', 'Clasificacion', 'Alerta_Umbral'];
    const rows = filteredReadings.map((r) => [
      r.id,
      r.timestamp,
      r.deviceName || r.deviceId,
      `"${r.location}"`,
      r.decibels,
      r.classification,
      r.isAlert ? 'SI' : 'NO',
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `simora_historico_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = async () => {
    if (window.confirm('¿Deseas reiniciar los datos del historial con las lecturas de demostración iniciales?')) {
      setIsResetting(true);
      await onReset();
      setIsResetting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-md">
      {/* Table Header and Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white">
            Registro Histórico de Telemetría Acústica
          </h3>
          <p className="text-xs text-slate-400">
            Mostrando {filteredReadings.length} de {readings.length} registros capturados
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            aria-label="Actualizar lecturas del servidor"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Actualizar</span>
          </button>

          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            aria-label="Exportar registros a archivo CSV"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Descargar CSV</span>
          </button>

          <button
            type="button"
            disabled={isResetting}
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-rose-900/50 bg-rose-950/40 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-900/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50"
            aria-label="Reiniciar histórico con datos iniciales"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isResetting ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Reiniciar Datos</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mt-4 flex flex-wrap items-center gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Filter className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="font-semibold">Filtros:</span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="filter-location" className="text-slate-400">
            Espacio:
          </label>
          <select
            id="filter-location"
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <option value="all">Todos los espacios</option>
            {uniqueLocations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="filter-class" className="text-slate-400">
            Clasificación:
          </label>
          <select
            id="filter-class"
            value={filterClassification}
            onChange={(e) => setFilterClassification(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <option value="all">Todas</option>
            <option value="Silencioso">Silencioso (&lt;50 dB)</option>
            <option value="Moderado">Moderado (50 - 70 dB)</option>
            <option value="Ruidoso">Ruidoso (&gt;70 dB)</option>
          </select>
        </div>
      </div>

      {/* Table view */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th scope="col" className="px-3 py-2.5">
                Hora
              </th>
              <th scope="col" className="px-3 py-2.5">
                Espacio
              </th>
              <th scope="col" className="px-3 py-2.5">
                Sensor
              </th>
              <th scope="col" className="px-3 py-2.5 text-right">
                Nivel (dB)
              </th>
              <th scope="col" className="px-3 py-2.5 text-center">
                Clasificación
              </th>
              <th scope="col" className="px-3 py-2.5 text-center">
                Estado Alerta
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredReadings.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No se encontraron lecturas que coincidan con los filtros aplicados.
                </td>
              </tr>
            ) : (
              filteredReadings.slice(0, 50).map((r) => {
                const date = new Date(r.timestamp);
                const timeStr = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

                return (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-3 py-2.5 font-mono text-slate-400 tabular-nums">
                      {timeStr}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-200">
                      {r.location}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-400 text-[11px]">
                      {r.deviceName || r.deviceId}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-white tabular-nums">
                      {r.decibels.toFixed(1)} dB
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          r.classification === 'Silencioso'
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            : r.classification === 'Moderado'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                        }`}
                      >
                        {r.classification}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {r.isAlert ? (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-semibold text-[11px]">
                          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                          <span>Umbral Excedido</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Normal</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
