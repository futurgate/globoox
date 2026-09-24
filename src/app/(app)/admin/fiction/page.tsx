'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldAlert, Play, Download, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/ui/PageHeader';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  fetchBooks,
  startFictionTranslation,
  getFictionProgress,
  downloadTranslatedEpub,
  type ApiBook,
  type FictionProgressEvent,
} from '@/lib/api';

const inputCls =
  'w-full rounded-[var(--radius)] border border-[var(--separator-opaque)] bg-[var(--app-surface-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--app-accent)]';

// v1 fiction pipeline supports EN/FR targets (Russian source).
const FICTION_LANGS = ['EN', 'FR'] as const;
type FictionLang = (typeof FICTION_LANGS)[number];

export default function AdminFictionPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading, isAuthenticated } = useAuth();

  const [books, setBooks] = useState<ApiBook[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [bookId, setBookId] = useState('');
  const [lang, setLang] = useState<FictionLang>('EN');

  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // Load book list once admin is confirmed.
  useEffect(() => {
    if (!isAdmin) return;
    setBooksLoading(true);
    fetchBooks()
      .then((list) => {
        setBooks(list);
        if (list.length && !bookId) setBookId(list[0].id);
      })
      .catch(() => setError('Failed to load books'))
      .finally(() => setBooksLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Prefill progress when book/lang changes (so a previously-finished book
  // shows as complete and the download button is enabled).
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  const loadProgress = useCallback(async () => {
    if (!bookId) return;
    try {
      const p = await getFictionProgress(bookId, lang);
      setTotal(p.totalChapters);
      setDone(p.counts.done);
      setComplete(p.state === 'complete');
      setCurrent(null);
    } catch {
      // No progress yet — reset.
      setTotal(0);
      setDone(0);
      setComplete(false);
    }
  }, [bookId, lang]);

  useEffect(() => {
    if (!isAdmin || !bookId) return;
    setErrors([]);
    setError(null);
    void loadProgress();
  }, [isAdmin, bookId, lang, loadProgress]);

  const handleTranslate = useCallback(async () => {
    if (!bookId || running) return;
    setRunning(true);
    setError(null);
    setErrors([]);
    setComplete(false);
    setDone(0);
    setCurrent(null);

    const controller = new AbortController();
    abortRef.current = controller;

    const onEvent = (ev: FictionProgressEvent) => {
      switch (ev.type) {
        case 'book_start':
          setTotal(ev.totalChapters ?? 0);
          break;
        case 'chapter_start':
          setCurrent(ev.title || `Chapter ${(ev.index ?? 0) + 1}`);
          break;
        case 'chapter_done':
          if (typeof ev.done === 'number') setDone(ev.done);
          if (typeof ev.totalChapters === 'number') setTotal(ev.totalChapters);
          break;
        case 'chapter_error':
          setErrors((e) => [...e, `Chapter ${(ev.index ?? 0) + 1}: ${ev.error ?? 'error'}`]);
          break;
        case 'book_done':
          if (typeof ev.done === 'number') setDone(ev.done);
          setCurrent(null);
          break;
      }
    };

    try {
      await startFictionTranslation(bookId, lang, onEvent, controller.signal);
      await loadProgress();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Translation failed');
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [bookId, lang, running, loadProgress]);

  const handleDownload = useCallback(async () => {
    if (!bookId) return;
    setDownloading(true);
    setError(null);
    try {
      await downloadTranslatedEpub(bookId, lang);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  }, [bookId, lang]);

  useEffect(() => () => abortRef.current?.abort(), []);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--app-text-muted)]" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center">
        <ShieldAlert className="w-10 h-10 text-[var(--app-text-muted)]" />
        <p className="text-lg font-medium">Admins only</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/settings')}>
          Back to settings
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24">
      <PageHeader title="Fiction Translation" />

      <p className="mb-5 text-sm text-[var(--app-text-muted)]">
        Run the full-book fiction pipeline on a whole book, watch progress, and download the
        translated EPUB. Targets EN/FR (Russian source). Block structure and images are preserved.
      </p>

      <div className="space-y-4 rounded-[var(--radius)] border border-[var(--separator-opaque)] p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
              Book
            </label>
            <select
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              disabled={booksLoading || running}
              className={inputCls}
            >
              {books.length === 0 && <option value="">No books available</option>}
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                  {b.author ? ` — ${b.author}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
              Target language
            </label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as FictionLang)}
              disabled={running}
              className={inputCls}
            >
              {FICTION_LANGS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleTranslate} disabled={!bookId || running}>
            {running ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Translating…
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" /> Translate book
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={!complete || downloading || running}
            title={complete ? 'Download translated EPUB' : 'Available once translation is complete'}
          >
            {downloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing…
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" /> Download EPUB
              </>
            )}
          </Button>
        </div>

        {/* Progress */}
        {(running || total > 0) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--app-text-muted)]">
                {complete ? (
                  <span className="inline-flex items-center gap-1 text-[var(--app-accent)]">
                    <BookOpen className="h-4 w-4" /> Complete
                  </span>
                ) : running ? (
                  current ? `Translating: ${current}` : 'Working…'
                ) : (
                  'Progress'
                )}
              </span>
              <span className="tabular-nums text-[var(--app-text-muted)]">
                {done}/{total} · {percent}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--separator-opaque)]">
              <div
                className="h-full rounded-full bg-[var(--app-accent)] transition-[width] duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}

        {errors.length > 0 && (
          <div className="rounded-[var(--radius)] border border-[var(--separator-opaque)] p-3 text-xs text-[var(--app-text-muted)]">
            <p className="mb-1 font-medium">Chapters with issues ({errors.length}):</p>
            <ul className="list-disc space-y-0.5 pl-4">
              {errors.slice(0, 10).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
