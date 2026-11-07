import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SPACES = [
  { name: 'Salón 301 - Lab IoT', category: 'Aula', recommendedThreshold: 65, base: 58, variance: 13 },
  { name: 'Biblioteca - Sala de Lectura', category: 'Biblioteca', recommendedThreshold: 45, base: 42, variance: 7 },
  { name: 'Sala de Estudio B', category: 'Estudio', recommendedThreshold: 50, base: 48, variance: 9 },
  { name: 'Cafetería Central', category: 'Común', recommendedThreshold: 70, base: 67, variance: 14 },
];

function classifyNoise(db) {
  if (db < 50) return 'Silencioso';
  if (db <= 70) return 'Moderado';
  return 'Ruidoso';
}

async function main() {
  console.log('Inicializando espacios y lecturas semilla en MySQL para SIMORA...');

  const spaceMap = new Map();
  for (const sp of SPACES) {
    const created = await prisma.space.upsert({
      where: { name: sp.name },
      update: { category: sp.category, recommendedThreshold: sp.recommendedThreshold },
      create: { name: sp.name, category: sp.category, recommendedThreshold: sp.recommendedThreshold },
    });
    spaceMap.set(sp.name, created.id);
  }

  for (let n = 1; n <= 3; n++) {
    await prisma.device.upsert({
      where: { id: `nodo-campus-0${n}` },
      update: { name: `Sensor Móvil 0${n}`, lastSeenAt: new Date() },
      create: { id: `nodo-campus-0${n}`, name: `Sensor Móvil 0${n}`, calibrationOffset: 0 },
    });
  }

  const now = Date.now();
  const records = [];
  for (let i = 48; i >= 0; i--) {
    const sp = SPACES[i % SPACES.length];
    const delta = Math.sin(i / 3) * 6 + (Math.random() - 0.5) * sp.variance;
    const db = Math.round(Math.max(30, Math.min(95, sp.base + delta)) * 10) / 10;
    records.push({
      deviceId: `nodo-campus-0${(i % 3) + 1}`,
      deviceName: `Sensor Móvil 0${(i % 3) + 1}`,
      spaceId: spaceMap.get(sp.name),
      location: sp.name,
      decibels: db,
      classification: classifyNoise(db),
      isAlert: db >= 70,
      timestamp: new Date(now - i * 3 * 60 * 1000),
    });
  }

  await prisma.noiseReading.createMany({ data: records });
  console.log(`Semilla completada: ${SPACES.length} espacios y ${records.length} lecturas insertadas.`);
}

main()
  .catch((err) => {
    console.error('Error ejecutando seed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
