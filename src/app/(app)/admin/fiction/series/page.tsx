'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ShieldAlert, Upload, RefreshCw, Library, ChevronLeft, FlaskConical, Play, RotateCcw, Activity, AlertTriangle, BellRing, Check, Wand2, Download, Copy, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/ui/PageHeader';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  listSeries,
  getSeries,
  uploadSeriesZip,
  runSeries,
  restartSeriesStep,
  listAttention,
  resolveAttentionItem,
  editSeriesGlossary,
  fetchPlaygroundModels,
  downloadSeriesTranslated,
  downloadTranslatedEpub,
  getGlossary,
  type SeriesListItem,
  type SeriesDetail,
  type SeriesVolume,
  type SeriesLiveness,
  type AttentionItem,
  type GlossaryEditResult,
  type GlossaryStatus,
} from '@/lib/api';

const inputCls =
  'w-full rounded-[var(--radius)] border border-[var(--separator-opaque)] bg-[var(--app-surface-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--app-accent)]';

// Genre drives the starter glossary + recipe later; manual choice at upload (MVP).
const GENRES = [
  { value: 'litrpg', label: 'LitRPG' },
  { value: 'nonfiction', label: 'Non-fiction' },
  { value: 'other', label: 'Other' },
];

// Static fallback for the per-stage model pickers until /api/admin/models resolves.
const FALLBACK_MODELS = [
  'gemini-4-hydrogen',
  'gemini-3.5-flash',
  'gemini-3.1-pro-preview',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
];

const PROCESSING_BADGE: Record<SeriesVolume['processingStatus'], { label: string; cls: string }> = {
  pending: { label: 'Queued', cls: 'text-amber-600' },
  processing: { label: 'Parsing…', cls: 'text-blue-600' },
  ready: { label: 'Ready', cls: 'text-emerald-600' },
  error: { label: 'Error', cls: 'text-red-600' },
};

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--separator-opaque)]">
      <div
        className="h-full rounded-full bg-[var(--app-accent)] transition-[width]"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

const LIVENESS: Record<Exclude<SeriesLiveness, null>, { label: string; cls: string }> = {
  moving: { label: 'moving', cls: 'text-emerald-600' },
  waiting_quota: { label: 'waiting on quota', cls: 'text-amber-600' },
  stalled: { label: 'stalled', cls: 'text-red-600' },
};

function LivenessBadge({ liveness }: { liveness: SeriesLiveness }) {
  if (!liveness) return null;
  const l = LIVENESS[liveness];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${l.cls}`}>
      <Activity className="h-3 w-3" />
      {l.label}
    </span>
  );
}

function WarningsChip({ w }: { w: NonNullable<SeriesVolume['warnings']> }) {
  const parts: string[] = [];
  if (w.retries) parts.push(`${w.retries} retries`);
  if (w.splitRetries) parts.push(`${w.splitRetries} split`);
  if (w.flaggedBlocks) parts.push(`${w.flaggedBlocks} flagged`);
  if (parts.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600" title="Recovered under load — not failures">
      <AlertTriangle className="h-3 w-3" />
      {parts.join(' · ')}
    </span>
  );
}

function VolumeRow({
  vol,
  lang,
  onRestart,
  restarting,
}: {
  vol: SeriesVolume;
  lang: string;
  onRestart?: (bookId: string, step: 'step0' | 'translate') => void;
  restarting?: string | null;
}) {
  const proc = PROCESSING_BADGE[vol.processingStatus] ?? PROCESSING_BADGE.ready;
  const gloss = vol.glossary ?? [];

  // On-demand glossary view + copy + translated-EPUB download for this volume.
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [glossaryData, setGlossaryData] = useState<GlossaryStatus | null>(null);
  const [glossaryLoading, setGlossaryLoading] = useState(false);
  const [glossaryErr, setGlossaryErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloadingVol, setDownloadingVol] = useState(false);
  const hasGlossary = gloss.length > 0;
  const glossaryJson = glossaryData?.glossary ? JSON.stringify(glossaryData.glossary, null, 2) : '';

  const toggleGlossary = async () => {
    if (glossaryOpen) { setGlossaryOpen(false); return; }
    setGlossaryOpen(true);
    if (glossaryData) return;
    setGlossaryLoading(true);
    setGlossaryErr(null);
    try {
      setGlossaryData(await getGlossary(vol.bookId, lang));
    } catch (e) {
      setGlossaryErr(e instanceof Error ? e.message : 'Failed to load glossary');
    } finally {
      setGlossaryLoading(false);
    }
  };

  const copyGlossary = async () => {
    if (!glossaryJson) return;
    try {
      await navigator.clipboard.writeText(glossaryJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard denied */ }
  };

  const downloadVol = async () => {
    setDownloadingVol(true);
    try { await downloadTranslatedEpub(vol.bookId, lang); }
    catch { /* surfaced as a browser error; keep the row quiet */ }
    finally { setDownloadingVol(false); }
  };
  // Offer a restart when a step is stalled or a step-0/translation errored.
  const glossErrored = gloss.some((g) => g.status === 'error');
  const transErrored = vol.translations.some((t) => t.errorChapters > 0 && t.state !== 'complete');
  const stalled = vol.liveness === 'stalled';
  const canRestartStep0 = !!onRestart && (glossErrored || (stalled && gloss.some((g) => g.status === 'building')));
  const canRestartTranslate = !!onRestart && (transErrored || (stalled && !gloss.some((g) => g.status === 'building')));
  const busyStep0 = restarting === `${vol.bookId}:step0`;
  const busyTranslate = restarting === `${vol.bookId}:translate`;

  return (
    <div className="rounded-[var(--radius)] border border-[var(--separator-opaque)] bg-[var(--app-surface-bg)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--app-text-muted)]">Vol {vol.volumeNumber ?? '—'}</span>
            <span className="truncate text-sm font-medium">{vol.title}</span>
            <LivenessBadge liveness={vol.liveness ?? null} />
          </div>
          {vol.author && <div className="truncate text-xs text-[var(--app-text-muted)]">{vol.author}</div>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`text-xs font-medium ${proc.cls}`}>{proc.label}</span>
          {vol.warnings && <WarningsChip w={vol.warnings} />}
        </div>
      </div>

      {/* Step 0 (glossary) status */}
      {gloss.length > 0 && (
        <div className="mt-2 space-y-1">
          {gloss.map((g) => (
            <div key={g.language} className="flex items-center justify-between text-xs">
              <span className="font-medium">Step 0 · {g.language}</span>
              <span className="text-[var(--app-text-muted)]">
                {g.frozen ? '🔒 frozen' : g.status}
                {g.chaptersTotal > 0 && ` · ${g.chaptersDone}/${g.chaptersTotal}`}
                {g.status === 'error' && <span className="ml-1 text-red-600">error</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 space-y-2">
        {vol.translations.length === 0 ? (
          <p className="text-xs text-[var(--app-text-muted)]">No translations yet.</p>
        ) : (
          vol.translations.map((t) => (
            <div key={t.language} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{t.language}</span>
                <span className="text-[var(--app-text-muted)]">
                  {t.doneChapters}/{t.totalChapters} ch · {t.percent}%
                  {t.errorChapters > 0 && <span className="ml-1 text-red-600">({t.errorChapters} err)</span>}
                </span>
              </div>
              <ProgressBar percent={t.percent} />
            </div>
          ))
        )}
      </div>

      {/* Glossary view/copy + translated-EPUB download for this volume. */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {hasGlossary && (
          <Button variant="outline" size="sm" onClick={toggleGlossary}>
            <ScrollText className="mr-1 h-3 w-3" />
            {glossaryOpen ? 'Hide glossary' : 'Glossary'}
          </Button>
        )}
        <Button variant="outline" size="sm" disabled={downloadingVol} onClick={downloadVol} title={`Download the translated EPUB (${lang})`}>
          <Download className={`mr-1 h-3 w-3 ${downloadingVol ? 'animate-pulse' : ''}`} />
          EPUB
        </Button>
      </div>

      {glossaryOpen && (
        <div className="mt-2 rounded-[var(--radius)] border border-[var(--separator-opaque)] bg-[var(--app-bg)] p-2">
          {glossaryLoading ? (
            <div className="flex items-center gap-2 text-xs text-[var(--app-text-muted)]"><Loader2 className="h-3 w-3 animate-spin" /> Loading…</div>
          ) : glossaryErr ? (
            <p className="text-xs text-red-600">{glossaryErr}</p>
          ) : glossaryJson ? (
            <>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-[var(--app-text-muted)]">
                  {glossaryData?.frozen ? '🔒 frozen · ' : ''}
                  {(glossaryData?.glossary?.named_entities?.length ?? 0)} names · {(glossaryData?.glossary?.terminology?.length ?? 0)} terms
                </span>
                <Button variant="ghost" size="sm" onClick={copyGlossary}>
                  {copied ? <Check className="mr-1 h-3 w-3 text-emerald-600" /> : <Copy className="mr-1 h-3 w-3" />}
                  {copied ? 'Copied' : 'Copy JSON'}
                </Button>
              </div>
              <pre className="max-h-72 overflow-auto rounded bg-[var(--app-surface-bg)] p-2 text-[11px] leading-snug">{glossaryJson}</pre>
            </>
          ) : (
            <p className="text-xs text-[var(--app-text-muted)]">No glossary content.</p>
          )}
        </div>
      )}

      {(canRestartStep0 || canRestartTranslate) && (
        <div className="mt-2 flex items-center gap-2">
          {canRestartStep0 && (
            <Button variant="outline" size="sm" disabled={busyStep0} onClick={() => onRestart!(vol.bookId, 'step0')}>
              <RotateCcw className={`mr-1 h-3 w-3 ${busyStep0 ? 'animate-spin' : ''}`} />
              Restart step 0
            </Button>
          )}
          {canRestartTranslate && (
            <Button variant="outline" size="sm" disabled={busyTranslate} onClick={() => onRestart!(vol.bookId, 'translate')}>
              <RotateCcw className={`mr-1 h-3 w-3 ${busyTranslate ? 'animate-spin' : ''}`} />
              Restart translate
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function AttentionPanel({
  items,
  onResolve,
  resolvingId,
  onSelectSeries,
}: {
  items: AttentionItem[];
  onResolve: (id: string) => void;
  resolvingId: string | null;
  onSelectSeries?: (seriesId: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mb-6 rounded-[var(--radius)] border border-amber-300 bg-amber-50 p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800">
        <BellRing className="h-4 w-4" />
        Needs attention ({items.length})
      </h2>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-start justify-between gap-3 rounded-[var(--radius)] bg-[var(--app-surface-bg)] p-2.5">
            <div className="min-w-0 text-xs">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-medium">{it.seriesName ?? it.bookTitle}</span>
                {it.seriesName && <span className="text-[var(--app-text-muted)]">· {it.bookTitle}</span>}
                {it.step && <span className="text-[var(--app-text-muted)]">· {it.step}</span>}
                <span className="text-[var(--app-text-muted)]">· {it.language}</span>
                {it.kind && <Badge variant="secondary">{it.kind}</Badge>}
              </div>
              <div className="mt-0.5 text-[var(--app-text-muted)]">{it.reason}</div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {it.seriesId && onSelectSeries && (
                <Button variant="ghost" size="sm" onClick={() => onSelectSeries(it.seriesId!)}>
                  Open
                </Button>
              )}
              <Button variant="outline" size="sm" disabled={resolvingId === it.id} onClick={() => onResolve(it.id)}>
                {resolvingId === it.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function FictionSeriesPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading, isAuthenticated } = useAuth();

  const [series, setSeries] = useState<SeriesListItem[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<SeriesDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload form
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [genre, setGenre] = useState('litrpg');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  // Full-flow run / restart
  const [downloadingSeries, setDownloadingSeries] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runMsg, setRunMsg] = useState<string | null>(null);
  const [restarting, setRestarting] = useState<string | null>(null);
  const [fresh, setFresh] = useState(false);

  // Per-stage model pickers ('' = use the recipe default for that stage).
  const [availableModels, setAvailableModels] = useState<string[]>(FALLBACK_MODELS);
  const [glossaryModel, setGlossaryModel] = useState('');
  const [translateModel, setTranslateModel] = useState('');

  // Attention queue (what needs a human)
  const [attention, setAttention] = useState<AttentionItem[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Glossary edit (M1.7 §2.3/2.4)
  const [geKind, setGeKind] = useState<'named_entity' | 'terminology'>('named_entity');
  const [geSource, setGeSource] = useState('');
  const [geTarget, setGeTarget] = useState('');
  const [geForms, setGeForms] = useState('');
  const [geBusy, setGeBusy] = useState(false);
  const [geResult, setGeResult] = useState<GlossaryEditResult | null>(null);

  const loadAttention = useCallback(async () => {
    try {
      setAttention(await listAttention());
    } catch {
      /* non-fatal: the queue panel just stays empty */
    }
  }, []);

  const handleResolve = useCallback(async (id: string) => {
    setResolvingId(id);
    try {
      await resolveAttentionItem(id);
      setAttention((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to resolve item');
    } finally {
      setResolvingId(null);
    }
  }, []);

  const loadSeries = useCallback(async () => {
    setSeriesLoading(true);
    setError(null);
    try {
      setSeries(await listSeries());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load series');
    } finally {
      setSeriesLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    if (!id) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    setError(null);
    try {
      setDetail(await getSeries(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load series detail');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleRun = useCallback(async () => {
    if (!detail) return;
    setRunning(true);
    setRunMsg(null);
    setError(null);
    try {
      const r = await runSeries(detail.id, {
        glossaryModel: glossaryModel || undefined,
        translateModel: translateModel || undefined,
        fresh,
      });
      const warn = r.volumesNotReady.length ? ` (${r.volumesNotReady.length} vol still parsing)` : '';
      setRunMsg(`Started${fresh ? ' FRESH' : ''}: step 0 v${r.enqueued.volumeNumber} · ${r.lang} · glossary ${r.glossaryModel} · translate ${r.translateModel}${warn}`);
      loadDetail(detail.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start full-flow');
    } finally {
      setRunning(false);
    }
  }, [detail, loadDetail, glossaryModel, translateModel, fresh]);

  // Target language for downloads / glossary view — from the recipe direction
  // (e.g. "RU->EN" → EN), else any volume's glossary/translation language.
  const targetLang = useMemo(() => {
    if (!detail) return 'EN';
    const fromRecipe = detail.recipe?.direction?.split('->')?.[1];
    if (fromRecipe) return fromRecipe.toUpperCase();
    for (const v of detail.volumes) {
      if (v.glossary?.length) return v.glossary[0].language.toUpperCase();
      if (v.translations.length) return v.translations[0].language.toUpperCase();
    }
    return 'EN';
  }, [detail]);

  const handleDownloadSeries = useCallback(async () => {
    if (!detail) return;
    setDownloadingSeries(true);
    setDownloadMsg(null);
    setError(null);
    try {
      const { skipped } = await downloadSeriesTranslated(detail.id, targetLang);
      setDownloadMsg(skipped.length ? `Downloaded. Skipped (not fully translated): vol ${skipped.join(', ')}` : 'Downloaded all translated volumes.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setDownloadingSeries(false);
    }
  }, [detail, targetLang]);

  const handleGlossaryEdit = useCallback(async () => {
    if (!detail || !geSource.trim() || !geTarget.trim()) return;
    setGeBusy(true);
    setGeResult(null);
    setError(null);
    try {
      const forms = geForms.split(',').map((s) => s.trim()).filter(Boolean);
      const r = await editSeriesGlossary(detail.id, [
        { kind: geKind, source: geSource.trim(), target: geTarget.trim(), ...(forms.length ? { forms } : {}) },
      ]);
      setGeResult(r);
      setGeSource('');
      setGeTarget('');
      setGeForms('');
      loadDetail(detail.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Glossary edit failed');
    } finally {
      setGeBusy(false);
    }
  }, [detail, geKind, geSource, geTarget, geForms, loadDetail]);

  const handleRestart = useCallback(
    async (bookId: string, step: 'step0' | 'translate') => {
      if (!detail) return;
      setRestarting(`${bookId}:${step}`);
      setError(null);
      try {
        await restartSeriesStep(detail.id, bookId, step);
        loadDetail(detail.id);
        loadAttention();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to restart step');
      } finally {
        setRestarting(null);
      }
    },
    [detail, loadDetail, loadAttention],
  );

  useEffect(() => {
    if (isAdmin) loadSeries();
  }, [isAdmin, loadSeries]);

  // Discover the provider's models for the per-stage pickers (best-effort).
  useEffect(() => {
    if (!isAdmin) return;
    fetchPlaygroundModels()
      .then((res) => { if (res.models.length) setAvailableModels(res.models); })
      .catch(() => { /* keep fallback */ });
  }, [isAdmin]);

  // Keep the attention queue fresh (it's the "what needs me" surface).
  useEffect(() => {
    if (!isAdmin) return;
    loadAttention();
    const timer = setInterval(loadAttention, 15000);
    return () => clearInterval(timer);
  }, [isAdmin, loadAttention]);

  useEffect(() => {
    if (isAdmin) loadDetail(selectedId);
  }, [isAdmin, selectedId, loadDetail]);

  // Poll the selected series while any volume is still parsing or translating.
  useEffect(() => {
    if (!isAdmin || !selectedId || !detail) return;
    const busy =
      detail.volumes.some((v) => v.processingStatus === 'pending' || v.processingStatus === 'processing') ||
      detail.volumes.some((v) => v.translations.some((t) => t.state !== 'complete' && t.doneChapters > 0)) ||
      // A step is live (orchestrator running) — keep polling to show progress.
      detail.volumes.some((v) => !!v.liveness) ||
      detail.volumes.some((v) => (v.glossary ?? []).some((g) => g.status === 'building'));
    if (!busy) return;
    const timer = setInterval(() => loadDetail(selectedId), 5000);
    return () => clearInterval(timer);
  }, [isAdmin, selectedId, detail, loadDetail]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadMsg(null);
    setError(null);
    try {
      const result = await uploadSeriesZip(file, { name: name.trim() || undefined, genre });
      const failed = result.failures?.length ?? 0;
      setUploadMsg(
        `Created "${result.name}" with ${result.books.length} volume(s)` +
          (failed ? `, ${failed} failed` : '')
      );
      setFile(null);
      setName('');
      if (fileRef.current) fileRef.current.value = '';
      await loadSeries();
      setSelectedId(result.seriesId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Series upload failed');
    } finally {
      setUploading(false);
    }
  };

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
        <PageHeader title="Fiction Series" />
        <Link href="/admin/fiction">
          <Button variant="outline" size="sm">
            <ChevronLeft className="mr-1 h-3.5 w-3.5" />
            Single book
          </Button>
        </Link>
      </div>

      <p className="mb-5 text-sm text-[var(--app-text-muted)]">
        Upload a ZIP of a whole series (one EPUB per volume in the archive root). Each volume is
        parsed like a normal upload; volumes are ordered by filename. Select a series below to watch
        per-volume translation progress.
      </p>

      {error && (
        <div className="mb-4 rounded-[var(--radius)] border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Attention queue — what needs a human (M1.6b). */}
      <AttentionPanel
        items={attention}
        onResolve={handleResolve}
        resolvingId={resolvingId}
        onSelectSeries={(id) => setSelectedId(id)}
      />

      {/* Upload */}
      <section className="mb-6 rounded-[var(--radius)] border border-[var(--separator-opaque)] p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Upload className="h-4 w-4" />
          Upload series ZIP
        </h2>
        <div className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept=".zip,application/zip"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-3 file:rounded-[var(--radius)] file:border-0 file:bg-[var(--app-accent)] file:px-3 file:py-1.5 file:text-sm file:text-white"
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className={inputCls}
              placeholder="Series name (optional — defaults to ZIP filename)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <select className={inputCls} value={genre} onChange={(e) => setGenre(e.target.value)}>
              {GENRES.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
            {uploadMsg && <span className="text-sm text-emerald-600">{uploadMsg}</span>}
          </div>
        </div>
      </section>

      {/* Series picker */}
      <section className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <Library className="h-4 w-4" />
            Series
          </label>
          <Button variant="outline" size="sm" onClick={loadSeries} disabled={seriesLoading}>
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${seriesLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <select
          className={inputCls}
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">— Select a series —</option>
          {series.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.bookCount} vol{s.bookCount === 1 ? '' : 's'}
              {s.genre ? ` · ${s.genre}` : ''})
            </option>
          ))}
        </select>
      </section>

      {/* Detail */}
      {detailLoading && !detail && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--app-text-muted)]" />
        </div>
      )}

      {detail && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {detail.name}
              {detail.genre && (
                <Badge variant="secondary" className="ml-2">
                  {detail.genre}
                </Badge>
              )}
            </h2>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs text-[var(--app-text-muted)]" title="Rebuild the glossary + overwrite the translation, ignoring anything already generated">
                <input type="checkbox" checked={fresh} onChange={(e) => setFresh(e.target.checked)} />
                from scratch
              </label>
              <Button
                size="sm"
                onClick={handleRun}
                disabled={running || !detail.recipe}
                title={detail.recipe ? 'Start the full-flow for this series' : 'No recipe for this genre'}
              >
                {running ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1 h-3.5 w-3.5" />}
                Run full-flow
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadSeries}
                disabled={downloadingSeries}
                title={`Download a ZIP of the translated EPUBs (${targetLang})`}
              >
                {downloadingSeries ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1 h-3.5 w-3.5" />}
                Download {targetLang}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadDetail(detail.id)}
                disabled={detailLoading}
              >
                <RefreshCw className={`mr-1 h-3.5 w-3.5 ${detailLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Per-stage model pickers for the full-flow run (M). '' = recipe default. */}
          <div className="mb-3 flex flex-col gap-2 text-xs sm:flex-row sm:items-center">
            <label className="flex items-center gap-1.5">
              <span className="text-[var(--app-text-muted)]">Glossary model:</span>
              <select className="rounded-[var(--radius)] border border-[var(--separator-opaque)] bg-[var(--app-surface-bg)] px-2 py-1" value={glossaryModel} onChange={(e) => setGlossaryModel(e.target.value)}>
                <option value="">Recipe default{detail.recipe ? ` (${detail.recipe.model})` : ''}</option>
                {availableModels.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              <span className="text-[var(--app-text-muted)]">Translate model:</span>
              <select className="rounded-[var(--radius)] border border-[var(--separator-opaque)] bg-[var(--app-surface-bg)] px-2 py-1" value={translateModel} onChange={(e) => setTranslateModel(e.target.value)}>
                <option value="">Recipe default{detail.recipe ? ` (${detail.recipe.model})` : ''}</option>
                {availableModels.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
          </div>

          {runMsg && <p className="mb-3 text-sm text-emerald-600">{runMsg}</p>}
          {downloadMsg && <p className="mb-3 text-sm text-[var(--app-text-muted)]">{downloadMsg}</p>}
          {detail.gate && detail.gate.waiting > 0 && (
            <div className="mb-3 flex items-center gap-2 rounded-[var(--radius)] border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <Activity className="h-3.5 w-3.5" />
              Rate-gate is throttling: {detail.gate.waiting} call(s) waiting on quota
              {detail.gate.rate429 > 0 && `, ${detail.gate.rate429} × 429 recovered`}. Running steps are healthy, just pacing.
            </div>
          )}

          {/* Recipe: the settings the full-flow uses for this genre (M1.2). */}
          {detail.recipe ? (
            <div className="mb-4 rounded-[var(--radius)] border border-[var(--separator-opaque)] bg-[var(--app-surface-bg)] p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <FlaskConical className="h-4 w-4" />
                Recipe: {detail.recipe.name}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[var(--app-text-muted)] sm:grid-cols-3">
                <div><span className="font-medium text-[var(--app-text)]">Direction:</span> {detail.recipe.direction}</div>
                <div><span className="font-medium text-[var(--app-text)]">Model:</span> {detail.recipe.model}</div>
                <div><span className="font-medium text-[var(--app-text)]">Units:</span> {detail.recipe.units}</div>
                <div><span className="font-medium text-[var(--app-text)]">Seed glossary:</span> {detail.recipe.seedGlossary}</div>
                <div><span className="font-medium text-[var(--app-text)]">Step 0:</span> {detail.recipe.prompts.step0}</div>
                <div><span className="font-medium text-[var(--app-text)]">Translate:</span> {detail.recipe.prompts.translate}</div>
              </div>
            </div>
          ) : detail.genre ? (
            <p className="mb-4 text-xs text-[var(--app-text-muted)]">
              No recipe defined for genre &ldquo;{detail.genre}&rdquo; yet.
            </p>
          ) : null}

          {/* Glossary edit (M1.7): change a name/term across the series and
              re-translate only the paragraphs that use it. */}
          <details className="mb-4 rounded-[var(--radius)] border border-[var(--separator-opaque)] bg-[var(--app-surface-bg)] p-3">
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <Wand2 className="h-4 w-4" />
              Edit glossary entry (re-translates affected paragraphs across all volumes)
            </summary>
            <div className="mt-3 space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row">
                <select className={inputCls} value={geKind} onChange={(e) => setGeKind(e.target.value as 'named_entity' | 'terminology')}>
                  <option value="named_entity">Name / entity</option>
                  <option value="terminology">Term</option>
                </select>
                <input className={inputCls} placeholder="Source (e.g. Крайт)" value={geSource} onChange={(e) => setGeSource(e.target.value)} />
                <input className={inputCls} placeholder="New target (e.g. Krayt)" value={geTarget} onChange={(e) => setGeTarget(e.target.value)} />
              </div>
              <input className={inputCls} placeholder="Forms / aliases, comma-separated (optional)" value={geForms} onChange={(e) => setGeForms(e.target.value)} />
              <div className="flex items-center gap-3">
                <Button size="sm" onClick={handleGlossaryEdit} disabled={geBusy || !geSource.trim() || !geTarget.trim()}>
                  {geBusy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Wand2 className="mr-1 h-3.5 w-3.5" />}
                  Apply + re-translate
                </Button>
                <span className="text-xs text-[var(--app-text-muted)]">Runs inline; capped at 300 blocks per call.</span>
              </div>
              {geResult && (
                <div className="mt-1 rounded-[var(--radius)] bg-[var(--separator-opaque)] p-2 text-xs">
                  <div className="font-medium">
                    {geResult.reason}
                    {geResult.capped && <span className="ml-1 text-amber-600">(capped — re-run for the rest)</span>}
                  </div>
                  {geResult.volumes.map((v) => (
                    <div key={v.bookId} className="text-[var(--app-text-muted)]">
                      Vol {v.volumeNumber ?? '—'}: {v.skipped ? v.skipped : `${v.affectedBlocks ?? 0} affected · ${v.applied ?? 0} re-translated`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>

          {detail.volumes.length === 0 ? (
            <p className="text-sm text-[var(--app-text-muted)]">No volumes in this series yet.</p>
          ) : (
            <div className="space-y-3">
              {detail.volumes.map((v) => (
                <VolumeRow key={v.bookId} vol={v} lang={targetLang} onRestart={handleRestart} restarting={restarting} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
