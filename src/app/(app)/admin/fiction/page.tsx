'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldAlert, Play, Download, BookOpen, RefreshCw, ScrollText, ChevronDown, ChevronRight, Wand2, GitCompare, Coins, FileText, RotateCcw, Save } from 'lucide-react';
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
  copyGlossaryFromBook,
  startStylisticRevision,
  getRevisionProgress,
  getRevisionDiff,
  getFictionCosts,
  startReaderCheck,
  getReaderCheckProgress,
  getReaderCheckJournal,
  fetchPlaygroundModels,
  fetchBookStagePrompts,
  saveServerPrompt,
  resetServerPrompt,
  type BookStagePrompt,
  type ApiBook,
  type ReaderCheckVariant,
  type ReaderCheckProgressEvent,
  type ReaderCheckJournalItem,
  type FictionProgressEvent,
  type FictionHistoryEntry,
  type GlossaryProgressEvent,
  type RevisionProgressEvent,
  type RevisionDiffEntry,
  type BookGlossary,
  type FictionCosts,
  type FictionStageCost,
} from '@/lib/api';
// (FictionCostStage not imported — stage labels use a string-keyed map.)

const inputCls =
  'w-full rounded-[var(--radius)] border border-[var(--separator-opaque)] bg-[var(--app-surface-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--app-accent)]';

// v1 fiction pipeline supports EN/FR targets (Russian source).
const FICTION_LANGS = ['EN', 'FR'] as const;
type FictionLang = (typeof FICTION_LANGS)[number];

// Static fallback shown until GET /api/admin/models resolves (or if it fails) —
// same discovery source the playground uses. An empty picker value means "use the
// prod default model for that stage" (the backend's config model).
const FALLBACK_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-pro-preview',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

/** Per-stage model override picker. '' = use the prod default for that stage. */
function ModelPicker({ value, onChange, models, disabled }: {
  value: string;
  onChange: (v: string) => void;
  models: string[];
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-[var(--app-text-muted)]" title="Model for this stage (default = the production model)">
      <span>Model</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1 text-xs"
      >
        <option value="">default</option>
        {models.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </label>
  );
}

// Shown when the live NDJSON stream drops mid-run but the backend keeps working
// (Vercel function hit its duration cap, or a flaky connection). The run is NOT
// failed — progress keeps advancing server-side and the status poll / Refresh
// will catch up. See TZ P0 #3.
const STREAM_DROPPED_NOTE =
  'Live progress stream interrupted, but the run continues in the background. Progress updates automatically — use Refresh if it looks stalled.';

/**
 * Classify a thrown run error so an interrupted stream is not mis-reported as a
 * hard failure. `streamStarted` is true once we have seen a `book_start` event:
 * after that, any non-abort error is a dropped stream (backend still running),
 * not a start failure.
 */
function classifyRunError(e: unknown, streamStarted: boolean): 'aborted' | 'dropped' | 'failed' {
  if (e instanceof Error && e.name === 'AbortError') return 'aborted';
  return streamStarted ? 'dropped' : 'failed';
}

// ── Per-stage prompt editor (server-backed) ──────────────────────────────────
// Edits the REAL pipeline prompt files for the selected book's direction. Saving
// stores a server-side override (prompt_overrides) that the next real run uses.
type PromptStageKey = 'glossary' | 'translate' | 'revision' | 'readerCheck' | 'calques' | 'correction';

const PROMPT_STAGES: { key: PromptStageKey; label: string; hint: string }[] = [
  { key: 'glossary', label: 'Glossary', hint: 'Builds the style bible / glossary per chapter.' },
  { key: 'translate', label: 'Translation', hint: 'Main whole-chapter translation prompt.' },
  { key: 'revision', label: 'Revision (Pass 2)', hint: 'Block-level stylistic polish.' },
  { key: 'readerCheck', label: 'Reader check — reader', hint: 'Finds general reader stumbles (reader variant).' },
  { key: 'calques', label: 'Reader check — calques', hint: 'Finds Russian calques only (calques variant).' },
  { key: 'correction', label: 'Correction', hint: 'Fixes the spots the reader check reported.' },
];
const PROMPT_STAGE_LABEL: Record<string, { label: string; hint: string }> = Object.fromEntries(
  PROMPT_STAGES.map((s) => [s.key, { label: s.label, hint: s.hint }]),
);

/** Placeholders ({UPPER_CASE}) in the shipped prompt that an edit dropped. */
function missingPromptPlaceholders(shipped: string, draft: string): string[] {
  const required = new Set<string>();
  for (const m of shipped.matchAll(/\{[A-Z0-9_]+\}/g)) required.add(m[0]);
  return [...required].filter((p) => !draft.includes(p));
}

export default function AdminFictionPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading, isAuthenticated } = useAuth();

  const [books, setBooks] = useState<ApiBook[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [bookId, setBookId] = useState('');
  const [lang, setLang] = useState<FictionLang>('EN');

  // Provider-discovered model list (shared with the playground) + the per-stage
  // model override. '' = use the prod default for that stage.
  const [availableModels, setAvailableModels] = useState<string[]>(FALLBACK_MODELS);
  const [glossaryModel, setGlossaryModel] = useState('');
  const [translateModel, setTranslateModel] = useState('');
  const [revisionModel, setRevisionModel] = useState('');

  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  // Backend-reported translation run state (separate from `running`, which tracks
  // the live stream this tab holds). Lets us poll to completion after a dropped
  // stream — essential on Vercel Hobby, where the function caps at 60s (TZ P0 #3).
  const [translationState, setTranslationState] = useState<'idle' | 'running' | 'complete'>('idle');
  const [errors, setErrors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [useGlossaryForTranslate, setUseGlossaryForTranslate] = useState(false);
  const [overwriteTranslation, setOverwriteTranslation] = useState(false);
  const [runRevisionAfter, setRunRevisionAfter] = useState(false);

  // Pass 2 — stylistic revision.
  const [revisionRunning, setRevisionRunning] = useState(false);
  const [revisionDone, setRevisionDone] = useState(0);
  const [revisionTotal, setRevisionTotal] = useState(0);
  const [revisionChangedCount, setRevisionChangedCount] = useState(0);
  const [revisionState, setRevisionState] = useState<string>('idle');
  const [revisionError, setRevisionError] = useState<string | null>(null);
  const [revisionUpdatedAt, setRevisionUpdatedAt] = useState<string | null>(null);
  const [overwriteRevision, setOverwriteRevision] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffEntries, setDiffEntries] = useState<RevisionDiffEntry[] | null>(null);

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
  const [rebuildGlossary, setRebuildGlossary] = useState(false);
  // Optional: seed a fresh glossary build from another book's finished glossary
  // (same language) so a later book in a series inherits its names/terms/voice.
  const [seedFromBookId, setSeedFromBookId] = useState('');
  // Reuse another book's finished glossary verbatim (copy, no LLM rebuild).
  const [glossaryCopying, setGlossaryCopying] = useState(false);

  // Reader-check QA pass (runs on an already-translated book; no re-translation).
  const [readerVariant, setReaderVariant] = useState<ReaderCheckVariant>('reader');
  const [readerModel, setReaderModel] = useState('');
  const [readerRestart, setReaderRestart] = useState(false);
  const [readerRunning, setReaderRunning] = useState(false);
  const [readerState, setReaderState] = useState<string>('idle');
  const [readerDone, setReaderDone] = useState(0);
  const [readerTotal, setReaderTotal] = useState(0);
  const [readerFound, setReaderFound] = useState(0);
  const [readerFixed, setReaderFixed] = useState(0);
  const [readerRejected, setReaderRejected] = useState(0);
  const [readerUnmatched, setReaderUnmatched] = useState(0);
  const [readerError, setReaderError] = useState<string | null>(null);
  const [readerJournal, setReaderJournal] = useState<ReaderCheckJournalItem[] | null>(null);
  const [readerJournalOpen, setReaderJournalOpen] = useState(false);
  const [readerJournalLoading, setReaderJournalLoading] = useState(false);

  // Per-stage cost / tokens / time for the selected book+language.
  const [fictionCosts, setFictionCosts] = useState<FictionCosts | null>(null);
  const [costsLoading, setCostsLoading] = useState(false);

  // Per-stage prompt editor (server-backed; edits the real pipeline prompts).
  const [promptsOpen, setPromptsOpen] = useState(false);
  const [promptStages, setPromptStages] = useState<BookStagePrompt[] | null>(null);
  const [promptDrafts, setPromptDrafts] = useState<Record<string, string>>({});
  const [promptBusy, setPromptBusy] = useState<string | null>(null);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [promptsError, setPromptsError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const glossaryAbortRef = useRef<AbortController | null>(null);
  const revisionAbortRef = useRef<AbortController | null>(null);
  const readerAbortRef = useRef<AbortController | null>(null);

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

  const loadFictionCosts = useCallback(async () => {
    if (!bookId) { setFictionCosts(null); return; }
    setCostsLoading(true);
    try {
      setFictionCosts(await getFictionCosts(bookId, lang));
    } catch {
      setFictionCosts(null); // non-fatal — cost panel is best-effort
    } finally {
      setCostsLoading(false);
    }
  }, [bookId, lang]);

  // ── Per-stage prompt editor ──
  // Load the REAL pipeline prompts for the selected book's direction. Saving a
  // stage stores a server-side override used by the next real run of that stage.
  const loadPrompts = useCallback(async () => {
    if (!bookId) { setPromptStages(null); return; }
    setPromptsLoading(true);
    setPromptsError(null);
    try {
      const res = await fetchBookStagePrompts(bookId, lang);
      setPromptStages(res.stages);
      setPromptDrafts(Object.fromEntries(res.stages.map((s) => [s.name, s.content])));
    } catch (e) {
      setPromptsError(e instanceof Error ? e.message : 'Failed to load prompts');
      setPromptStages(null);
    } finally {
      setPromptsLoading(false);
    }
  }, [bookId, lang]);

  // Load (or reload) when the section is open and the book/language changes.
  useEffect(() => {
    if (!isAdmin || !promptsOpen || !bookId) return;
    void loadPrompts();
  }, [isAdmin, promptsOpen, bookId, lang, loadPrompts]);

  const savePromptStage = useCallback(async (p: BookStagePrompt) => {
    const content = promptDrafts[p.name] ?? p.content;
    const missing = missingPromptPlaceholders(p.shipped, content);
    if (missing.length > 0) {
      setPromptsError(`${p.name}: missing required placeholder(s): ${missing.join(', ')}.`);
      return;
    }
    setPromptBusy(p.name);
    setPromptsError(null);
    try {
      await saveServerPrompt(p.name, content);
      await loadPrompts();
    } catch (e) {
      setPromptsError(e instanceof Error ? e.message : 'Failed to save prompt');
    } finally {
      setPromptBusy(null);
    }
  }, [promptDrafts, loadPrompts]);

  const resetPromptStage = useCallback(async (p: BookStagePrompt) => {
    setPromptBusy(p.name);
    setPromptsError(null);
    try {
      await resetServerPrompt(p.name);
      await loadPrompts();
    } catch (e) {
      setPromptsError(e instanceof Error ? e.message : 'Failed to reset prompt');
    } finally {
      setPromptBusy(null);
    }
  }, [loadPrompts]);

  // Load book list once admin is confirmed.
  useEffect(() => {
    if (!isAdmin) return;
    setBooksLoading(true);
    fetchBooks()
      .then((unsorted) => {
        // Alphabetical by title so the book pickers are easy to scan.
        const list = [...unsorted].sort((a, b) =>
          (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base', numeric: true }),
        );
        setBooks(list);
        if (list.length && !bookId) setBookId(list[0].id);
      })
      .catch(() => setError('Failed to load books'))
      .finally(() => setBooksLoading(false));
    void loadHistory();
    // Discover the provider's models for the per-stage pickers (best-effort —
    // the static fallback stays if discovery fails).
    fetchPlaygroundModels()
      .then((res) => { if (res.models.length) setAvailableModels(res.models); })
      .catch(() => { /* keep fallback */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Load per-stage costs whenever the selected book or language changes.
  useEffect(() => {
    if (!isAdmin || !bookId) return;
    void loadFictionCosts();
  }, [isAdmin, bookId, lang, loadFictionCosts]);

  // Prefill progress when book/lang changes (so a previously-finished book
  // shows as complete and the download button is enabled).
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  // A glossary is usable for translation once it carries terms or named entities.
  const glossaryReady =
    !!glossary &&
    ((glossary.terminology?.length ?? 0) > 0 || (glossary.named_entities?.length ?? 0) > 0);

  // "Building" is a server-side state, not tied to this tab's stream: it stays
  // true after a reload (or when a build was started elsewhere). Drives the
  // loader/label so progress is visible even without an active stream here.
  const glossaryBuilding = glossaryRunning || glossaryState === 'building';

  const loadProgress = useCallback(async () => {
    if (!bookId) return;
    try {
      const p = await getFictionProgress(bookId, lang);
      setTotal(p.totalChapters);
      setDone(p.counts.done);
      setComplete(p.state === 'complete');
      setTranslationState(p.state);
      setCurrent(null);
    } catch {
      // No progress yet — reset.
      setTotal(0);
      setDone(0);
      setComplete(false);
      setTranslationState('idle');
    }
  }, [bookId, lang]);

  useEffect(() => {
    if (!isAdmin || !bookId) return;
    setErrors([]);
    setError(null);
    void loadProgress();
  }, [isAdmin, bookId, lang, loadProgress]);

  // ── Pass 2 — stylistic revision ──
  const loadRevisionProgress = useCallback(async () => {
    if (!bookId) return;
    try {
      const p = await getRevisionProgress(bookId, lang);
      setRevisionTotal(p.totalBlocks);
      setRevisionDone(p.revised);
      setRevisionChangedCount(p.changed);
      setRevisionState(p.state);
      setRevisionUpdatedAt(p.updatedAt ?? null);
      setRevisionError(p.error ?? null);
    } catch {
      setRevisionTotal(0);
      setRevisionDone(0);
      setRevisionChangedCount(0);
      setRevisionState('idle');
      setRevisionUpdatedAt(null);
    }
  }, [bookId, lang]);

  const runRevision = useCallback(async () => {
    if (!bookId || revisionRunning) return;
    setRevisionRunning(true);
    setRevisionError(null);
    setRevisionState('running');
    setRevisionDone(0);
    setRevisionChangedCount(0);

    const controller = new AbortController();
    revisionAbortRef.current = controller;
    let streamStarted = false;

    const onEvent = (ev: RevisionProgressEvent) => {
      switch (ev.type) {
        case 'book_start':
          streamStarted = true;
          setRevisionTotal(ev.totalBlocks ?? 0);
          break;
        case 'block_done':
          if (typeof ev.done === 'number') setRevisionDone(ev.done);
          if (ev.changed === true) setRevisionChangedCount((c) => c + 1);
          break;
        case 'book_done':
          if (typeof ev.changed === 'number') setRevisionChangedCount(ev.changed);
          setRevisionState('done');
          break;
      }
    };

    try {
      await startStylisticRevision(bookId, lang, onEvent, { overwrite: overwriteRevision, model: revisionModel || undefined, signal: controller.signal });
      await loadRevisionProgress();
    } catch (e) {
      const kind = classifyRunError(e, streamStarted);
      if (kind === 'dropped') {
        // Backend keeps revising; reload status and let Refresh/cron continue it.
        setRevisionError(STREAM_DROPPED_NOTE);
        await loadRevisionProgress();
      } else if (kind === 'failed') {
        setRevisionError(e instanceof Error ? e.message : 'Revision failed');
        setRevisionState('error');
      } // 'aborted' (user stopped): leave the current status untouched.
    } finally {
      setRevisionRunning(false);
      revisionAbortRef.current = null;
      void loadFictionCosts();
    }
  }, [bookId, lang, revisionRunning, overwriteRevision, revisionModel, loadRevisionProgress, loadFictionCosts]);

  // ── Reader-check QA pass ──
  const loadReaderProgress = useCallback(async () => {
    if (!bookId) return;
    try {
      const p = await getReaderCheckProgress(bookId, lang);
      setReaderState(p.state);
      setReaderTotal(p.chaptersTotal);
      setReaderDone(p.chaptersDone);
      setReaderFound(p.found);
      setReaderFixed(p.fixed);
      setReaderRejected(p.rejected);
      setReaderUnmatched(p.unmatched);
      setReaderError(p.error ?? null);
    } catch {
      setReaderState('idle');
      setReaderTotal(0);
      setReaderDone(0);
      setReaderFound(0);
      setReaderFixed(0);
      setReaderRejected(0);
      setReaderUnmatched(0);
      setReaderError(null);
    }
  }, [bookId, lang]);

  const loadReaderJournal = useCallback(async () => {
    if (!bookId) return;
    setReaderJournalLoading(true);
    try {
      const j = await getReaderCheckJournal(bookId, lang);
      setReaderJournal(j.items);
    } catch {
      setReaderJournal(null);
    } finally {
      setReaderJournalLoading(false);
    }
  }, [bookId, lang]);

  const runReaderCheckPass = useCallback(async () => {
    if (!bookId || readerRunning) return;
    setReaderRunning(true);
    setReaderError(null);
    setReaderState('running');
    setReaderDone(0);
    setReaderFound(0);
    setReaderFixed(0);
    setReaderRejected(0);
    setReaderUnmatched(0);

    const controller = new AbortController();
    readerAbortRef.current = controller;
    let streamStarted = false;

    const onEvent = (ev: ReaderCheckProgressEvent) => {
      switch (ev.type) {
        case 'book_start':
          streamStarted = true;
          setReaderTotal(ev.totalChapters ?? 0);
          // Resume: the bar starts at the already-finished chapter count.
          if (typeof ev.resumingFrom === 'number') setReaderDone(ev.resumingFrom);
          break;
        case 'chapter_done':
          // Counts are emitted CUMULATIVE (seeded from the prior run on resume), so set.
          if (typeof ev.done === 'number') setReaderDone(ev.done);
          if (typeof ev.totalChapters === 'number') setReaderTotal(ev.totalChapters);
          if (typeof ev.found === 'number') setReaderFound(ev.found);
          if (typeof ev.fixed === 'number') setReaderFixed(ev.fixed);
          if (typeof ev.rejected === 'number') setReaderRejected(ev.rejected);
          if (typeof ev.unmatched === 'number') setReaderUnmatched(ev.unmatched);
          break;
        case 'book_done':
          if (typeof ev.found === 'number') setReaderFound(ev.found);
          if (typeof ev.fixed === 'number') setReaderFixed(ev.fixed);
          if (typeof ev.rejected === 'number') setReaderRejected(ev.rejected);
          if (typeof ev.unmatched === 'number') setReaderUnmatched(ev.unmatched);
          setReaderState('done');
          break;
      }
    };

    try {
      await startReaderCheck(bookId, lang, readerVariant, onEvent, { model: readerModel || undefined, restart: readerRestart, signal: controller.signal });
      await loadReaderProgress();
      await loadReaderJournal();
      setReaderJournalOpen(true);
    } catch (e) {
      const kind = classifyRunError(e, streamStarted);
      if (kind === 'dropped') {
        // Backend keeps running; reload status and let the poll effect continue.
        setReaderError(STREAM_DROPPED_NOTE);
        await loadReaderProgress();
      } else if (kind === 'failed') {
        setReaderError(e instanceof Error ? e.message : 'Reader-check failed');
        setReaderState('error');
      } // 'aborted' (user stopped): leave the current status untouched.
    } finally {
      setReaderRunning(false);
      readerAbortRef.current = null;
      void loadFictionCosts();
    }
  }, [bookId, lang, readerRunning, readerVariant, readerModel, readerRestart, loadReaderProgress, loadReaderJournal, loadFictionCosts]);

  useEffect(() => {
    if (!isAdmin || !bookId) return;
    setDiffOpen(false);
    setDiffEntries(null);
    void loadRevisionProgress();
  }, [isAdmin, bookId, lang, loadRevisionProgress]);

  // Load reader-check progress (and journal if a run exists) on book/lang change.
  useEffect(() => {
    if (!isAdmin || !bookId) return;
    setReaderJournalOpen(false);
    setReaderJournal(null);
    void loadReaderProgress();
  }, [isAdmin, bookId, lang, loadReaderProgress]);

  const handleViewChanges = useCallback(async () => {
    if (diffOpen) { setDiffOpen(false); return; }
    setDiffLoading(true);
    setRevisionError(null);
    try {
      const d = await getRevisionDiff(bookId, lang, { changedOnly: true });
      setDiffEntries(d.entries);
      setDiffOpen(true);
    } catch (e) {
      setRevisionError(e instanceof Error ? e.message : 'Failed to load changes');
    } finally {
      setDiffLoading(false);
    }
  }, [bookId, lang, diffOpen]);

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
    let streamStarted = false;

    const onEvent = (ev: FictionProgressEvent) => {
      switch (ev.type) {
        case 'book_start':
          streamStarted = true;
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
        model: translateModel || undefined,
        signal: controller.signal,
      });
      await loadProgress();
    } catch (e) {
      const kind = classifyRunError(e, streamStarted);
      if (kind === 'dropped') {
        // Backend keeps translating; reload per-chapter progress from status.
        setError(STREAM_DROPPED_NOTE);
        await loadProgress();
      } else if (kind === 'failed') {
        setError(e instanceof Error ? e.message : 'Translation failed');
      } // 'aborted' (user stopped): leave the current status untouched.
    } finally {
      setRunning(false);
      abortRef.current = null;
      void loadHistory();
      void loadFictionCosts();
    }

    // Pass 2 chains after a successful Pass 1 when the toggle is on.
    if (runRevisionAfter) await runRevision();
  }, [bookId, lang, running, loadProgress, loadHistory, loadFictionCosts, useGlossaryForTranslate, glossaryReady, overwriteTranslation, translateModel, runRevisionAfter, runRevision]);

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
    setSeedFromBookId(''); // a seed choice is per target book — don't carry it across
    void loadGlossary();
  }, [isAdmin, bookId, lang, loadGlossary]);

  // When a build is in progress but this tab isn't the one streaming it (after a
  // reload, or a build started elsewhere), there are no NDJSON events to advance
  // the bar — poll the status endpoint so progress keeps updating.
  useEffect(() => {
    if (!isAdmin || !bookId) return;
    if (glossaryState !== 'building' || glossaryRunning) return;
    const id = setInterval(() => { void loadGlossary(); }, 3000);
    return () => clearInterval(id);
  }, [isAdmin, bookId, glossaryState, glossaryRunning, loadGlossary]);

  // Same for translation: on Hobby the stream caps at 60s and drops long before a
  // multi-chapter book finishes, but the backend keeps going — poll the status
  // endpoint while a run is in progress server-side and this tab isn't streaming.
  useEffect(() => {
    if (!isAdmin || !bookId) return;
    if (translationState !== 'running' || running) return;
    const id = setInterval(() => { void loadProgress(); }, 3000);
    return () => clearInterval(id);
  }, [isAdmin, bookId, translationState, running, loadProgress]);

  // Same for stylistic revision (its server run-state heartbeats 'running').
  useEffect(() => {
    if (!isAdmin || !bookId) return;
    if (revisionState !== 'running' || revisionRunning) return;
    const id = setInterval(() => { void loadRevisionProgress(); }, 3000);
    return () => clearInterval(id);
  }, [isAdmin, bookId, revisionState, revisionRunning, loadRevisionProgress]);

  // Same for the reader-check pass (its run-state heartbeats 'running').
  useEffect(() => {
    if (!isAdmin || !bookId) return;
    if (readerState !== 'running' || readerRunning) return;
    const id = setInterval(() => { void loadReaderProgress(); }, 3000);
    return () => clearInterval(id);
  }, [isAdmin, bookId, readerState, readerRunning, loadReaderProgress]);

  // Pull the freshest state for every stage at once (translation, glossary,
  // revision) + history — so an interrupted/resumed run shows its real progress.
  const handleRefresh = useCallback(async () => {
    if (!bookId) return;
    setRefreshing(true);
    try {
      await Promise.allSettled([
        loadProgress(),
        loadGlossary(),
        loadRevisionProgress(),
        loadHistory(),
        loadFictionCosts(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [bookId, loadProgress, loadGlossary, loadRevisionProgress, loadHistory, loadFictionCosts]);

  const handleGenerateGlossary = useCallback(async () => {
    if (!bookId || glossaryRunning) return;
    setGlossaryRunning(true);
    setGlossaryError(null);
    setGlossaryState('building');
    setGlossaryDone(0);

    const controller = new AbortController();
    glossaryAbortRef.current = controller;
    let streamStarted = false;

    const onEvent = (ev: GlossaryProgressEvent) => {
      switch (ev.type) {
        case 'book_start':
          streamStarted = true;
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
      await startGlossaryGeneration(bookId, lang, onEvent, {
        restart: rebuildGlossary,
        seedFromBookId: seedFromBookId || undefined,
        model: glossaryModel || undefined,
        signal: controller.signal,
      });
      await loadGlossary();
      setGlossaryOpen(true);
    } catch (e) {
      const kind = classifyRunError(e, streamStarted);
      if (kind === 'dropped') {
        // Backend keeps building; reload status and let the poll effect continue.
        setGlossaryError(STREAM_DROPPED_NOTE);
        await loadGlossary();
      } else if (kind === 'failed') {
        setGlossaryError(e instanceof Error ? e.message : 'Glossary generation failed');
        setGlossaryState('error');
      } // 'aborted' (user stopped): leave the current status untouched.
    } finally {
      setGlossaryRunning(false);
      glossaryAbortRef.current = null;
      void loadFictionCosts();
    }
  }, [bookId, lang, glossaryRunning, rebuildGlossary, seedFromBookId, glossaryModel, loadGlossary, loadFictionCosts]);

  // Reuse an existing glossary from another book verbatim — no generation.
  const handleCopyGlossary = useCallback(async () => {
    if (!bookId || !seedFromBookId || glossaryRunning || glossaryCopying) return;
    setGlossaryCopying(true);
    setGlossaryError(null);
    try {
      const g = await copyGlossaryFromBook(bookId, lang, seedFromBookId);
      setGlossary(g.glossary);
      setGlossaryState(g.state);
      setGlossaryDone(g.chaptersDone);
      setGlossaryTotal(g.chaptersTotal);
      setGlossaryOpen(true);
    } catch (e) {
      setGlossaryError(e instanceof Error ? e.message : 'Failed to copy glossary');
    } finally {
      setGlossaryCopying(false);
    }
  }, [bookId, lang, seedFromBookId, glossaryRunning, glossaryCopying]);

  useEffect(() => () => { abortRef.current?.abort(); glossaryAbortRef.current?.abort(); revisionAbortRef.current?.abort(); readerAbortRef.current?.abort(); }, []);

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
    <div className="mx-auto w-full max-w-3xl px-4 pt-[calc(1rem+env(safe-area-inset-top)+76px)] pb-24">
      <div className="flex items-start justify-between gap-3">
        <PageHeader title="Fiction Translation" />
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={!bookId || refreshing}
          title="Pull the latest status for every stage (translation, glossary, revision)"
        >
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

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

        <label className="flex items-center gap-2 text-sm" title="After translating, run segment-level stylistic revision (Pass 2)">
          <input
            type="checkbox"
            checked={runRevisionAfter}
            disabled={running || revisionRunning}
            onChange={(e) => setRunRevisionAfter(e.target.checked)}
            className="h-4 w-4 accent-[var(--app-accent)]"
          />
          <span>
            Stylistic revision (Pass 2) after translation
            <span className="ml-1 text-xs text-[var(--app-text-muted)]">(off = translate only)</span>
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <ModelPicker value={translateModel} onChange={setTranslateModel} models={availableModels} disabled={running} />
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

      {/* ── Per-stage prompt editor (server-backed) ── */}
      <div className="mt-6 space-y-4 rounded-[var(--radius)] border border-[var(--separator-opaque)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4" /> Stage prompts
            </h2>
            <p className="mt-1 text-xs text-[var(--app-text-muted)]">
              Edit the prompt for each stage of the selected book&apos;s direction. <strong>Save</strong> stores a
              server-side override that the next <em>real</em> run uses (for cached stages — translate/revision —
              re-run with <em>Overwrite</em> to regenerate). <strong>Reset to shipped</strong> removes the override.
              All editable prompts across directions are also on{' '}
              <a href="/admin/prompts" className="text-[var(--app-accent)] underline">Server prompts</a>.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPromptsOpen((o) => !o)}>
            {promptsOpen ? <ChevronDown className="mr-2 h-4 w-4" /> : <ChevronRight className="mr-2 h-4 w-4" />}
            {promptsOpen ? 'Hide' : 'Edit prompts'}
          </Button>
        </div>

        {promptsOpen && (
          <div className="space-y-4">
            {!bookId && <p className="text-sm text-[var(--app-text-muted)]">Select a book above to edit its prompts.</p>}

            {bookId && (
              <div className="flex items-center justify-end">
                <Button variant="outline" size="sm" onClick={loadPrompts} disabled={promptsLoading}>
                  <RefreshCw className={`mr-2 h-3.5 w-3.5 ${promptsLoading ? 'animate-spin' : ''}`} />
                  Reload
                </Button>
              </div>
            )}

            {promptsLoading && !promptStages && (
              <div className="flex items-center gap-2 text-sm text-[var(--app-text-muted)]">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading prompts…
              </div>
            )}

            {promptsError && <p className="text-sm text-red-500">{promptsError}</p>}

            {promptStages && promptStages.map((p) => {
              const meta = PROMPT_STAGE_LABEL[p.stage] ?? { label: p.stage, hint: '' };
              const draft = promptDrafts[p.name] ?? p.content;
              const dirty = draft !== p.content;
              const busy = promptBusy === p.name;
              const missing = missingPromptPlaceholders(p.shipped, draft);
              return (
                <div key={p.name} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      {meta.label}
                      <code className="text-[10px] font-normal text-[var(--app-text-muted)]">{p.name}</code>
                      {p.overridden && (
                        <span className="rounded bg-[var(--app-accent)]/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--app-accent)]">
                          overridden
                        </span>
                      )}
                      {dirty && <span className="text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-500">unsaved</span>}
                    </label>
                  </div>
                  <p className="text-xs text-[var(--app-text-muted)]">{meta.hint}</p>
                  <textarea
                    value={draft}
                    onChange={(e) => setPromptDrafts((prev) => ({ ...prev, [p.name]: e.target.value }))}
                    spellCheck={false}
                    rows={10}
                    disabled={busy}
                    className={`${inputCls} min-h-[8rem] resize-y font-mono text-xs leading-relaxed`}
                  />
                  {missing.length > 0 && (
                    <p className="text-xs text-red-500">Missing placeholder(s): {missing.join(', ')} — keep them or Save is blocked.</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" onClick={() => savePromptStage(p)} disabled={busy || !dirty || missing.length > 0}>
                      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save (used by real runs)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPromptDrafts((prev) => ({ ...prev, [p.name]: p.content }))}
                      disabled={busy || !dirty}
                      title="Discard unsaved edits"
                    >
                      Revert edits
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resetPromptStage(p)}
                      disabled={busy || !p.overridden}
                      title="Delete the server override and use the shipped prompt"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset to shipped
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
          <ModelPicker value={glossaryModel} onChange={setGlossaryModel} models={availableModels} disabled={glossaryRunning} />
          <Button onClick={handleGenerateGlossary} disabled={!bookId || glossaryRunning}>
            {glossaryRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <ScrollText className="mr-2 h-4 w-4" />
                {/* A server-side build that this tab isn't streaming (e.g. after a
                    reload, or one that stalled) can be picked up from where it
                    left off — resumes from chapters_done. */}
                {rebuildGlossary
                  ? 'Rebuild glossary'
                  : glossaryState === 'building'
                    ? 'Resume glossary'
                    : glossary
                      ? 'Regenerate glossary'
                      : 'Generate glossary'}
              </>
            )}
          </Button>

          {glossary && !glossaryBuilding && (
            <Button variant="outline" onClick={() => setGlossaryOpen((o) => !o)}>
              {glossaryOpen ? <ChevronDown className="mr-2 h-4 w-4" /> : <ChevronRight className="mr-2 h-4 w-4" />}
              {glossaryOpen ? 'Hide glossary' : 'View glossary'}
            </Button>
          )}
        </div>

        <label
          className="flex items-center gap-2 text-sm"
          title="Discard the existing glossary and rebuild it from chapter 1 (needed to re-apply a new glossary prompt — existing entries are otherwise frozen)"
        >
          <input
            type="checkbox"
            checked={rebuildGlossary}
            disabled={glossaryRunning}
            onChange={(e) => setRebuildGlossary(e.target.checked)}
            className="h-4 w-4 accent-[var(--app-accent)]"
          />
          <span>
            Rebuild from scratch
            <span className="ml-1 text-xs text-[var(--app-text-muted)]">(off = resume/merge into existing)</span>
          </span>
        </label>

        {/* Series continuity: either SEED a fresh build from an earlier book's
            glossary (then "Rebuild"/"Generate" above folds chapters in), or COPY
            that glossary verbatim with no generation at all. */}
        <div className="space-y-2">
          <label className="flex flex-wrap items-center gap-2 text-sm">
            <span>Use another book</span>
            <select
              value={seedFromBookId}
              disabled={glossaryRunning || glossaryCopying}
              onChange={(e) => setSeedFromBookId(e.target.value)}
              className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1 text-sm"
            >
              <option value="">— none (start empty) —</option>
              {books
                .filter((b) => b.id !== bookId)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyGlossary}
              disabled={!bookId || !seedFromBookId || glossaryRunning || glossaryCopying}
              title="Copy that book's glossary as-is for this book + language — no generation"
            >
              {glossaryCopying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Copying…
                </>
              ) : (
                <>
                  <ScrollText className="mr-2 h-4 w-4" /> Use as-is (copy)
                </>
              )}
            </Button>
          </label>
          <p className="text-xs text-[var(--app-text-muted)]">
            Requires a {lang} glossary on the selected book. <strong>Use as-is</strong> copies it
            verbatim (no LLM). The <strong>Generate/Rebuild</strong> button above instead seeds a fresh
            build from it (ignored on resume).
          </p>
        </div>

        {(glossaryBuilding || glossaryTotal > 0) && glossaryState !== 'idle' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-[var(--app-text-muted)]">
                {glossaryBuilding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {glossaryState === 'done' && !glossaryBuilding
                  ? 'Complete'
                  : glossaryBuilding
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

      {/* ── Stylistic revision (Pass 2) ── */}
      <div className="mt-6 space-y-4 rounded-[var(--radius)] border border-[var(--separator-opaque)] p-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Wand2 className="h-4 w-4" /> Stylistic revision (Pass 2)
          </h2>
          <p className="mt-1 text-xs text-[var(--app-text-muted)]">
            Polishes the translated text block by block using neighboring context + the glossary. Runs on
            the selected book + language; already-revised blocks are skipped. Before/after is saved for review.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ModelPicker value={revisionModel} onChange={setRevisionModel} models={availableModels} disabled={revisionRunning} />
          <Button onClick={runRevision} disabled={!bookId || revisionRunning || running}>
            {revisionRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Revising…
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" /> Run revision
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={handleViewChanges}
            disabled={!bookId || revisionRunning || diffLoading || revisionChangedCount === 0}
            title={revisionChangedCount === 0 ? 'No changes to show yet' : 'Compare draft vs revised'}
          >
            {diffLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GitCompare className="mr-2 h-4 w-4" />
            )}
            {diffOpen ? 'Hide changes' : 'View changes'}
          </Button>
        </div>

        <label
          className="flex items-center gap-2 text-sm"
          title="Re-revise every block, replacing existing revisions (needed to re-revise an already-revised book, e.g. with a new revision prompt)"
        >
          <input
            type="checkbox"
            checked={overwriteRevision}
            disabled={revisionRunning || running}
            onChange={(e) => setOverwriteRevision(e.target.checked)}
            className="h-4 w-4 accent-[var(--app-accent)]"
          />
          <span>
            Overwrite existing revisions
            <span className="ml-1 text-xs text-[var(--app-text-muted)]">(off = skip already-revised blocks)</span>
          </span>
        </label>

        {(revisionRunning || revisionTotal > 0) && revisionState !== 'idle' && (() => {
          const stopped = !revisionRunning && (revisionState === 'stalled' || revisionState === 'incomplete' || revisionState === 'error');
          const label = revisionRunning
            ? 'Revising…'
            : revisionState === 'done'
              ? 'Complete'
              : revisionState === 'stalled'
                ? 'Stopped (stalled)'
                : revisionState === 'incomplete'
                  ? 'Stopped — incomplete'
                  : revisionState === 'error'
                    ? 'Stopped — error'
                    : 'Progress';
          return (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className={stopped ? 'font-medium text-amber-600 dark:text-amber-500' : 'text-[var(--app-text-muted)]'}>
                  {label}
                  <span className="ml-2 text-xs text-[var(--app-text-muted)]">{revisionChangedCount} changed</span>
                </span>
                <span className="tabular-nums text-[var(--app-text-muted)]">
                  {revisionDone}/{revisionTotal} · {revisionTotal > 0 ? Math.round((revisionDone / revisionTotal) * 100) : 0}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--separator-opaque)]">
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${stopped ? 'bg-amber-500' : 'bg-[var(--app-accent)]'}`}
                  style={{ width: `${revisionTotal > 0 ? Math.round((revisionDone / revisionTotal) * 100) : 0}%` }}
                />
              </div>
              {stopped && (
                <p className="text-xs text-[var(--app-text-muted)]">
                  Last progress {revisionUpdatedAt ? new Date(revisionUpdatedAt).toLocaleString() : 'unknown'}. Click “Run revision” to finish the rest — already-revised blocks are skipped (cron also resumes it automatically).
                </p>
              )}
            </div>
          );
        })()}

        {revisionError && <p className="text-sm text-red-500">{revisionError}</p>}

        {diffOpen && diffEntries && <RevisionDiffView entries={diffEntries} />}
      </div>

      {/* ── Reader-check QA pass (calques / reader) ── */}
      <div className="mt-6 space-y-4 rounded-[var(--radius)] border border-[var(--separator-opaque)] p-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4" /> Reader-check (QA pass)
          </h2>
          <p className="mt-1 text-xs text-[var(--app-text-muted)]">
            Runs on the <strong>already-translated</strong> book — no re-translation. Per chapter it searches the
            translated text for stumbling places, anchors each quote to a segment, fixes
            <em> blocks/noticeable</em> places using the source + neighbours + glossary, and verifies the fix
            (same segments, 0.5–2× length, no Latin/Cyrillic mix). Accepted fixes are saved into the book, so the
            downloadable EPUB reflects them. Every place is logged below.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span>Search prompt</span>
            <select
              value={readerVariant}
              disabled={readerRunning}
              onChange={(e) => setReaderVariant(e.target.value as ReaderCheckVariant)}
              className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1 text-sm"
            >
              <option value="reader">Reader (general stumbles)</option>
              <option value="calques">Calques (RU idioms only)</option>
            </select>
          </label>
          <ModelPicker value={readerModel} onChange={setReaderModel} models={availableModels} disabled={readerRunning} />
          <Button onClick={runReaderCheckPass} disabled={!bookId || readerRunning || running || revisionRunning}>
            {readerRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking…
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                {!readerRestart && readerDone > 0 && readerDone < readerTotal ? 'Resume reader-check' : 'Run reader-check'}
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={async () => {
              if (readerJournalOpen) { setReaderJournalOpen(false); return; }
              if (!readerJournal) await loadReaderJournal();
              setReaderJournalOpen(true);
            }}
            disabled={!bookId || readerJournalLoading}
          >
            {readerJournalLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : readerJournalOpen ? (
              <ChevronDown className="mr-2 h-4 w-4" />
            ) : (
              <ChevronRight className="mr-2 h-4 w-4" />
            )}
            {readerJournalOpen ? 'Hide journal' : 'View journal'}
          </Button>
        </div>

        <label
          className="flex items-center gap-2 text-sm"
          title="Re-check from chapter 1 and clear the journal. Off = resume from the last finished chapter."
        >
          <input
            type="checkbox"
            checked={readerRestart}
            disabled={readerRunning}
            onChange={(e) => setReaderRestart(e.target.checked)}
            className="h-4 w-4 accent-[var(--app-accent)]"
          />
          <span>
            Restart from scratch
            <span className="ml-1 text-xs text-[var(--app-text-muted)]">(off = resume from where it stopped)</span>
          </span>
        </label>

        {(readerRunning || readerTotal > 0) && readerState !== 'idle' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className={readerState === 'error' ? 'font-medium text-amber-600 dark:text-amber-500' : 'text-[var(--app-text-muted)]'}>
                {readerRunning ? 'Checking…' : readerState === 'done' ? 'Complete' : readerState === 'error' ? 'Stopped — error' : 'Progress'}
                <span className="ml-2 text-xs text-[var(--app-text-muted)]">
                  {readerFound} found · {readerFixed} fixed · {readerRejected} rejected · {readerUnmatched} unmatched
                </span>
              </span>
              <span className="tabular-nums text-[var(--app-text-muted)]">
                {readerDone}/{readerTotal} · {readerTotal > 0 ? Math.round((readerDone / readerTotal) * 100) : 0}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--separator-opaque)]">
              <div
                className={`h-full rounded-full transition-[width] duration-300 ${readerState === 'error' ? 'bg-amber-500' : 'bg-[var(--app-accent)]'}`}
                style={{ width: `${readerTotal > 0 ? Math.round((readerDone / readerTotal) * 100) : 0}%` }}
              />
            </div>
          </div>
        )}

        {readerError && <p className="text-sm text-red-500">{readerError}</p>}

        {readerJournalOpen && <ReaderCheckJournalView items={readerJournal} loading={readerJournalLoading} />}
      </div>

      {/* ── Cost & tokens (per stage) ── */}
      <div className="mt-6 space-y-4 rounded-[var(--radius)] border border-[var(--separator-opaque)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Coins className="h-4 w-4" /> Cost &amp; tokens
            </h2>
            <p className="mt-1 text-xs text-[var(--app-text-muted)]">
              LLM spend, tokens and time per stage for the selected book + language. Each stage shows the
              <em> estimate</em> (worst-case projection from book structure) next to the <em>measured</em>
              figures (real recorded spend), so you can compare. Measured appears once a stage has run under
              cost tracking; time is only known for measured runs.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadFictionCosts} disabled={!bookId || costsLoading}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${costsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {!fictionCosts && costsLoading && (
          <div className="flex items-center gap-2 text-sm text-[var(--app-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        {fictionCosts && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-[var(--app-text-muted)]">
                  <th className="py-1 pr-3 font-medium">Stage</th>
                  <th className="py-1 pr-3 font-medium"> </th>
                  <th className="py-1 pr-3 text-right font-medium">Calls</th>
                  <th className="py-1 pr-3 text-right font-medium">Tokens in → out</th>
                  <th className="py-1 pr-3 text-right font-medium">Time</th>
                  <th className="py-1 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {fictionCosts.stages.map((s) => (
                  <StageCostRows key={s.stage} row={s} />
                ))}
                <tr className="border-t-2 border-[var(--separator-opaque)] font-semibold">
                  <td className="py-2 pr-3" rowSpan={2}>Total</td>
                  <td className="py-2 pr-3"><SourceTag kind="estimate" /></td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {fictionCosts.stages.reduce((a, s) => a + s.estimate.llmCalls, 0).toLocaleString('en-US')}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {fmtTokens(fictionCosts.totals.estimate.tokensIn)} → {fmtTokens(fictionCosts.totals.estimate.tokensOut)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-[var(--app-text-muted)]">—</td>
                  <td className="py-2 text-right tabular-nums">{fmtUsd(fictionCosts.totals.estimate.costUsd)}</td>
                </tr>
                <tr className="font-semibold">
                  <td className="py-2 pr-3"><SourceTag kind="measured" /></td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {fictionCosts.stages.reduce((a, s) => a + (s.measured?.llmCalls ?? 0), 0).toLocaleString('en-US')}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {fmtTokens(fictionCosts.totals.measured.tokensIn)} → {fmtTokens(fictionCosts.totals.measured.tokensOut)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtDuration(fictionCosts.totals.measured.durationMs)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtUsd(fictionCosts.totals.measured.costUsd)}</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-xs text-[var(--app-text-muted)]">
              <span className="font-medium">estimate</span> = worst-case (empty-cache) projection from book structure ·
              <span className="font-medium"> measured</span> = real recorded spend. A stage shows <span className="italic">not run yet</span> until it has been executed under cost tracking.
            </p>
          </div>
        )}
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

const READER_OUTCOME_STYLE: Record<string, string> = {
  fixed: 'text-emerald-600 dark:text-emerald-400',
  rejected: 'text-amber-600 dark:text-amber-500',
  unmatched: 'text-[var(--app-text-muted)]',
  skipped: 'text-[var(--app-text-muted)]',
};

function ReaderCheckJournalView({ items, loading }: { items: ReaderCheckJournalItem[] | null; loading: boolean }) {
  if (loading && !items) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--app-text-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading journal…
      </div>
    );
  }
  if (!items || items.length === 0) {
    return <p className="text-sm text-[var(--app-text-muted)]">No journal yet — run a reader-check pass.</p>;
  }

  // Group by chapter, preserving the (chapter-number ordered) sequence.
  const groups: { key: string; title: string; items: ReaderCheckJournalItem[] }[] = [];
  for (const it of items) {
    const key = it.chapterId || String(it.chapterNumber ?? '');
    const title = `${it.chapterNumber != null ? `${it.chapterNumber}. ` : ''}${it.chapterTitle ?? 'Untitled'}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(it);
    else groups.push({ key, title, items: [it] });
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.key} className="rounded-[var(--radius)] border border-[var(--separator-opaque)] p-3">
          <h4 className="mb-2 text-xs font-semibold text-[var(--app-text-muted)]">{g.title}</h4>
          <div className="space-y-3">
            {g.items.map((it, i) => (
              <div key={i} className="border-t border-[var(--separator-opaque)] pt-2 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`font-semibold uppercase ${READER_OUTCOME_STYLE[it.outcome] ?? ''}`}>{it.outcome}</span>
                  {it.rejectReason && <span className="text-[var(--app-text-muted)]">({it.rejectReason})</span>}
                  <span className="text-[var(--app-text-muted)]">· {it.severity}</span>
                  {it.matchType && it.matchType !== 'none' && (
                    <span className="text-[var(--app-text-muted)]">· {it.matchType}{it.matchScore != null ? ` ${it.matchScore}` : ''}</span>
                  )}
                </div>
                <p className="mt-1 text-sm">
                  <span className="text-[var(--app-text-muted)]">quote:</span> “{it.quote}”
                </p>
                {it.problem && <p className="mt-0.5 text-xs text-[var(--app-text-muted)]">{it.problem}</p>}
                {(it.before != null || it.after != null) && (
                  <div className="mt-1 space-y-1 text-sm">
                    {it.before != null && (
                      <p className="text-red-600 dark:text-red-400"><span className="select-none">− </span>{it.before}</p>
                    )}
                    {it.after != null && it.outcome === 'fixed' && (
                      <p className="text-emerald-600 dark:text-emerald-400"><span className="select-none">+ </span>{it.after}</p>
                    )}
                    {it.after != null && it.outcome !== 'fixed' && (
                      <p className="text-[var(--app-text-muted)]"><span className="select-none">~ </span>{it.after} <span className="italic">(not applied)</span></p>
                    )}
                  </div>
                )}
                {it.changeNote && <p className="mt-0.5 text-xs italic text-[var(--app-text-muted)]">{it.changeNote}</p>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RevisionDiffView({ entries }: { entries: RevisionDiffEntry[] }) {
  // Group entries by chapter, preserving the (already chapter+position ordered) sequence.
  const groups: { key: string; title: string; items: RevisionDiffEntry[] }[] = [];
  for (const e of entries) {
    const title = `${e.chapterNumber ? `Ch. ${e.chapterNumber}` : 'Chapter'}${e.chapterTitle ? ` — ${e.chapterTitle}` : ''}`;
    const last = groups[groups.length - 1];
    if (last && last.key === e.chapterId) last.items.push(e);
    else groups.push({ key: e.chapterId, title, items: [e] });
  }

  if (entries.length === 0) {
    return (
      <p className="rounded-[var(--radius)] border border-[var(--separator-opaque)] p-3 text-sm text-[var(--app-text-muted)]">
        No changed blocks — the revision left the draft unchanged.
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-[var(--radius)] border border-[var(--separator-opaque)] bg-[var(--app-surface-bg)] p-4 text-sm">
      <p className="text-xs text-[var(--app-text-muted)]">{entries.length} changed block{entries.length === 1 ? '' : 's'}</p>
      {groups.map((g) => (
        <section key={g.key} className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--app-text-muted)]">{g.title}</h4>
          <ul className="space-y-3">
            {g.items.map((e) => (
              <RevisionDiffEntryRow key={e.blockId} entry={e} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

const STAGE_LABEL: Record<string, string> = {
  glossary: 'Glossary',
  translate: 'Translation',
  revise: 'Revision (Pass 2)',
  'reader-check': 'Reader-check (search)',
  correction: 'Reader-check (fix)',
};

function fmtUsd(n: number): string {
  if (!n) return '$0';
  return n < 1 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`;
}
function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}k`;
  return String(n);
}
function fmtDuration(ms: number | null): string {
  if (!ms) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function SourceTag({ kind }: { kind: 'estimate' | 'measured' }) {
  const cls =
    kind === 'measured'
      ? 'bg-[var(--app-accent)]/15 text-[var(--app-accent)]'
      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cls}`}>
      {kind}
    </span>
  );
}

// Two rows per stage: the estimate (projection) above the measured (real) figures.
function StageCostRows({ row }: { row: FictionStageCost }) {
  const est = row.estimate;
  const m = row.measured;
  return (
    <>
      <tr className="border-t-2 border-[var(--separator-opaque)]">
        <td className="py-2 pr-3 align-top font-medium" rowSpan={2}>
          {STAGE_LABEL[row.stage] ?? row.stage}
        </td>
        <td className="py-2 pr-3">
          <SourceTag kind="estimate" />
          {!est.priceKnown && (
            <span className="ml-1 text-[10px] text-[var(--app-text-muted)]" title="Pricing for this model is approximate">
              ~price
            </span>
          )}
        </td>
        <td className="py-2 pr-3 text-right tabular-nums">{est.llmCalls.toLocaleString('en-US')}</td>
        <td className="py-2 pr-3 text-right tabular-nums">{fmtTokens(est.tokensIn)} → {fmtTokens(est.tokensOut)}</td>
        <td className="py-2 pr-3 text-right tabular-nums text-[var(--app-text-muted)]">—</td>
        <td className="py-2 text-right tabular-nums">{fmtUsd(est.costUsd)}</td>
      </tr>
      <tr className={m ? '' : 'text-[var(--app-text-muted)]'}>
        <td className="py-2 pr-3"><SourceTag kind="measured" /></td>
        {m ? (
          <>
            <td className="py-2 pr-3 text-right tabular-nums">{m.llmCalls.toLocaleString('en-US')}</td>
            <td className="py-2 pr-3 text-right tabular-nums">{fmtTokens(m.tokensIn)} → {fmtTokens(m.tokensOut)}</td>
            <td className="py-2 pr-3 text-right tabular-nums">{fmtDuration(m.durationMs)}</td>
            <td className="py-2 text-right tabular-nums">{fmtUsd(m.costUsd)}</td>
          </>
        ) : (
          <td className="py-2 text-right italic" colSpan={4}>{row.ran ? 'not measured yet' : 'not run yet'}</td>
        )}
      </tr>
    </>
  );
}

function RevisionDiffEntryRow({ entry }: { entry: RevisionDiffEntry }) {
  const [showSource, setShowSource] = useState(false);
  return (
    <li className="rounded-[var(--radius)] border border-[var(--separator-opaque)] p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--app-text-muted)]">Draft (before)</div>
          <p className="whitespace-pre-wrap text-[var(--app-text-muted)]">{entry.draft}</p>
        </div>
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--app-accent)]">Revised (after)</div>
          <p className="whitespace-pre-wrap">{entry.revised}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setShowSource((s) => !s)}
        className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--app-text-muted)] hover:underline"
      >
        {showSource ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {showSource ? 'Hide source' : 'Show source'}
      </button>
      {showSource && <p className="mt-1 whitespace-pre-wrap text-xs text-[var(--app-text-muted)]">{entry.source}</p>}
    </li>
  );
}
