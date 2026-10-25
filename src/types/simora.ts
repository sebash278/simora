export type NoiseClassification = 'Silencioso' | 'Moderado' | 'Ruidoso';

export function classifyNoise(decibels: number): NoiseClassification {
  if (decibels < 50) return 'Silencioso';
  if (decibels <= 70) return 'Moderado';
  return 'Ruidoso';
}

export interface NoiseReading {
  id: string;
  deviceId: string;
  deviceName: string;
  location: string;
  decibels: number;
  classification: NoiseClassification;
  timestamp: string; // ISO string
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
}

export interface ThresholdConfig {
  warningThreshold: number; // default: 55 dB
  dangerThreshold: number;  // default: 70 dB
}
