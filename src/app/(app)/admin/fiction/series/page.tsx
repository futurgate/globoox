'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ShieldAlert, Upload, RefreshCw, Library, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/ui/PageHeader';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  listSeries,
  getSeries,
  uploadSeriesZip,
  type SeriesListItem,
  type SeriesDetail,
  type SeriesVolume,
} from '@/lib/api';

const inputCls =
  'w-full rounded-[var(--radius)] border border-[var(--separator-opaque)] bg-[var(--app-surface-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--app-accent)]';

// Genre drives the starter glossary + recipe later; manual choice at upload (MVP).
const GENRES = [
  { value: 'litrpg', label: 'LitRPG' },
  { value: 'nonfiction', label: 'Non-fiction' },
  { value: 'other', label: 'Other' },
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

function VolumeRow({ vol }: { vol: SeriesVolume }) {
  const proc = PROCESSING_BADGE[vol.processingStatus] ?? PROCESSING_BADGE.ready;
  return (
    <div className="rounded-[var(--radius)] border border-[var(--separator-opaque)] bg-[var(--app-surface-bg)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--app-text-muted)]">
              Vol {vol.volumeNumber ?? '—'}
            </span>
            <span className="truncate text-sm font-medium">{vol.title}</span>
          </div>
          {vol.author && (
            <div className="truncate text-xs text-[var(--app-text-muted)]">{vol.author}</div>
          )}
        </div>
        <span className={`shrink-0 text-xs font-medium ${proc.cls}`}>{proc.label}</span>
      </div>

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
                  {t.errorChapters > 0 && (
                    <span className="ml-1 text-red-600">({t.errorChapters} err)</span>
                  )}
                </span>
              </div>
              <ProgressBar percent={t.percent} />
            </div>
          ))
        )}
      </div>
    </div>
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

  useEffect(() => {
    if (isAdmin) loadSeries();
  }, [isAdmin, loadSeries]);

  useEffect(() => {
    if (isAdmin) loadDetail(selectedId);
  }, [isAdmin, selectedId, loadDetail]);

  // Poll the selected series while any volume is still parsing or translating.
  useEffect(() => {
    if (!isAdmin || !selectedId || !detail) return;
    const busy =
      detail.volumes.some((v) => v.processingStatus === 'pending' || v.processingStatus === 'processing') ||
      detail.volumes.some((v) => v.translations.some((t) => t.state !== 'complete' && t.doneChapters > 0));
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
          {detail.volumes.length === 0 ? (
            <p className="text-sm text-[var(--app-text-muted)]">No volumes in this series yet.</p>
          ) : (
            <div className="space-y-3">
              {detail.volumes.map((v) => (
                <VolumeRow key={v.bookId} vol={v} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
