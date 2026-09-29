import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const songs = await prisma.song.findMany({
      orderBy: {
        title: 'asc',
      },
    });

    return NextResponse.json(songs, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching songs:', error);
    return NextResponse.json(
      {
        error: 'Falha ao buscar acervo de músicas.',
        details: error?.message || String(error),
        code: error?.code,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, artist, youtube } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'O título da música é obrigatório.' },
        { status: 400 }
      );
    }

    const newSong = await prisma.song.create({
      data: {
        title: title.trim(),
        artist: artist && typeof artist === 'string' && artist.trim() ? artist.trim() : null,
        youtube: youtube && typeof youtube === 'string' && youtube.trim() ? youtube.trim() : null,
      },
    });

    return NextResponse.json(newSong, { status: 201 });
  } catch (error) {
    console.error('Error creating song:', error);
    return NextResponse.json(
      { error: 'Falha ao cadastrar música.' },
      { status: 500 }
    );
  }
}
