import fs from 'fs';
import path from 'path';
import { NoiseReading, NoiseStats, NoiseClassification, classifyNoise } from '@/types/simora';

const DATA_FILE = path.join(process.cwd(), '.simora_storage.json');

function generateInitialSeed(): NoiseReading[] {
  const locations = [
    { name: 'Biblioteca - Sala de Lectura', base: 42, variance: 7 },
    { name: 'Salón 301 - Lab IoT', base: 58, variance: 12 },
    { name: 'Sala de Estudio B', base: 49, variance: 9 },
  ];

  const readings: NoiseReading[] = [];
  const now = Date.now();

  // Generate readings over the last 2 hours at 3-minute intervals
  for (let i = 40; i >= 0; i--) {
    const loc = locations[i % locations.length];
    const timestamp = new Date(now - i * 3 * 60 * 1000).toISOString();
    // Simulate natural noise fluctuations
    const delta = (Math.sin(i / 3) * 6) + ((Math.random() - 0.5) * loc.variance);
    const db = Math.round(Math.max(30, Math.min(95, loc.base + delta)) * 10) / 10;
    const classification = classifyNoise(db);

    readings.push({
      id: `seed-${i}-${Date.now().toString(36)}`,
      deviceId: `sensor-node-${(i % 3) + 1}`,
      deviceName: `Smartphone Sensor ${(i % 3) + 1}`,
      location: loc.name,
      decibels: db,
      classification,
      timestamp,
      isAlert: db >= 70,
    });
  }

  return readings;
}

// In-memory cache with fallback to disk file
let cachedReadings: NoiseReading[] | null = null;

export function getReadings(): NoiseReading[] {
  if (cachedReadings) {
    return cachedReadings;
  }

  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      cachedReadings = JSON.parse(raw);
      if (Array.isArray(cachedReadings) && cachedReadings.length > 0) {
        return cachedReadings;
      }
    }
  } catch (err) {
    console.error('Error reading persisted data file:', err);
  }

  // Fallback to seed data
  cachedReadings = generateInitialSeed();
  saveReadings(cachedReadings);
  return cachedReadings;
}

export function saveReadings(readings: NoiseReading[]): void {
  cachedReadings = readings;
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(readings, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving data to disk:', err);
  }
}

export function addReading(data: {
  deviceId: string;
  deviceName?: string;
  location?: string;
  decibels: number;
  timestamp?: string;
}): NoiseReading {
  const current = getReadings();
  const db = Math.round(Math.max(20, Math.min(120, data.decibels)) * 10) / 10;
  const classification = classifyNoise(db);
  const timestamp = data.timestamp || new Date().toISOString();

  const newReading: NoiseReading = {
    id: `reading-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    deviceId: data.deviceId || 'mobile-sensor-client',
    deviceName: data.deviceName || 'Smartphone Edge Sensor',
    location: data.location || 'Salón 301 - Lab IoT',
    decibels: db,
    classification,
    timestamp,
    isAlert: db >= 70,
  };

  // Prepend new reading and keep latest 300 entries
  const updated = [newReading, ...current].slice(0, 300);
  saveReadings(updated);
  return newReading;
}

export function resetReadings(): NoiseReading[] {
  const seed = generateInitialSeed();
  saveReadings(seed);
  return seed;
}

export function calculateStats(readings: NoiseReading[]): NoiseStats {
  if (readings.length === 0) {
    return {
      currentDecibels: 0,
      avgDecibels: 0,
      maxDecibels: 0,
      minDecibels: 0,
      totalReadings: 0,
      alertCount: 0,
      activeSensors: 0,
      distribution: { silencioso: 0, moderado: 0, ruidoso: 0 },
    };
  }

  const dbs = readings.map((r) => r.decibels);
  const total = dbs.reduce((acc, val) => acc + val, 0);
  const avg = Math.round((total / dbs.length) * 10) / 10;
  const max = Math.max(...dbs);
  const min = Math.min(...dbs);
  const alertCount = readings.filter((r) => r.isAlert).length;
  const uniqueDevices = new Set(readings.map((r) => r.deviceId)).size;

  const distribution = {
    silencioso: readings.filter((r) => r.classification === 'Silencioso').length,
    moderado: readings.filter((r) => r.classification === 'Moderado').length,
    ruidoso: readings.filter((r) => r.classification === 'Ruidoso').length,
  };

  return {
    currentDecibels: readings[0].decibels,
    avgDecibels: avg,
    maxDecibels: max,
    minDecibels: min,
    totalReadings: readings.length,
    alertCount,
    activeSensors: uniqueDevices,
    distribution,
  };
}
