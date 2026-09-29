import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      orderBy: {
        createdAt: 'desc',
      },
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

    return NextResponse.json(events, { status: 200 });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar eventos.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, songIds } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'O título do evento é obrigatório.' },
        { status: 400 }
      );
    }

    const selectedSongIds: string[] = Array.isArray(songIds) ? songIds : [];

    // Create Event and initial EventSong records
    const newEvent = await prisma.event.create({
      data: {
        title: title.trim(),
        songs: {
          create: selectedSongIds.map((songId, index) => ({
            songId,
            order: index,
            selected: false,
          })),
        },
      },
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

    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Falha ao criar evento.' },
      { status: 500 }
    );
  }
}
