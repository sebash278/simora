import { NextResponse, connection } from 'next/server';
import { getPersistenceEngine } from '@/lib/storage';
import { realtimeHub } from '@/lib/realtime';

export async function GET() {
  await connection();
  const engine = await getPersistenceEngine();

  return NextResponse.json({
    success: true,
    status: 'ok',
    persistenceEngine: engine,
    realtimeClients: realtimeHub.getClientCount(),
    timestamp: new Date().toISOString(),
  });
}
