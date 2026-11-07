import { NextRequest, NextResponse, connection } from 'next/server';
import { getReadings, addReading, resetReadings } from '@/lib/storage';

export async function GET(request: NextRequest) {
  await connection();
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const location = searchParams.get('location') || undefined;
    const classification = searchParams.get('classification') || undefined;
    const deviceId = searchParams.get('deviceId') || undefined;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const alertsOnly = searchParams.get('alertsOnly') === 'true';
    const thresholdParam = searchParams.get('threshold');

    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const threshold = thresholdParam ? parseFloat(thresholdParam) : 70;

    const readings = await getReadings({
      limit: limit && !Number.isNaN(limit) && limit > 0 ? limit : undefined,
      location,
      classification,
      deviceId,
      from,
      to,
      alertsOnly,
      threshold: !Number.isNaN(threshold) ? threshold : 70,
    });

    return NextResponse.json({
      success: true,
      count: readings.length,
      data: readings,
    });
  } catch (error) {
    console.error('Error fetching readings:', error);
    return NextResponse.json(
      { success: false, error: 'Error al recuperar lecturas de ruido' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.decibels === undefined || typeof body.decibels !== 'number' || Number.isNaN(body.decibels)) {
      return NextResponse.json(
        { success: false, error: 'El campo "decibels" es obligatorio y debe ser numérico' },
        { status: 400 }
      );
    }

    if (body.decibels < 0 || body.decibels > 140) {
      return NextResponse.json(
        { success: false, error: 'El valor de decibeles debe estar en el rango de 0 a 140 dB' },
        { status: 400 }
      );
    }

    const reading = await addReading({
      deviceId: body.deviceId || 'mobile-node-edge',
      deviceName: body.deviceName || 'Smartphone Sensor',
      location: body.location || 'Salón 301 - Lab IoT',
      decibels: body.decibels,
      timestamp: body.timestamp || new Date().toISOString(),
      calibrationOffset:
        typeof body.calibrationOffset === 'number' ? body.calibrationOffset : undefined,
      alertThreshold:
        typeof body.alertThreshold === 'number' ? body.alertThreshold : 70,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Lectura de ruido registrada exitosamente',
        data: reading,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating reading:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno al registrar lectura' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const seed = await resetReadings();
    return NextResponse.json({
      success: true,
      message: 'Historial restablecido con datos iniciales',
      count: seed.length,
    });
  } catch (error) {
    console.error('Error resetting readings:', error);
    return NextResponse.json(
      { success: false, error: 'Error al reiniciar datos' },
      { status: 500 }
    );
  }
}
