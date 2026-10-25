import { NextResponse } from 'next/server';
import { getReadings, calculateStats } from '@/lib/storage';

export async function GET() {
  try {
    const readings = getReadings();
    const stats = calculateStats(readings);

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
