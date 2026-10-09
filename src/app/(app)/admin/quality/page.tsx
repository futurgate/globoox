'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  ShieldAlert,
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/ui/PageHeader';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  fetchBooks,
  runTranslationQuality,
  ApiRequestError,
  type ApiBook,
  type QualityTargetLang,
  type TranslationQualityReport,
} from '@/lib/api';

const LANGS: QualityTargetLang[] = ['EN', 'FR', 'ES', 'RU'];

const inputCls =
  'w-full rounded-[var(--radius)] border border-[var(--separator-opaque)] bg-[var(--app-surface-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--app-accent)]';

function fmtNum(v?: number | null, digits = 0): string {
  if (v == null) return '—';
  return v.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export default function QualityPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading, isAuthenticated } = useAuth();

  const [books, setBooks] = useState<ApiBook[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [bookId, setBookId] = useState<string>('');
  const [targetLang, setTargetLang] = useState<QualityTargetLang>('EN');
  const [genre, setGenre] = useState<'fiction' | 'nonfiction'>('fiction');

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<TranslationQualityReport | null>(null);

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

  useEffect(() => {
    if (isAdmin) void loadBooks();
  }, [isAdmin, loadBooks]);

  const run = useCallback(async () => {
    if (!bookId) return;
    setRunning(true);
    setError(null);
    setReport(null);
    try {
      const res = await runTranslationQuality({ bookId, targetLang, genre });
      setReport(res);
    } catch (e) {
      if (e instanceof ApiRequestError) {
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : 'Quality check failed');
      }
    } finally {
      setRunning(false);
    }
  }, [bookId, targetLang, genre]);

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
          You don&apos;t have access to the admin area.
        </p>
        <Button variant="outline" size="sm" onClick={() => router.push('/settings')}>
          Back to settings
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-[calc(1rem+env(safe-area-inset-top)+76px)] pb-24">
      <PageHeader title="Translation Quality" />

      <p className="mb-5 text-sm text-[var(--app-text-muted)]">
        Deterministic QA of a finished translation against its source — no LLM, no reading.
        First version; a smarter algorithm will replace the engine later.
      </p>

      {/* ── Run panel ──────────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--app-text-muted)]">Book</span>
          <select
            className={inputCls}
            value={bookId}
            onChange={(e) => setBookId(e.target.value)}
            disabled={booksLoading || running}
          >
            {books.length === 0 && <option value="">No books</option>}
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
                {b.original_language ? ` (${b.original_language})` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--app-text-muted)]">Target</span>
          <select
            className={inputCls}
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value as QualityTargetLang)}
            disabled={running}
          >
            {LANGS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--app-text-muted)]">Genre</span>
          <select
            className={inputCls}
            value={genre}
            onChange={(e) => setGenre(e.target.value as 'fiction' | 'nonfiction')}
            disabled={running}
          >
            <option value="fiction">fiction</option>
            <option value="nonfiction">nonfiction</option>
          </select>
        </label>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button onClick={run} disabled={running || !bookId} size="sm">
          {running ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />}
          {running ? 'Checking…' : 'Run check'}
        </Button>
        <Button variant="outline" size="sm" onClick={loadBooks} disabled={booksLoading || running}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Reload books
        </Button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-[var(--radius)] border border-[var(--separator-opaque)] bg-[var(--app-surface-bg)] p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Report ─────────────────────────────────────────────────────────── */}
      {report && (
        <div className="mt-6 space-y-5">
          <Verdict report={report} />

          {report.blocking.length > 0 && (
            <IssueList title="Blocking" tone="blocking" items={report.blocking} />
          )}
          {report.warnings.length > 0 && (
            <IssueList title="Warnings" tone="warning" items={report.warnings} />
          )}

          <Structure report={report} />

          {report.entities && report.entities.length > 0 && <Entities report={report} />}
        </div>
      )}
    </div>
  );
}

function Verdict({ report }: { report: TranslationQualityReport }) {
  const ok = report.verdict === 'OK';
  return (
    <div
      className={`flex items-center gap-3 rounded-[var(--radius)] border p-4 ${
        ok
          ? 'border-emerald-500/40 bg-emerald-500/5'
          : 'border-red-500/40 bg-red-500/5'
      }`}
    >
      {ok ? (
        <CheckCircle2 className="h-6 w-6 text-emerald-500" />
      ) : (
        <XCircle className="h-6 w-6 text-red-500" />
      )}
      <div>
        <div className="text-base font-semibold">{ok ? 'OK' : 'Blocking issues'}</div>
        <div className="text-sm text-[var(--app-text-muted)]">
          {report.blocking.length} blocking · {report.warnings.length} warnings ·{' '}
          {report.src_lang} → {report.tgt_lang} · {report.genre}
          {report.hasGlossary ? ' · glossary' : ''}
        </div>
      </div>
    </div>
  );
}

function IssueList({
  title,
  tone,
  items,
}: {
  title: string;
  tone: 'blocking' | 'warning';
  items: string[];
}) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--separator-opaque)] p-4">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <ul className="space-y-1.5 text-sm">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={tone === 'blocking' ? 'text-red-500' : 'text-amber-500'}>•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Structure({ report }: { report: TranslationQualityReport }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--separator-opaque)] p-4">
      <h3 className="mb-1 text-sm font-semibold">Structure</h3>
      <p className="mb-3 text-sm text-[var(--app-text-muted)]">
        Chapters: source {report.chapters.source}, target {report.chapters.target}. Median
        length ratio {report.length.median_ratio}.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--app-text-muted)]">
              <th className="py-1 pr-4 font-medium">Ch</th>
              <th className="py-1 pr-4 font-medium">Src words</th>
              <th className="py-1 pr-4 font-medium">Tgt words</th>
              <th className="py-1 font-medium">Ratio</th>
            </tr>
          </thead>
          <tbody>
            {report.length.per_chapter.map((r) => (
              <tr key={r.chapter} className="border-t border-[var(--separator-opaque)]">
                <td className="py-1 pr-4">{r.chapter}</td>
                <td className="py-1 pr-4">{fmtNum(r.src_words)}</td>
                <td className="py-1 pr-4">{fmtNum(r.tgt_words)}</td>
                <td className="py-1">{r.ratio}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Entities({ report }: { report: TranslationQualityReport }) {
  const rows = report.entities ?? [];
  return (
    <div className="rounded-[var(--radius)] border border-[var(--separator-opaque)] p-4">
      <h3 className="mb-3 text-sm font-semibold">Entities (source vs target occurrences)</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--app-text-muted)]">
              <th className="py-1 pr-4 font-medium">Entity</th>
              <th className="py-1 pr-4 font-medium">Target</th>
              <th className="py-1 pr-4 font-medium">Src</th>
              <th className="py-1 pr-4 font-medium">Tgt</th>
              <th className="py-1 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 60).map((r) => (
              <tr key={r.entity} className="border-t border-[var(--separator-opaque)]">
                <td className="py-1 pr-4">{r.entity}</td>
                <td className="py-1 pr-4">{r.targets.join(' / ')}</td>
                <td className="py-1 pr-4">{r.src}</td>
                <td className="py-1 pr-4">{r.tgt}</td>
                <td className="py-1">{r.flag ? <span className="text-amber-500">⚠</span> : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
