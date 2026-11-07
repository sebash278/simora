export type NoiseClassification = 'Silencioso' | 'Moderado' | 'Ruidoso';

export type SpaceCategory = 'Biblioteca' | 'Estudio' | 'Aula' | 'Común';

export type PersistenceEngine = 'mysql-prisma' | 'local-json';

export function classifyNoise(decibels: number): NoiseClassification {
  if (decibels < 50) return 'Silencioso';
  if (decibels <= 70) return 'Moderado';
  return 'Ruidoso';
}

export function getRecommendedThresholdForCategory(category: SpaceCategory): number {
  switch (category) {
    case 'Biblioteca':
      return 45;
    case 'Estudio':
      return 50;
    case 'Aula':
      return 65;
    case 'Común':
      return 70;
  }
}

export interface MonitoredSpace {
  id: string;
  name: string;
  category: SpaceCategory;
  recommendedThreshold: number;
  createdAt?: string;
}

export interface NoiseReading {
  id: string;
  deviceId: string;
  deviceName: string;
  location: string;
  decibels: number;
  classification: NoiseClassification;
  timestamp: string; // ISO 8601
  isAlert: boolean;
}

export interface NoiseStats {
  currentDecibels: number;
  avgDecibels: number;
  maxDecibels: number;
  minDecibels: number;
  totalReadings: number;
  alertCount: number;
  activeSensors: number;
  distribution: {
    silencioso: number;
    moderado: number;
    ruidoso: number;
  };
  persistenceEngine: PersistenceEngine;
}

export interface ReadingsQueryFilter {
  limit?: number;
  location?: string;
  classification?: string;
  deviceId?: string;
  from?: string;
  to?: string;
  alertsOnly?: boolean;
  threshold?: number;
}

export type RealtimeEvent =
  | {
      type: 'connected';
      engine: PersistenceEngine;
      clients: number;
      timestamp: string;
    }
  | {
      type: 'reading:new';
      reading: NoiseReading;
    }
  | {
      type: 'reading:reset';
      count: number;
      timestamp: string;
    }
  | {
      type: 'space:new';
      space: MonitoredSpace;
    };
