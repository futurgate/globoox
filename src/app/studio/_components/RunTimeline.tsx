'use client';

import Link from 'next/link';
import { useState } from 'react';
import { RefreshButton } from './RequestFeedback';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { RunStageState, StudioRun } from '@/lib/studioRecipe';
import { bookPath } from './projectLinks';
import { activeStatus, operationNames, runCost, runDate, runStatusNames, stageNames, type RunStatus } from './runDisplay';
import { downloadBookFile, useBookAction, useBookData } from './bookRequests';

type Stage = keyof typeof stageNames;
type StageProgress = RunStageState & { done: number | null; total: number | null };
const eventNames = {
  queued: 'Запуск поставлен в очередь', stage_started: 'Этап начат', stage_ready: 'Определён объём работы',
  stage_done: 'Этап завершён', stage_error: 'Ошибка этапа', stage_stopped: 'Этап остановлен',
  glossary_reused: 'Использован готовый глоссарий', chapter_started: 'Начата глава',
  chapter_done: 'Глава готова', chapter_skipped: 'Глава пропущена', chapter_error: 'Ошибка главы',
  stop_requested: 'Запрошена остановка',
};
type RunEvent = {
  id: string; at: string; kind: keyof typeof eventNames; stage: Stage | null; attempt: number | null;
  chapterNumber: number | null; done: number | null; total: number | null; reason: string | null;
};
type Timeline = {
  runId: string; bookId: string; lang: string; operation: StudioRun['operation']; createdAt: string; status: RunStatus;
  stages: Partial<Record<Stage,StageProgress>>; hasChapterEvents: boolean; events: RunEvent[]; nextCursor: string | null;
  costUsd?: number | null; usageComplete?: boolean; tokensIn?: number | null; tokensOut?: number | null;
};
const live = (timeline: Timeline) => activeStatus(timeline.status);
type Artifact = { status: 'ready' | 'failed' | 'unavailable'; filename: string | null; sizeBytes: number | null };

function RunResult({ bookId, lang, runId, title, version }: {
  bookId: string; lang: string; runId: string; title: string; version: number;
}) {
  const url = '/api/studio/run-artifact?' + new URLSearchParams({runId});
  const metadata = useBookData<Artifact>(url + '&metadata=1', version);
  const action = useBookAction();
  const info = metadata?.data;
  return <Card className="gap-3 p-4 sm:p-5">
    <h2>Результат запуска</h2>
    {!metadata && <p role="status">Ищем сохранённый EPUB…</p>}
    {info?.status === 'ready' && <div><Button disabled={action.busy} onClick={() => void action.run(signal =>
      downloadBookFile(url, (info.filename || title + ' (' + lang + ')').replace(/\.epub$/i,''), signal))}>
      {action.busy ? 'Скачивание…' : 'Скачать EPUB этого запуска'}</Button></div>}
    {info?.status === 'ready' && <p className="pt-muted text-sm">В файле сохранены текст и обложка на момент завершения перевода.</p>}
    {info?.status === 'unavailable' && <p className="pt-muted">Отдельный EPUB этого запуска не сохранён.</p>}
    {info?.status === 'failed' && <p role="status">Перевод завершён, но сохранить EPUB в истории не удалось.</p>}
    {(action.error || metadata?.error) && <p role="alert">{action.error || metadata?.error}</p>}
    <Link className="self-start text-sm underline" href={bookPath(bookId) + '/translations/' + lang + '/editions'}>Текущее издание и обложка</Link>
  </Card>;
}

export function RunTimeline({ bookId, lang, runId, title }: {
  bookId: string; lang: string; runId: string; title: string;
}) {
  const [version, setVersion] = useState(0);
  const [cursors, setCursors] = useState<string[]>([]);
  const url = '/api/studio/run-timeline?' + new URLSearchParams({runId});
  const first = useBookData<Timeline>(url, version, live);
  const cursor = cursors[cursors.length - 1];
  const older = useBookData<Timeline>(cursor ? url + '&before=' + encodeURIComponent(cursor) : null, version);
  const data = first?.data;
  const page = cursor ? older?.data : data;
  if (data && (data.bookId !== bookId || data.lang !== lang || data.runId !== runId)) return <p role="alert">Этот запуск не относится к выбранному переводу книги.</p>;
  const error = first?.error || older?.error;
  const lastEventAt = data?.events[0]?.at;
  const end = data?.stages.translate?.finishedAt ?? data?.stages.glossary?.finishedAt;
  const minutes = data && end && !activeStatus(data.status)
    ? Math.max(0, Math.round((Date.parse(end) - Date.parse(data.createdAt)) / 60000)) : null;
  return <div className="grid gap-4">
    <Card className="gap-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2>{data ? operationNames[data.operation] + ' · ' + lang : 'Состояние запуска'}</h2>
        <RefreshButton pending={!first || first.refreshing || Boolean(older?.refreshing)} size="sm" variant="outline" onClick={() => setVersion(v => v + 1)}>Обновить</RefreshButton>
      </div>
      {error && <p role="alert">{error}</p>}
      {!first && <p role="status">Загружаем запуск…</p>}
      {data && <><p>{runStatusNames[data.status]} · запуск {runDate(data.createdAt)}</p>
        {minutes != null && <p className="pt-muted text-sm">От запуска до завершения попытки · {minutes < 1 ? 'меньше минуты' : minutes + ' мин'}</p>}
        {activeStatus(data.status) && lastEventAt && <p className="pt-muted text-sm">Последнее событие · {runDate(lastEventAt)}</p>}
        {(Object.keys(stageNames) as Stage[]).map(key => {
          const stage = data.stages[key];
          if (!stage) return null;
          return <div key={key} className="flex flex-wrap gap-x-3 border-t pt-2 text-sm">
            <strong>{stageNames[key]}</strong><span>{runStatusNames[stage.status]}</span>
            {stage.done != null && stage.total != null && <span>Глав {stage.done} из {stage.total}</span>}
            {stage.attempt > 1 && <span>Попытка {stage.attempt}</span>}
          </div>;
        })}
        <p className="text-sm">Учтённый расход · {runCost(data.costUsd)}
          {data.costUsd != null && !data.usageComplete && ' · неполные данные'}</p>
        {(data.tokensIn != null || data.tokensOut != null) && <p className="pt-muted text-sm">Токены · вход {data.tokensIn?.toLocaleString('ru') ?? '—'} · выход {data.tokensOut?.toLocaleString('ru') ?? '—'}</p>}
      </>}
    </Card>
    {data?.stages.translate?.status === 'done' && <RunResult bookId={bookId} lang={lang} runId={runId} title={title} version={version}/>}
    {data && <Card className="gap-3 p-4 sm:p-5">
      <h2>Журнал запуска</h2>
      {!data.hasChapterEvents && !activeStatus(data.status) && <p className="pt-muted text-sm">Для этого запуска доступны отметки этапов. Событий по главам в журнале нет.</p>}
      {cursor && !older && <p role="status">Загружаем события…</p>}
      <ol className="divide-y">{page?.events.map(event => <li key={event.id} className="py-2 text-sm">
        <div className="flex flex-wrap items-baseline gap-x-3"><time className="pt-muted" dateTime={event.at}>{runDate(event.at)}</time>
          <strong>{eventNames[event.kind] || 'Событие этапа'}{event.chapterNumber != null && ' · глава ' + event.chapterNumber}</strong></div>
        <p className="pt-muted">{[event.stage && stageNames[event.stage], event.attempt && 'попытка ' + event.attempt,
          event.done != null && event.total != null && 'глав ' + event.done + ' из ' + event.total].filter(Boolean).join(' · ')}</p>
        {event.reason && <p>{event.reason}</p>}
      </li>)}</ol>
      {(cursor || page?.nextCursor) && <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={!cursor} onClick={() => setCursors(old => old.slice(0,-1))}>Новее</Button>
        <Button size="sm" variant="outline" disabled={!page?.nextCursor} onClick={() => {if (page?.nextCursor) setCursors(old => [...old,page.nextCursor!]);}}>Старее</Button>
      </div>}
    </Card>}
  </div>;
}
