import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface UpdateSongItem {
  id?: string;
  songId?: string;
  selected: boolean;
  order: number;
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id: eventId } = await context.params;

    if (!eventId) {
      return NextResponse.json(
        { error: 'ID do evento não fornecido.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const songsList: UpdateSongItem[] = Array.isArray(body)
      ? body
      : Array.isArray(body?.songs)
      ? body.songs
      : [];

    if (!songsList.length && !Array.isArray(body) && !Array.isArray(body?.songs)) {
      return NextResponse.json(
        { error: 'Lista de músicas inválida para atualização.' },
        { status: 400 }
      );
    }

    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Evento não encontrado.' },
        { status: 404 }
      );
    }

    // Execute atomic update across all EventSong records
    const transactionOperations = songsList.map((item) => {
      if (item.id) {
        return prisma.eventSong.update({
          where: {
            id: item.id,
          },
          data: {
            selected: Boolean(item.selected),
            order: Number(item.order),
          },
        });
      } else if (item.songId) {
        return prisma.eventSong.upsert({
          where: {
            eventId_songId: {
              eventId,
              songId: item.songId,
            },
          },
          update: {
            selected: Boolean(item.selected),
            order: Number(item.order),
          },
          create: {
            eventId,
            songId: item.songId,
            selected: Boolean(item.selected),
            order: Number(item.order),
          },
        });
      } else {
        throw new Error('Identificador da música (id ou songId) não fornecido');
      }
    });

    await prisma.$transaction(transactionOperations);

    // Fetch updated event songs
    const updatedEvent = await prisma.event.findUnique({
      where: { id: eventId },
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

    return NextResponse.json(
      {
        message: 'Repertório atualizado com sucesso.',
        event: updatedEvent,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating event songs:', error);
    return NextResponse.json(
      { error: 'Falha ao sincronizar músicas do evento.' },
      { status: 500 }
    );
  }
}
