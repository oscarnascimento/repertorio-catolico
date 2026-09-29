'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Plus,
  Save,
  Search,
  Trash2,
} from 'lucide-react';

interface Song {
  id: string;
  title: string;
  artist: string | null;
  youtube: string | null;
  createdAt: string;
}

interface EventSongItem {
  id?: string;
  songId: string;
  selected: boolean;
  order: number;
  notes?: string | null;
  song: Song;
}

interface EventItem {
  id: string;
  title: string;
  notes?: string | null;
  createdAt: string;
  songs: EventSongItem[];
}

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventId = params?.id;

  const [event, setEvent] = useState<EventItem | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [songsList, setSongsList] = useState<EventSongItem[]>([]);
  const [catalog, setCatalog] = useState<Song[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!eventId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [eventRes, songsRes] = await Promise.all([
          fetch(`/api/events/${eventId}`),
          fetch('/api/songs'),
        ]);

        if (!eventRes.ok) {
          throw new Error('Evento não encontrado.');
        }

        const eventData = await eventRes.json();
        const songsData = songsRes.ok ? await songsRes.json() : [];

        setEvent(eventData);
        setTitle(eventData.title || '');
        setNotes(eventData.notes || '');
        setSongsList((eventData.songs || []).map((item: EventSongItem) => ({ ...item, song: item.song || songsData.find((song: Song) => song.id === item.songId) })));
        setCatalog(songsData);
      } catch (err) {
        console.error(err);
        setFeedback({ type: 'error', message: 'Não foi possível carregar o evento.' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  const filteredCatalog = useMemo(() => {
    const query = catalogSearch.trim().toLowerCase();
    if (!query) return catalog;
    return catalog.filter((song) => {
      const haystack = `${song.title} ${song.artist || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [catalog, catalogSearch]);

  const handleAddAllSongs = () => {
    setSongsList((prev) => {
      const existingIds = new Set(prev.map((item) => item.songId));
      const additions: EventSongItem[] = [];

      catalog.forEach((song) => {
        if (!existingIds.has(song.id)) {
          additions.push({
            songId: song.id,
            selected: false,
            order: prev.length + additions.length,
            notes: null,
            song,
          });
        }
      });

      return [...prev, ...additions].map((item, index) => ({ ...item, order: index }));
    });
  };

  const handleClearAllSongs = () => {
    setSongsList([]);
  };

  const handleAddSong = (song: Song) => {
    if (songsList.some((item) => item.songId === song.id)) {
      return;
    }

    setSongsList((prev) => [
      ...prev,
      {
        songId: song.id,
        selected: false,
        order: prev.length,
        notes: null,
        song,
      },
    ]);
  };

  const handleRemoveSong = (songId: string) => {
    setSongsList((prev) => prev.filter((item) => item.songId !== songId).map((item, index) => ({ ...item, order: index })));
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setSongsList((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
      return updated.map((item, idx) => ({ ...item, order: idx }));
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= songsList.length - 1) return;
    setSongsList((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
      return updated.map((item, idx) => ({ ...item, order: idx }));
    });
  };

  const handleToggleSelected = (index: number) => {
    setSongsList((prev) => prev.map((item, idx) => (idx === index ? { ...item, selected: !item.selected } : item)));
  };

  const handleNoteChange = (songId: string, value: string) => {
    setSongsList((prev) => prev.map((item) => (item.songId === songId ? { ...item, notes: value.trim() || null } : item)));
  };

  const handleSave = async () => {
    if (!eventId) return;

    if (!title.trim()) {
      setFeedback({ type: 'error', message: 'Título da celebração obrigatório.' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          notes: notes.trim() || null,
          songs: songsList.map((item, index) => ({
            songId: item.songId,
            selected: item.selected,
            order: index,
            notes: item.notes || null,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao salvar evento.');
      }

      setFeedback({ type: 'success', message: 'Evento atualizado com sucesso!' });
      setEvent(data);
      setTimeout(() => router.push('/admin'), 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar evento.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  if (!eventId) {
    return <div className="p-6 text-red-500">Evento inválido.</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-300">Carregando celebração...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white transition">
              <ArrowLeft className="w-4 h-4" />
              Voltar ao painel
            </Link>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar evento'}
          </button>
        </div>

        {feedback && (
          <div className={`mb-6 rounded-xl border px-3 py-2 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
              : 'border-red-500/40 bg-red-500/10 text-red-200'
          }`}>
            {feedback.message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl">
            <div className="mb-5">
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Título da celebração
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white outline-none ring-0 placeholder:text-slate-500 focus:border-amber-400"
                placeholder="Ex: Adoração 12/10"
              />
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Observações gerais
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-400"
                placeholder="Orientações para a equipe..."
              />
            </div>

            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-300">
                Músicas do evento
              </h2>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {catalog.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleAddAllSongs}
                      className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-200 hover:bg-emerald-500/20"
                    >
                      Adicionar todas
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllSongs}
                      className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[10px] font-bold text-rose-200 hover:bg-rose-500/20"
                    >
                      Limpar tudo
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="mb-3 flex items-center justify-end">
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-200">
                {songsList.length} itens
              </span>
            </div>

            <div className="space-y-3">
              {songsList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-8 text-center text-sm text-slate-400">
                  Nenhuma música neste evento ainda. Adicione do acervo à direita.
                </div>
              ) : (
                songsList.map((item, index) => (
                  <div
                    key={`${item.songId}-${index}`}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-200">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{item.song?.title || 'Música'}</p>
                          {item.song?.artist && <p className="text-xs text-slate-400">{item.song.artist}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleSelected(index)}
                          className={`rounded-lg border px-2 py-1.5 text-[10px] font-bold ${
                            item.selected
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                              : 'border-slate-700 bg-slate-900 text-slate-300'
                          }`}
                          title={item.selected ? 'Selecionada' : 'Não selecionada'}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-slate-300 disabled:opacity-30"
                          title="Mover para cima"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === songsList.length - 1}
                          className="rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-slate-300 disabled:opacity-30"
                          title="Mover para baixo"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSong(item.songId)}
                          className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-1.5 text-rose-300"
                          title="Remover da lista"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                        Comentário da música
                      </label>
                      <input
                        value={item.notes || ''}
                        onChange={(e) => handleNoteChange(item.songId, e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none placeholder:text-slate-500 focus:border-amber-400"
                        placeholder="Ex: Entrar suave no violão, repetir refrão 2x..."
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <aside className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-300">Adicionar do acervo</h2>
            </div>

            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Pesquisar música..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-400"
              />
            </label>

            <div className="mt-4 max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {filteredCatalog.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-xs text-slate-400">
                  Nenhuma música encontrada.
                </div>
              ) : (
                filteredCatalog.map((song) => {
                  const alreadyAdded = songsList.some((item) => item.songId === song.id);
                  return (
                    <div
                      key={song.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/80 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{song.title}</p>
                          {song.artist && <p className="text-xs text-slate-400">{song.artist}</p>}
                        </div>
                        <button
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => handleAddSong(song)}
                          className={`rounded-lg border px-2 py-1.5 text-[10px] font-bold ${
                            alreadyAdded
                              ? 'cursor-not-allowed border-slate-700 bg-slate-800 text-slate-500'
                              : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                          }`}
                        >
                          {alreadyAdded ? 'Adicionada' : 'Adicionar'}
                        </button>
                      </div>

                      {song.youtube && (
                        <a
                          href={song.youtube}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-[10px] text-red-300"
                        >
                          <MessageSquare className="h-3 w-3" />
                          Ver vídeo
                        </a>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
