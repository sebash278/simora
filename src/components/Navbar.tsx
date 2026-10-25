'use client';

import React from 'react';
import { Activity, Radio, Info, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'sensor' | 'architecture';
  onTabChange: (tab: 'dashboard' | 'sensor' | 'architecture') => void;
  isStreaming: boolean;
  activeSensorsCount: number;
}

export function Navbar({
  activeTab,
  onTabChange,
  isStreaming,
  activeSensorsCount,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-lg shadow-emerald-500/20">
            <Radio className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white">SIMORA</span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                IoT Edge
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Monitoreo de Ruido Ambiental mediante Sensores Móviles
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 rounded-xl bg-slate-900/90 p-1 border border-slate-800 text-sm font-medium">
          <button
            type="button"
            onClick={() => onTabChange('dashboard')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              activeTab === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
            aria-label="Ver Dashboard Central de Monitoreo"
          >
            <Activity className="h-4 w-4" aria-hidden="true" />
            <span className="hidden md:inline">Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('sensor')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              activeTab === 'sensor'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
            aria-label="Abrir interfaz de Nodo Sensor Móvil"
          >
            <Radio className="h-4 w-4" aria-hidden="true" />
            <span className="hidden md:inline">Sensor Móvil</span>
            {isStreaming && (
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('architecture')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              activeTab === 'architecture'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
            aria-label="Ver Arquitectura Técnica y Privacidad"
          >
            <Info className="h-4 w-4" aria-hidden="true" />
            <span className="hidden md:inline">Arquitectura &amp; Info</span>
          </button>
        </nav>

        {/* Live Network Pill */}
        <div className="hidden lg:flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
          <span className="flex h-2 w-2 relative">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span>
            {activeSensorsCount} {activeSensorsCount === 1 ? 'nodo activo' : 'nodos activos'}
          </span>
          <span className="text-slate-600">•</span>
          <ShieldCheck className="h-3.5 w-3.5 text-teal-400" aria-hidden="true" />
          <span className="text-[11px] text-teal-300">Privacidad Edge</span>
        </div>
      </div>
    </header>
  );
}
