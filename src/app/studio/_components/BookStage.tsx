'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { resumableStage, runEndpoint, runsEndpoint, type FrozenRecipe, type StudioRun } from '@/lib/studioRecipe';
import { RefreshButton, PendingText } from './RequestFeedback';
import { Button } from '@/components/ui/button';
import { studioErrorMessage } from '@/lib/studioFetch';
import { Card } from '@/components/ui/card';
import IOSSettingsRow from '@/components/ui/ios-settings-row';
import { bookEndpoint, bookPost, consumeStage, useBookAction, useBookData } from './bookRequests';

export const stages = {
  glossary: { title: 'Глоссарий', api: 'generate-glossary' },
  translate: { title: 'Перевод текста', api: 'translate-full-book' },
  revise: { title: 'Стилистическая редактура', api: 'revise-full-book' },
  'reader-check': { title: 'Читательская проверка', api: 'reader-check' },
} as const;
export type StageName = keyof typeof stages;

type Status = {
  state: string; error?: string | null; percent?: number; frozen?: boolean;
  chaptersDone?: number; chaptersTotal?: number; totalChapters?: number; revised?: number; totalBlocks?: number;
  counts?: { done?: number; translating?: number; error?: number };
  chapters?: { status: string; error: string | null; updated_at?: string }[];
};
const names: Record<string, string> = {
  idle: 'Ещё не запускался', pending: 'Ожидает', running: 'В работе', building: 'В работе',
  stalled: 'Приостановлен', incomplete: 'Выполнен частично', done: 'Готово', complete: 'Завершён',
  error: 'Ошибка', stopped: 'Остановлен',
};

function statusActive(data: Status) {
  if (data.chapters) return data.chapters.some(chapter => chapter.status === 'translating' && (
    !chapter.updated_at || Date.now() - Date.parse(chapter.updated_at) < 10 * 60000
  ));
  return data.state === 'running' || data.state === 'building';
}

const ExecutionContext = createContext<{
  active: Partial<Record<StageName | 'flow', boolean>>;
  report: (stage: StageName | 'flow', running: boolean) => void;
} | null>(null);

export function BookExecution({children}: {children: ReactNode}) {
  const [active,setActive] = useState<Partial<Record<StageName | 'flow',boolean>>>({});
  const report = useCallback((stage: StageName | 'flow', running: boolean) => {
    setActive(prev => Boolean(prev[stage]) === running ? prev : {...prev,[stage]:running});
  }, []);
  return <ExecutionContext.Provider value={{ active, report }}>{children}</ExecutionContext.Provider>;
}

export function useBookExecution() {
  return useContext(ExecutionContext)!;
}

export function ActionFeedback({ error, notice, pending }: { error?: string; notice?: string; pending?: string }) {
  if (pending) return <PendingText>{pending}</PendingText>;
  if (error) return <p className="pt-callout" role="alert">{error}</p>;
  return notice ? <p className="pt-muted" role="status">{notice}</p> : null;
}

export function StageCard({ stage, bookId, lang, models, sourceBookId, books, onChange, inheritedModel, onEstimateModel }: {
  stage: StageName; bookId: string; lang: string; models: readonly string[]; sourceBookId?: string;
  books?: readonly { id: string; title: string | null }[];
  onChange?: () => void; inheritedModel?: string; onEstimateModel?: (model: string | null) => void;
}) {
  const [model, setModel] = useState('');
  const [withGlossary, setWithGlossary] = useState(false);
  const [restart, setRestart] = useState(false);
  const [tick, setTick] = useState(0);
  const start = useBookAction(), stop = useBookAction();
  const {active, report} = useContext(ExecutionContext)!;
  const tracked = stage === 'glossary' || stage === 'translate';
  const requestId = useRef<{ key: string; id: string } | null>(null);
  const runHistory = useBookData<{ runs: StudioRun[] }>(tracked ? runsEndpoint(bookId, lang) : null, start.version + tick);
  const resumeId = tracked && !restart && runHistory?.data ? resumableStage(runHistory.data.runs, stage) : undefined;
  const detail = useBookData<{ id: string; config: FrozenRecipe }>(resumeId ? runEndpoint(bookId, lang, resumeId) : null, tick);
  const frozen = tracked && resumeId && detail?.data?.id === resumeId && detail.data.config?.[stage]?.model
    ? detail.data.config : undefined;
  const frozenModel = tracked && frozen ? frozen[stage].model : undefined;
  const frozenSeed = frozen?.options?.seedFromBookId;
  const quoteModel = !runHistory?.data ? null : resumeId ? frozenModel || null : model || inheritedModel || null;
  useEffect(() => {
    onEstimateModel?.(quoteModel);
    return () => onEstimateModel?.(null);
  }, [onEstimateModel, quoteModel]);
  const version = tick + start.version + stop.version;
  const url = bookEndpoint(bookId, stages[stage].api, lang);
  const state = useBookData<Status>(url, version, start.busy || statusActive);
  const data = state?.data;
  const done = data?.counts?.done ?? data?.chaptersDone ?? data?.revised ?? 0;
  const total = data?.totalChapters ?? data?.chaptersTotal ?? data?.totalBlocks ?? 0;
  const externalRunning = data ? statusActive(data) : false;
  const running = start.busy || externalRunning;
  const otherRunning = Object.entries(active).some(([name, value]) => value && name !== stage);
  useEffect(() => {
    report(stage, running);
    return () => report(stage, false);
  }, [report, stage, running]);
  const failed = data?.error || data?.chapters?.find(c => c.error)?.error;
  const failureMessage = failed && studioErrorMessage(failed, 'При выполнении этапа возникла ошибка.');
  const blocked = !data || (tracked && !runHistory?.data) || (resumeId && !frozen) || running || otherRunning || (stage === 'glossary' && data.frozen);
  const overwriteNote = stage === 'translate' ? 'Заменить переведённые блоки и сбросить связанные правки'
    : stage === 'glossary' ? 'Пересобрать словарь с первой главы' : stage === 'revise' ? 'Пересчитать уже отредактированные блоки' : 'Заново проверить главы';
  const startStage = () => {
    if (blocked) return;
    if (restart && !window.confirm(`${overwriteNote}? Это действие применяется к выбранному переводу.`)) return;
    void start.run(async signal => {
      const key = JSON.stringify([bookId, lang, stage, model, restart, withGlossary, sourceBookId]);
      if (requestId.current?.key !== key) requestId.current = { key, id: crypto.randomUUID() };
      const payload = resumeId ? { lang, studioRun: { runId: resumeId } } : {
        ...(tracked ? { studioRun: { requestId: requestId.current.id } } : {}),
        lang, ...(model ? { model } : {}),
        ...(stage === 'translate' ? { mode: 'fiction', useGlossary: withGlossary, overwrite: restart } : {}),
        ...(stage === 'glossary' ? { restart, ...(sourceBookId ? { seedFromBookId: sourceBookId } : {}) } : {}),
        ...(stage === 'revise' ? { overwrite: restart } : {}),
        ...(stage === 'reader-check' ? { variant: 'reader', restart } : {}),
      };
      try {
        const response = await bookPost(url, payload, signal);
        const result = await consumeStage(response);
        requestId.current = null;
        return result;
      } finally {
        if (!signal.aborted) { setRestart(false); onChange?.(); }
      }
    });
  };
  const interrupted = tracked && resumeId ? runHistory?.data?.runs.find(r => r.id === resumeId)?.stages[stage] : null;
  const reportedState = interrupted?.status || data?.state;
  let statusLabel = state?.error ? 'Статус недоступен' : 'Загрузка…';
  if (running) statusLabel = names.running;
  else if (stage === 'translate' && reportedState === 'complete' && data?.counts?.error) {
    statusLabel = `Завершён с ошибками · глав с ошибкой: ${data.counts.error}`;
  }
  else if (reportedState === 'running' && stage === 'translate') statusLabel = names.incomplete;
  else if (reportedState) statusLabel = names[reportedState] || reportedState;
  return <Card className="p-4 gap-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3>{stages[stage].title}</h3>
      <span className="pt-muted">{statusLabel}</span>
    </div>
    {total > 0 && <p className="pt-muted">{stage === 'revise' ? 'Блоков' : 'Глав'} {done} из {total}</p>}
    {otherRunning && <p className="pt-muted">Дождитесь завершения текущего этапа книги.</p>}
    {data?.frozen && <p>Словарь заморожен. Разморозьте его во вкладке «Глоссарий» для новой генерации.</p>}
    {failureMessage && <div className="pt-callout">
      <p>{failureMessage}</p>
      {failed !== failureMessage && <details><summary>Технические подробности</summary><p>{failed}</p></details>}
    </div>}
    <ActionFeedback error={state?.error || runHistory?.error || detail?.error ||
      (resumeId && detail?.data && !frozen ? 'Не удалось прочитать сохранённые параметры запуска.' : '') || start.error || stop.error} notice={start.notice || stop.notice}/>
    <details><summary className="text-sm">Параметры запуска</summary>
      <div className="grid gap-3 pt-3">
        {resumeId ? frozen ? <div className="grid gap-1 text-sm">
          <p>Модель запуска · {frozenModel}</p>
          {stage === 'translate' && <p>Глоссарий тома · {frozen.options?.useGlossary ? 'используется' : 'выключен'}</p>}
          {stage === 'glossary' && <p>Исходный словарь · {frozenSeed
            ? books?.find(book => book.id === frozenSeed)?.title || frozenSeed : frozen.options?.seedStarterGenre || 'без исходной книги'}</p>}
          <p className="pt-muted">При первом запуске · {frozen.options?.fresh ? 'перезапись с начала' : 'сохранение готового результата'}.</p>
        </div> : !detail && <p role="status">Загружаем параметры остановленного запуска…</p> : <>
          <IOSSettingsRow label="Модель" value={model} disabled={running} onChange={setModel}
            options={[{ id: '', label: inheritedModel ? 'По рецепту · ' + inheritedModel : 'По рецепту' }, ...models.map(id => ({ id, label: id }))]} />
          {stage === 'translate' && <label><input type="checkbox" checked={withGlossary} disabled={running} onChange={e => setWithGlossary(e.target.checked)}/> Использовать готовый глоссарий тома</label>}
          {stage === 'glossary' && sourceBookId && <p className="pt-muted">Для новой генерации будет использован словарь выбранной книги.</p>}
        </>}
        <label><input type="checkbox" checked={restart} disabled={Boolean(running)} onChange={e => setRestart(e.target.checked)}/> {overwriteNote}</label>
      </div>
    </details>
    <div className="flex flex-wrap gap-2">
      <Button disabled={Boolean(blocked)} onClick={startStage}>{restart ? 'Перезапустить' : resumeId || (done > 0 && total > done) ? 'Продолжить' : 'Запустить'}</Button>
      {running && <Button variant="outline" disabled={stop.busy} onClick={() => void stop.run(async signal => {
        await bookPost(bookEndpoint(bookId, 'stop-stage', lang), { lang, stage }, signal);
        return 'Остановка запрошена. Текущие вызовы завершатся.';
      })}>Остановить</Button>}
      <RefreshButton pending={!state || state.refreshing || Boolean(runHistory?.refreshing || detail?.refreshing)} onClick={() => setTick(v => v + 1)}/>
    </div>
  </Card>;
}
