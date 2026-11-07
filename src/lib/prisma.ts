import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  __simoraPrisma?: PrismaClient;
  __simoraMysqlAvailable?: boolean;
  __simoraLastCheckAt?: number;
};

const RECHECK_INTERVAL_MS = 15_000;

export function getPrismaClient(): PrismaClient | null {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl || !dbUrl.startsWith('mysql://')) {
    return null;
  }

  if (!globalForPrisma.__simoraPrisma) {
    globalForPrisma.__simoraPrisma = new PrismaClient({
      log: ['error'],
    });
  }

  return globalForPrisma.__simoraPrisma;
}

/**
 * Verifica si la instancia MySQL configurada en DATABASE_URL está accesible.
 * Cachea temporalmente fallos de red para no bloquear peticiones en modo desconectado.
 */
export async function getActivePrisma(): Promise<PrismaClient | null> {
  const client = getPrismaClient();
  if (!client) return null;

  const now = Date.now();
  const lastCheck = globalForPrisma.__simoraLastCheckAt ?? 0;

  if (
    globalForPrisma.__simoraMysqlAvailable === false &&
    now - lastCheck < RECHECK_INTERVAL_MS
  ) {
    return null;
  }

  if (
    globalForPrisma.__simoraMysqlAvailable === true &&
    now - lastCheck < RECHECK_INTERVAL_MS
  ) {
    return client;
  }

  try {
    await Promise.race([
      client.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('MySQL ping timeout')), 1500)
      ),
    ]);
    globalForPrisma.__simoraMysqlAvailable = true;
    globalForPrisma.__simoraLastCheckAt = now;
    return client;
  } catch {
    globalForPrisma.__simoraMysqlAvailable = false;
    globalForPrisma.__simoraLastCheckAt = now;
    return null;
  }
}

export function markMysqlUnavailable(): void {
  globalForPrisma.__simoraMysqlAvailable = false;
  globalForPrisma.__simoraLastCheckAt = Date.now();
}
