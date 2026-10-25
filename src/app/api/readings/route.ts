import { NextRequest, NextResponse } from 'next/server';
import { getReadings, addReading, resetReadings } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const location = searchParams.get('location');
    const classification = searchParams.get('classification');

    let readings = getReadings();

    if (location && location !== 'all') {
      readings = readings.filter((r) => r.location.toLowerCase().includes(location.toLowerCase()));
    }

    if (classification && classification !== 'all') {
      readings = readings.filter((r) => r.classification.toLowerCase() === classification.toLowerCase());
    }

    if (limitParam) {
      const limit = parseInt(limitParam, 10);
      if (!isNaN(limit) && limit > 0) {
        readings = readings.slice(0, limit);
      }
    }

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

    if (body.decibels === undefined || typeof body.decibels !== 'number') {
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

    const reading = addReading({
      deviceId: body.deviceId || 'mobile-node-edge',
      deviceName: body.deviceName || 'Smartphone Sensor',
      location: body.location || 'Salón 301 - Lab IoT',
      decibels: body.decibels,
      timestamp: body.timestamp || new Date().toISOString(),
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
    const seed = resetReadings();
    return NextResponse.json({
      success: true,
      message: 'Historial restablecido con datos de simulación iniciales',
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
