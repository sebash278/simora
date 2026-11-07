import { NextRequest, NextResponse, connection } from 'next/server';
import { getReadings, getPersistenceEngine, calculateStats } from '@/lib/storage';

export async function GET(request: NextRequest) {
  await connection();
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location') || undefined;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const thresholdParam = searchParams.get('threshold');
    const threshold = thresholdParam ? parseFloat(thresholdParam) : 70;
    const safeThreshold = !Number.isNaN(threshold) ? threshold : 70;

    const [readings, engine] = await Promise.all([
      getReadings({
        location,
        from,
        to,
        threshold: safeThreshold,
        limit: 1000,
      }),
      getPersistenceEngine(),
    ]);

    const stats = calculateStats(readings, engine, safeThreshold);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { success: false, error: 'Error al calcular estadísticas de monitoreo' },
      { status: 500 }
    );
  }
}
