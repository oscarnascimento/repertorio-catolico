'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import {
  ChevronUp,
  ChevronDown,
  Check,
  Youtube,
  Sparkles,
  AlertCircle,
  Music2,
  Share2,
  MessageSquare,
  MessageSquarePlus,
  X,
  FileText,
  Clock,
  Trash2,
} from 'lucide-react';

interface Song {
  id: string;
  title: string;
  artist: string | null;
  youtube: string | null;
}

interface EventSongItem {
  id: string;
  eventId: string;
  songId: string;
  selected: boolean;
  order: number;
  notes?: string | null;
  song: Song;
}

interface EventData {
  id: string;
  title: string;
  notes?: string | null;
  createdAt: string;
  songs: EventSongItem[];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EventMobilePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const [event, setEvent] = useState<EventData | null>(null);
  const [songsList, setSongsList] = useState<EventSongItem[]>([]);
  const [generalNotes, setGeneralNotes] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [activeFilter, setActiveFilter] = useState<'all' | 'selected'>('all');
  const [copiedShare, setCopiedShare] = useState(false);

  // Song comment modal state
  const [commentModalSong, setCommentModalSong] = useState<EventSongItem | null>(null);
  const [currentSongComment, setCurrentSongComment] = useState<string>('');
  const [songCommentSyncStatus, setSongCommentSyncStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Debounce timer refs
  const generalNotesTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const songNotesTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch Event data
  const fetchEventData = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await fetch(`/api/events/${eventId}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Evento não encontrado. Verifique o link.');
        }
        throw new Error('Falha ao carregar informações da celebração.');
      }
      const data: EventData = await res.json();
      setEvent(data);
      setGeneralNotes(data.notes || '');
      // Sort by order ascending
      const sorted = [...(data.songs || [])].sort((a, b) => a.order - b.order);
      setSongsList(sorted);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar dados';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchEventData();
    }
  }, [eventId]);

  // Synchronize state with backend (songs array and optional general notes)
  const triggerAutoSave = async (
    updatedList: EventSongItem[],
    previousList: EventSongItem[],
    notesToSave?: string
  ) => {
    setSyncStatus('saving');

    try {
      const payload = {
        notes: notesToSave !== undefined ? notesToSave : generalNotes,
        songs: updatedList.map((item, index) => ({
          id: item.id,
          songId: item.songId,
          selected: item.selected,
          order: index,
          notes: item.notes || null,
        })),
      };

      const res = await fetch(`/api/events/${eventId}/songs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Falha ao salvar alterações no banco');
      }

      setSyncStatus('saved');
      setTimeout(() => {
        setSyncStatus('idle');
      }, 2500);
    } catch (err) {
      console.error('Falha de sincronização:', err);
      setSyncStatus('error');
      // Rollback to previous state on failure
      setSongsList(previousList);
    }
  };

  // Handle General Notes Change with Auto-Save Debounce
  const handleGeneralNotesChange = (newVal: string) => {
    setGeneralNotes(newVal);
    setSyncStatus('saving');

    if (generalNotesTimeoutRef.current) {
      clearTimeout(generalNotesTimeoutRef.current);
    }

    generalNotesTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/songs`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: newVal }),
        });

        if (!res.ok) {
          throw new Error('Falha ao salvar observação');
        }

        setSyncStatus('saved');
        setTimeout(() => {
          setSyncStatus('idle');
        }, 2500);
      } catch (err) {
        console.error('Erro ao salvar observação geral:', err);
        setSyncStatus('error');
      }
    }, 800);
  };

  // Toggle Song Selection (Optimistic Update)
  const handleToggleSelect = (index: number) => {
    const previous = [...songsList];
    const updated = songsList.map((item, idx) => {
      if (idx === index) {
        return { ...item, selected: !item.selected };
      }
      return item;
    });

    setSongsList(updated);
    triggerAutoSave(updated, previous);
  };

  // Move Song Up in Order (Optimistic Update)
  const handleMoveUp = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (index <= 0) return;

    const previous = [...songsList];
    const updated = [...songsList];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;

    const reordered = updated.map((item, idx) => ({ ...item, order: idx }));
    setSongsList(reordered);
    triggerAutoSave(reordered, previous);
  };

  // Move Song Down in Order (Optimistic Update)
  const handleMoveDown = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (index >= songsList.length - 1) return;

    const previous = [...songsList];
    const updated = [...songsList];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;

    const reordered = updated.map((item, idx) => ({ ...item, order: idx }));
    setSongsList(reordered);
    triggerAutoSave(reordered, previous);
  };

  // Open Song Comment Popup
  const handleOpenSongComment = (e: React.MouseEvent, item: EventSongItem) => {
    e.stopPropagation();
    setCommentModalSong(item);
    setCurrentSongComment(item.notes || '');
    setSongCommentSyncStatus('idle');
  };

  // Close Song Comment Popup
  const handleCloseSongComment = () => {
    setCommentModalSong(null);
    setSongCommentSyncStatus('idle');
  };

  // Update Song Comment with Auto-Save Debounce
  const handleSongCommentChange = (newVal: string) => {
    setCurrentSongComment(newVal);
    setSongCommentSyncStatus('saving');

    if (!commentModalSong) return;

    const songId = commentModalSong.songId;

    // Optimistically update songsList
    const updatedList = songsList.map((s) => {
      if (s.songId === songId) {
        return { ...s, notes: newVal.trim() || null };
      }
      return s;
    });
    setSongsList(updatedList);

    if (songNotesTimeoutRef.current) {
      clearTimeout(songNotesTimeoutRef.current);
    }

    songNotesTimeoutRef.current = setTimeout(async () => {
      try {
        const itemToUpdate = updatedList.find((s) => s.songId === songId);
        if (!itemToUpdate) return;

        const res = await fetch(`/api/events/${eventId}/songs`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            songs: [
              {
                id: itemToUpdate.id,
                songId: itemToUpdate.songId,
                selected: itemToUpdate.selected,
                order: itemToUpdate.order,
                notes: newVal.trim() || null,
              },
            ],
          }),
        });

        if (!res.ok) {
          throw new Error('Falha ao salvar comentário da música');
        }

        setSongCommentSyncStatus('saved');
        setTimeout(() => {
          setSongCommentSyncStatus('idle');
        }, 2000);
      } catch (err) {
        console.error('Erro ao sincronizar comentário da música:', err);
        setSongCommentSyncStatus('idle');
      }
    }, 600);
  };

  // Clear Song Comment
  const handleClearSongComment = () => {
    handleSongCommentChange('');
  };

  const handleShareLink = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 3000);
    }
  };

  // Stats
  const selectedCount = songsList.filter((s) => s.selected).length;
  const totalCount = songsList.length;

  // Filtered view
  const displayedSongs = activeFilter === 'selected'
    ? songsList.filter((s) => s.selected)
    : songsList;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-700 flex items-center justify-center text-white shadow-xl shadow-blue-700/20 mb-4 animate-pulse-subtle">
          <Sparkles className="w-8 h-8 text-amber-300" />
        </div>
        <p className="text-sm font-semibold text-slate-700">Carregando celebração...</p>
        <p className="text-xs text-slate-400 mt-1">Sincronizando com o repertório</p>
      </div>
    );
  }

  if (errorMessage || !event) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Celebração não encontrada</h2>
        <p className="text-sm text-slate-600 mb-6">{errorMessage || 'O link pode estar incorreto ou o evento foi removido.'}</p>
        <Link
          href="/admin"
          className="px-5 py-2.5 bg-blue-700 text-white rounded-xl text-sm font-semibold shadow hover:bg-blue-800 transition"
        >
          Ir para Painel de Administração
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 font-sans">
      {/* Mobile Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-blue-700 text-amber-300 flex items-center justify-center shrink-0 shadow-md">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="truncate">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight truncate">
                  {event.title}
                </h1>
                <p className="text-[11px] text-slate-500 font-medium">
                  {selectedCount} de {totalCount} música{totalCount === 1 ? '' : 's'} escolhida{selectedCount === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            {/* Sync & Share Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleShareLink}
                title="Compartilhar Link"
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-95 border border-slate-200"
              >
                {copiedShare ? (
                  <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Sync Status Banner */}
          <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
            <div className="flex items-center gap-1.5">
              {syncStatus === 'saving' && (
                <span className="flex items-center gap-1 text-amber-600 font-medium animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  Salvando automaticamente...
                </span>
              )}
              {syncStatus === 'saved' && (
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  Salvo no banco
                </span>
              )}
              {syncStatus === 'error' && (
                <span className="flex items-center gap-1 text-red-600 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Erro ao salvar. Revertendo.
                </span>
              )}
              {syncStatus === 'idle' && (
                <span className="text-slate-400 font-normal">
                  Toque para marcar e use as setas para ordenar
                </span>
              )}
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition ${
                  activeFilter === 'all'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Todas ({totalCount})
              </button>
              <button
                onClick={() => setActiveFilter('selected')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition ${
                  activeFilter === 'selected'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Marcadas ({selectedCount})
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto px-4 pt-3.5 space-y-3.5">
        {/* CAIXA DE OBSERVAÇÃO GERAL DA CELEBRAÇÃO (ACIMA DA SELEÇÃO DE MÚSICAS) */}
        <section className="bg-white rounded-2xl border border-amber-200/90 shadow-sm p-3.5 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800">
              <FileText className="w-4 h-4 text-amber-600" />
              <label htmlFor="general-notes" className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Observações Gerais da Celebração
              </label>
            </div>
            {syncStatus === 'saving' && (
              <span className="text-[10px] text-amber-600 font-medium animate-pulse">
                Salvando...
              </span>
            )}
            {syncStatus === 'saved' && (
              <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
                <Check className="w-3 h-3" /> Salvo
              </span>
            )}
          </div>

          <textarea
            id="general-notes"
            rows={2}
            value={generalNotes}
            onChange={(e) => handleGeneralNotesChange(e.target.value)}
            placeholder="Digite orientações gerais para o ministério de música (ex: momento de silêncio após a homilia, oração pelos enfermos, avisos)..."
            className="w-full bg-amber-50/40 border border-amber-200/70 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition resize-y min-h-[64px]"
          />
          <p className="text-[10px] text-slate-400">
            * Salvo automaticamente. Visível para toda a equipe e ministério de música.
          </p>
        </section>

        {/* SONG LIST CONTAINER */}
        {songsList.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm mt-2">
            <Music2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Nenhuma música sugerida</p>
            <p className="text-xs text-slate-400 mt-1">
              O administrador ainda não adicionou músicas a esta celebração.
            </p>
          </div>
        ) : displayedSongs.length === 0 && activeFilter === 'selected' ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm mt-2">
            <Check className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Nenhuma música marcada ainda</p>
            <p className="text-xs text-slate-400 mt-1">
              Mude para a aba &quot;Todas&quot; e marque as canções desejadas.
            </p>
          </div>
        ) : (
          displayedSongs.map((item) => {
            const trueIndex = songsList.findIndex((s) => s.id === item.id);
            const isFirst = trueIndex === 0;
            const isLast = trueIndex === songsList.length - 1;
            const hasComment = Boolean(item.notes && item.notes.trim());

            return (
              <div
                key={item.id}
                onClick={() => handleToggleSelect(trueIndex)}
                className={`group relative rounded-2xl border-2 p-3.5 transition-all duration-150 cursor-pointer shadow-sm select-none active:scale-[0.99] space-y-2.5 ${
                  item.selected
                    ? 'bg-blue-50/90 border-blue-600 shadow-blue-500/10 ring-1 ring-blue-500/30'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Sequence Position & Checkbox */}
                  <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        item.selected
                          ? 'bg-blue-700 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      #{trueIndex + 1}
                    </span>

                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center border-2 transition-all ${
                        item.selected
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-slate-50 border-slate-300 text-transparent group-hover:border-slate-400'
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  </div>

                  {/* Song Information */}
                  <div className="flex-1 min-w-0 pr-1">
                    <h2
                      className={`text-sm font-bold leading-snug line-clamp-2 transition ${
                        item.selected ? 'text-blue-950' : 'text-slate-800'
                      }`}
                    >
                      {item.song.title}
                    </h2>

                    {item.song.artist && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {item.song.artist}
                      </p>
                    )}

                    {/* Action Bar (YouTube + Comment Button) */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {/* YouTube Button */}
                      {item.song.youtube && (
                        <a
                          href={item.song.youtube}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/80 text-[11px] font-semibold transition active:scale-95 shadow-2xs"
                        >
                          <Youtube className="w-3.5 h-3.5 text-red-600" />
                          <span>Vídeo</span>
                        </a>
                      )}

                      {/* Comment Trigger Button */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenSongComment(e, item)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition active:scale-95 shadow-2xs ${
                          hasComment
                            ? 'bg-amber-100 hover:bg-amber-200/90 text-amber-900 border-amber-300 ring-1 ring-amber-400/30'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                        title={hasComment ? 'Ver/editar comentário desta música' : 'Adicionar comentário a esta música'}
                      >
                        {hasComment ? (
                          <>
                            <MessageSquare className="w-3.5 h-3.5 text-amber-700 fill-amber-500/20" />
                            <span>Comentário</span>
                          </>
                        ) : (
                          <>
                            <MessageSquarePlus className="w-3.5 h-3.5 text-slate-500" />
                            <span>+ Comentário</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Reordering Controls (Up / Down) */}
                  <div
                    className="flex flex-col gap-1 shrink-0 pl-1 border-l border-slate-200/80"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={(e) => handleMoveUp(e, trueIndex)}
                      title="Mover para cima"
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 flex items-center justify-center transition active:scale-90 disabled:opacity-30 disabled:pointer-events-none border border-slate-200"
                    >
                      <ChevronUp className="w-5 h-5 stroke-[2.5]" />
                    </button>

                    <button
                      type="button"
                      disabled={isLast}
                      onClick={(e) => handleMoveDown(e, trueIndex)}
                      title="Mover para baixo"
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 flex items-center justify-center transition active:scale-90 disabled:opacity-30 disabled:pointer-events-none border border-slate-200"
                    >
                      <ChevronDown className="w-5 h-5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* Inline Comment Preview (if available) */}
                {hasComment && (
                  <div
                    onClick={(e) => handleOpenSongComment(e, item)}
                    className="mt-1 bg-amber-50/80 border border-amber-200/70 rounded-xl p-2 text-xs text-amber-950 flex items-start gap-1.5 cursor-pointer hover:bg-amber-100/70 transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="line-clamp-2 italic text-[11px] leading-relaxed flex-1">
                      &quot;{item.notes}&quot;
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      {/* POPUP / MODAL: COMENTÁRIO POR MÚSICA */}
      {commentModalSong && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl sm:rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                    Comentário da Música
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-1">
                    {commentModalSong.song.title}
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseSongComment}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="song-comment-input" className="font-semibold text-slate-700">
                  Instruções ou Observações para os músicos:
                </label>
                {songCommentSyncStatus === 'saving' && (
                  <span className="text-[10px] text-amber-600 font-medium animate-pulse">
                    Salvando...
                  </span>
                )}
                {songCommentSyncStatus === 'saved' && (
                  <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
                    <Check className="w-3 h-3" /> Salvo
                  </span>
                )}
              </div>

              <textarea
                id="song-comment-input"
                rows={4}
                autoFocus
                value={currentSongComment}
                onChange={(e) => handleSongCommentChange(e.target.value)}
                placeholder="Ex: Entrar suave no violão, repetir refrão 2x no final, Tom: Sol Maior..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
              />

              <p className="text-[10px] text-slate-400">
                * O comentário é salvo automaticamente enquanto você digita e fica visível para todos.
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              {currentSongComment ? (
                <button
                  type="button"
                  onClick={handleClearSongComment}
                  className="px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={handleCloseSongComment}
                className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Concluído</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sticky Floating Helper */}
      <footer className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-slate-200 py-2.5 px-4 z-20">
        <div className="max-w-md mx-auto flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <span>{selectedCount} selecionada{selectedCount === 1 ? '' : 's'}</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-blue-700 hover:underline font-semibold flex items-center gap-1"
            >
              <span>Painel Geral</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
