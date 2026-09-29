import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cleanYoutubeUrl } from '@/lib/utils';

interface ImportSongRow {
  title?: string;
  titulo?: string;
  name?: string;
  artist?: string | null;
  compositor?: string | null;
  composer?: string | null;
  autor?: string | null;
  youtube?: string | null;
  url?: string | null;
  link?: string | null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rows: ImportSongRow[] = Array.isArray(body)
      ? body
      : Array.isArray(body?.songs)
      ? body.songs
      : [];

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum registro de música enviado para importação.' },
        { status: 400 }
      );
    }

    // Sanitize and filter valid rows
    const validSongsToInsert: { title: string; artist: string | null; youtube: string | null }[] = [];
    let invalidCount = 0;

    for (const row of rows) {
      const rawTitle = row.title || row.titulo || row.name;
      const rawArtist = row.compositor || row.artist || row.composer || row.autor;
      const rawUrl = row.url || row.youtube || row.link;

      if (!rawTitle || typeof rawTitle !== 'string' || !rawTitle.trim()) {
        invalidCount++;
        continue;
      }

      validSongsToInsert.push({
        title: rawTitle.trim(),
        artist: rawArtist && typeof rawArtist === 'string' && rawArtist.trim() ? rawArtist.trim() : null,
        youtube: rawUrl && typeof rawUrl === 'string' ? cleanYoutubeUrl(rawUrl) : null,
      });
    }

    if (validSongsToInsert.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma linha da planilha continha título válido preenchido.' },
        { status: 400 }
      );
    }

    // Fetch existing song titles to avoid identical duplicates (case-insensitive check)
    const existingSongs = await prisma.song.findMany({
      select: { title: true },
    });
    const existingTitlesSet = new Set(existingSongs.map((s: { title: string }) => s.title.toLowerCase().trim()));

    const newSongsToCreate = [];
    let skippedDuplicates = 0;

    for (const song of validSongsToInsert) {
      if (existingTitlesSet.has(song.title.toLowerCase())) {
        skippedDuplicates++;
      } else {
        // Add to avoid duplicate in the same spreadsheet batch
        existingTitlesSet.add(song.title.toLowerCase());
        newSongsToCreate.push(song);
      }
    }

    if (newSongsToCreate.length > 0) {
      await prisma.song.createMany({
        data: newSongsToCreate,
      });
    }

    // Fetch updated song list
    const allSongs = await prisma.song.findMany({
      orderBy: { title: 'asc' },
    });

    return NextResponse.json(
      {
        message: `${newSongsToCreate.length} músicas importadas com sucesso.`,
        importedCount: newSongsToCreate.length,
        skippedDuplicates,
        invalidCount,
        totalSongs: allSongs.length,
        songs: allSongs,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro na importação de músicas:', error);
    return NextResponse.json(
      { error: 'Falha ao processar e salvar planilha no banco de dados.' },
      { status: 500 }
    );
  }
}
