'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2, ShieldAlert, Play, ChevronDown, ChevronRight, FileWarning, Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/ui/PageHeader';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  fetchBooks, fetchChapters, runTranslationQuality, dismissQualityIssues, listQualityRuns,
  judgeChapterQuality, ApiRequestError,
  type ApiBook, type ApiChapter, type QaTargetLang, type QaReportV2, type QaIssue, type QaCheckId, type QaGroup,
  type QaRunSummaryRow, type ChapterJudgeResult,
} from '@/lib/api';

const LANGS: QaTargetLang[] = ['EN', 'FR', 'ES', 'RU'];
const PAGE = 50;
const GROUPABLE = new Set<QaCheckId>(['missing_name', 'name_form_not_in_glossary']);

const CHECK_LABEL: Record<QaCheckId, string> = {
  untranslated: 'Не переведено',
  source_script: 'Остался исходный алфавит',
  model_artifact: 'Артефакт модели',
  markdown_leak: 'Markdown в тексте',
  length_outlier: 'Аномальная длина',
  chapter_title_untranslated: 'Название главы',
  missing_name: 'Пропавшее имя',
  name_form_not_in_glossary: 'Форма имени не из глоссария',
  profanity_added: 'Лишняя брань',
  translator_note: 'Примечание переводчика',
  number_missing: 'Пропавшее число',
};

const inputCls =
  'rounded-[var(--radius)] border border-[var(--separator-opaque)] bg-[var(--app-surface-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--app-accent)]';

function fmtDateTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Build a Markdown report tuned for pasting into an LLM to drive fixes.
// Fenced blocks preserve markup (e.g. leaked **…**) that blockquotes would mangle.
function reportToMarkdown(report: QaReportV2, bookTitle: string): string {
  const L: string[] = [];
  L.push(`# QA перевода: ${bookTitle} (${report.srcLang} → ${report.tgtLang})`);
  L.push('');
  L.push(`Прогон: ${report.generatedAt} · вердикт: ${report.verdict} · ${report.summary.errors} ошибок, ${report.summary.review} на проверку${report.summary.dismissed ? `, ${report.summary.dismissed} принято (ниже не включены)` : ''}.`);
  L.push('');
  L.push('> Инструкция для LLM: ниже — проблемы перевода, каждая с типом, местом (глава/абзац), исходным и переведённым текстом. Исправь только перевод (`target`), сохранив смысл, тон и форматирование исходника, и верни исправленный текст блока с его `blockId`.');
  L.push('');

  const active = report.issues.filter((i) => !i.dismissal);
  const errors = active.filter((i) => i.severity === 'error');
  const review = active.filter((i) => i.severity === 'review');

  const section = (title: string, items: QaIssue[]) => {
    if (!items.length) return;
    L.push(`## ${title} (${items.length})`);
    L.push('');
    for (const it of items) {
      L.push(`### [${it.check}] Гл.${it.chapterIndex}${it.chapterTitle ? ` «${it.chapterTitle}»` : ''} · ¶${it.position} · blockId ${it.blockId}`);
      L.push(`- Проблема: ${it.message}`);
      if (it.expected?.length) L.push(`- Ожидается: ${it.expected.join(', ')}`);
      L.push('- Исходник:');
      L.push('```');
      L.push(it.source);
      L.push('```');
      L.push('- Перевод:');
      L.push('```');
      L.push(it.target);
      L.push('```');
      L.push('');
    }
  };
  section('Ошибки', errors);
  section('На проверку', review);

  if (report.epub.blocking.length || report.epub.warnings.length) {
    L.push('## Файл EPUB (экспортёр; на оценку перевода не влияет)');
    for (const b of report.epub.blocking) L.push(`- [blocking] ${b}`);
    for (const w of report.epub.warnings) L.push(`- [warning] ${w}`);
    L.push('');
  }
  return L.join('\n');
}

// Render text with <mark> over the given highlight ranges (for one side).
function Highlighted({ text, ranges }: { text: string; ranges: { start: number; end: number }[] }) {
  if (!ranges.length) return <>{text}</>;
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const out: React.ReactNode[] = [];
  let pos = 0;
  sorted.forEach((r, i) => {
    if (r.start < pos) return;
    if (r.start > pos) out.push(text.slice(pos, r.start));
    out.push(<mark key={i} className="rounded bg-amber-300/40 px-0.5 dark:bg-amber-400/30">{text.slice(r.start, r.end)}</mark>);
    pos = r.end;
  });
  if (pos < text.length) out.push(text.slice(pos));
  return <>{out}</>;
}

export default function QualityPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading, isAuthenticated } = useAuth();

  const [books, setBooks] = useState<ApiBook[]>([]);
  const [bookId, setBookId] = useState('');
  const [targetLang, setTargetLang] = useState<QaTargetLang>('EN');
  const [genre, setGenre] = useState<'fiction' | 'nonfiction'>('fiction');

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<QaReportV2 | null>(null);

  // filters
  const [sevFilter, setSevFilter] = useState<'all' | 'error' | 'review' | 'dismissed'>('all');
  const [groupFilter, setGroupFilter] = useState<'all' | QaGroup>('all');
  const [checkFilter, setCheckFilter] = useState<'all' | QaCheckId>('all');
  const [chapterFilter, setChapterFilter] = useState<number | null>(null);
  const [visible, setVisible] = useState(PAGE);

  const [epubOpen, setEpubOpen] = useState(false);
  const [runs, setRuns] = useState<QaRunSummaryRow[] | null>(null);

  const loadBooks = useCallback(async () => {
    try {
      const list = await fetchBooks();
      setBooks(list);
      setBookId((p) => p || list[0]?.id || '');
    } catch { /* keep */ }
  }, []);
  useEffect(() => { if (isAdmin) void loadBooks(); }, [isAdmin, loadBooks]);

  const run = useCallback(async () => {
    if (!bookId) return;
    setRunning(true); setError(null); setRuns(null);
    try {
      const res = await runTranslationQuality({ bookId, targetLang, genre });
      setReport(res);
      setSevFilter('all'); setGroupFilter('all'); setCheckFilter('all'); setChapterFilter(null); setVisible(PAGE);
    } catch (e) {
      setReport(null);
      setError(e instanceof ApiRequestError ? e.message : e instanceof Error ? e.message : 'QA failed');
    } finally {
      setRunning(false);
    }
  }, [bookId, targetLang, genre]);

  // Optimistically set/clear a dismissal on a set of issues, persisting to the backend.
  const dismiss = useCallback(async (items: QaIssue[], status: 'accepted' | 'false_positive' | null) => {
    if (!report || !items.length) return;
    const keyset = new Set(items.map((i) => `${i.blockId}|${i.key}`));
    const prevIssues = report.issues;
    const now = new Date().toISOString();
    setReport({
      ...report,
      issues: report.issues.map((it) =>
        keyset.has(`${it.blockId}|${it.key}`)
          ? { ...it, dismissal: status ? { status, at: now } : undefined }
          : it),
    });
    try {
      await dismissQualityIssues({
        bookId: report.bookId, targetLang: report.tgtLang as QaTargetLang,
        items: items.map((i) => ({ blockId: i.blockId, issueKey: i.key, status })),
      });
    } catch {
      setReport((r) => (r ? { ...r, issues: prevIssues } : r)); // revert
      setError('Не удалось сохранить решение, попробуйте ещё раз.');
    }
  }, [report]);

  const downloadMarkdown = useCallback(() => {
    if (!report) return;
    const title = books.find((b) => b.id === report.bookId)?.title ?? report.bookId;
    const md = reportToMarkdown(report, title);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safe = title.replace(/[^\p{L}\p{N}.\-_ ]/gu, '_').trim().slice(0, 60) || 'report';
    a.href = url;
    a.download = `qa-${safe}-${report.tgtLang}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [report, books]);

  const loadRuns = useCallback(async () => {
    if (!report) return;
    try { const { runs } = await listQualityRuns(report.bookId, report.tgtLang as QaTargetLang); setRuns(runs); }
    catch { setRuns([]); }
  }, [report]);

  // Live counts (recomputed from issues so optimistic dismissals update the chips).
  const counts = useMemo(() => {
    const c = { error: 0, review: 0, dismissed: 0 };
    for (const it of report?.issues ?? []) {
      if (it.dismissal) c.dismissed++;
      else if (it.severity === 'error') c.error++;
      else c.review++;
    }
    return c;
  }, [report]);

  const chapterCells = useMemo(() => {
    const map = new Map<number, { errors: number; review: number }>();
    for (const it of report?.issues ?? []) {
      if (it.dismissal) continue;
      const e = map.get(it.chapterIndex) ?? { errors: 0, review: 0 };
      if (it.severity === 'error') e.errors++; else e.review++;
      map.set(it.chapterIndex, e);
    }
    return report?.chapters.map((ch) => ({ ...ch, ...(map.get(ch.index) ?? { errors: 0, review: 0 }) })) ?? [];
  }, [report]);

  const filtered = useMemo(() => {
    if (!report) return [];
    return report.issues.filter((it) => {
      if (sevFilter === 'dismissed') { if (!it.dismissal) return false; }
      else if (it.dismissal) return false;
      if (sevFilter === 'error' && it.severity !== 'error') return false;
      if (sevFilter === 'review' && it.severity !== 'review') return false;
      if (groupFilter !== 'all' && it.group !== groupFilter) return false;
      if (checkFilter !== 'all' && it.check !== checkFilter) return false;
      if (chapterFilter != null && it.chapterIndex !== chapterFilter) return false;
      return true;
    });
  }, [report, sevFilter, groupFilter, checkFilter, chapterFilter]);

  // Group groupable checks by key; keep others as singletons, preserving order.
  const rendered = useMemo(() => {
    const groups: { key: string; items: QaIssue[]; grouped: boolean }[] = [];
    const byKey = new Map<string, number>();
    for (const it of filtered) {
      if (GROUPABLE.has(it.check)) {
        const idx = byKey.get(it.key);
        if (idx == null) { byKey.set(it.key, groups.length); groups.push({ key: it.key, items: [it], grouped: true }); }
        else groups[idx].items.push(it);
      } else {
        groups.push({ key: `${it.blockId}|${it.key}`, items: [it], grouped: false });
      }
    }
    return groups;
  }, [filtered]);

  const shown = rendered.slice(0, visible);
  const checkOptions = report ? (Object.keys(report.summary.byCheck) as QaCheckId[]) : [];

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin text-[var(--app-text-muted)]" /></div>;
  }
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center">
        <ShieldAlert className="w-10 h-10 text-[var(--app-text-muted)]" />
        <p className="text-lg font-medium">Admins only</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/settings')}>Back to settings</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-[calc(1rem+env(safe-area-inset-top)+76px)] pb-24">
      <PageHeader title="Translation Quality" />

      {/* ── header controls ── */}
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--app-text-muted)]">Книга</span>
          <select className={`${inputCls} min-w-[12rem]`} value={bookId} onChange={(e) => setBookId(e.target.value)} disabled={running}>
            {books.length === 0 && <option value="">Нет книг</option>}
            {books.map((b) => <option key={b.id} value={b.id}>{b.title}{b.original_language ? ` (${b.original_language})` : ''}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--app-text-muted)]">Язык</span>
          <select className={inputCls} value={targetLang} onChange={(e) => setTargetLang(e.target.value as QaTargetLang)} disabled={running}>
            {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--app-text-muted)]">Жанр</span>
          <select className={inputCls} value={genre} onChange={(e) => setGenre(e.target.value as 'fiction' | 'nonfiction')} disabled={running}>
            <option value="fiction">fiction</option>
            <option value="nonfiction">nonfiction</option>
          </select>
        </label>
        <Button onClick={run} disabled={running || !bookId} size="sm">
          {running ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />}
          {running ? 'Проверяю…' : 'Проверить'}
        </Button>
        {report && (
          <span className="ml-auto text-xs text-[var(--app-text-muted)]">
            прогон {fmtDateTime(report.generatedAt)}
            {report.previousRun && <> · было {report.previousRun.errors}✕/{report.previousRun.review}? → {counts.error}✕/{counts.review}?</>}
          </span>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-[var(--radius)] border border-red-500/40 bg-red-500/5 p-3 text-sm">{error}</div>
      )}

      {bookId && <ChapterJudge bookId={bookId} targetLang={targetLang} />}

      {report && (
        <div className="mt-5 space-y-4">
          {/* ── verdict + chips ── */}
          <div className="flex flex-wrap items-center gap-2">
            <Chip active={sevFilter === 'error'} tone="error" onClick={() => setSevFilter((s) => s === 'error' ? 'all' : 'error')}>{counts.error} ошибок</Chip>
            <Chip active={sevFilter === 'review'} tone="review" onClick={() => setSevFilter((s) => s === 'review' ? 'all' : 'review')}>{counts.review} проверить</Chip>
            <Chip active={sevFilter === 'dismissed'} tone="muted" onClick={() => setSevFilter((s) => s === 'dismissed' ? 'all' : 'dismissed')}>{counts.dismissed} принято</Chip>
            <span className="ml-1 text-xs text-[var(--app-text-muted)]">вердикт: {report.verdict === 'ERRORS' ? 'есть ошибки' : report.verdict === 'REVIEW' ? 'на проверку' : 'чисто'}{report.hasGlossary ? ' · глоссарий' : ''}</span>
            <Button variant="outline" size="sm" className="ml-auto" onClick={downloadMarkdown} title="Скачать отчёт в Markdown — удобно скормить LLM">
              <Download className="mr-1.5 h-4 w-4" />Скачать .md
            </Button>
          </div>

          {/* ── chapter strip ── */}
          {chapterCells.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {chapterCells.map((ch) => {
                const active = chapterFilter === ch.index;
                const bg = ch.errors ? 'bg-red-500/70' : ch.review ? 'bg-amber-400/60' : 'bg-[var(--separator-opaque)]';
                return (
                  <button
                    key={ch.id}
                    title={`${ch.title || `Гл. ${ch.index}`} · ${ch.errors}✕ / ${ch.review}? · ratio ${ch.ratio}`}
                    onClick={() => setChapterFilter(active ? null : ch.index)}
                    className={`h-5 w-5 rounded-sm ${bg} ${active ? 'ring-2 ring-[var(--app-accent)]' : ''}`}
                  />
                );
              })}
            </div>
          )}

          {/* ── sub-filters ── */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <select className={inputCls} value={checkFilter} onChange={(e) => setCheckFilter(e.target.value as QaCheckId | 'all')}>
              <option value="all">Все типы</option>
              {checkOptions.map((c) => <option key={c} value={c}>{CHECK_LABEL[c]} ({report.summary.byCheck[c]})</option>)}
            </select>
            <select className={inputCls} value={groupFilter} onChange={(e) => setGroupFilter(e.target.value as QaGroup | 'all')}>
              <option value="all">Все группы</option>
              <option value="text">текст</option>
              <option value="names">имена</option>
              <option value="style">стиль</option>
            </select>
            {chapterFilter != null && (
              <button className="text-xs text-[var(--app-accent)]" onClick={() => setChapterFilter(null)}>× глава {chapterFilter}</button>
            )}
            {report.summary.truncated.length > 0 && (
              <span className="text-xs text-amber-500">часть issue не показана (лимит): {report.summary.truncated.join(', ')}</span>
            )}
          </div>

          {/* ── issue list ── */}
          {shown.length === 0 && <p className="text-sm text-[var(--app-text-muted)]">Нет проблем под текущим фильтром.</p>}
          <div className="space-y-3">
            {shown.map((g) =>
              g.grouped && g.items.length > 1
                ? <IssueGroup key={g.key} items={g.items} onDismiss={dismiss} />
                : <IssueCard key={g.key} issue={g.items[0]} onDismiss={dismiss} />)}
          </div>
          {rendered.length > visible && (
            <Button variant="outline" size="sm" onClick={() => setVisible((v) => v + PAGE)}>Показать ещё {Math.min(PAGE, rendered.length - visible)}</Button>
          )}

          {/* ── EPUB-file group (collapsed, does not affect verdict) ── */}
          {(report.epub.blocking.length > 0 || report.epub.warnings.length > 0) && (
            <div className="rounded-[var(--radius)] border border-[var(--separator-opaque)]">
              <button className="flex w-full items-center gap-2 p-3 text-sm font-medium" onClick={() => setEpubOpen((o) => !o)}>
                {epubOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <FileWarning className="h-4 w-4 text-[var(--app-text-muted)]" />
                Файл EPUB · {report.epub.blocking.length + report.epub.warnings.length} проблем экспортёра (на оценку перевода не влияют)
              </button>
              {epubOpen && (
                <ul className="space-y-1 px-4 pb-3 text-sm text-[var(--app-text-muted)]">
                  {report.epub.blocking.map((b, i) => <li key={`b${i}`}>• {b}</li>)}
                  {report.epub.warnings.map((w, i) => <li key={`w${i}`}>• {w}</li>)}
                </ul>
              )}
            </div>
          )}

          {/* ── history ── */}
          <div>
            <button className="text-sm text-[var(--app-accent)]" onClick={() => (runs ? setRuns(null) : loadRuns())}>
              {runs ? 'Скрыть историю' : 'История прогонов'}
            </button>
            {runs && (
              <ul className="mt-2 space-y-1 text-sm">
                {runs.length === 0 && <li className="text-[var(--app-text-muted)]">Прогонов пока нет.</li>}
                {runs.map((r) => (
                  <li key={r.runId} className="text-[var(--app-text-muted)]">
                    {fmtDateTime(r.generatedAt)} — {r.summary?.errors ?? 0} ошибок, {r.summary?.review ?? 0} проверить, {r.summary?.dismissed ?? 0} принято
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ children, active, tone, onClick }: { children: React.ReactNode; active: boolean; tone: 'error' | 'review' | 'muted'; onClick: () => void }) {
  const base = tone === 'error' ? 'text-red-600 dark:text-red-400' : tone === 'review' ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--app-text-muted)]';
  return (
    <button onClick={onClick} className={`rounded-full border px-3 py-1 text-xs font-medium ${base} ${active ? 'border-[var(--app-accent)] bg-[var(--app-surface-bg)]' : 'border-[var(--separator-opaque)]'}`}>
      {children}
    </button>
  );
}

function IssueCard({ issue, onDismiss }: { issue: QaIssue; onDismiss: (items: QaIssue[], status: 'accepted' | 'false_positive' | null) => void }) {
  const srcHi = issue.highlights.filter((h) => h.side === 'source');
  const tgtHi = issue.highlights.filter((h) => h.side === 'target');
  const isError = issue.severity === 'error';
  return (
    <div className={`rounded-[var(--radius)] border p-3 ${issue.dismissal ? 'border-[var(--separator-opaque)] opacity-60' : isError ? 'border-red-500/40' : 'border-amber-400/40'}`}>
      <div className="mb-2 text-xs font-medium">
        <span className={isError ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}>{isError ? 'ОШИБКА' : 'ПРОВЕРИТЬ'}</span>
        {' · '}{CHECK_LABEL[issue.check]} · Гл. {issue.chapterIndex}{issue.chapterTitle ? ` «${issue.chapterTitle}»` : ''}, ¶{issue.position}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="whitespace-pre-wrap break-words rounded bg-[var(--app-surface-bg)] p-2 text-sm">
          <div className="mb-1 text-[10px] uppercase text-[var(--app-text-muted)]">Исходник</div>
          <Highlighted text={issue.source} ranges={srcHi} />
        </div>
        <div className="whitespace-pre-wrap break-words rounded bg-[var(--app-surface-bg)] p-2 text-sm">
          <div className="mb-1 text-[10px] uppercase text-[var(--app-text-muted)]">Перевод</div>
          <Highlighted text={issue.target} ranges={tgtHi} />
        </div>
      </div>
      <p className="mt-2 text-sm text-[var(--app-text-muted)]">{issue.message}</p>
      <div className="mt-2 flex items-center gap-2">
        {issue.dismissal ? (
          <>
            <span className="text-xs text-[var(--app-text-muted)]">{issue.dismissal.status === 'accepted' ? 'Принято как есть' : 'Ложная тревога'}</span>
            <button className="text-xs text-[var(--app-accent)]" onClick={() => onDismiss([issue], null)}>Вернуть</button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={() => onDismiss([issue], 'accepted')}>Принять как есть</Button>
            <Button variant="ghost" size="sm" onClick={() => onDismiss([issue], 'false_positive')}>Ложная тревога</Button>
          </>
        )}
      </div>
    </div>
  );
}

function IssueGroup({ items, onDismiss }: { items: QaIssue[]; onDismiss: (items: QaIssue[], status: 'accepted' | 'false_positive' | null) => void }) {
  const [open, setOpen] = useState(false);
  const head = items[0];
  const allDismissed = items.every((i) => i.dismissal);
  return (
    <div className="rounded-[var(--radius)] border border-amber-400/40">
      <div className="flex items-center gap-2 p-3">
        <button className="flex items-center gap-1 text-sm font-medium" onClick={() => setOpen((o) => !o)}>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          ПРОВЕРИТЬ · {CHECK_LABEL[head.check]} «{head.key.split(':').slice(1).join(':')}» · {items.length} абзацев
        </button>
        {!allDismissed && (
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => onDismiss(items, 'accepted')}>Принять все</Button>
        )}
      </div>
      {open && (
        <div className="space-y-3 border-t border-[var(--separator-opaque)] p-3">
          {items.map((it) => <IssueCard key={`${it.blockId}|${it.key}`} issue={it} onDismiss={onDismiss} />)}
        </div>
      )}
    </div>
  );
}

// ── LLM-оценка одной главы (вариант A) ────────────────────────────────────────

const SEV_RANK: Record<string, number> = { critical: 3, major: 2, minor: 1 };

function ChapterJudge({ bookId, targetLang }: { bookId: string; targetLang: QaTargetLang }) {
  const [open, setOpen] = useState(false);
  const [chapters, setChapters] = useState<ApiChapter[]>([]);
  const [chapterId, setChapterId] = useState('');
  const [judgeModel, setJudgeModel] = useState('gemini-2.5-flash');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChapterJudgeResult | null>(null);
  const [runs, setRuns] = useState<QaRunSummaryRow[] | null>(null);

  useEffect(() => {
    setResult(null); setError(null); setRuns(null); setChapterId('');
    if (!open || !bookId) return;
    fetchChapters(bookId).then((cs) => { setChapters(cs); setChapterId((p) => p || cs[0]?.id || ''); }).catch(() => setChapters([]));
  }, [open, bookId]);

  const judge = useCallback(async () => {
    if (!chapterId) return;
    setRunning(true); setError(null); setResult(null);
    try {
      const res = await judgeChapterQuality({ bookId, targetLang, chapterId, judgeModel });
      setResult(res);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : e instanceof Error ? e.message : 'Judge failed');
    } finally {
      setRunning(false);
    }
  }, [bookId, targetLang, chapterId, judgeModel]);

  const loadRuns = useCallback(async () => {
    try {
      const { runs } = await listQualityRuns(bookId, targetLang, 50);
      setRuns(runs.filter((r) => r.engine === 'llm-judge-fiction-v1'));
    } catch { setRuns([]); }
  }, [bookId, targetLang]);

  const sortedIssues = result
    ? [...result.issues].sort((a, b) => (SEV_RANK[b.severity] ?? 0) - (SEV_RANK[a.severity] ?? 0) || a.category.localeCompare(b.category))
    : [];

  return (
    <div className="mt-5 rounded-[var(--radius)] border border-[var(--separator-opaque)]">
      <button className="flex w-full items-center gap-2 p-3 text-sm font-medium" onClick={() => setOpen((o) => !o)}>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        LLM-оценка главы (экспериментально)
      </button>
      {open && (
        <div className="space-y-3 border-t border-[var(--separator-opaque)] p-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--app-text-muted)]">Глава</span>
              <select className={`${inputCls} min-w-[14rem]`} value={chapterId} onChange={(e) => setChapterId(e.target.value)} disabled={running}>
                {chapters.length === 0 && <option value="">Нет глав</option>}
                {chapters.map((c) => <option key={c.id} value={c.id}>{c.index}. {c.title || '(без названия)'}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--app-text-muted)]">Модель судьи</span>
              <input className={inputCls} value={judgeModel} onChange={(e) => setJudgeModel(e.target.value)} disabled={running} />
            </label>
            <Button onClick={judge} disabled={running || !chapterId} size="sm">
              {running ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />}
              {running ? 'Оцениваю…' : 'Оценить'}
            </Button>
            <span className="text-xs text-[var(--app-text-muted)]">один вызов LLM на главу — стоит денег</span>
          </div>

          {error && <div className="rounded-[var(--radius)] border border-red-500/40 bg-red-500/5 p-2 text-sm">{error}</div>}

          {result && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="text-lg font-bold">{result.verdict.overall}/100</span>
                <span>A {result.scores.adequacy}/5</span>
                <span>F {result.scores.fluency}/5</span>
                <span>S {result.scores.style}/5</span>
                {result.scores.dialogue != null && <span>D {result.scores.dialogue}/5</span>}
                <span>MQM −{result.mqmPenalty} <span className="text-[var(--app-text-muted)]">({result.mqmPer1k}/1k слов)</span></span>
                <span className="ml-auto text-xs text-[var(--app-text-muted)]">{result.model} · ${result.costUsd.toFixed(4)}</span>
              </div>
              {result.verdict.summary && <p className="text-sm text-[var(--app-text-muted)]">{result.verdict.summary}</p>}

              {sortedIssues.length === 0 && <p className="text-sm text-[var(--app-text-muted)]">Судья не нашёл ошибок.</p>}
              <div className="space-y-2">
                {sortedIssues.map((it, i) => (
                  <div key={i} className={`rounded-[var(--radius)] border p-2 ${it.severity === 'critical' ? 'border-red-500/40' : it.severity === 'major' ? 'border-amber-400/40' : 'border-[var(--separator-opaque)]'}`}>
                    <div className="mb-1 text-xs font-medium">
                      <span className={it.severity === 'critical' ? 'text-red-600 dark:text-red-400' : it.severity === 'major' ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--app-text-muted)]'}>
                        [{it.severity}] {it.category}
                      </span>
                      {it.position >= 0 && <span className="text-[var(--app-text-muted)]"> · ¶{it.position}</span>}
                    </div>
                    {(it.source || it.target) && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="whitespace-pre-wrap break-words rounded bg-[var(--app-surface-bg)] p-2 text-sm">{it.source}</div>
                        <div className="whitespace-pre-wrap break-words rounded bg-[var(--app-surface-bg)] p-2 text-sm">{it.target}</div>
                      </div>
                    )}
                    {it.explanation && <p className="mt-1 text-sm text-[var(--app-text-muted)]">{it.explanation}</p>}
                    {it.suggestion && <p className="mt-1 text-sm">→ {it.suggestion}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <button className="text-sm text-[var(--app-accent)]" onClick={() => (runs ? setRuns(null) : loadRuns())}>
              {runs ? 'Скрыть историю' : 'История LLM-оценок'}
            </button>
            {runs && (
              <ul className="mt-2 space-y-1 text-sm">
                {runs.length === 0 && <li className="text-[var(--app-text-muted)]">Оценок пока нет.</li>}
                {runs.map((r) => {
                  const s = r.summary as Record<string, unknown>;
                  return (
                    <li key={r.runId} className="text-[var(--app-text-muted)]">
                      {fmtDateTime(r.generatedAt)} — гл. {String(s.chapterTitle ?? s.chapterId ?? '')} · overall {String((s.scores as Record<string, unknown>)?.overall ?? '—')} · MQM/1k {String(s.mqmPer1k ?? '—')}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
