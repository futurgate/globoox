'use client';

import { studioFetch } from '@/lib/studioFetch';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Play, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { WorkspaceBook, WorkspaceSeries } from '@/lib/translationWorkspaceTypes';
import { bookPath, processingLabel } from './projectLinks';

type Glossary = { language: string; status: string; chaptersDone: number; chaptersTotal: number; frozen: boolean };
type Translation = { language: string; state: string; doneChapters: number; totalChapters: number; errorChapters: number };
type Volume = { bookId: string; processingStatus: string; liveness?: string | null; glossary?: Glossary[]; translations: Translation[] };
type SeriesDetail = {
  id: string;
  recipe?: { name: string; direction: string; model: string; units: string; seedGlossary: string; prompts: { step0: string; translate: string } } | null;
  volumes: Volume[];
};
const liveness: Record<string, string> = { moving: 'Идёт обработка', waiting_quota: 'Ожидает квоту модели', stalled: 'Давно нет прогресса' };
const glossaryStates: Record<string, string> = { pending: 'в очереди', building: 'собирается', done: 'готов', error: 'ошибка' };
const unitNames: Record<string, string> = { us: 'Американские единицы', metric: 'Метрические', keep: 'Сохранить исходные' };
const genreNames: Record<string, string> = { litrpg: 'ЛитРПГ', nonfiction: 'Нон-фикшн', other: 'Другой жанр' };

async function readResponse(response: Response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.message ?? payload?.error;
    throw new Error(typeof message === 'string' ? message : 'Запрос не выполнен (' + response.status + ').');
  }
  return payload;
}

export default function SeriesWorkspace({ series, role, books }: {
  series: WorkspaceSeries;
  role: 'admin' | 'author';
  books: WorkspaceBook[];
}) {
  const [detail, setDetail] = useState<SeriesDetail | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);
  const [model, setModel] = useState('');
  const [showRun, setShowRun] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [followUntil, setFollowUntil] = useState(0);
  const inFlight = useRef<AbortController | null>(null);
  const mutation = useRef<AbortController | null>(null);
  const endpoint = '/api/translation-workspace/series/' + encodeURIComponent(series.id);
  const admin = role === 'admin' && series.ownerVerified;
  const load = useCallback(async () => {
    if (!admin || inFlight.current) return;
    const request = new AbortController();
    inFlight.current = request;
    setFetching(true);
    try {
      const response = await studioFetch(endpoint + '/detail', { signal: request.signal, cache: 'no-store' });
      const value = await readResponse(response) as SeriesDetail;
      if (!value || value.id !== series.id || !Array.isArray(value.volumes)) throw new Error('Сервер не подтвердил данные серии.');
      if (!request.signal.aborted) { setDetail(value); setError(''); }
    } catch (cause) {
      if (!request.signal.aborted) { setError(cause instanceof Error ? cause.message : 'Не удалось открыть данные серии.'); }
    } finally {
      if (inFlight.current === request) inFlight.current = null;
      if (!request.signal.aborted) setFetching(false);
    }
  }, [admin, endpoint, series.id]);
  useEffect(() => {
    void load();
    return () => { inFlight.current?.abort(); inFlight.current = null; mutation.current?.abort(); };
  }, [load]);
  const running = detail?.volumes.some((v) => v.liveness === 'moving' || v.liveness === 'waiting_quota' ||
    v.glossary?.some((g) => g.status === 'building') || ['pending', 'processing'].includes(v.processingStatus)) ?? false;
  useEffect(() => {
    if (!admin || (!running && !followUntil)) return;
    const interval = setInterval(() => {
      if (Date.now() >= followUntil && followUntil) setFollowUntil(0);
      if (document.visibilityState === 'visible') void load();
    }, 7000);
    return () => clearInterval(interval);
  }, [running, admin, followUntil, load]);

  async function operate(action: 'run' | 'restart', bookId?: string, step?: 'translate' | 'step0', lang?: string) {
    if (!admin || mutation.current) return;
    const request = new AbortController();
    mutation.current = request;
    setWorking(true);
    setError('');
    setMessage('');
    try {
      const body = action === 'run' ? (model.trim() ? { model: model.trim() } : {}) : { bookId, step, lang };
      const response = await studioFetch(endpoint + '/' + action, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: request.signal,
      });
      const result = await readResponse(response);
      if (!result?.enqueued || result.seriesId !== series.id) throw new Error('Сервер не подтвердил постановку в очередь. Обновите состояние серии.');
      if (!request.signal.aborted) {
        setMessage((action === 'run' ? 'Запуск серии принят. ' : 'Продолжение этапа принято. ') + 'Том ' + result.enqueued.volumeNumber + ' поставлен в очередь.');
        setShowRun(false);
        setFollowUntil(Date.now() + 90000);
        void load();
      }
    } catch (cause) {
      if (!request.signal.aborted) setError(cause instanceof Error ? cause.message : 'Не удалось запустить этап.');
    } finally {
      if (mutation.current === request) mutation.current = null;
      if (!request.signal.aborted) setWorking(false);
    }
  }

  const sorted = [...books].sort((a, b) => (a.volumeNumber ?? Infinity) - (b.volumeNumber ?? Infinity) || (a.title ?? '').localeCompare(b.title ?? '', 'ru'));
  const hasGaps = sorted.some((book, index) => book.volumeNumber != null && book.volumeNumber !== index + 1);
  const volumes = new Map(detail?.volumes.map((v) => [v.bookId, v]) ?? []);
  const recipe = detail?.recipe;
  const allReady = sorted.length > 0 && sorted.every((book) => (volumes.get(book.id)?.processingStatus ?? book.processingStatus) === 'ready');
  return (
    <div className="space-y-4">
      {admin && <Card className="gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Перевод серии</h2>
            <p className="text-sm text-[var(--app-text-muted)]">{recipe?.name || (series.genre ? (genreNames[series.genre] ?? series.genre) : 'Жанр не указан')}</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={fetching}><RefreshCw className={fetching ? 'animate-spin' : ''} />Обновить</Button>
        </div>
        {recipe && <>
          <details className="text-sm"><summary className="cursor-pointer font-medium">Параметры рецепта</summary>
            <dl className="mt-2 space-y-1 break-words">
              <div><dt className="inline text-[var(--app-text-muted)]">Направление · </dt><dd className="inline">{recipe.direction.replace('->', ' → ')}</dd></div>
              <div><dt className="inline text-[var(--app-text-muted)]">Модель · </dt><dd className="inline">{recipe.model}</dd></div>
              <div><dt className="inline text-[var(--app-text-muted)]">Единицы · </dt><dd className="inline">{unitNames[recipe.units] || recipe.units}</dd></div>
              <div><dt className="inline text-[var(--app-text-muted)]">Стартовый словарь · </dt><dd className="inline">{recipe.seedGlossary}</dd></div>
              <div><dt className="inline text-[var(--app-text-muted)]">Шаблон словаря · </dt><dd className="inline">{recipe.prompts.step0}</dd></div>
              <div><dt className="inline text-[var(--app-text-muted)]">Шаблон перевода · </dt><dd className="inline">{recipe.prompts.translate}</dd></div>
            </dl>
          </details>
          {showRun ? (
            <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void operate('run'); }}>
              <label className="block space-y-1 text-sm font-medium">Модель для этого запуска<Input value={model} disabled={working} placeholder={recipe.model} autoComplete="off" onChange={(event) => setModel(event.target.value)} /></label>
              <p className="text-sm text-[var(--app-text-muted)]">Сервер поставит первый том в очередь и начнёт обработку остальных томов по рецепту. Вызовы модели учитываются в расходах.</p>
              {hasGaps && <p role="status" className="text-sm">В нумерации есть пропуски. В запуск войдут только перечисленные тома, в указанном порядке.</p>}
              <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!allReady || working || running}><Play />Подтвердить запуск</Button>
                <Button type="button" variant="outline" disabled={working} onClick={() => setShowRun(false)}>Отмена</Button></div>
            </form>
          ) : <Button className="self-start" disabled={!allReady || working || running || Boolean(followUntil)} onClick={() => setShowRun(true)}><Play />Запустить перевод серии</Button>}
          {!allReady && <p className="text-sm text-[var(--app-text-muted)]">Для запуска дождитесь импорта каждого тома.</p>}
        </>}
        {detail && !recipe && <p className="text-sm text-[var(--app-text-muted)]">{detail.recipe === null ? 'Для жанра этой серии ещё нет рецепта.' : 'Автоматический запуск недоступен на подключённом сервере.'}</p>}
        {message && <p role="status" className="text-sm">{message}</p>}
        {error && <p role="alert" className="break-words text-sm">{error}</p>}
      </Card>}
      {role === 'admin' && !series.ownerVerified && <p className="text-sm text-[var(--app-text-muted)]">Доступны ваши тома. Для управления всей серией требуется подтверждение её владельца.</p>}
      {role === 'author' && <Card className="items-start gap-2 p-4"><Button disabled><Play />Запустить перевод серии</Button><p className="text-sm font-semibold">Планируется</p><p className="text-sm text-[var(--app-text-muted)]">Для запуска от имени автора требуется доступ к обработке серии.</p></Card>}
      <Card className="overflow-hidden">
        <h2 className="px-4 py-3 text-lg font-semibold">Тома серии</h2>
        {sorted.length === 0 && <p className="px-4 pb-4 text-sm">В этой серии пока нет томов.</p>}
        {sorted.map((book) => {
          const v = volumes.get(book.id);
          const status = v?.processingStatus ?? book.processingStatus;
          return <div key={book.id} className="border-t border-[var(--app-border)] px-4 py-3">
            <Link className="flex items-center gap-2 hover:underline" href={bookPath(book.id)}>
              <div className="min-w-0 flex-1">
                {book.volumeNumber != null && <span className="text-xs text-[var(--app-text-muted)]">Том {book.volumeNumber}</span>}
                <p className="break-words font-medium">{book.title || 'Без названия'}</p>
                <p className="text-sm text-[var(--app-text-muted)]">{[book.author, status && processingLabel[status], v?.liveness && liveness[v.liveness]].filter(Boolean).join(' · ')}</p>
              </div><ChevronRight size={16} aria-hidden />
            </Link>
            {v?.glossary?.map((g) => <div key={g.language} className="mt-2 flex flex-wrap items-center gap-2 text-sm"><span>Словарь {g.language} · {glossaryStates[g.status] ?? g.status} · {g.chaptersDone}/{g.chaptersTotal} глав{g.frozen ? ' · зафиксирован' : ''}</span>
              {(g.status === 'error' || (v.liveness === 'stalled' && g.status === 'building')) && <Button size="sm" variant="outline" disabled={working} onClick={() => void operate('restart', book.id, 'step0', g.language)}>Продолжить словарь</Button>}
            </div>)}
            {v?.translations.map((t) => <div key={t.language} className="mt-2 flex flex-wrap items-center gap-2 text-sm"><span>Перевод {t.language} · {t.doneChapters}/{t.totalChapters} глав{t.errorChapters > 0 ? ' · ошибок: ' + t.errorChapters : ''}</span>
              {t.state !== 'complete' && (t.errorChapters > 0 || (t.state === 'partial' && v.liveness === 'stalled')) && <Button size="sm" variant="outline" disabled={working} onClick={() => void operate('restart', book.id, 'translate', t.language)}>Продолжить перевод</Button>}
            </div>)}
          </div>;
        })}
      </Card>
    </div>
  );
}
