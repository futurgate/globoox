'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Play,
  Upload as UploadIcon,
  ShieldAlert,
  RefreshCw,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/ui/PageHeader';
import UploadBookModal from '@/components/UploadBookModal';
import { IOSAction, IOSActionStack } from '@/components/ui/ios-action-group';
import IOSFlowDialog from '@/components/ui/ios-flow-dialog';
import IOSDialogFooter from '@/components/ui/ios-dialog-footer';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  fetchBooks,
  fetchPlaygroundModels,
  fetchTranslationEstimate,
  startCostRun,
  getCostRunStatus,
  fetchCostRuns,
  COST_LAB_LANGS,
  type ApiBook,
  type CostLabLang,
  type BookTranslationEstimate,
  type CostRunStatus,
  type DbBookTranslationCostRun,
} from '@/lib/api';

const FALLBACK_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-pro-preview',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

const PREFERRED_MODEL = 'gemini-2.5-flash';
const POLL_MS = 2000;

const inputCls =
  'w-full rounded-[var(--radius)] border border-[var(--separator-opaque)] bg-[var(--app-surface-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--app-accent)]';

// ── formatters ───────────────────────────────────────────────────────────────

function fmtUsd(v?: number | null): string {
  if (v == null) return '—';
  if (v === 0) return '$0';
  return v < 0.01 ? `$${v.toFixed(5)}` : `$${v.toFixed(4)}`;
}

function fmtInt(v?: number | null): string {
  if (v == null) return '—';
  return v.toLocaleString();
}

function fmtNum(v?: number | null, digits = 0): string {
  if (v == null) return '—';
  return v.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function fmtDuration(ms?: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return `${m}m ${rem}s`;
}

function fmtDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: '2-digit',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type SortKey = 'date' | 'cost' | 'model';

export default function CostLabPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading, isAuthenticated } = useAuth();

  // ── data ──────────────────────────────────────────────────────────────────
  const [books, setBooks] = useState<ApiBook[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>(FALLBACK_MODELS);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsMeta, setModelsMeta] = useState<{ provider: string; fallback?: boolean } | null>(null);

  // ── run panel selection ─────────────────────────────────────────────────────
  const [bookId, setBookId] = useState<string>('');
  const [model, setModel] = useState<string>(PREFERRED_MODEL);
  const [lang, setLang] = useState<CostLabLang>('RU');

  const [uploadOpen, setUploadOpen] = useState(false);

  // ── estimate ────────────────────────────────────────────────────────────────
  const [estimate, setEstimate] = useState<BookTranslationEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  // ── real run / progress ──────────────────────────────────────────────────────
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [status, setStatus] = useState<CostRunStatus | null>(null);
  const jobIdRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  // ── history table ────────────────────────────────────────────────────────────
  const [runs, setRuns] = useState<DbBookTranslationCostRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterBook, setFilterBook] = useState<string>('');
  const [filterModel, setFilterModel] = useState<string>('');
  const [groupByRun, setGroupByRun] = useState(false);

  const isRunning = !!status && (status.state === 'waiting' || status.state === 'active');

  // ── loaders ────────────────────────────────────────────────────────────────
  const loadBooks = useCallback(async () => {
    setBooksLoading(true);
    try {
      const list = await fetchBooks();
      setBooks(list);
      setBookId((prev) => prev || list[0]?.id || '');
    } catch {
      /* keep whatever we have */
    } finally {
      setBooksLoading(false);
    }
  }, []);

  const loadModels = useCallback(async () => {
    setModelsLoading(true);
    try {
      const res = await fetchPlaygroundModels();
      if (res.models.length) {
        setAvailableModels(res.models);
        setModelsMeta({ provider: res.provider, fallback: res.fallback });
        setModel((prev) =>
          res.models.includes(prev)
            ? prev
            : res.models.includes(PREFERRED_MODEL)
              ? PREFERRED_MODEL
              : res.models[0]
        );
      }
    } catch {
      setModelsMeta({ provider: 'unknown', fallback: true });
    } finally {
      setModelsLoading(false);
    }
  }, []);

  const loadRuns = useCallback(async () => {
    setRunsLoading(true);
    try {
      const { runs: rows } = await fetchCostRuns({ limit: 200 });
      setRuns(rows);
    } catch {
      /* leave prior rows */
    } finally {
      setRunsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadBooks();
    loadModels();
    loadRuns();
  }, [isAdmin, loadBooks, loadModels, loadRuns]);

  // Estimate is stale whenever the (book, model, lang) selection changes.
  useEffect(() => {
    setEstimate(null);
    setEstimateError(null);
  }, [bookId, model, lang]);

  // ── polling ────────────────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const poll = useCallback(async () => {
    const jobId = jobIdRef.current;
    if (!jobId) return;
    try {
      const s = await getCostRunStatus(jobId);
      setStatus(s);
      if (startedAtRef.current) setElapsedMs(Date.now() - startedAtRef.current);
      if (s.state === 'completed' || s.state === 'failed') {
        stopPolling();
        jobIdRef.current = null;
        loadRuns();
      }
    } catch (e) {
      // A transient poll error shouldn't kill the run view; surface it but keep polling.
      setRunError(e instanceof Error ? e.message : 'Status poll failed');
    }
  }, [stopPolling, loadRuns]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const beginRun = useCallback(async () => {
    setConfirmOpen(false);
    setStarting(true);
    setRunError(null);
    setStatus(null);
    setElapsedMs(0);
    try {
      const { jobId } = await startCostRun({ bookId, model, lang });
      jobIdRef.current = jobId;
      startedAtRef.current = Date.now();
      setStatus({ state: 'waiting', progress: 0 });
      stopPolling();
      pollRef.current = setInterval(poll, POLL_MS);
      void poll();
    } catch (e) {
      setRunError(e instanceof Error ? e.message : 'Failed to start run');
    } finally {
      setStarting(false);
    }
  }, [bookId, model, lang, poll, stopPolling]);

  const handleEstimate = useCallback(async () => {
    if (!bookId) return;
    setEstimating(true);
    setEstimateError(null);
    try {
      const est = await fetchTranslationEstimate(bookId, { model, lang });
      setEstimate(est);
    } catch (e) {
      setEstimateError(e instanceof Error ? e.message : 'Estimate failed');
    } finally {
      setEstimating(false);
    }
  }, [bookId, model, lang]);

  const onUploaded = useCallback(
    (newBookId: string) => {
      setUploadOpen(false);
      loadBooks().then(() => setBookId(newBookId));
    },
    [loadBooks]
  );

  // ── derived: filtered + sorted history ─────────────────────────────────────
  const modelOptions = useMemo(
    () => [...new Set([...availableModels, ...runs.map((r) => r.model)])],
    [availableModels, runs]
  );

  const visibleRuns = useMemo(() => {
    let rows = runs;
    if (filterBook) rows = rows.filter((r) => r.book_id === filterBook);
    if (filterModel) rows = rows.filter((r) => r.model === filterModel);
    const sorted = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') cmp = a.created_at.localeCompare(b.created_at);
      else if (sortKey === 'cost') cmp = (a.cost_usd ?? 0) - (b.cost_usd ?? 0);
      else if (sortKey === 'model') cmp = a.model.localeCompare(b.model);
      return sortAsc ? cmp : -cmp;
    });
    if (groupByRun) {
      // Keep the chosen sort but cluster rows that share a run_id together, ordered
      // by each group's best (first-seen) position under the current sort.
      const order = new Map<string, number>();
      sorted.forEach((r, i) => {
        if (!order.has(r.run_id)) order.set(r.run_id, i);
      });
      return [...sorted].sort(
        (a, b) => (order.get(a.run_id)! - order.get(b.run_id)!) || 0
      );
    }
    return sorted;
  }, [runs, filterBook, filterModel, sortKey, sortAsc, groupByRun]);

  const bookFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of runs) {
      if (r.book_id) map.set(r.book_id, r.book_title || r.book_id);
    }
    return [...map.entries()];
  }, [runs]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  // ── access control ─────────────────────────────────────────────────────────
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
        <p className="text-sm text-[var(--app-text-muted)]">
          You don&apos;t have access to the translation cost lab.
        </p>
        <Button variant="outline" size="sm" onClick={() => router.push('/settings')}>
          Back to settings
        </Button>
      </div>
    );
  }

  const selectedBook = books.find((b) => b.id === bookId);
  const fromScratchUsd = estimate?.fromScratch.cost.totalUsd ?? null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24">
      <PageHeader title="Translation Cost Lab" />

      <p className="mb-5 text-sm text-[var(--app-text-muted)]">
        Measure the <strong>real</strong> first-time cost of translating a whole book on a chosen
        model — live LLM calls, cache bypassed, cold pricing — and browse the history of every
        measured run.
      </p>

      {/* ── Run panel ── */}
      <div className="space-y-4 rounded-[var(--radius)] border border-[var(--separator-opaque)] p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Book selector */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
              Book
            </label>
            <div className="flex gap-2">
              <select
                value={bookId}
                onChange={(e) => setBookId(e.target.value)}
                disabled={booksLoading}
                className={inputCls}
              >
                {books.length === 0 && <option value="">No books — upload one</option>}
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                    {b.author ? ` — ${b.author}` : ''}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUploadOpen(true)}
                title="Upload a new book"
              >
                <UploadIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Target language */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
              Target language
            </label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as CostLabLang)}
              className={inputCls}
            >
              {COST_LAB_LANGS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Model */}
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <label className="block text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
              Model
            </label>
            <button
              type="button"
              onClick={loadModels}
              disabled={modelsLoading}
              title="Refresh available models"
              className="inline-flex items-center gap-1 text-xs text-[var(--app-text-muted)] hover:text-[var(--app-accent)] disabled:opacity-50"
            >
              <RefreshCw className={'h-3 w-3' + (modelsLoading ? ' animate-spin' : '')} />
              {modelsMeta?.provider && modelsMeta.provider !== 'unknown'
                ? `${modelsMeta.provider}${modelsMeta.fallback ? ' · fallback' : ''}`
                : 'refresh'}
            </button>
          </div>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className={inputCls + ' sm:max-w-xs'}
          >
            {[...new Set([model, ...availableModels])].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--separator-opaque)] pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleEstimate}
            disabled={!bookId || estimating}
          >
            {estimating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Calculator className="h-4 w-4" />
            )}
            Estimate cost
          </Button>

          <Button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={!bookId || isRunning || starting}
          >
            {isRunning || starting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isRunning ? 'Running…' : 'Run real measurement'}
          </Button>

          {estimateError && (
            <span className="text-sm text-red-600 dark:text-red-400">{estimateError}</span>
          )}
          {runError && !isRunning && (
            <span className="text-sm text-red-600 dark:text-red-400">{runError}</span>
          )}
        </div>

        {/* Estimate result */}
        {estimate && (
          <div className="rounded-[var(--radius)] border border-[var(--separator-opaque)] bg-[var(--app-surface-bg)] p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
                Estimated cost · whole book · {estimate.model}
              </span>
              <span className="text-2xl font-bold tabular-nums">{fmtUsd(fromScratchUsd)}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--app-text-muted)]">
              <span>{fmtInt(estimate.bookStats.blockCount)} blocks</span>
              <span>{fmtInt(estimate.bookStats.totalChars)} chars</span>
              <span>{fmtInt(estimate.fromScratch.llmCalls)} LLM calls</span>
              <span>
                {fmtInt(estimate.fromScratch.tokens.fullInput)}→
                {fmtInt(estimate.fromScratch.tokens.estimatedOutput)} tok
              </span>
              {!estimate.pricing.known && (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3" /> pricing not in map
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-[var(--app-text-muted)]">
              Pure token math — no LLM called. Projects the cold, empty-cache run for one language.
            </p>
          </div>
        )}

        {/* Live progress */}
        {status && <RunProgress status={status} elapsedMs={elapsedMs} />}
      </div>

      {/* ── History table ── */}
      <div className="mt-8">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold">Measured runs</h2>
          <button
            type="button"
            onClick={loadRuns}
            disabled={runsLoading}
            className="inline-flex items-center gap-1 text-xs text-[var(--app-text-muted)] hover:text-[var(--app-accent)] disabled:opacity-50"
          >
            <RefreshCw className={'h-3 w-3' + (runsLoading ? ' animate-spin' : '')} /> refresh
          </button>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select
              value={filterBook}
              onChange={(e) => setFilterBook(e.target.value)}
              className={inputCls + ' w-auto py-1 text-xs'}
              title="Filter by book"
            >
              <option value="">All books</option>
              {bookFilterOptions.map(([id, title]) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </select>
            <select
              value={filterModel}
              onChange={(e) => setFilterModel(e.target.value)}
              className={inputCls + ' w-auto py-1 text-xs'}
              title="Filter by model"
            >
              <option value="">All models</option>
              {modelOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-[var(--app-text-muted)]">
              <input
                type="checkbox"
                checked={groupByRun}
                onChange={(e) => setGroupByRun(e.target.checked)}
              />
              Group by run
            </label>
          </div>
        </div>

        {visibleRuns.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-dashed border-[var(--separator-opaque)] p-10 text-center text-sm text-[var(--app-text-muted)]">
            {runsLoading
              ? 'Loading runs…'
              : runs.length === 0
                ? 'No measured runs yet. Run a real measurement above to populate this table.'
                : 'No runs match the current filters.'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--separator-opaque)]">
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--separator-opaque)] text-left text-xs uppercase tracking-wide text-[var(--app-text-muted)]">
                  <Th onClick={() => toggleSort('date')} active={sortKey === 'date'} asc={sortAsc}>
                    Date
                  </Th>
                  <Th>Book</Th>
                  <Th onClick={() => toggleSort('model')} active={sortKey === 'model'} asc={sortAsc}>
                    Model
                  </Th>
                  <Th>Lang</Th>
                  <Th onClick={() => toggleSort('cost')} active={sortKey === 'cost'} asc={sortAsc}>
                    Cost
                  </Th>
                  <Th>Chapters</Th>
                  <Th>Blocks</Th>
                  <Th>Avg / med chars</Th>
                  <Th>Tokens in/out</Th>
                  <Th>$ / block</Th>
                  <Th>$ / 1k chars</Th>
                  <Th>Duration</Th>
                  <Th>Errors</Th>
                </tr>
              </thead>
              <tbody>
                {visibleRuns.map((r, i) => {
                  const prev = visibleRuns[i - 1];
                  const groupBreak = groupByRun && prev && prev.run_id !== r.run_id;
                  return (
                    <tr
                      key={r.id}
                      className={
                        'border-b border-[var(--separator-opaque)] tabular-nums align-top ' +
                        (groupBreak ? 'border-t-2 border-t-[var(--app-accent)]/40 ' : '')
                      }
                    >
                      <td className="whitespace-nowrap px-3 py-2">{fmtDateTime(r.created_at)}</td>
                      <td className="max-w-[220px] truncate px-3 py-2" title={r.book_title ?? ''}>
                        {r.book_title ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--separator-opaque)] px-2 py-0.5 font-mono text-xs">
                          {r.model}
                          {!r.known_pricing && (
                            <AlertTriangle
                              className="h-3 w-3 text-amber-600 dark:text-amber-400"
                              aria-label="pricing not in map"
                            />
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2">{r.target_lang}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-semibold">
                        {fmtUsd(r.cost_usd)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {fmtInt(r.chapters_translated)}
                        {r.chapters_total != null && (
                          <span className="text-[var(--app-text-muted)]"> / {r.chapters_total}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">{fmtInt(r.blocks_translated)}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {fmtNum(r.avg_block_chars)} / {fmtNum(r.median_block_chars)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {fmtInt(r.tokens_in)}
                        <span className="text-[var(--app-text-muted)]">/</span>
                        {fmtInt(r.tokens_out)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">{fmtUsd(r.cost_per_block)}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {fmtUsd(r.cost_per_1k_source_chars)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">{fmtDuration(r.duration_ms)}</td>
                      <td className="px-3 py-2">
                        {r.batch_errors > 0 ? (
                          <span className="text-red-600 dark:text-red-400">{r.batch_errors}</span>
                        ) : (
                          <span className="text-[var(--app-text-muted)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-[var(--app-text-muted)]">
          <Info className="h-3 w-3" />
          Cold, first-time cost. The per-request chapter-summary cost is excluded, so figures are a
          documented lower bound.
        </p>
      </div>

      {/* ── Modals ── */}
      <UploadBookModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={onUploaded} />

      <IOSFlowDialog
        open={confirmOpen}
        onOpenChange={(next) => !next && setConfirmOpen(false)}
        className="sm:max-w-md sm:pb-6"
        title="Run a real measurement?"
        description="This makes live LLM calls and costs real money."
      >
        <div className="space-y-4">
          <div className="rounded-[20px] bg-[var(--bg-grouped)] p-5 text-sm">
            <p className="flex items-start gap-2 font-medium text-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              This translates the <strong>whole book</strong> with real LLM calls (cache bypassed).
            </p>
            <ul className="mt-3 space-y-1 text-muted-foreground">
              <li>
                Book: <span className="text-foreground">{selectedBook?.title ?? '—'}</span>
              </li>
              <li>
                Model: <span className="font-mono text-foreground">{model}</span>
              </li>
              <li>
                Target language: <span className="text-foreground">{lang}</span>
              </li>
              {fromScratchUsd != null && (
                <li>
                  Estimated cost:{' '}
                  <span className="text-foreground">{fmtUsd(fromScratchUsd)}</span>
                </li>
              )}
            </ul>
          </div>
          <IOSDialogFooter>
            <IOSActionStack>
              <IOSAction onClick={beginRun} emphasized>
                Run &amp; charge real money
              </IOSAction>
              <IOSAction onClick={() => setConfirmOpen(false)}>Cancel</IOSAction>
            </IOSActionStack>
          </IOSDialogFooter>
        </div>
      </IOSFlowDialog>
    </div>
  );
}

// ── progress panel ─────────────────────────────────────────────────────────────

function RunProgress({ status, elapsedMs }: { status: CostRunStatus; elapsedMs: number }) {
  const result = status.result;
  const partial = status.state === 'completed' && (result?.batch_errors ?? 0) > 0;
  const pct = Math.max(0, Math.min(100, Math.round(status.progress || 0)));

  const barColor =
    status.state === 'failed'
      ? 'bg-red-500'
      : partial
        ? 'bg-amber-500'
        : status.state === 'completed'
          ? 'bg-emerald-500'
          : 'bg-primary';

  return (
    <div className="rounded-[var(--radius)] border border-[var(--separator-opaque)] bg-[var(--app-surface-bg)] p-4">
      <div className="mb-2 flex items-center justify-between gap-2 text-sm">
        <span className="inline-flex items-center gap-2 font-medium">
          {status.state === 'completed' && !partial && (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          )}
          {status.state === 'completed' && partial && (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
          {status.state === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
          {(status.state === 'waiting' || status.state === 'active') && (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          {status.state === 'completed'
            ? partial
              ? `Completed with ${result?.batch_errors} batch error(s)`
              : 'Completed'
            : status.state === 'failed'
              ? 'Failed'
              : status.state === 'waiting'
                ? 'Queued…'
                : 'Translating…'}
        </span>
        <span className="tabular-nums text-[var(--app-text-muted)]">{pct}%</span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--fill-quaternary)]">
        <div
          className={'h-2 rounded-full transition-all duration-300 ' + barColor}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--app-text-muted)] tabular-nums">
        {status.batchesTotal != null && (
          <span>
            batch {status.batchesDone ?? 0} / {status.batchesTotal}
          </span>
        )}
        <span>{fmtDuration(elapsedMs)} elapsed</span>
        {(status.tokensIn != null || status.tokensOut != null) && (
          <span>
            {fmtInt(status.tokensIn ?? 0)}→{fmtInt(status.tokensOut ?? 0)} tok
          </span>
        )}
        {status.costUsd != null && <span>{fmtUsd(status.costUsd)} so far</span>}
      </div>

      {status.state === 'failed' && status.failReason && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{status.failReason}</p>
      )}

      {status.state === 'completed' && result && (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-[var(--separator-opaque)] pt-3 text-xs">
          <span className="font-semibold">{fmtUsd(result.cost_usd)}</span>
          <span className="text-[var(--app-text-muted)]">
            {fmtInt(result.blocks_translated)} blocks
          </span>
          <span className="text-[var(--app-text-muted)]">
            {fmtInt(result.tokens_in)}→{fmtInt(result.tokens_out)} tok
          </span>
          <span className="text-[var(--app-text-muted)]">
            {fmtDuration(result.duration_ms)}
          </span>
          <span className="text-emerald-600 dark:text-emerald-400">saved to history ↓</span>
        </div>
      )}
    </div>
  );
}

// ── table header cell ──────────────────────────────────────────────────────────

function Th({
  children,
  onClick,
  active,
  asc,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  asc?: boolean;
}) {
  return (
    <th
      className={
        'whitespace-nowrap px-3 py-2 font-medium ' +
        (onClick ? 'cursor-pointer select-none hover:text-[var(--app-accent)]' : '')
      }
      onClick={onClick}
    >
      {children}
      {active && <span className="ml-1">{asc ? '▲' : '▼'}</span>}
    </th>
  );
}
