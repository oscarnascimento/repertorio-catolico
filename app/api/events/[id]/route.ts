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
    const { title, notes, songIds, songs, addSongIds, removeSongIds } = body;

    let updatedTitle = existingEvent.title;
    if (typeof title === 'string' && title.trim()) {
      updatedTitle = title.trim();
    }

    let updatedNotes = existingEvent.notes;
    if (notes !== undefined) {
      updatedNotes = typeof notes === 'string' ? notes.trim() || null : null;
    }

    let newSongsData: Array<{ songId: string; selected: boolean; order: number; notes?: string | null }> | null = null;

    if (Array.isArray(songs)) {
      newSongsData = songs.map((s, index) => ({
        songId: s.songId,
        selected: Boolean(s.selected),
        order: typeof s.order === 'number' ? s.order : index,
        notes: s.notes ? String(s.notes).trim() || null : null,
      }));
    } else if (Array.isArray(songIds)) {
      const existingMap = new Map<string, { selected: boolean; notes: string | null }>();
      existingEvent.songs.forEach((es) => {
        existingMap.set(es.songId, { selected: es.selected, notes: es.notes });
      });

      newSongsData = songIds.map((sId: string, index: number) => {
        const prev = existingMap.get(sId);
        return {
          songId: sId,
          selected: prev?.selected ?? false,
          notes: prev?.notes ?? null,
          order: index,
        };
      });
    } else if (Array.isArray(addSongIds) || Array.isArray(removeSongIds)) {
      const currentSongs = [...existingEvent.songs].sort((a, b) => a.order - b.order);
      const nextSongs = currentSongs.map((song) => ({
        songId: song.songId,
        selected: song.selected,
        order: song.order,
        notes: song.notes,
      }));

      if (Array.isArray(removeSongIds)) {
        const removeSet = new Set(removeSongIds.filter((value): value is string => typeof value === 'string'));
        for (const item of nextSongs) {
          if (removeSet.has(item.songId)) {
            item.songId = '';
          }
        }
      }

      if (Array.isArray(addSongIds)) {
        for (const songId of addSongIds) {
          if (typeof songId !== 'string' || nextSongs.some((item) => item.songId === songId)) {
            continue;
          }
          nextSongs.push({
            songId,
            selected: false,
            order: nextSongs.length,
            notes: null,
          });
        }
      }

      newSongsData = nextSongs
        .filter((item) => item.songId)
        .map((item, index) => ({
          songId: item.songId,
          selected: item.selected,
          order: index,
          notes: item.notes ?? null,
        }));
    }

    // Atomic database transaction to update title, notes and songs
    await prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id },
        data: {
          title: updatedTitle,
          notes: updatedNotes,
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
              notes: item.notes ?? null,
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
