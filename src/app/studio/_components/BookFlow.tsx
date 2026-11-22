'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { bookRunPath } from './projectLinks';
import { runsEndpoint, type StudioRun } from '@/lib/studioRecipe';
import { ActionFeedback, useBookExecution } from './BookStage';
import { bookEndpoint, bookPost, useBookAction, useBookData } from './bookRequests';

type RunState = {
  runId: string; bookId: string; lang: string; stage: 'glossary' | 'translate';
  status: 'queued' | 'running' | 'done' | 'stopped' | 'error';
};
const activeRun = (run: RunState) => run.status === 'queued' || run.status === 'running';
const statusNames = { queued:'В очереди', running:'Выполняется', done:'Перевод завершён', stopped:'Остановлен', error:'Ошибка' };

export function BookFlow({ bookId, lang, settingsReady, editionsUrl }: {
  bookId: string; lang: string; settingsReady: boolean; editionsUrl: string;
}) {
  const action = useBookAction();
  const [refresh, setRefresh] = useState(0);
  const [accepted, setAccepted] = useState<RunState>();
  const requestId = useRef('');
  const history = useBookData<{ runs: StudioRun[] }>(runsEndpoint(bookId, lang), action.version + refresh);
  const latest = history?.data?.runs[0];
  // A later manual stage supersedes the previously completed book flow.
  const runId = accepted?.runId || (latest?.operation === 'book' ? latest.id : undefined);
  const url = bookEndpoint(bookId, 'run', lang);
  const current = useBookData<RunState>(runId ? url + '&runId=' + encodeURIComponent(runId) : null, action.version + refresh, activeRun);
  const run = current?.data ?? accepted;
  const retry = run?.status === 'stopped' || run?.status === 'error';
  const running = action.busy || Boolean(run && activeRun(run));
  const { active, report } = useBookExecution();
  useEffect(() => {
    report('flow', running);
    return () => report('flow', false);
  }, [report, running]);
  const anotherStage = Object.entries(active).some(([key, value]) => key !== 'flow' && value);
  async function start(signal: AbortSignal) {
    requestId.current ||= crypto.randomUUID();
    const studioRun = retry && runId ? { runId } : { requestId: requestId.current };
    const response = await bookPost(url, { lang, studioRun }, signal);
    const result: RunState = await response.json();
    if (result.bookId !== bookId || result.lang !== lang || !result.runId) throw Error('Сервер не подтвердил запуск этой книги.');
    setAccepted(result);
    requestId.current = '';
  }

  return <Card className="gap-3 p-5">
    <h2>Перевод книги</h2>
    <p className="pt-muted">Сервер подготовит глоссарий и переведёт текст с сохранёнными параметрами. Запуск расходует токены. Вкладку можно закрыть.</p>
    {run && <p role="status">{statusNames[run.status]}{run.status !== 'done' && ' · ' + (run.stage === 'glossary' ? 'глоссарий' : 'перевод текста')}</p>}
    <div className="flex flex-wrap gap-2">
      {runId && <Button asChild variant="outline"><Link href={bookRunPath(bookId,lang,runId)}>Ход запуска</Link></Button>}
      {run?.status === 'done' ? <Button asChild><Link href={editionsUrl}>Обложка и EPUB</Link></Button>
        : <Button disabled={!history?.data || Boolean(runId && !current?.data && !accepted) || running || anotherStage || (!retry && !settingsReady)}
            onClick={() => void action.run(start)}>{retry ? 'Продолжить с места остановки' : 'Запустить перевод книги'}</Button>}
      {(history?.error || current?.error || action.error || running || retry) && <Button variant="outline" onClick={() => setRefresh(n => n + 1)}>Обновить состояние</Button>}
    </div>
    {!run && !settingsReady && <p className="pt-muted text-sm">Для запуска нужны сохранённые параметры книги.</p>}
    {retry && <p className="pt-muted text-sm">При продолжении используются параметры исходного запуска.</p>}
    <ActionFeedback error={action.error || current?.error || history?.error}/>
  </Card>;
}
