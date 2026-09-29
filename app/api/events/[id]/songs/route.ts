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
  notes?: string | null;
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

    const hasNotesField = !Array.isArray(body) && body?.notes !== undefined;
    const eventGeneralNotes = hasNotesField
      ? typeof body.notes === 'string'
        ? body.notes.trim() || null
        : null
      : undefined;

    if (!songsList.length && !Array.isArray(body) && !Array.isArray(body?.songs) && !hasNotesField) {
      return NextResponse.json(
        { error: 'Nenhum dado válido para atualização.' },
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

    // Execute atomic update across all EventSong records and Event notes
    await prisma.$transaction(async (tx) => {
      // 1. Update general event notes if passed
      if (eventGeneralNotes !== undefined) {
        await tx.event.update({
          where: { id: eventId },
          data: {
            notes: eventGeneralNotes,
          },
        });
      }

      // 2. Update song items
      for (const item of songsList) {
        const itemNotes = item.notes !== undefined
          ? (typeof item.notes === 'string' ? item.notes.trim() || null : null)
          : undefined;

        if (item.id) {
          await tx.eventSong.update({
            where: {
              id: item.id,
            },
            data: {
              selected: Boolean(item.selected),
              order: Number(item.order),
              ...(itemNotes !== undefined ? { notes: itemNotes } : {}),
            },
          });
        } else if (item.songId) {
          await tx.eventSong.upsert({
            where: {
              eventId_songId: {
                eventId,
                songId: item.songId,
              },
            },
            update: {
              selected: Boolean(item.selected),
              order: Number(item.order),
              ...(itemNotes !== undefined ? { notes: itemNotes } : {}),
            },
            create: {
              eventId,
              songId: item.songId,
              selected: Boolean(item.selected),
              order: Number(item.order),
              notes: itemNotes ?? null,
            },
          });
        }
      }
    });

    // Fetch updated event
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
        message: 'Repertório e observações atualizados com sucesso.',
        event: updatedEvent,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating event songs and notes:', error);
    return NextResponse.json(
      { error: 'Falha ao sincronizar dados do evento.' },
      { status: 500 }
    );
  }
}
