'use client';

import React from 'react';
import { Mic, BarChart2, Clock, Info } from 'lucide-react';

export type TabType = 'sensor' | 'monitoring' | 'history' | 'info';

interface MobileNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isStreaming: boolean;
}

export function MobileNavigation({
  activeTab,
  onTabChange,
  isStreaming,
}: MobileNavigationProps) {
  const tabs = [
    {
      id: 'sensor' as TabType,
      label: 'Sensor',
      icon: Mic,
      showPulse: isStreaming,
    },
    {
      id: 'monitoring' as TabType,
      label: 'Monitoreo',
      icon: BarChart2,
      showPulse: false,
    },
    {
      id: 'history' as TabType,
      label: 'Historial',
      icon: Clock,
      showPulse: false,
    },
    {
      id: 'info' as TabType,
      label: 'Info',
      icon: Info,
      showPulse: false,
    },
  ];

  return (
    <nav
      aria-label="Navegación principal de SIMORA"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#1f242e] bg-[#0c0e13]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-1 flex-col items-center justify-center py-1 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 ${
                isActive ? 'text-white font-medium' : 'text-[#727b8e] hover:text-[#a2aab8]'
              }`}
              aria-label={`Ir a pestaña ${tab.label}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon className="h-5 w-5 transition-transform" aria-hidden="true" />
                {tab.showPulse && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </div>
              <span className="mt-1 text-[11px] tracking-tight">{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 h-0.5 w-6 rounded-full bg-white" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
