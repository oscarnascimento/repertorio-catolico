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

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID do evento não fornecido.' },
        { status: 400 }
      );
    }

    const existingEvent = await prisma.event.findUnique({
      where: { id },
      include: {
        songs: true,
      },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Evento não encontrado.' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { title, songIds, songs } = body;

    let updatedTitle = existingEvent.title;
    if (typeof title === 'string' && title.trim()) {
      updatedTitle = title.trim();
    }

    let newSongsData: Array<{ songId: string; selected: boolean; order: number }> | null = null;

    if (Array.isArray(songs)) {
      newSongsData = songs.map((s, index) => ({
        songId: s.songId,
        selected: Boolean(s.selected),
        order: typeof s.order === 'number' ? s.order : index,
      }));
    } else if (Array.isArray(songIds)) {
      const existingSelectionMap = new Map<string, boolean>();
      existingEvent.songs.forEach((es) => {
        existingSelectionMap.set(es.songId, es.selected);
      });

      newSongsData = songIds.map((sId: string, index: number) => ({
        songId: sId,
        selected: existingSelectionMap.get(sId) ?? false,
        order: index,
      }));
    }

    // Atomic database transaction to update title and songs
    await prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id },
        data: {
          title: updatedTitle,
        },
      });

      if (newSongsData !== null) {
        await tx.eventSong.deleteMany({
          where: { eventId: id },
        });

        if (newSongsData.length > 0) {
          await tx.eventSong.createMany({
            data: newSongsData.map((item) => ({
              eventId: id,
              songId: item.songId,
              selected: item.selected,
              order: item.order,
            })),
          });
        }
      }
    });

    const updatedEvent = await prisma.event.findUnique({
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

    return NextResponse.json(updatedEvent, { status: 200 });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: 'Falha ao atualizar evento.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
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
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Evento não encontrado.' },
        { status: 404 }
      );
    }

    await prisma.event.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Evento excluído com sucesso.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: 'Falha ao excluir evento.' },
      { status: 500 }
    );
  }
}
