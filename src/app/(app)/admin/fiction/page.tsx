'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldAlert, Play, Download, BookOpen, RefreshCw, ScrollText, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/ui/PageHeader';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  fetchBooks,
  startFictionTranslation,
  getFictionProgress,
  listFictionTranslations,
  downloadTranslatedEpub,
  startGlossaryGeneration,
  getGlossary,
  type ApiBook,
  type FictionProgressEvent,
  type FictionHistoryEntry,
  type GlossaryProgressEvent,
  type BookGlossary,
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
  const [useGlossaryForTranslate, setUseGlossaryForTranslate] = useState(false);
  const [overwriteTranslation, setOverwriteTranslation] = useState(false);

  // History (one entry per book+language), persists across tab reloads.
  const [history, setHistory] = useState<FictionHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  // Glossary generation (separate from translation; not wired into the pipeline).
  const [glossaryRunning, setGlossaryRunning] = useState(false);
  const [glossaryDone, setGlossaryDone] = useState(0);
  const [glossaryTotal, setGlossaryTotal] = useState(0);
  const [glossaryState, setGlossaryState] = useState<string>('idle');
  const [glossaryError, setGlossaryError] = useState<string | null>(null);
  const [glossary, setGlossary] = useState<BookGlossary | null>(null);
  const [glossaryOpen, setGlossaryOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const glossaryAbortRef = useRef<AbortController | null>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      setHistory(await listFictionTranslations());
    } catch {
      // non-fatal — history is best-effort
    } finally {
      setHistoryLoading(false);
    }
  }, []);

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
    void loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Prefill progress when book/lang changes (so a previously-finished book
  // shows as complete and the download button is enabled).
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  // A glossary is usable for translation once it carries terms or named entities.
  const glossaryReady =
    !!glossary &&
    ((glossary.terminology?.length ?? 0) > 0 || (glossary.named_entities?.length ?? 0) > 0);

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
      await startFictionTranslation(bookId, lang, onEvent, {
        useGlossary: useGlossaryForTranslate && glossaryReady,
        overwrite: overwriteTranslation,
        signal: controller.signal,
      });
      await loadProgress();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Translation failed');
    } finally {
      setRunning(false);
      abortRef.current = null;
      void loadHistory();
    }
  }, [bookId, lang, running, loadProgress, loadHistory, useGlossaryForTranslate, glossaryReady, overwriteTranslation]);

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

  const handleDownloadEntry = useCallback(async (entry: FictionHistoryEntry) => {
    const key = `${entry.bookId}::${entry.language}`;
    setDownloadingKey(key);
    setError(null);
    try {
      await downloadTranslatedEpub(entry.bookId, entry.language);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setDownloadingKey(null);
    }
  }, []);

  // Load any existing glossary when book/lang changes.
  const loadGlossary = useCallback(async () => {
    if (!bookId) return;
    try {
      const g = await getGlossary(bookId, lang);
      setGlossary(g.glossary);
      setGlossaryState(g.state);
      setGlossaryDone(g.chaptersDone);
      setGlossaryTotal(g.chaptersTotal);
      setGlossaryError(g.error);
    } catch {
      setGlossary(null);
      setGlossaryState('idle');
      setGlossaryDone(0);
      setGlossaryTotal(0);
      setGlossaryError(null);
    }
  }, [bookId, lang]);

  useEffect(() => {
    if (!isAdmin || !bookId) return;
    setGlossaryOpen(false);
    void loadGlossary();
  }, [isAdmin, bookId, lang, loadGlossary]);

  const handleGenerateGlossary = useCallback(async () => {
    if (!bookId || glossaryRunning) return;
    setGlossaryRunning(true);
    setGlossaryError(null);
    setGlossaryState('building');
    setGlossaryDone(0);

    const controller = new AbortController();
    glossaryAbortRef.current = controller;

    const onEvent = (ev: GlossaryProgressEvent) => {
      switch (ev.type) {
        case 'book_start':
          setGlossaryTotal(ev.totalChapters ?? 0);
          if (typeof ev.resumingFrom === 'number') setGlossaryDone(ev.resumingFrom);
          break;
        case 'chapter_done':
          if (typeof ev.done === 'number') setGlossaryDone(ev.done);
          if (typeof ev.totalChapters === 'number') setGlossaryTotal(ev.totalChapters);
          break;
        case 'chapter_error':
          setGlossaryError(`Chapter ${(ev.index ?? 0) + 1}: ${ev.error ?? 'error'}`);
          break;
        case 'book_done':
          setGlossaryState('done');
          break;
      }
    };

    try {
      await startGlossaryGeneration(bookId, lang, onEvent, { signal: controller.signal });
      await loadGlossary();
      setGlossaryOpen(true);
    } catch (e) {
      setGlossaryError(e instanceof Error ? e.message : 'Glossary generation failed');
      setGlossaryState('error');
    } finally {
      setGlossaryRunning(false);
      glossaryAbortRef.current = null;
    }
  }, [bookId, lang, glossaryRunning, loadGlossary]);

  useEffect(() => () => { abortRef.current?.abort(); glossaryAbortRef.current?.abort(); }, []);

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

        <label
          className={`flex items-center gap-2 text-sm ${glossaryReady ? '' : 'opacity-50'}`}
          title={glossaryReady ? 'Translate using the generated glossary' : 'Generate a glossary below to enable this'}
        >
          <input
            type="checkbox"
            checked={useGlossaryForTranslate && glossaryReady}
            disabled={!glossaryReady || running}
            onChange={(e) => setUseGlossaryForTranslate(e.target.checked)}
            className="h-4 w-4 accent-[var(--app-accent)]"
          />
          <span>
            Use glossary
            {!glossaryReady && (
              <span className="ml-1 text-xs text-[var(--app-text-muted)]">(none generated yet)</span>
            )}
          </span>
        </label>

        <label className="flex items-center gap-2 text-sm" title="Re-translate every block, replacing existing translations">
          <input
            type="checkbox"
            checked={overwriteTranslation}
            disabled={running}
            onChange={(e) => setOverwriteTranslation(e.target.checked)}
            className="h-4 w-4 accent-[var(--app-accent)]"
          />
          <span>
            Overwrite existing translations
            <span className="ml-1 text-xs text-[var(--app-text-muted)]">(off = skip already-translated blocks)</span>
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleTranslate} disabled={!bookId || running}>
            {running ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Translating…
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                {useGlossaryForTranslate && glossaryReady ? 'Translate with glossary' : 'Translate book'}
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

      {/* ── Glossary / style bible (not wired into the pipeline yet) ── */}
      <div className="mt-6 space-y-4 rounded-[var(--radius)] border border-[var(--separator-opaque)] p-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ScrollText className="h-4 w-4" /> Glossary / style bible
          </h2>
          <p className="mt-1 text-xs text-[var(--app-text-muted)]">
            Built incrementally, chapter by chapter, for the selected book + language. Not used by the
            translation pipeline yet — generate and inspect it here.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleGenerateGlossary} disabled={!bookId || glossaryRunning}>
            {glossaryRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <ScrollText className="mr-2 h-4 w-4" />
                {glossary ? 'Regenerate glossary' : 'Generate glossary'}
              </>
            )}
          </Button>

          {glossary && !glossaryRunning && (
            <Button variant="outline" onClick={() => setGlossaryOpen((o) => !o)}>
              {glossaryOpen ? <ChevronDown className="mr-2 h-4 w-4" /> : <ChevronRight className="mr-2 h-4 w-4" />}
              {glossaryOpen ? 'Hide glossary' : 'View glossary'}
            </Button>
          )}
        </div>

        {(glossaryRunning || glossaryTotal > 0) && glossaryState !== 'idle' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--app-text-muted)]">
                {glossaryState === 'done' && !glossaryRunning
                  ? 'Complete'
                  : glossaryRunning
                    ? 'Building…'
                    : glossaryState === 'error'
                      ? 'Stopped'
                      : 'Progress'}
              </span>
              <span className="tabular-nums text-[var(--app-text-muted)]">
                {glossaryDone}/{glossaryTotal} · {glossaryTotal > 0 ? Math.round((glossaryDone / glossaryTotal) * 100) : 0}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--separator-opaque)]">
              <div
                className="h-full rounded-full bg-[var(--app-accent)] transition-[width] duration-300"
                style={{ width: `${glossaryTotal > 0 ? Math.round((glossaryDone / glossaryTotal) * 100) : 0}%` }}
              />
            </div>
          </div>
        )}

        {glossaryError && <p className="text-sm text-red-500">{glossaryError}</p>}

        {glossary && glossaryOpen && <GlossaryView glossary={glossary} />}
      </div>

      {/* ── History ── */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">History</h2>
          <Button variant="outline" size="sm" onClick={loadHistory} disabled={historyLoading}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {history.length === 0 ? (
          <p className="rounded-[var(--radius)] border border-[var(--separator-opaque)] p-4 text-sm text-[var(--app-text-muted)]">
            No fiction translations yet. Translate a book above — each book + language becomes its own entry here.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--separator-opaque)] rounded-[var(--radius)] border border-[var(--separator-opaque)]">
            {history.map((h) => {
              const key = `${h.bookId}::${h.language}`;
              const isComplete = h.state === 'complete';
              return (
                <li key={key} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{h.title}</span>
                      <span className="shrink-0 rounded-full border border-[var(--separator-opaque)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--app-text-muted)]">
                        {h.language}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--app-text-muted)]">
                      {isComplete ? (
                        <span className="text-[var(--app-accent)]">Complete</span>
                      ) : (
                        <span>
                          {h.state === 'partial' ? 'Partial' : 'Pending'} · {h.doneChapters}/{h.totalChapters} ({h.percent}%)
                        </span>
                      )}
                      {h.errorChapters > 0 && <span className="text-red-500"> · {h.errorChapters} failed</span>}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadEntry(h)}
                    disabled={!isComplete || downloadingKey === key}
                    title={isComplete ? 'Download translated EPUB' : 'Not fully translated yet'}
                  >
                    {downloadingKey === key ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function GlossaryView({ glossary }: { glossary: BookGlossary }) {
  const p = glossary.prose_style_profile;
  const chars = glossary.character_voice_profiles ?? [];
  const terms = glossary.terminology ?? [];
  const entities = glossary.named_entities ?? [];

  return (
    <div className="space-y-4 rounded-[var(--radius)] border border-[var(--separator-opaque)] bg-[var(--app-surface-bg)] p-4 text-sm">
      {p && (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--app-text-muted)]">Prose style</h3>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            {p.register && <Row label="Register" value={p.register} />}
            {p.domain && <Row label="Domain" value={p.domain} />}
            {p.narrative_tense && <Row label="Tense" value={p.narrative_tense} />}
            {p.rhythm_target && <Row label="Rhythm" value={p.rhythm_target} />}
            {p.diction && <Row label="Diction" value={p.diction} />}
          </dl>
        </section>
      )}

      {chars.length > 0 && (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--app-text-muted)]">
            Characters ({chars.length})
          </h3>
          <ul className="space-y-2">
            {chars.map((c, i) => (
              <li key={i} className="rounded-[var(--radius)] border border-[var(--separator-opaque)] p-2">
                <div className="font-medium">{c.character_id || '—'}</div>
                {c.register && <div className="text-xs text-[var(--app-text-muted)]">Register: {c.register}</div>}
                {c.speech_patterns && <div className="text-xs text-[var(--app-text-muted)]">Speech: {c.speech_patterns}</div>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {terms.length > 0 && (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--app-text-muted)]">
            Terminology ({terms.length})
          </h3>
          <ul className="space-y-0.5">
            {terms.map((t, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium">{t.source_term}</span>
                <span className="text-[var(--app-text-muted)]">→ {t.preferred_translation}</span>
                {t.note && <span className="text-xs text-[var(--app-text-muted)]">({t.note})</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {entities.length > 0 && (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--app-text-muted)]">
            Named entities ({entities.length})
          </h3>
          <ul className="space-y-0.5">
            {entities.map((e, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium">{e.entity}</span>
                <span className="text-[var(--app-text-muted)]">→ {e.preferred_target}</span>
                {e.type && <span className="text-[10px] uppercase text-[var(--app-text-muted)]">[{e.type}]</span>}
                {e.note && <span className="text-xs text-[var(--app-text-muted)]">({e.note})</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className="text-xs">
        <summary className="cursor-pointer text-[var(--app-text-muted)]">Raw JSON</summary>
        <pre className="mt-2 max-h-96 overflow-auto rounded-[var(--radius)] bg-[var(--separator-opaque)] p-2">
          {JSON.stringify(glossary, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-[var(--app-text-muted)]">{label}:</dt>
      <dd>{value}</dd>
    </div>
  );
}
