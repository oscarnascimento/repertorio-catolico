'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Music,
  PlusCircle,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  Search,
  Youtube,
  Radio,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  ListMusic,
  RefreshCw,
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  FileText,
  X,
  CheckCircle2,
  LogOut,
  Edit,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  ArrowUpDown,
  Filter,
  MessageSquare,
  MessageSquarePlus,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { cleanYoutubeUrl, formatDateTime } from '@/lib/utils';

interface Song {
  id: string;
  title: string;
  artist: string | null;
  youtube: string | null;
  createdAt: string;
}

interface EventSongItem {
  id: string;
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

interface ParsedImportRow {
  title: string;
  artist: string;
  youtube: string;
  isValid: boolean;
  isDuplicate?: boolean;
}

type TabType = 'events' | 'create' | 'catalog';

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('events');
  const [songs, setSongs] = useState<Song[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingSongs, setLoadingSongs] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Erro ao sair:', err);
    } finally {
      router.push('/admin/login');
      router.refresh();
    }
  };

  // New Song Form State
  const [newTitle, setNewTitle] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [newYoutube, setNewYoutube] = useState('');
  const [creatingSong, setCreatingSong] = useState(false);
  const [songFeedback, setSongFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Event Form State
  const [eventTitle, setEventTitle] = useState('');
  const [eventNotes, setEventNotes] = useState('');
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [eventFilterSearch, setEventFilterSearch] = useState('');
  const [createdEventModal, setCreatedEventModal] = useState<{ id: string; title: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Events Listing Search & Filter State
  const [eventListSearch, setEventListSearch] = useState('');

  // Event Editing Modal State
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSongsList, setEditSongsList] = useState<
    Array<{
      id?: string;
      songId: string;
      selected: boolean;
      order: number;
      notes?: string | null;
      song: Song;
    }>
  >([]);
  const [editCatalogSearch, setEditCatalogSearch] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editFeedback, setEditFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeCommentSongId, setActiveCommentSongId] = useState<string | null>(null);

  // Event Deletion Confirmation State
  const [eventToDelete, setEventToDelete] = useState<EventItem | null>(null);
  const [deletingEvent, setDeletingEvent] = useState(false);

  // Catalog search state
  const [catalogSearch, setCatalogSearch] = useState('');

  // Spreadsheet Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTab, setImportTab] = useState<'file' | 'paste'>('file');
  const [pastedText, setPastedText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skippedDuplicates: number;
    invalid: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch initial data
  const fetchSongs = async () => {
    try {
      setLoadingSongs(true);
      const res = await fetch('/api/songs');
      if (res.ok) {
        const data = await res.json();
        setSongs(data);
      }
    } catch (err) {
      console.error('Erro ao buscar músicas:', err);
    } finally {
      setLoadingSongs(false);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoadingEvents(true);
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error('Erro ao buscar eventos:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    fetchSongs();
    fetchEvents();
  }, []);

  // Open Edit Modal for an Event
  const handleOpenEdit = (event: EventItem) => {
    setEditingEvent(event);
    setEditTitle(event.title);
    setEditNotes(event.notes || '');
    const sorted = [...(event.songs || [])].sort((a, b) => a.order - b.order);
    setEditSongsList(sorted);
    setEditCatalogSearch('');
    setEditFeedback(null);
    setActiveCommentSongId(null);
  };

  // Close Edit Modal
  const handleCloseEdit = () => {
    setEditingEvent(null);
    setEditFeedback(null);
    setActiveCommentSongId(null);
  };

  // Add a song from catalog to the event currently being edited
  const handleAddSongToEditEvent = (song: Song) => {
    if (editSongsList.some((item) => item.songId === song.id)) {
      return;
    }
    const newItem = {
      songId: song.id,
      selected: false,
      order: editSongsList.length,
      notes: null,
      song,
    };
    setEditSongsList((prev) => [...prev, newItem]);
  };

  // Remove song from currently edited event
  const handleRemoveSongFromEditEvent = (songId: string) => {
    setEditSongsList((prev) => {
      const filtered = prev.filter((item) => item.songId !== songId);
      return filtered.map((item, idx) => ({ ...item, order: idx }));
    });
  };

  // Reorder songs inside editor (Move Up)
  const handleMoveSongUpInEdit = (index: number) => {
    if (index <= 0) return;
    setEditSongsList((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
      return updated.map((item, idx) => ({ ...item, order: idx }));
    });
  };

  // Reorder songs inside editor (Move Down)
  const handleMoveSongDownInEdit = (index: number) => {
    if (index >= editSongsList.length - 1) return;
    setEditSongsList((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
      return updated.map((item, idx) => ({ ...item, order: idx }));
    });
  };

  // Toggle selection inside editor
  const handleToggleSelectInEdit = (index: number) => {
    setEditSongsList((prev) => {
      return prev.map((item, idx) => {
        if (idx === index) {
          return { ...item, selected: !item.selected };
        }
        return item;
      });
    });
  };

  // Update song comment inside editor
  const handleSongNoteChangeInEdit = (songId: string, newNote: string) => {
    setEditSongsList((prev) => {
      return prev.map((item) => {
        if (item.songId === songId) {
          return { ...item, notes: newNote.trim() || null };
        }
        return item;
      });
    });
  };

  // Save changes to the edited event
  const handleSaveEditEvent = async () => {
    if (!editingEvent) return;
    if (!editTitle.trim()) {
      setEditFeedback({ type: 'error', message: 'Por favor, informe o título da celebração.' });
      return;
    }

    setSavingEdit(true);
    setEditFeedback(null);

    try {
      const payload = {
        title: editTitle.trim(),
        notes: editNotes.trim() || null,
        songs: editSongsList.map((item, index) => ({
          songId: item.songId,
          selected: item.selected,
          order: index,
          notes: item.notes || null,
        })),
      };

      const res = await fetch(`/api/events/${editingEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao salvar alterações do evento.');
      }

      const updated = await res.json();

      // Update state
      setEvents((prev) => prev.map((evt) => (evt.id === updated.id ? updated : evt)));
      setEditFeedback({ type: 'success', message: 'Evento atualizado com sucesso!' });

      setTimeout(() => {
        handleCloseEdit();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar evento';
      setEditFeedback({ type: 'error', message: msg });
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete an Event
  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;

    setDeletingEvent(true);
    try {
      const res = await fetch(`/api/events/${eventToDelete.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao excluir evento');
      }

      setEvents((prev) => prev.filter((evt) => evt.id !== eventToDelete.id));
      setEventToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir evento';
      alert(msg);
    } finally {
      setDeletingEvent(false);
    }
  };

  // Handle Add Single Song
  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setSongFeedback({ type: 'error', message: 'Por favor, informe o título da música.' });
      return;
    }

    setCreatingSong(true);
    setSongFeedback(null);

    try {
      const res = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          artist: newArtist.trim() || null,
          youtube: cleanYoutubeUrl(newYoutube),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao cadastrar música');
      }

      const created = await res.json();
      setSongs((prev) => [created, ...prev]);
      setNewTitle('');
      setNewArtist('');
      setNewYoutube('');
      setSongFeedback({ type: 'success', message: `"${created.title}" cadastrada com sucesso!` });

      setTimeout(() => {
        setSongFeedback(null);
      }, 4000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao cadastrar música';
      setSongFeedback({ type: 'error', message: errorMessage });
    } finally {
      setCreatingSong(false);
    }
  };

  // Helper to normalize column names
  const normalizeKey = (key: string) => {
    return key
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  // Parse generic raw object data from XLSX or CSV
  const processRawData = (rawArray: Array<Record<string, unknown>>) => {
    const existingTitles = new Set(songs.map((s) => s.title.toLowerCase().trim()));

    const rows: ParsedImportRow[] = rawArray.map((row) => {
      let title = '';
      let artist = '';
      let youtube = '';

      for (const [k, v] of Object.entries(row)) {
        const norm = normalizeKey(k);
        const strVal = v ? String(v).trim() : '';

        if (norm.includes('titulo') || norm.includes('title') || norm.includes('musica') || norm.includes('nome')) {
          title = strVal;
        } else if (norm.includes('compositor') || norm.includes('artista') || norm.includes('artist') || norm.includes('autor')) {
          artist = strVal;
        } else if (norm.includes('url') || norm.includes('youtube') || norm.includes('link') || norm.includes('video')) {
          youtube = strVal;
        }
      }

      const isValid = Boolean(title && title.trim());
      const isDuplicate = isValid && existingTitles.has(title.toLowerCase().trim());

      return {
        title,
        artist,
        youtube,
        isValid,
        isDuplicate,
      };
    });

    setParsedRows(rows.filter((r) => r.title || r.artist || r.youtube));
    setImportResult(null);
  };

  // Handle File Upload (.xlsx, .xls, .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const binaryStr = evt.target?.result;
        const workbook = XLSX.read(binaryStr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

        processRawData(json);
      } catch (err) {
        console.error('Erro ao ler arquivo de planilha:', err);
        alert('Não foi possível ler a planilha. Verifique se o arquivo é um CSV ou Excel válido.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Handle Pasted Text (from Google Sheets / Excel copy-paste)
  const handleParsePastedText = () => {
    if (!pastedText.trim()) return;

    const lines = pastedText.trim().split(/\r?\n/);
    if (lines.length === 0) return;

    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';

    const headerParts = firstLine.split(delimiter).map((h) => h.trim());
    const hasHeader = headerParts.some((h) => {
      const norm = normalizeKey(h);
      return norm.includes('titulo') || norm.includes('compositor') || norm.includes('url');
    });

    const dataLines = hasHeader ? lines.slice(1) : lines;
    const headers = hasHeader
      ? headerParts
      : ['titulo', 'compositor', 'url'];

    const rawArray: Array<Record<string, unknown>> = dataLines.map((line) => {
      const cols = line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
      const obj: Record<string, unknown> = {};
      headers.forEach((h, idx) => {
        obj[h] = cols[idx] || '';
      });
      return obj;
    });

    processRawData(rawArray);
  };

  // Download Sample CSV
  const handleDownloadSample = () => {
    const csvContent =
      'titulo;compositor;url\n' +
      'Diante do Rei;Celina Borges;https://www.youtube.com/watch?v=sample1\n' +
      'Tão Sublime Sacramento;Tradicional Litúrgico;https://www.youtube.com/watch?v=sample2\n' +
      'Eis-me Aqui Senhor;Comunidade Católica Shalom;https://www.youtube.com/watch?v=sample3\n';

    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modelo_repertorio_musicas.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Execute Batch Import API
  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert('Nenhuma música válida para importar.');
      return;
    }

    setImporting(true);
    try {
      const payload = validRows.map((r) => ({
        title: r.title,
        artist: r.artist || null,
        youtube: r.youtube || null,
      }));

      const res = await fetch('/api/songs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs: payload }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao importar músicas');
      }

      const result = await res.json();
      setImportResult({
        imported: result.importedCount,
        skippedDuplicates: result.skippedDuplicates,
        invalid: result.invalidCount,
      });

      await fetchSongs();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao importar planilha';
      alert(errorMessage);
    } finally {
      setImporting(false);
    }
  };

  // Handle Song Selection for Event Creation
  const toggleSelectSong = (songId: string) => {
    setSelectedSongIds((prev) =>
      prev.includes(songId) ? prev.filter((id) => id !== songId) : [...prev, songId]
    );
  };

  const selectAllFilteredSongs = () => {
    const ids = filteredSongsForEvent.map((s) => s.id);
    const allSelected = ids.every((id) => selectedSongIds.includes(id));
    if (allSelected) {
      setSelectedSongIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedSongIds((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  // Handle Create Event
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) {
      alert('Por favor, informe o título da celebração/evento.');
      return;
    }

    setCreatingEvent(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: eventTitle.trim(),
          songIds: selectedSongIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao criar evento');
      }

      const newEvent = await res.json();
      setEvents((prev) => [newEvent, ...prev]);
      setCreatedEventModal({ id: newEvent.id, title: newEvent.title });
      setEventTitle('');
      setEventNotes('');
      setSelectedSongIds([]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar evento';
      alert(errorMessage);
    } finally {
      setCreatingEvent(false);
    }
  };

  const copyEventLink = (eventId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/evento/${eventId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(eventId);
    setTimeout(() => {
      setCopiedId(null);
    }, 3000);
  };

  // Filter songs for event selection
  const filteredSongsForEvent = useMemo(() => {
    const search = eventFilterSearch.toLowerCase().trim();
    if (!search) return songs;
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(search) ||
        (s.artist && s.artist.toLowerCase().includes(search))
    );
  }, [songs, eventFilterSearch]);

  // Filter songs for catalog list
  const filteredCatalogSongs = useMemo(() => {
    const search = catalogSearch.toLowerCase().trim();
    if (!search) return songs;
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(search) ||
        (s.artist && s.artist.toLowerCase().includes(search))
    );
  }, [songs, catalogSearch]);

  // Filter events in the main list
  const filteredEventsList = useMemo(() => {
    const search = eventListSearch.toLowerCase().trim();
    if (!search) return events;
    return events.filter(
      (evt) =>
        evt.title.toLowerCase().includes(search) ||
        (evt.notes && evt.notes.toLowerCase().includes(search)) ||
        evt.songs.some(
          (s) =>
            s.song.title.toLowerCase().includes(search) ||
            (s.song.artist && s.song.artist.toLowerCase().includes(search)) ||
            (s.notes && s.notes.toLowerCase().includes(search))
        )
    );
  }, [events, eventListSearch]);

  // Filter catalog songs for the edit modal
  const filteredSongsForEditCatalog = useMemo(() => {
    const search = editCatalogSearch.toLowerCase().trim();
    if (!search) return songs;
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(search) ||
        (s.artist && s.artist.toLowerCase().includes(search))
    );
  }, [songs, editCatalogSearch]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-slate-100">
      {/* Top Navigation */}
      <header className="border-b border-slate-700/60 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950">
              <Sparkles className="w-6 h-6 fill-slate-950" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Repertório Católico
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-medium">
                  Painel Admin
                </span>
              </h1>
              <p className="text-xs text-slate-400">Ministério de Música & Adoração</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setParsedRows([]);
                setImportResult(null);
                setPastedText('');
                setIsImportModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">Importar Planilha</span>
            </button>

            <button
              onClick={() => {
                fetchSongs();
                fetchEvents();
              }}
              title="Atualizar dados"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              title="Sair do painel"
              className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Quick Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            onClick={() => setActiveTab('catalog')}
            className={`cursor-pointer transition-all duration-200 border rounded-2xl p-5 flex items-center justify-between backdrop-blur-sm shadow-card ${
              activeTab === 'catalog'
                ? 'bg-blue-950/40 border-blue-500/50 ring-2 ring-blue-500/20'
                : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800/90'
            }`}
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Músicas no Acervo</p>
              <p className="text-3xl font-extrabold text-white mt-1">{songs.length}</p>
              <p className="text-[11px] text-blue-400 mt-1 flex items-center gap-1">
                <span>Ver acervo completo</span>
                <ArrowRight className="w-3 h-3" />
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Music className="w-6 h-6" />
            </div>
          </div>

          <div
            onClick={() => setActiveTab('events')}
            className={`cursor-pointer transition-all duration-200 border rounded-2xl p-5 flex items-center justify-between backdrop-blur-sm shadow-card ${
              activeTab === 'events'
                ? 'bg-amber-950/40 border-amber-500/50 ring-2 ring-amber-500/20'
                : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800/90'
            }`}
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Eventos / Celebrações</p>
              <p className="text-3xl font-extrabold text-white mt-1">{events.length}</p>
              <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                <span>Gerenciar eventos</span>
                <ArrowRight className="w-3 h-3" />
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Calendar className="w-6 h-6" />
            </div>
          </div>

          <div
            onClick={() => setActiveTab('create')}
            className={`cursor-pointer transition-all duration-200 border rounded-2xl p-5 flex items-center justify-between backdrop-blur-sm shadow-card ${
              activeTab === 'create'
                ? 'bg-emerald-950/40 border-emerald-500/50 ring-2 ring-emerald-500/20'
                : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800/90'
            }`}
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Novo Evento</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <p className="text-sm font-semibold text-emerald-400">Criar Celebração</p>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Gere link para o Diácono</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <PlusCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Tab Navigation Header */}
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('events')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
                activeTab === 'events'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/80'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Eventos & Celebrações</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${
                  activeTab === 'events' ? 'bg-slate-950 text-amber-400 font-extrabold' : 'bg-slate-900 text-slate-400'
                }`}
              >
                {events.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
                activeTab === 'create'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/80'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Criar Novo Evento</span>
            </button>

            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
                activeTab === 'catalog'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/80'
              }`}
            >
              <ListMusic className="w-4 h-4" />
              <span>Acervo de Músicas</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${
                  activeTab === 'catalog' ? 'bg-white text-blue-700 font-extrabold' : 'bg-slate-900 text-slate-400'
                }`}
              >
                {songs.length}
              </span>
            </button>
          </div>

          {activeTab === 'events' && (
            <button
              onClick={() => setActiveTab('create')}
              className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Novo Evento</span>
            </button>
          )}
        </div>

        {/* TAB 1: LISTAGEM E GERENCIAMENTO DE EVENTOS */}
        {activeTab === 'events' && (
          <section className="space-y-6">
            {/* Search and filter bar for events */}
            <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-4 shadow-card backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por título, observação ou música..."
                  value={eventListSearch}
                  onChange={(e) => setEventListSearch(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                />
                {eventListSearch && (
                  <button
                    onClick={() => setEventListSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400 w-full sm:w-auto justify-between sm:justify-end">
                <span>
                  Exibindo <strong className="text-white">{filteredEventsList.length}</strong> de{' '}
                  <strong className="text-white">{events.length}</strong> celebrações
                </span>
                <button
                  onClick={fetchEvents}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  title="Atualizar lista"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {loadingEvents ? (
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-16 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
                <p className="text-sm text-slate-400 font-medium">Carregando lista de eventos...</p>
              </div>
            ) : filteredEventsList.length === 0 ? (
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-16 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                  <Calendar className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Nenhum evento encontrado</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    {eventListSearch
                      ? `Não encontramos nenhum evento com o termo "${eventListSearch}".`
                      : 'Nenhuma celebração ou evento cadastrado até o momento.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEventListSearch('');
                    setActiveTab('create');
                  }}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition inline-flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Criar Primeira Celebração</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredEventsList.map((event) => {
                  const selectedCount = event.songs?.filter((s) => s.selected).length || 0;
                  const totalSongs = event.songs?.length || 0;
                  const percent = totalSongs > 0 ? Math.round((selectedCount / totalSongs) * 100) : 0;
                  const hasNotes = Boolean(event.notes && event.notes.trim());

                  return (
                    <div
                      key={event.id}
                      className="bg-slate-800/80 border border-slate-700/80 hover:border-slate-600/90 rounded-2xl p-5 shadow-card backdrop-blur-md flex flex-col justify-between space-y-4 transition group"
                    >
                      <div>
                        {/* Header & Badges */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="space-y-1">
                            <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition line-clamp-1">
                              {event.title}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              <span>{formatDateTime(event.createdAt)}</span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                                selectedCount === totalSongs && totalSongs > 0
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                                  : selectedCount > 0
                                  ? 'bg-blue-950/80 text-blue-300 border-blue-500/40'
                                  : 'bg-slate-900 text-slate-400 border-slate-700'
                              }`}
                            >
                              {selectedCount}/{totalSongs} marcadas
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {percent}% concluído
                            </span>
                          </div>
                        </div>

                        {/* Event General Notes Preview if present */}
                        {hasNotes && (
                          <div className="mb-3 bg-amber-950/30 border border-amber-500/30 rounded-xl p-2.5 text-xs text-amber-200/90 flex items-start gap-2">
                            <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <p className="line-clamp-2 leading-relaxed text-[11px] italic">
                              &quot;{event.notes}&quot;
                            </p>
                          </div>
                        )}

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-900/80 h-1.5 rounded-full overflow-hidden mb-3.5 border border-slate-800">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              percent === 100
                                ? 'bg-emerald-500'
                                : percent > 0
                                ? 'bg-blue-500'
                                : 'bg-slate-700'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        {/* Songs Preview List */}
                        <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 max-h-40 overflow-y-auto">
                          {event.songs.length === 0 ? (
                            <p className="text-xs text-slate-500 italic py-2 text-center">
                              Nenhuma música vinculada a este evento. Clique em &quot;Editar&quot; para adicionar.
                            </p>
                          ) : (
                            event.songs.map((es, idx) => {
                              const hasSongComment = Boolean(es.notes && es.notes.trim());
                              return (
                                <div
                                  key={es.id || idx}
                                  className={`flex items-center justify-between gap-2 p-1.5 rounded-lg text-xs transition ${
                                    es.selected
                                      ? 'bg-emerald-950/30 text-emerald-200 font-medium border border-emerald-500/20'
                                      : 'text-slate-300 hover:bg-slate-800/60'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <span
                                      className={`w-4 h-4 rounded text-[10px] flex items-center justify-center shrink-0 font-bold ${
                                        es.selected
                                          ? 'bg-emerald-500 text-slate-950'
                                          : 'bg-slate-800 text-slate-400'
                                      }`}
                                    >
                                      {es.selected ? <Check className="w-3 h-3 stroke-[3]" /> : idx + 1}
                                    </span>
                                    <span className="truncate">{es.song?.title || 'Música'}</span>
                                    {es.song?.artist && (
                                      <span className="text-slate-500 text-[10px] truncate hidden sm:inline">
                                        ({es.song.artist})
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {hasSongComment && (
                                      <span
                                        className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40 flex items-center gap-1"
                                        title={`Comentário: "${es.notes}"`}
                                      >
                                        <MessageSquare className="w-2.5 h-2.5 text-amber-400" />
                                        <span className="hidden sm:inline">Nota</span>
                                      </span>
                                    )}

                                    {es.song?.youtube && (
                                      <span className="text-[10px] text-red-400 bg-red-950/40 px-1.5 py-0.5 rounded border border-red-800/30 shrink-0 flex items-center gap-1">
                                        <Youtube className="w-2.5 h-2.5" />
                                        Vídeo
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-3 border-t border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {/* 1. Edit Button */}
                        <button
                          onClick={() => handleOpenEdit(event)}
                          className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                          title="Alterar músicas, observações e título deste evento"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>

                        {/* 2. Copy Link Button */}
                        <button
                          onClick={() => copyEventLink(event.id)}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                          title="Copiar link da celebração para enviar ao Diácono"
                        >
                          {copiedId === event.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400 font-bold">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar Link</span>
                            </>
                          )}
                        </button>

                        {/* 3. Open Public View */}
                        <Link
                          href={`/evento/${event.id}`}
                          target="_blank"
                          className="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-blue-200 border border-blue-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                          title="Abrir página do Diácono em nova aba"
                        >
                          <span>Diácono</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>

                        {/* 4. Delete Button */}
                        <button
                          onClick={() => setEventToDelete(event)}
                          className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                          title="Excluir este evento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: CRIAR NOVO EVENTO */}
        {activeTab === 'create' && (
          <section className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-6 shadow-card backdrop-blur-md max-w-4xl mx-auto">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-700/60 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Criar Nova Celebração / Evento</h2>
                <p className="text-xs text-slate-400">
                  Defina o título e selecione as músicas sugeridas para o Diácono escolher e ordenar
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Título da Celebração <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Adoração Santíssimo - Quinta-feira 20h"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Músicas Sugeridas ({selectedSongIds.length} selecionada{selectedSongIds.length === 1 ? '' : 's'})
                  </label>
                  {filteredSongsForEvent.length > 0 && (
                    <button
                      type="button"
                      onClick={selectAllFilteredSongs}
                      className="text-xs text-amber-400 hover:text-amber-300 font-medium transition"
                    >
                      {filteredSongsForEvent.every((s) => selectedSongIds.includes(s.id))
                        ? 'Desmarcar visíveis'
                        : 'Selecionar visíveis'}
                    </button>
                  )}
                </div>

                {/* Search inside event picker */}
                <div className="relative mb-3">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrar músicas do acervo..."
                    value={eventFilterSearch}
                    onChange={(e) => setEventFilterSearch(e.target.value)}
                    className="w-full bg-slate-900/60 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                {/* Scrollable song checklist */}
                <div className="max-h-80 overflow-y-auto space-y-2 pr-1 border border-slate-700/60 rounded-xl p-2.5 bg-slate-900/40">
                  {loadingSongs ? (
                    <div className="py-8 text-center text-xs text-slate-400">Carregando acervo...</div>
                  ) : songs.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Nenhuma música cadastrada no acervo ainda. Cadastre no Acervo ou importe uma planilha!
                    </div>
                  ) : filteredSongsForEvent.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      Nenhuma música encontrada para &quot;{eventFilterSearch}&quot;.
                    </div>
                  ) : (
                    filteredSongsForEvent.map((song) => {
                      const isChecked = selectedSongIds.includes(song.id);
                      return (
                        <div
                          key={song.id}
                          onClick={() => toggleSelectSong(song.id)}
                          className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition border text-sm ${
                            isChecked
                              ? 'bg-amber-500/15 border-amber-500/50 text-white font-medium'
                              : 'bg-slate-800/40 border-slate-700/40 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center space-x-3 overflow-hidden">
                            <div
                              className={`w-5 h-5 rounded flex items-center justify-center border transition ${
                                isChecked
                                  ? 'bg-amber-500 border-amber-500 text-slate-950 font-bold'
                                  : 'border-slate-600 bg-slate-900/80'
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <div className="truncate">
                              <span className="text-xs sm:text-sm">{song.title}</span>
                              {song.artist && (
                                <span className="text-xs text-slate-400 ml-2">({song.artist})</span>
                              )}
                            </div>
                          </div>
                          {song.youtube && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-800/40 flex items-center gap-1 shrink-0 ml-2">
                              <Youtube className="w-3 h-3 text-red-400" />
                              Vídeo
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('events')}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Ver Lista de Eventos
                </button>
                <button
                  type="submit"
                  disabled={creatingEvent || !eventTitle.trim()}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3 px-6 rounded-xl shadow-lg shadow-amber-500/20 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                >
                  {creatingEvent ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Gerando Evento...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-5 h-5" />
                      <span>Criar Evento e Gerar Link</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* TAB 3: ACERVO DE MÚSICAS (CADASTRO E LISTA) */}
        {activeTab === 'catalog' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Add Song Form */}
            <div className="lg:col-span-5 space-y-6">
              <section className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-6 shadow-card backdrop-blur-md">
                <div className="flex items-center justify-between pb-4 border-b border-slate-700/60 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                      <Music className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Cadastrar Música</h2>
                      <p className="text-xs text-slate-400">Adicione ao acervo geral</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setParsedRows([]);
                      setImportResult(null);
                      setPastedText('');
                      setIsImportModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Importar Planilha</span>
                  </button>
                </div>

                {songFeedback && (
                  <div
                    className={`p-3 rounded-xl mb-4 text-xs font-medium border flex items-center justify-between ${
                      songFeedback.type === 'success'
                        ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                        : 'bg-red-950/60 border-red-500/50 text-red-200'
                    }`}
                  >
                    <span>{songFeedback.message}</span>
                    <button onClick={() => setSongFeedback(null)} className="text-xs opacity-70 hover:opacity-100">
                      ✕
                    </button>
                  </div>
                )}

                <form onSubmit={handleAddSong} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Título da Canção <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Diante do Rei, Tão Sublime Sacramento"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Compositor / Artista <span className="text-slate-500 font-normal">(Opcional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Celina Borges, Walmir Alencar"
                      value={newArtist}
                      onChange={(e) => setNewArtist(e.target.value)}
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Link / URL (YouTube) <span className="text-slate-500 font-normal">(Opcional)</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://youtube.com/watch?v=..."
                      value={newYoutube}
                      onChange={(e) => setNewYoutube(e.target.value)}
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={creatingSong || !newTitle.trim()}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-white border border-blue-500/30 font-semibold py-2.5 px-4 rounded-xl transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs"
                  >
                    {creatingSong ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Cadastrando...
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-4 h-4" />
                        Cadastrar no Acervo
                      </>
                    )}
                  </button>
                </form>
              </section>
            </div>

            {/* Right: Catalog List */}
            <div className="lg:col-span-7 space-y-6">
              <section className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-6 shadow-card backdrop-blur-md">
                <div className="flex items-center justify-between pb-4 border-b border-slate-700/60 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                      <ListMusic className="w-4 h-4" />
                    </div>
                    <h2 className="text-base font-bold text-white">Acervo Cadastrado</h2>
                  </div>
                  <span className="text-xs bg-slate-900 px-2.5 py-1 rounded-full text-slate-400 border border-slate-700">
                    {filteredCatalogSongs.length} músicas
                  </span>
                </div>

                {/* Search in catalog */}
                <div className="relative mb-3">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Pesquisar por título ou compositor..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="w-full bg-slate-900/60 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>

                <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
                  {loadingSongs ? (
                    <div className="py-12 text-center text-xs text-slate-400">Carregando acervo...</div>
                  ) : filteredCatalogSongs.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      Nenhuma música encontrada. Use o botão &quot;Importar Planilha&quot; para adicionar em lote!
                    </div>
                  ) : (
                    filteredCatalogSongs.map((song) => (
                      <div
                        key={song.id}
                        className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="truncate">
                          <p className="font-semibold text-white truncate">{song.title}</p>
                          <p className="text-slate-400 text-[11px] truncate">
                            {song.artist || 'Compositor não especificado'}
                          </p>
                        </div>

                        {song.youtube && (
                          <a
                            href={song.youtube}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-md bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 flex items-center gap-1.5 transition shrink-0"
                            title="Ouvir no YouTube"
                          >
                            <Youtube className="w-3.5 h-3.5 text-red-400" />
                            <span className="text-[10px] font-medium">Ouvir</span>
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: EDITAR EVENTO & ALTERAR MÚSICAS */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl space-y-5 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Editar Celebração / Evento</h3>
                  <p className="text-xs text-slate-400">
                    Altere o título, observações gerais, adicione, remova ou reordene as músicas
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseEdit}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Feedback Alert */}
            {editFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium border flex items-center justify-between ${
                  editFeedback.type === 'success'
                    ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
                    : 'bg-red-950/80 border-red-500/60 text-red-200'
                }`}
              >
                <span>{editFeedback.message}</span>
                <button onClick={() => setEditFeedback(null)} className="opacity-70 hover:opacity-100">
                  ✕
                </button>
              </div>
            )}

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Event Title & General Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Título da Celebração <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                    placeholder="Nome do evento"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Observações Gerais da Celebração
                  </label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Orientações e avisos para a equipe..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition resize-none"
                  />
                </div>
              </div>

              {/* Grid 2 Columns: Songs in Event vs Catalog Search */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2">
                {/* Column 1: Current Event Songs */}
                <div className="md:col-span-7 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <span>Músicas no Evento</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px]">
                        {editSongsList.length} total
                      </span>
                    </h4>
                    <span className="text-[11px] text-slate-400">Use as setas para reordenar</span>
                  </div>

                  <div className="max-h-80 overflow-y-auto space-y-2.5 border border-slate-800 rounded-xl p-2.5 bg-slate-950/60">
                    {editSongsList.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        Nenhuma música adicionada ao evento. Selecione músicas do catálogo ao lado!
                      </div>
                    ) : (
                      editSongsList.map((item, index) => {
                        const isCommentOpen = activeCommentSongId === item.songId;
                        const hasNote = Boolean(item.notes && item.notes.trim());

                        return (
                          <div
                            key={item.songId}
                            className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 space-y-2 text-xs transition"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 overflow-hidden">
                                {/* Order Badge */}
                                <span className="w-5 h-5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {index + 1}
                                </span>

                                {/* Song Info */}
                                <div className="truncate">
                                  <p className="font-semibold text-white truncate">{item.song?.title || 'Música'}</p>
                                  {item.song?.artist && (
                                    <p className="text-[10px] text-slate-400 truncate">{item.song.artist}</p>
                                  )}
                                </div>
                              </div>

                              {/* Action Buttons for this item */}
                              <div className="flex items-center gap-1 shrink-0">
                                {/* Toggle Comment Box */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActiveCommentSongId((prev) => (prev === item.songId ? null : item.songId))
                                  }
                                  className={`p-1.5 rounded-md border text-[10px] transition ${
                                    hasNote
                                      ? 'bg-amber-950 text-amber-300 border-amber-500/50'
                                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                                  }`}
                                  title={hasNote ? `Comentário: "${item.notes}"` : 'Adicionar comentário para esta música'}
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </button>

                                {/* Toggle selection status */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleSelectInEdit(index)}
                                  className={`p-1.5 rounded-md border text-[10px] transition ${
                                    item.selected
                                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40 font-bold'
                                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                                  }`}
                                  title={item.selected ? 'Marcada como escolhida' : 'Marcar como escolhida'}
                                >
                                  <Check className="w-3 h-3" />
                                </button>

                                {/* Move Up */}
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => handleMoveSongUpInEdit(index)}
                                  className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 transition"
                                  title="Subir posição"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>

                                {/* Move Down */}
                                <button
                                  type="button"
                                  disabled={index === editSongsList.length - 1}
                                  onClick={() => handleMoveSongDownInEdit(index)}
                                  className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 transition"
                                  title="Descer posição"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>

                                {/* Remove from event */}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSongFromEditEvent(item.songId)}
                                  className="p-1.5 rounded-md bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 transition"
                                  title="Remover deste evento"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Collapsible/Active Comment Textarea */}
                            {(isCommentOpen || hasNote) && (
                              <div className="pt-1.5 border-t border-slate-800/80">
                                <div className="flex items-center gap-1.5 text-[10px] text-amber-400 mb-1">
                                  <MessageSquare className="w-3 h-3" />
                                  <span>Comentário Litúrgico / Instrução da Música:</span>
                                </div>
                                <input
                                  type="text"
                                  value={item.notes || ''}
                                  onChange={(e) => handleSongNoteChangeInEdit(item.songId, e.target.value)}
                                  placeholder="Ex: Entrar suave no violão, repetir refrão 2x..."
                                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-400"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Column 2: Add Songs from Catalog */}
                <div className="md:col-span-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Adicionar do Acervo
                    </h4>
                  </div>

                  {/* Search in catalog */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Pesquisar acervo..."
                      value={editCatalogSearch}
                      onChange={(e) => setEditCatalogSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-1.5 border border-slate-800 rounded-xl p-2 bg-slate-950/60">
                    {filteredSongsForEditCatalog.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500">Nenhuma música encontrada.</div>
                    ) : (
                      filteredSongsForEditCatalog.map((song) => {
                        const isAlreadyInEvent = editSongsList.some((item) => item.songId === song.id);
                        return (
                          <div
                            key={song.id}
                            className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 transition ${
                              isAlreadyInEvent
                                ? 'bg-amber-950/20 border-amber-500/30 text-amber-200/80'
                                : 'bg-slate-900/70 border-slate-800 text-slate-200 hover:border-slate-700'
                            }`}
                          >
                            <div className="truncate">
                              <p className="font-semibold truncate text-[11px]">{song.title}</p>
                              {song.artist && (
                                <p className="text-[10px] text-slate-400 truncate">{song.artist}</p>
                              )}
                            </div>

                            {isAlreadyInEvent ? (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium shrink-0 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Adicionada
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddSongToEditEvent(song)}
                                className="px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 shrink-0 transition active:scale-95"
                              >
                                <Plus className="w-3 h-3 stroke-[3]" />
                                <span>Adicionar</span>
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleCloseEdit}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={savingEdit || !editTitle.trim()}
                onClick={handleSaveEditEvent}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                {savingEdit ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Salvando Alterações...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Salvar Alterações do Evento</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO DE EVENTO */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Excluir Celebração?</h3>
                <p className="text-xs text-slate-400">Esta ação não poderá ser desfeita.</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300">
              Você tem certeza que deseja excluir o evento <strong className="text-white">&quot;{eventToDelete.title}&quot;</strong>?
              O link público correspondente deixará de funcionar.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deletingEvent}
                onClick={() => setEventToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={deletingEvent}
                onClick={handleDeleteEvent}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
              >
                {deletingEvent ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sim, Excluir Evento</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMPORTADOR DE PLANILHA (Excel / CSV / Copiar-Colar) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-blue-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Importador de Músicas em Lote</h3>
                  <p className="text-xs text-slate-400">
                    Colunas aceitas: <span className="text-blue-300 font-mono">titulo</span>,{' '}
                    <span className="text-blue-300 font-mono">compositor</span> e{' '}
                    <span className="text-blue-300 font-mono">url</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Tabs */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setImportTab('file')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      importTab === 'file'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload de Arquivo (.xlsx / .csv)
                  </button>

                  <button
                    onClick={() => setImportTab('paste')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      importTab === 'paste'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Copiar e Colar Tabela
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Modelo CSV</span>
                </button>
              </div>

              {/* Tab 1: File Upload */}
              {importTab === 'file' && (
                <div className="space-y-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-blue-500/60 rounded-2xl p-8 text-center cursor-pointer bg-slate-950/50 hover:bg-slate-950 transition group"
                  >
                    <Upload className="w-10 h-10 text-slate-500 group-hover:text-blue-400 mx-auto mb-3 transition" />
                    <p className="text-sm font-bold text-white">Clique para selecionar sua planilha</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Suporta arquivos do Excel (<span className="text-slate-300">.xlsx, .xls</span>) e{' '}
                      <span className="text-slate-300">.csv</span>
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Paste from Clipboard */}
              {importTab === 'paste' && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-300">
                    Cole as linhas copiadas do Google Sheets ou Excel:
                  </label>
                  <textarea
                    rows={6}
                    placeholder={`titulo\tcompositor\turl\nDiante do Rei\tCelina Borges\thttps://youtube.com/...\nTão Sublime Sacramento\tLitúrgico\thttps://youtube.com/...`}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3 font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleParsePastedText}
                    disabled={!pastedText.trim()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-blue-300 font-semibold text-xs rounded-xl border border-blue-500/30 transition disabled:opacity-40"
                  >
                    Processar Texto Colado
                  </button>
                </div>
              )}

              {/* Result Summary */}
              {importResult && (
                <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 space-y-1 text-xs">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Importação Concluída com Sucesso!</span>
                  </div>
                  <p>
                    • <strong className="text-white">{importResult.imported}</strong> novas músicas adicionadas ao
                    acervo.
                  </p>
                  {importResult.skippedDuplicates > 0 && (
                    <p className="text-amber-300">
                      • {importResult.skippedDuplicates} músicas ignoradas pois já existiam no acervo (duplicadas).
                    </p>
                  )}
                  {importResult.invalid > 0 && (
                    <p className="text-slate-400">
                      • {importResult.invalid} linhas sem título foram desconsideradas.
                    </p>
                  )}
                </div>
              )}

              {/* Preview Table */}
              {parsedRows.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <span>Pré-visualização</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px]">
                        {parsedRows.filter((r) => r.isValid).length} válidas de {parsedRows.length} linhas
                      </span>
                    </h4>
                    <span className="text-[11px] text-slate-400">Mostrando primeiras 10 músicas</span>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-hidden max-h-52 overflow-y-auto bg-slate-950/60 text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold">
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Título</th>
                          <th className="p-2.5">Compositor</th>
                          <th className="p-2.5">Link / URL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {parsedRows.slice(0, 10).map((row, idx) => (
                          <tr
                            key={idx}
                            className={
                              !row.isValid
                                ? 'bg-red-950/20 text-red-300'
                                : row.isDuplicate
                                ? 'bg-amber-950/20 text-amber-200'
                                : 'text-slate-300'
                            }
                          >
                            <td className="p-2.5 whitespace-nowrap">
                              {!row.isValid ? (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-red-900/60 text-red-200">
                                  Sem título
                                </span>
                              ) : row.isDuplicate ? (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-900/60 text-amber-200">
                                  Já existe
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-200">
                                  Nova
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 font-medium text-white max-w-[160px] truncate">
                              {row.title || '-'}
                            </td>
                            <td className="p-2.5 text-slate-400 max-w-[120px] truncate">
                              {row.artist || '-'}
                            </td>
                            <td className="p-2.5 font-mono text-[10px] text-slate-400 max-w-[150px] truncate">
                              {row.youtube || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                {importResult ? 'Fechar' : 'Cancelar'}
              </button>

              {parsedRows.filter((r) => r.isValid).length > 0 && !importResult && (
                <button
                  type="button"
                  disabled={importing}
                  onClick={handleExecuteImport}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition active:scale-95 flex items-center gap-2 disabled:opacity-50"
                >
                  {importing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Salvando no banco...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>
                        Confirmar Importação de {parsedRows.filter((r) => r.isValid).length} Músicas
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL / ALERT NA CRIAÇÃO DE EVENTO */}
      {createdEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Evento Criado com Sucesso!</h3>
                <p className="text-xs text-slate-400">{createdEventModal.title}</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <p className="text-xs text-slate-400">
                Envie este link direto para o Diácono e a equipe de louvor:
              </p>
              <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-700">
                <span className="text-xs text-amber-300 font-mono truncate flex-1 select-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}/evento/${createdEventModal.id}` : `/evento/${createdEventModal.id}`}
                </span>
                <button
                  onClick={() => copyEventLink(createdEventModal.id)}
                  className="px-3 py-1.5 rounded-md bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1 hover:bg-amber-400 active:scale-95 transition"
                >
                  {copiedId === createdEventModal.id ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copiar
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setCreatedEventModal(null);
                  setActiveTab('events');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Ir para Lista de Eventos
              </button>
              <Link
                href={`/evento/${createdEventModal.id}`}
                target="_blank"
                onClick={() => setCreatedEventModal(null)}
                className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl flex items-center gap-1.5 transition shadow-lg shadow-amber-500/20"
              >
                <span>Visualizar como Diácono</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
