'use client';

import React from 'react';
import { Cpu, ShieldCheck, Activity, Radio, CheckCircle2 } from 'lucide-react';

export function MobileInfoView() {
  return (
    <div className="flex flex-col space-y-4 pb-8 text-xs leading-relaxed">
      {/* System Overview Card */}
      <div className="rounded-2xl border border-[#1b202a] bg-[#101319] p-4 space-y-3">
        <div className="flex items-center gap-2 text-white font-medium">
          <Cpu className="h-4 w-4 text-[#8a94a6]" aria-hidden="true" />
          <span>Funcionamiento del Nodo Sensor (Edge Computing)</span>
        </div>
        <p className="text-[#8b94a6]">
          SIMORA convierte el dispositivo en un sensor de borde acústico autónomo para evaluar el confort sonoro en espacios académicos y de trabajo.
        </p>

        <div className="rounded-xl border border-[#1a2d21] bg-[#0c1a12] p-3 text-[#b3dec2] space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Operación en Tiempo Real</span>
          </div>
          <ul className="space-y-1 text-[11px] list-disc list-inside text-[#9bc8ad]">
            <li>Cálculo matemático instantáneo de decibeles (dB) en el navegador.</li>
            <li>Clasificación acústica automática según estándares internacionales.</li>
            <li>Sincronización periódica de telemetría hacia el panel central.</li>
            <li>Detección inmediata de picos y eventos de disconfort sonoro.</li>
          </ul>
        </div>
      </div>

      {/* Privacy Guarantee */}
      <div className="rounded-2xl border border-[#1b202a] bg-[#101319] p-4 space-y-2">
        <div className="flex items-center gap-2 text-white font-medium">
          <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <span>Privacidad por Diseño (Zero-Recording)</span>
        </div>
        <p className="text-[#848d9e] text-[11px]">
          SIMORA no graba, almacena ni transmite ondas sonoras ni fragmentos de voz. La señal del micrófono se analiza exclusivamente en la memoria volátil del dispositivo para calcular el valor eficaz (RMS) y la escala relativa en decibeles. Una vez obtenido el valor numérico, el búfer de audio se destruye inmediatamente.
        </p>
      </div>

      {/* Acoustic Standards (WHO) */}
      <div className="rounded-2xl border border-[#1b202a] bg-[#101319] p-4 space-y-2">
        <div className="flex items-center gap-2 text-white font-medium">
          <Activity className="h-4 w-4 text-amber-400" aria-hidden="true" />
          <span>Criterios de Confort Acústico (OMS)</span>
        </div>
        <p className="text-[#757f92] text-[11px]">
          Umbrales recomendados para salvaguardar la concentración y la salud auditiva en entornos educativos:
        </p>
        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="rounded-xl bg-[#0d1712] border border-[#173022] p-2">
            <span className="font-mono text-emerald-400 text-xs font-semibold">&lt;50 dB</span>
            <span className="block text-[10px] text-[#719c82] mt-0.5">Óptimo (Biblioteca)</span>
          </div>
          <div className="rounded-xl bg-[#1f190e] border border-[#3b2e17] p-2">
            <span className="font-mono text-amber-400 text-xs font-semibold">50–70 dB</span>
            <span className="block text-[10px] text-[#a48a5e] mt-0.5">Aula de clase</span>
          </div>
          <div className="rounded-xl bg-[#211114] border border-[#3f1e24] p-2">
            <span className="font-mono text-rose-400 text-xs font-semibold">&gt;70 dB</span>
            <span className="block text-[10px] text-[#ab6b76] mt-0.5">Fatiga auditiva</span>
          </div>
        </div>
      </div>

      {/* Technical Specifications */}
      <div className="rounded-2xl border border-[#1b202a] bg-[#101319] p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-white font-medium">
          <Radio className="h-4 w-4 text-[#8a94a6]" aria-hidden="true" />
          <span>Especificaciones Técnicas del Nodo</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-xl bg-[#0d0f14] border border-[#1c202a] p-2.5">
            <span className="text-[#646d7e] block text-[10px]">Intervalo de Muestreo</span>
            <span className="font-mono text-white font-medium">2.500 ms (0.4 Hz)</span>
          </div>
          <div className="rounded-xl bg-[#0d0f14] border border-[#1c202a] p-2.5">
            <span className="text-[#646d7e] block text-[10px]">Rango de Medición</span>
            <span className="font-mono text-white font-medium">30 dB – 130 dB</span>
          </div>
          <div className="rounded-xl bg-[#0d0f14] border border-[#1c202a] p-2.5">
            <span className="text-[#646d7e] block text-[10px]">Motor de Análisis</span>
            <span className="font-mono text-white font-medium">Web Audio API (RMS)</span>
          </div>
          <div className="rounded-xl bg-[#0d0f14] border border-[#1c202a] p-2.5">
            <span className="text-[#646d7e] block text-[10px]">Capa de Ingesta</span>
            <span className="font-mono text-white font-medium">REST API / HTTPS</span>
          </div>
        </div>
      </div>

      {/* Authors & Academic Context */}
      <div className="rounded-2xl border border-[#171b23] bg-[#0a0c10] p-4 text-center text-[#555d6e] text-[11px] space-y-1">
        <p className="font-medium text-[#7d8799]">
          SIMORA · Sistema de Monitoreo de Ruido Ambiental
        </p>
        <p>Internet de las Cosas (IoT) · Fundación Universitaria Compensar (2026)</p>
        <p className="text-[#49505f]">
          Sebastian Hernandez Pinzon · Samuel Felipe Barbosa Ríos
        </p>
      </div>
    </div>
  );
}
