'use client';

import { studioErrorMessage, studioFetch } from '@/lib/studioFetch';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Download, Play, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ModelChoice, RecipeEditor } from './RecipeSettings';
import { recipeEndpoint, runsEndpoint, type StudioRun, type RecipeSettings } from '@/lib/studioRecipe';
import { bookGet, downloadBookFile, useBookAction, useBookData } from './bookRequests';
import type { WorkspaceBook, WorkspaceSeries } from '@/lib/translationWorkspaceTypes';
import { bookPath, bookRunPath, processingLabel } from './projectLinks';
import { LaunchAccessNotice, useLaunchAccess } from './LaunchAccess';

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
    throw new Error(studioErrorMessage(message, 'Запрос не выполнен (' + response.status + ').', response.status));
  }
  return payload;
}

function VolumePreview({ book, sourceLang, targetLang, glossaryModel, translateModel }: {
  book: WorkspaceBook; sourceLang: string; targetLang: string; glossaryModel: string; translateModel: string;
}) {
  const result = useBookData<RecipeSettings>(recipeEndpoint({ scope: 'book', scopeId: book.id, sourceLang, targetLang }));
  return <li className="border-t py-2"><strong>{book.title}</strong>
    {result?.data ? <p>Глоссарий · {glossaryModel || result.data.effective.glossaryModel} · Перевод · {translateModel || result.data.effective.translateModel}</p> :
      <p role="status">{result?.error || 'Загружаем параметры тома…'}</p>}</li>;
}

export default function SeriesWorkspace({ series, role, books, ownerId }: {
  series: WorkspaceSeries;
  ownerId: string; role: 'admin' | 'author';
  books: WorkspaceBook[];
}) {
  const [detail, setDetail] = useState<SeriesDetail | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);
  const [glossaryModel, setGlossaryModel] = useState('');
  const [translateModel, setTranslateModel] = useState('');
  const [savedRecipe, setSavedRecipe] = useState<RecipeSettings | null>(null);
  const [settingsReady, setSettingsReady] = useState(false);
  const [firstRunUrl, setFirstRunUrl] = useState('');
  const [previewBooks, setPreviewBooks] = useState(false);
  const runRequest = useRef<{ signature: string; id: string } | null>(null);
  const [showRun, setShowRun] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [followUntil, setFollowUntil] = useState(0);
  const inFlight = useRef<AbortController | null>(null);
  const archive = useBookAction();
  const mutation = useRef<AbortController | null>(null);
  const endpoint = '/api/translation-workspace/series/' + encodeURIComponent(series.id);
  const admin = role === 'admin' && series.ownerVerified;
  const access = useLaunchAccess(role === 'author' && series.ownerVerified);
  const canStart = series.ownerVerified && access.allowed;
  const models = useBookData<{ models: string[] }>(admin && showRun ? '/api/admin/models' : null);
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
      if (!request.signal.aborted) { setError(studioErrorMessage(cause, 'Не удалось открыть данные серии.')); }
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
    if (!canStart || (action === 'restart' && !admin) || mutation.current) return;
    const request = new AbortController();
    mutation.current = request;
    setWorking(true);
    setError('');
    setMessage('');
    try {
      const signature = JSON.stringify([series.id, glossaryModel, translateModel, savedRecipe?.revision]);
      if (action === 'run' && signature !== runRequest.current?.signature) runRequest.current = { signature, id: crypto.randomUUID() };
      let resumed: string | undefined;
      if (action === 'restart' && bookId && lang) {
        const { runs } = await bookGet<{ runs: StudioRun[] }>(runsEndpoint(bookId, lang), request.signal);
        const existing = runs.find(run => run.operation === 'series' && run.seriesId === series.id);
        resumed = existing?.id;
      }
      const body = action === 'run' ? {
        lang: targetLang, studioRun: { requestId: runRequest.current!.id }, ...(admin && glossaryModel && { glossaryModel }), ...(admin && translateModel && { translateModel }),
      } : { bookId, step, lang, ...(resumed && { studioRun: { runId: resumed } }) };
      const response = await studioFetch(endpoint + '/' + action, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: request.signal,
      });
      const result = await readResponse(response);
      if (!result?.enqueued || result.seriesId !== series.id) throw new Error('Сервер не подтвердил постановку в очередь. Обновите состояние серии.');
      if (!request.signal.aborted) {
        setMessage(admin ? (action === 'run' ? 'Запуск серии принят. ' : 'Продолжение этапа принято. ') + 'Том ' + result.enqueued.volumeNumber + ' поставлен в очередь.'
          : 'Перевод серии принят. Ход работы доступен в истории запусков проекта.');
        const first = result.runs?.find((item: { bookId: string }) => item.bookId === result.enqueued.bookId);
        if (first?.runId) setFirstRunUrl(bookRunPath(first.bookId, targetLang, first.runId));
        setShowRun(false); runRequest.current = null; setGlossaryModel(''); setTranslateModel('');
        if (admin) setFollowUntil(Date.now() + 90000);
        void load();
      }
    } catch (cause) {
      if (!request.signal.aborted) setError(studioErrorMessage(cause, 'Не удалось запустить этап.'));
    } finally {
      if (mutation.current === request) mutation.current = null;
      if (!request.signal.aborted) setWorking(false);
    }
  }

  const sorted = [...books].sort((a, b) => (a.volumeNumber ?? Infinity) - (b.volumeNumber ?? Infinity) || (a.title ?? '').localeCompare(b.title ?? '', 'ru'));
  const hasGaps = sorted.some((book, index) => book.volumeNumber != null && book.volumeNumber !== index + 1);
  const volumes = new Map(detail?.volumes.map((v) => [v.bookId, v]) ?? []);
  const recipe = detail?.recipe;
  const direction = (recipe?.direction || series.direction || '').toUpperCase().split(/\s*(?:->|→|-)\s*/);
  const sourceLang = direction[0] || sorted[0]?.sourceLanguage?.toUpperCase() || 'RU';
  const targetLang = direction[1] || (sourceLang === 'RU' ? 'EN' : 'RU');
  const canRunRecipe = Boolean(savedRecipe && (!admin || (savedRecipe.effective.glossaryModel && savedRecipe.effective.translateModel)));
  const allReady = sorted.length > 0 && sorted.every((book) => (volumes.get(book.id)?.processingStatus ?? book.processingStatus) === 'ready');
  return (
    <div className="space-y-4">
      {canStart && <Card className="gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Перевод серии</h2>
            <p className="text-sm text-[var(--app-text-muted)]">{recipe?.name || (series.genre ? (genreNames[series.genre] ?? series.genre) : 'Жанр не указан')}</p>
          </div>
          {admin && <Button variant="outline" size="sm" onClick={load} disabled={fetching}><RefreshCw className={fetching ? 'animate-spin' : ''} />Обновить</Button>}
        </div>
        {recipe && <details className="text-sm"><summary className="cursor-pointer font-medium">Базовый рецепт серии</summary>
            <dl className="mt-2 space-y-1 break-words">
              <div><dt className="inline text-[var(--app-text-muted)]">Направление · </dt><dd className="inline">{recipe.direction.replace('->', ' → ')}</dd></div>

              <div><dt className="inline text-[var(--app-text-muted)]">Единицы · </dt><dd className="inline">{unitNames[recipe.units] || recipe.units}</dd></div>
              <div><dt className="inline text-[var(--app-text-muted)]">Стартовый словарь · </dt><dd className="inline">{recipe.seedGlossary}</dd></div>
              <div><dt className="inline text-[var(--app-text-muted)]">Шаблон словаря · </dt><dd className="inline">{recipe.prompts.step0}</dd></div>
              <div><dt className="inline text-[var(--app-text-muted)]">Шаблон перевода · </dt><dd className="inline">{recipe.prompts.translate}</dd></div>
            </dl>
          </details>}
          {canRunRecipe && (admin || !firstRunUrl) && <>
          {showRun ? (
            <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void operate('run'); }}>
              {admin && <><ModelChoice label="Модель глоссария для запуска" value={glossaryModel} inherited={savedRecipe?.effective.glossaryModel}
                models={models?.data?.models ?? []} disabled={working} onChange={setGlossaryModel}/>
              <ModelChoice label="Модель перевода для запуска" value={translateModel} inherited={savedRecipe?.effective.translateModel}
                models={models?.data?.models ?? []} disabled={working} onChange={setTranslateModel}/>
              {models?.error && <p role="alert">{models.error}</p>}
              <details onToggle={e => setPreviewBooks(e.currentTarget.open)}><summary>Параметры по томам ({sorted.length})</summary>
                {previewBooks && <ul className="mt-2 text-sm">{sorted.map(book => <VolumePreview key={book.id} book={book}
                  sourceLang={book.sourceLanguage || sourceLang} targetLang={targetLang} glossaryModel={glossaryModel} translateModel={translateModel}/>)}</ul>}
              </details></>}
              {!admin && <p>Томов в запуске · {sorted.length}. Направление · {sourceLang} → {targetLang}.</p>}
              <p className="text-sm text-[var(--app-text-muted)]">Сервер поставит первый том в очередь и начнёт обработку остальных томов по рецепту. Вызовы модели учитываются в расходах.</p>
              {hasGaps && <p role="status" className="text-sm">В нумерации есть пропуски. В запуск войдут только перечисленные тома, в указанном порядке.</p>}
              <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!allReady || !settingsReady || working || running}><Play />Подтвердить запуск</Button>
                <Button type="button" variant="outline" disabled={working} onClick={() => setShowRun(false)}>Отмена</Button></div>
            </form>
          ) : <Button className="self-start" disabled={!allReady || !settingsReady || working || running || Boolean(followUntil)} onClick={() => setShowRun(true)}><Play />Запустить перевод серии</Button>}
          {!allReady && <p className="text-sm text-[var(--app-text-muted)]">Для запуска дождитесь импорта каждого тома.</p>}
          {!settingsReady && <p className="text-sm text-[var(--app-text-muted)]">Перед запуском сохраните параметры серии.</p>}
        </>}
        {!canRunRecipe && <p className="text-sm text-[var(--app-text-muted)]">Для запуска нужны сохранённые параметры перевода серии.</p>}
        {message && <p role="status" className="text-sm">{message}</p>}
        {firstRunUrl && <Link className="self-start text-sm underline" href={firstRunUrl}>Открыть журнал тома</Link>}
        {error && <p role="alert" className="break-words text-sm">{error}</p>}
      </Card>}
      {series.ownerVerified && sourceLang && targetLang && <RecipeEditor ownerId={ownerId} admin={admin}
        locator={{ scope:'series', scopeId:series.id, sourceLang, targetLang }} onResolved={setSavedRecipe} onReadyToRun={setSettingsReady}/>}
      {role === 'admin' && !series.ownerVerified && <p className="text-sm text-[var(--app-text-muted)]">Доступны ваши тома. Для управления всей серией требуется подтверждение её владельца.</p>}
      {role === 'author' && series.ownerVerified && !access.allowed && <LaunchAccessNotice access={access}/>}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <h2 className="text-lg font-semibold">Тома серии</h2>
          {admin && sorted.length > 0 && <Button size="sm" variant="outline" disabled={archive.busy}
            onClick={() => void archive.run(signal => downloadBookFile(endpoint + '/download-translated?lang=' + encodeURIComponent(targetLang),
              (series.name || 'Серия') + ' (' + targetLang + ')', signal, 'zip'))}>
            <Download />{archive.busy ? 'Собираем ZIP…' : 'Скачать готовые тома · ZIP · ' + targetLang}</Button>}
        </div>
        {archive.error && <p role="alert" className="px-4 text-sm">{archive.error}</p>}
        {archive.notice && <p role="status" className="px-4 text-sm">{archive.notice}</p>}
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
              {t.state === 'complete' && <Button size="sm" variant="outline" asChild><Link href={bookPath(book.id) + '/translations/' + encodeURIComponent(t.language) + '/editions'}>Обложка и EPUB</Link></Button>}
              {t.state !== 'complete' && (t.errorChapters > 0 || (t.state === 'partial' && v.liveness === 'stalled')) && <Button size="sm" variant="outline" disabled={working} onClick={() => void operate('restart', book.id, 'translate', t.language)}>Продолжить перевод</Button>}
            </div>)}
          </div>;
        })}
      </Card>
    </div>
  );
}
