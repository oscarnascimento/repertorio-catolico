import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID do evento não fornecido.' },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        songs: {
          include: {
            song: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Evento não encontrado.' },
        { status: 404 }
      );
    }

    return NextResponse.json(event, { status: 200 });
  } catch (error) {
    console.error('Error fetching event details:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar detalhes do evento.' },
      { status: 500 }
    );
  }
}
