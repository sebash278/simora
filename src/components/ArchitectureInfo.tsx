'use client';

import React from 'react';
import { Layers, ShieldCheck, CheckCircle2, Cpu, Server, LayoutDashboard, Radio } from 'lucide-react';

export function ArchitectureInfo() {
  return (
    <div className="space-y-6">
      {/* System Architecture Overview */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <Layers className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Arquitectura del Sistema SIMORA
            </h2>
            <p className="text-xs text-slate-400">
              Sistema de Monitoreo de Ruido Ambiental mediante Sensores Móviles en Espacios Académicos
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-6 md:grid-cols-2">
          {/* Edge and Privacy Layer */}
          <div className="rounded-xl bg-emerald-950/20 border border-emerald-500/30 p-4">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm mb-3">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>Capa de Borde y Privacidad</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>
                  <strong>Nodo Sensor Edge (Web Audio API):</strong> Captura de stream de audio y cálculo instantáneo de decibeles aproximados mediante valor eficaz cuadrático medio (RMS) directamente en smartphones o navegadores.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>
                  <strong>Privacidad por Diseño (Zero-Recording):</strong> El audio se procesa en el buffer volátil de memoria del navegador y se descarta de inmediato; nunca se graba, almacena ni transmite audio crudo.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>
                  <strong>Simulador IoT Integrado:</strong> Generador de telemetría sintética para pruebas continuas de conectividad y análisis de red sin requerir micrófono activo.
                </span>
              </li>
            </ul>
          </div>

          {/* Cloud and Analytics Layer */}
          <div className="rounded-xl bg-slate-950/50 border border-slate-800 p-4">
            <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm mb-3">
              <Radio className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span>Capa de Ingesta y Visualización</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>
                  <strong>API REST de Telemetría:</strong> Endpoints <code className="text-emerald-300">POST /api/readings</code>, <code className="text-emerald-300">GET /api/readings</code> y <code className="text-emerald-300">GET /api/stats</code> para ingestión y consulta en tiempo real.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>
                  <strong>Dashboard en Tiempo Real:</strong> Monitoreo instantáneo, semáforo acústico (Silencioso, Moderado, Ruidoso) y serie temporal reactiva con umbrales configurables.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>
                  <strong>Categorización por Espacios:</strong> Vinculación de lecturas a salones, bibliotecas y zonas comunes para análisis de clima acústico según estándares de la OMS.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* IoT Architecture Diagram */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-md">
        <h3 className="text-base font-bold text-white mb-4">
          Flujo de Arquitectura del Sistema IoT (Edge-to-Cloud)
        </h3>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-4 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 mb-2">
              <Cpu className="h-5 w-5" aria-hidden="true" />
            </div>
            <h4 className="text-xs font-bold text-slate-200">1. Edge Device (Móvil)</h4>
            <p className="mt-1 text-[11px] text-slate-400">
              Captura micrófono vía Web Audio API. Cálculo de decibeles RMS en el procesador del dispositivo móvil.
            </p>
          </div>

          <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-4 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400 mb-2">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <h4 className="text-xs font-bold text-slate-200">2. Privacidad &amp; Buffer</h4>
            <p className="mt-1 text-[11px] text-slate-400">
              Descarte inmediato del audio crudo. Solo se emite la tupla numérica <code className="text-teal-300">(dB, timestamp, id)</code>.
            </p>
          </div>

          <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-4 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 mb-2">
              <Server className="h-5 w-5" aria-hidden="true" />
            </div>
            <h4 className="text-xs font-bold text-slate-200">3. Backend &amp; Ingesta</h4>
            <p className="mt-1 text-[11px] text-slate-400">
              Next.js API Routes valida rango (0-140 dB), clasifica semáforo y persiste en el repositorio de telemetría.
            </p>
          </div>

          <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-4 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 mb-2">
              <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
            </div>
            <h4 className="text-xs font-bold text-slate-200">4. Visualización</h4>
            <p className="mt-1 text-[11px] text-slate-400">
              Dashboard reactivo con cálculo de métricas acústicas, detección de picos de ruido y exportación para reportes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
