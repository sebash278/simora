import { NextRequest, NextResponse, connection } from 'next/server';
import { getSpaces, addSpace } from '@/lib/storage';
import { SpaceCategory } from '@/types/simora';

const VALID_CATEGORIES: SpaceCategory[] = ['Biblioteca', 'Estudio', 'Aula', 'Común'];

export async function GET() {
  await connection();
  try {
    const spaces = await getSpaces();
    return NextResponse.json({
      success: true,
      count: spaces.length,
      data: spaces,
    });
  } catch (error) {
    console.error('Error fetching spaces:', error);
    return NextResponse.json(
      { success: false, error: 'Error al consultar espacios monitoreados' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawName = typeof body.name === 'string' ? body.name.trim() : '';

    if (rawName.length < 2 || rawName.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'El nombre del espacio debe tener entre 2 y 100 caracteres',
        },
        { status: 400 }
      );
    }

    const category: SpaceCategory = VALID_CATEGORIES.includes(body.category)
      ? body.category
      : 'Aula';

    const space = await addSpace({
      name: rawName,
      category,
      recommendedThreshold:
        typeof body.recommendedThreshold === 'number'
          ? body.recommendedThreshold
          : undefined,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Espacio registrado exitosamente',
        data: space,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating space:', error);
    return NextResponse.json(
      { success: false, error: 'Error al registrar nuevo espacio' },
      { status: 500 }
    );
  }
}
