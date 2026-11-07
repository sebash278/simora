import fs from 'fs';
import path from 'path';
import {
  NoiseReading,
  NoiseStats,
  MonitoredSpace,
  SpaceCategory,
  PersistenceEngine,
  ReadingsQueryFilter,
  classifyNoise,
  getRecommendedThresholdForCategory,
} from '@/types/simora';
import { getActivePrisma, markMysqlUnavailable } from '@/lib/prisma';
import { realtimeHub } from '@/lib/realtime';

const DATA_FILE = path.join(process.cwd(), '.simora_storage.json');

interface LocalStoreData {
  spaces: MonitoredSpace[];
  readings: NoiseReading[];
}

export const DEFAULT_SPACES: MonitoredSpace[] = [
  {
    id: 'space-lab-301',
    name: 'Salón 301 - Lab IoT',
    category: 'Aula',
    recommendedThreshold: 65,
  },
  {
    id: 'space-biblioteca',
    name: 'Biblioteca - Sala de Lectura',
    category: 'Biblioteca',
    recommendedThreshold: 45,
  },
  {
    id: 'space-estudio-b',
    name: 'Sala de Estudio B',
    category: 'Estudio',
    recommendedThreshold: 50,
  },
  {
    id: 'space-cafeteria',
    name: 'Cafetería Central',
    category: 'Común',
    recommendedThreshold: 70,
  },
];

function generateInitialSeedReadings(): NoiseReading[] {
  const profiles = [
    { name: 'Biblioteca - Sala de Lectura', base: 42, variance: 7 },
    { name: 'Salón 301 - Lab IoT', base: 58, variance: 13 },
    { name: 'Sala de Estudio B', base: 48, variance: 9 },
    { name: 'Cafetería Central', base: 67, variance: 14 },
  ];

  const readings: NoiseReading[] = [];
  const now = Date.now();

  for (let i = 48; i >= 0; i--) {
    const prof = profiles[i % profiles.length];
    const timestamp = new Date(now - i * 3 * 60 * 1000).toISOString();
    const delta = Math.sin(i / 3) * 6 + (Math.random() - 0.5) * prof.variance;
    const db = Math.round(Math.max(30, Math.min(95, prof.base + delta)) * 10) / 10;
    const classification = classifyNoise(db);

    readings.push({
      id: `seed-${i}-${now.toString(36)}`,
      deviceId: `nodo-campus-0${(i % 3) + 1}`,
      deviceName: `Sensor Móvil 0${(i % 3) + 1}`,
      location: prof.name,
      decibels: db,
      classification,
      timestamp,
      isAlert: db >= 70,
    });
  }

  return readings.reverse(); // Más recientes primero
}

let cachedStore: LocalStoreData | null = null;
let mysqlSeededCheck = false;

function loadLocalStore(): LocalStoreData {
  if (cachedStore) {
    return cachedStore;
  }

  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);

      // Compatibilidad con formato previo (arreglo plano de lecturas)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const existingNames = new Set(DEFAULT_SPACES.map((s) => s.name));
        const extraSpaces: MonitoredSpace[] = [];
        for (const r of parsed as NoiseReading[]) {
          if (r.location && !existingNames.has(r.location)) {
            existingNames.add(r.location);
            extraSpaces.push({
              id: `space-${extraSpaces.length + 10}`,
              name: r.location,
              category: 'Aula',
              recommendedThreshold: 65,
            });
          }
        }
        cachedStore = {
          spaces: [...DEFAULT_SPACES, ...extraSpaces],
          readings: parsed,
        };
        saveLocalStore(cachedStore);
        return cachedStore;
      }

      if (
        parsed &&
        typeof parsed === 'object' &&
        Array.isArray(parsed.readings) &&
        parsed.readings.length > 0
      ) {
        cachedStore = {
          spaces:
            Array.isArray(parsed.spaces) && parsed.spaces.length > 0
              ? parsed.spaces
              : [...DEFAULT_SPACES],
          readings: parsed.readings,
        };
        return cachedStore;
      }
    }
  } catch (err) {
    console.error('Error leyendo archivo de almacenamiento local:', err);
  }

  cachedStore = {
    spaces: [...DEFAULT_SPACES],
    readings: generateInitialSeedReadings(),
  };
  saveLocalStore(cachedStore);
  return cachedStore;
}

function saveLocalStore(store: LocalStoreData): void {
  cachedStore = store;
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error guardando almacenamiento local:', err);
  }
}

function parseBoundaryDate(value: string, isEndOfDay: boolean): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Si es solo fecha YYYY-MM-DD, interpretarla en hora local completa del día
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    return isEndOfDay
      ? new Date(y, m - 1, d, 23, 59, 59, 999)
      : new Date(y, m - 1, d, 0, 0, 0, 0);
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function ensureMysqlSeeded() {
  if (mysqlSeededCheck) return;
  const prisma = await getActivePrisma();
  if (!prisma) return;

  try {
    const spaceCount = await prisma.space.count();
    if (spaceCount === 0) {
      for (const sp of DEFAULT_SPACES) {
        await prisma.space.upsert({
          where: { name: sp.name },
          update: {},
          create: {
            name: sp.name,
            category: sp.category,
            recommendedThreshold: sp.recommendedThreshold,
          },
        });
      }
    }

    const readingCount = await prisma.noiseReading.count();
    if (readingCount === 0) {
      const seed = generateInitialSeedReadings();
      const spaces = await prisma.space.findMany();
      const spaceMap = new Map(spaces.map((s) => [s.name, s.id]));

      const uniqueDevices = new Map<string, string>();
      for (const r of seed) {
        uniqueDevices.set(r.deviceId, r.deviceName);
      }

      for (const [id, name] of uniqueDevices.entries()) {
        await prisma.device.upsert({
          where: { id },
          update: { name },
          create: { id, name },
        });
      }

      await prisma.noiseReading.createMany({
        data: seed.map((r) => ({
          deviceId: r.deviceId,
          deviceName: r.deviceName,
          spaceId: spaceMap.get(r.location) ?? null,
          location: r.location,
          decibels: r.decibels,
          classification: r.classification,
          isAlert: r.isAlert,
          timestamp: new Date(r.timestamp),
        })),
      });
    }

    mysqlSeededCheck = true;
  } catch (err) {
    console.error('Aviso al inicializar semilla en MySQL:', err);
    markMysqlUnavailable();
  }
}

export async function getPersistenceEngine(): Promise<PersistenceEngine> {
  const prisma = await getActivePrisma();
  return prisma ? 'mysql-prisma' : 'local-json';
}

export async function getSpaces(): Promise<MonitoredSpace[]> {
  const prisma = await getActivePrisma();
  if (prisma) {
    try {
      await ensureMysqlSeeded();
      const rows = await prisma.space.findMany({
        orderBy: { createdAt: 'asc' },
      });
      return rows.map((s) => ({
        id: s.id,
        name: s.name,
        category: (s.category as SpaceCategory) || 'Aula',
        recommendedThreshold: s.recommendedThreshold,
        createdAt: s.createdAt.toISOString(),
      }));
    } catch (err) {
      console.error('Fallo consultando espacios en MySQL, usando respaldo local:', err);
      markMysqlUnavailable();
    }
  }

  return loadLocalStore().spaces;
}

export async function addSpace(input: {
  name: string;
  category?: SpaceCategory;
  recommendedThreshold?: number;
}): Promise<MonitoredSpace> {
  const cleanName = input.name.trim().slice(0, 100);
  const category: SpaceCategory = input.category || 'Aula';
  const recommendedThreshold =
    typeof input.recommendedThreshold === 'number'
      ? Math.max(35, Math.min(95, input.recommendedThreshold))
      : getRecommendedThresholdForCategory(category);

  const prisma = await getActivePrisma();
  if (prisma) {
    try {
      await ensureMysqlSeeded();
      const saved = await prisma.space.upsert({
        where: { name: cleanName },
        update: { category, recommendedThreshold },
        create: { name: cleanName, category, recommendedThreshold },
      });

      const space: MonitoredSpace = {
        id: saved.id,
        name: saved.name,
        category: saved.category as SpaceCategory,
        recommendedThreshold: saved.recommendedThreshold,
        createdAt: saved.createdAt.toISOString(),
      };
      realtimeHub.publish({ type: 'space:new', space });
      return space;
    } catch (err) {
      console.error('Fallo creando espacio en MySQL, guardando localmente:', err);
      markMysqlUnavailable();
    }
  }

  const store = loadLocalStore();
  const existing = store.spaces.find(
    (s) => s.name.toLowerCase() === cleanName.toLowerCase()
  );

  if (existing) {
    existing.category = category;
    existing.recommendedThreshold = recommendedThreshold;
    saveLocalStore(store);
    return existing;
  }

  const created: MonitoredSpace = {
    id: `space-${Date.now().toString(36)}`,
    name: cleanName,
    category,
    recommendedThreshold,
    createdAt: new Date().toISOString(),
  };

  store.spaces = [...store.spaces, created];
  saveLocalStore(store);
  realtimeHub.publish({ type: 'space:new', space: created });
  return created;
}

export async function getReadings(
  filter: ReadingsQueryFilter = {}
): Promise<NoiseReading[]> {
  const fromDate = filter.from ? parseBoundaryDate(filter.from, false) : null;
  const toDate = filter.to ? parseBoundaryDate(filter.to, true) : null;
  const threshold = filter.threshold ?? 70;

  const prisma = await getActivePrisma();
  if (prisma) {
    try {
      await ensureMysqlSeeded();

      const where: Record<string, unknown> = {};
      if (filter.location && filter.location !== 'all') {
        where.location = { contains: filter.location };
      }
      if (filter.classification && filter.classification !== 'all') {
        where.classification = filter.classification;
      }
      if (filter.deviceId && filter.deviceId !== 'all') {
        where.deviceId = filter.deviceId;
      }
      if (fromDate || toDate) {
        where.timestamp = {
          ...(fromDate ? { gte: fromDate } : {}),
          ...(toDate ? { lte: toDate } : {}),
        };
      }
      if (filter.alertsOnly) {
        where.decibels = { gte: threshold };
      }

      const rows = await prisma.noiseReading.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: filter.limit && filter.limit > 0 ? Math.min(filter.limit, 1000) : 500,
      });

      return rows.map((r) => ({
        id: r.id,
        deviceId: r.deviceId,
        deviceName: r.deviceName,
        location: r.location,
        decibels: r.decibels,
        classification: r.classification as NoiseReading['classification'],
        timestamp: r.timestamp.toISOString(),
        isAlert: r.decibels >= threshold,
      }));
    } catch (err) {
      console.error('Fallo leyendo lecturas desde MySQL, usando respaldo local:', err);
      markMysqlUnavailable();
    }
  }

  const store = loadLocalStore();
  let list = store.readings.map((r) => ({
    ...r,
    isAlert: r.decibels >= threshold,
  }));

  if (filter.location && filter.location !== 'all') {
    const q = filter.location.toLowerCase();
    list = list.filter((r) => r.location.toLowerCase().includes(q));
  }

  if (filter.classification && filter.classification !== 'all') {
    const c = filter.classification.toLowerCase();
    list = list.filter((r) => r.classification.toLowerCase() === c);
  }

  if (filter.deviceId && filter.deviceId !== 'all') {
    list = list.filter((r) => r.deviceId === filter.deviceId);
  }

  if (fromDate) {
    const minMs = fromDate.getTime();
    list = list.filter((r) => new Date(r.timestamp).getTime() >= minMs);
  }

  if (toDate) {
    const maxMs = toDate.getTime();
    list = list.filter((r) => new Date(r.timestamp).getTime() <= maxMs);
  }

  if (filter.alertsOnly) {
    list = list.filter((r) => r.isAlert);
  }

  if (filter.limit && filter.limit > 0) {
    list = list.slice(0, filter.limit);
  }

  return list;
}

export async function addReading(data: {
  deviceId: string;
  deviceName?: string;
  location?: string;
  decibels: number;
  timestamp?: string;
  calibrationOffset?: number;
  alertThreshold?: number;
}): Promise<NoiseReading> {
  const db = Math.round(Math.max(20, Math.min(130, data.decibels)) * 10) / 10;
  const classification = classifyNoise(db);
  const parsedTs = data.timestamp ? new Date(data.timestamp) : new Date();
  const validTs = Number.isNaN(parsedTs.getTime()) ? new Date() : parsedTs;
  const deviceId = (data.deviceId || 'nodo-movil').trim().slice(0, 80);
  const deviceName = (data.deviceName || `Sensor Móvil (${deviceId})`).trim().slice(0, 120);
  const location = (data.location || 'Salón 301 - Lab IoT').trim().slice(0, 120);
  const threshold = data.alertThreshold ?? 70;
  const isAlert = db >= threshold;

  const prisma = await getActivePrisma();
  if (prisma) {
    try {
      await ensureMysqlSeeded();

      const space = await prisma.space.upsert({
        where: { name: location },
        update: {},
        create: {
          name: location,
          category: 'Aula',
          recommendedThreshold: 65,
        },
      });

      await prisma.device.upsert({
        where: { id: deviceId },
        update: {
          name: deviceName,
          lastSeenAt: validTs,
          ...(typeof data.calibrationOffset === 'number'
            ? { calibrationOffset: data.calibrationOffset }
            : {}),
        },
        create: {
          id: deviceId,
          name: deviceName,
          calibrationOffset: data.calibrationOffset ?? 0,
          lastSeenAt: validTs,
        },
      });

      const created = await prisma.noiseReading.create({
        data: {
          deviceId,
          deviceName,
          spaceId: space.id,
          location,
          decibels: db,
          classification,
          isAlert,
          timestamp: validTs,
        },
      });

      const reading: NoiseReading = {
        id: created.id,
        deviceId: created.deviceId,
        deviceName: created.deviceName,
        location: created.location,
        decibels: created.decibels,
        classification: created.classification as NoiseReading['classification'],
        timestamp: created.timestamp.toISOString(),
        isAlert: created.isAlert,
      };

      realtimeHub.publish({ type: 'reading:new', reading });
      return reading;
    } catch (err) {
      console.error('Fallo persistiendo lectura en MySQL, guardando en almacén local:', err);
      markMysqlUnavailable();
    }
  }

  const store = loadLocalStore();

  if (!store.spaces.some((s) => s.name.toLowerCase() === location.toLowerCase())) {
    store.spaces.push({
      id: `space-${Date.now().toString(36)}`,
      name: location,
      category: 'Aula',
      recommendedThreshold: 65,
      createdAt: new Date().toISOString(),
    });
  }

  const newReading: NoiseReading = {
    id: `reading-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    deviceId,
    deviceName,
    location,
    decibels: db,
    classification,
    timestamp: validTs.toISOString(),
    isAlert,
  };

  store.readings = [newReading, ...store.readings].slice(0, 1000);
  saveLocalStore(store);

  realtimeHub.publish({ type: 'reading:new', reading: newReading });
  return newReading;
}

export async function resetReadings(): Promise<NoiseReading[]> {
  const seed = generateInitialSeedReadings();

  const prisma = await getActivePrisma();
  if (prisma) {
    try {
      await prisma.noiseReading.deleteMany();
      mysqlSeededCheck = false;
      await ensureMysqlSeeded();
      const fresh = await getReadings({ limit: 200 });
      realtimeHub.publish({
        type: 'reading:reset',
        count: fresh.length,
        timestamp: new Date().toISOString(),
      });
      return fresh;
    } catch (err) {
      console.error('Fallo reiniciando lecturas en MySQL, reiniciando almacén local:', err);
      markMysqlUnavailable();
    }
  }

  const store = loadLocalStore();
  store.readings = seed;
  saveLocalStore(store);

  realtimeHub.publish({
    type: 'reading:reset',
    count: seed.length,
    timestamp: new Date().toISOString(),
  });
  return seed;
}

export function calculateStats(
  readings: NoiseReading[],
  engine: PersistenceEngine,
  threshold = 70
): NoiseStats {
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
      persistenceEngine: engine,
    };
  }

  let sum = 0;
  let max = -Infinity;
  let min = Infinity;
  let alertCount = 0;
  let silencioso = 0;
  let moderado = 0;
  let ruidoso = 0;
  const devices = new Set<string>();

  for (let i = 0; i < readings.length; i++) {
    const r = readings[i];
    const db = r.decibels;
    sum += db;
    if (db > max) max = db;
    if (db < min) min = db;
    if (db >= threshold) alertCount++;
    devices.add(r.deviceId);

    if (r.classification === 'Silencioso') silencioso++;
    else if (r.classification === 'Moderado') moderado++;
    else ruidoso++;
  }

  return {
    currentDecibels: readings[0].decibels,
    avgDecibels: Math.round((sum / readings.length) * 10) / 10,
    maxDecibels: max,
    minDecibels: min,
    totalReadings: readings.length,
    alertCount,
    activeSensors: devices.size,
    distribution: { silencioso, moderado, ruidoso },
    persistenceEngine: engine,
  };
}
