'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
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
  active: Partial<Record<StageName, boolean>>;
  report: (stage: StageName, running: boolean) => void;
} | null>(null);

export function BookExecution({children}: {children: ReactNode}) {
  const [active,setActive] = useState<Partial<Record<StageName,boolean>>>({});
  const report = useCallback((stage: StageName, running: boolean) => {
    setActive(prev => Boolean(prev[stage]) === running ? prev : {...prev,[stage]:running});
  }, []);
  return <ExecutionContext.Provider value={{ active, report }}>{children}</ExecutionContext.Provider>;
}

export function ActionFeedback({ error, notice }: { error?: string; notice?: string }) {
  if (error) return <p className="pt-callout" role="alert">{error}</p>;
  return notice ? <p className="pt-muted" role="status">{notice}</p> : null;
}

export function StageCard({ stage, bookId, lang, models, sourceBookId, onChange }: {
  stage: StageName; bookId: string; lang: string; models: readonly string[]; sourceBookId?: string;
  onChange?: () => void;
}) {
  const [model, setModel] = useState('');
  const [withGlossary, setWithGlossary] = useState(false);
  const [restart, setRestart] = useState(false);
  const [tick, setTick] = useState(0);
  const start = useBookAction(), stop = useBookAction();
  const {active, report} = useContext(ExecutionContext)!;
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
  const blocked = !data || running || otherRunning || (stage === 'glossary' && data.frozen);
  const overwriteNote = stage === 'translate' ? 'Заменить переведённые блоки и сбросить связанные правки'
    : stage === 'glossary' ? 'Пересобрать словарь с первой главы' : stage === 'revise' ? 'Пересчитать уже отредактированные блоки' : 'Заново проверить главы';
  const startStage = () => {
    if (blocked) return;
    if (restart && !window.confirm(`${overwriteNote}? Это действие применяется к выбранному переводу.`)) return;
    void start.run(async signal => {
      const payload = {
        lang, ...(model ? { model } : {}),
        ...(stage === 'translate' ? { mode: 'fiction', useGlossary: withGlossary, overwrite: restart } : {}),
        ...(stage === 'glossary' ? { restart, ...(sourceBookId ? { seedFromBookId: sourceBookId } : {}) } : {}),
        ...(stage === 'revise' ? { overwrite: restart } : {}),
        ...(stage === 'reader-check' ? { variant: 'reader', restart } : {}),
      };
      try {
        const response = await bookPost(url, payload, signal);
        return await consumeStage(response);
      } finally {
        if (!signal.aborted) { setRestart(false); onChange?.(); }
      }
    });
  };
  return <Card className="p-4 gap-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3>{stages[stage].title}</h3>
      <span className="pt-muted">{data ? (stage === 'translate' && data.state === 'running' && !running ? 'Выполнен частично' : names[data.state] || data.state) : state?.error ? 'Статус недоступен' : 'Загрузка…'}</span>
    </div>
    {total > 0 && <p className="pt-muted">{stage === 'revise' ? 'Блоков' : 'Глав'} {done} из {total}</p>}
    {otherRunning && <p className="pt-muted">Дождитесь завершения текущего этапа книги.</p>}
    {data?.frozen && <p>Словарь заморожен. Разморозьте его во вкладке «Глоссарий» для новой генерации.</p>}
    {failed && <p className="pt-callout">{failed}</p>}
    <ActionFeedback error={state?.error || start.error || stop.error} notice={start.notice || stop.notice}/>
    <details><summary className="text-sm">Параметры запуска</summary>
      <div className="grid gap-3 pt-3">
        <IOSSettingsRow label="Модель" value={model} disabled={Boolean(running)} onChange={setModel}
          options={[{ id: '', label: 'По умолчанию' }, ...models.map(id => ({ id, label: id }))]} />
        {stage === 'translate' && <label><input type="checkbox" checked={withGlossary} disabled={Boolean(running)} onChange={e => setWithGlossary(e.target.checked)}/> Использовать готовый глоссарий тома</label>}
        {stage === 'glossary' && sourceBookId && <p className="pt-muted">Для новой генерации будет использован словарь выбранной книги.</p>}
        <label><input type="checkbox" checked={restart} disabled={Boolean(running)} onChange={e => setRestart(e.target.checked)}/> {overwriteNote}</label>
      </div>
    </details>
    <div className="flex flex-wrap gap-2">
      <Button disabled={Boolean(blocked)} onClick={startStage}>{restart ? 'Перезапустить' : done > 0 && total > done ? 'Продолжить' : 'Запустить'}</Button>
      {running && <Button variant="outline" disabled={stop.busy} onClick={() => void stop.run(async signal => {
        await bookPost(bookEndpoint(bookId, 'stop-stage', lang), { lang, stage }, signal);
        return 'Остановка запрошена. Текущие вызовы завершатся.';
      })}>Остановить</Button>}
      <Button variant="ghost" onClick={() => { setTick(v => v + 1); }}>Обновить</Button>
    </div>
  </Card>;
}
