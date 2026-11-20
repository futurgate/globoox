'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { BookTranslationEstimate, FictionCosts, QaReportV2 } from '@/lib/api';
import { downloadText } from '../../_components/downloads';
import { ActionFeedback, stages } from './BookStage';
import { bookEndpoint, bookPost, downloadBookFile, useBookAction, useBookData } from './bookRequests';

export function Planned({ title, description }: { title: string; description: string }) {
  return <Card className="p-5 gap-2"><div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="opacity-60">{title}</h3><span className="pt-muted text-sm">Планируется</span></div><p className="pt-muted">{description}</p></Card>;
}
const dollars = (v: number | null) => v == null ? 'Тариф не указан' : new Intl.NumberFormat('ru', { style:'currency', currency:'USD', maximumFractionDigits:4 }).format(v);

export function Estimate({ bookId, lang }: {bookId: string; lang: string}) {
  const [show, setShow] = useState(false);
  const [version, setVersion] = useState(0);
  const result = useBookData<BookTranslationEstimate>(show ? bookEndpoint(bookId, 'translation-estimate', lang) : null, version);
  const estimate = result?.data?.byLanguage.find(l => l.lang === lang);
  return <Card className="p-5 gap-3"><h3>Оценка перевода текста</h3>
    <p className="pt-muted">По оставшимся блокам книги и тарифу модели по умолчанию. Расчёт не запускает перевод.</p>
    <Button variant="outline" disabled={show && !result} onClick={() => { setShow(true); setVersion(v => v + 1); }}>{show && !result ? 'Расчёт…' : 'Рассчитать'}</Button>
    <ActionFeedback error={result?.error}/>
    {result?.data && <p>{estimate ? `${dollars(estimate.cost.totalUsd)} · осталось блоков: ${estimate.blocksRemaining} · модель ${result.data.model}` : 'Для этого направления оценка отсутствует.'}</p>}
  </Card>;
}

export function BookEdition({ bookId, title, lang, isAdmin }: { bookId: string; title: string; lang: string; isAdmin: boolean }) {
  const [report, setReport] = useState<QaReportV2>();
  const [reload, setReload] = useState(0);
  const action = useBookAction();
  const coverage = useBookData<BookTranslationEstimate>(isAdmin ? bookEndpoint(bookId, 'translation-estimate', lang) : null, reload);
  const target = coverage?.data?.byLanguage.find(l => l.lang === lang);
  const covered = target && target.blocksRemaining === 0 && target.blocksTranslated > 0;
  const download = bookEndpoint(bookId, 'download-translated', lang);
  return <div className="pt-stack">
    {isAdmin ? <Card className="p-5 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2>Переведённый EPUB</h2><Button variant="ghost" onClick={() => setReload(v => v + 1)}>Обновить</Button></div>
      {coverage?.error ? <ActionFeedback error={coverage.error}/> : <p className="pt-muted">{!coverage ? 'Проверяем готовность текста…' : target ? `Переведено блоков: ${target.blocksTranslated}, осталось: ${target.blocksRemaining}.` : 'Не удалось определить готовность по статистике блоков.'}</p>}
      <div className="flex flex-wrap gap-2">
        {covered || coverage?.error || (coverage?.data && !target)
          ? <Button disabled={action.busy} onClick={() => void action.run(signal => downloadBookFile(download, (title || bookId) + ' (' + lang + ')', signal))}>Скачать EPUB</Button>
          : <Button disabled>Скачать EPUB после перевода</Button>}
        <Button variant="outline" disabled={action.busy || (!!target && !covered)} onClick={() => void action.run(async signal => {
          const r = await bookPost(bookEndpoint(bookId,'translation-quality',lang),{ targetLang:lang, genre:'fiction' },signal);
          const next: QaReportV2 = await r.json();
          if (!signal.aborted) setReport(next);
        })}>{action.busy ? 'Проверка…' : 'Проверить качество EPUB'}</Button>
      </div>
      <ActionFeedback error={action.error}/>
      {report && <div className="grid gap-2"><h3>Результат проверки</h3>
        <p>Ошибок текста: {report.summary.errors} · замечаний: {report.summary.review} · ошибок структуры EPUB: {report.epub.blocking.length}.</p>
        {[...report.epub.blocking, ...report.epub.warnings].map((s,i) => <p key={i}>{s}</p>)}
        {report.issues.length > 0 && <details><summary>Замечания по тексту</summary>{report.issues.map((issue, i) => <p key={i} className="py-1">{issue.message}</p>)}</details>}
        <Button variant="outline" onClick={() => downloadText(`quality-${bookId}-${lang}.json`,JSON.stringify(report,null,2),'application/json')}>Скачать результат проверки</Button></div>}
    </Card> : <Planned title="Скачать переведённый EPUB" description="Выдача перевода автору ожидает подключения права на скачивание своей книги."/>}
    <Planned title="Карточка издания и материалы" description="Подтверждение выходных данных, локализованной обложки и надписей для сборки."/>
    <Planned title="Проверенный выпуск и итоговый отчёт" description="Выдача выпуска после обязательной проверки и сводный отчёт по книге."/>
  </div>;
}

type CostRun = {runId: string; kind: string; model: string | null; startedAt: string | null; total: {costUsd: number; calls: number; durationMs: number}};
export function BookRuns({ bookId, lang }: { bookId: string; lang: string }) {
  const [version,setVersion] = useState(0);
  const costs = useBookData<FictionCosts>(bookEndpoint(bookId,'fiction-costs',lang),version);
  const runs = useBookData<{runs: CostRun[]}>(bookEndpoint(bookId,'fiction-cost-runs',lang),version);
  const action = useBookAction();
  const labels: Record<string,string> = { ...Object.fromEntries(Object.entries(stages).map(([k,v]) => [k,v.title])), correction:'Исправление замечаний', revision:'Стилистическая редактура' };
  return <div className="pt-stack"><Card className="p-5 gap-3"><div className="flex flex-wrap justify-between gap-2"><h2>Расходы по этапам</h2><Button variant="ghost" onClick={() => setVersion(v => v+1)}>Обновить</Button></div>
    <ActionFeedback error={costs?.error || action.error} notice={action.notice}/>
    {!costs && <p role="status">Загружаем статистику…</p>}
    {costs?.data && <>{!costs.data.stages.some(s => s.ran || s.measured) && <p>Пока нет данных о выполненных этапах.</p>}
      {costs.data.stages.filter(s => s.ran || s.measured).map(s => <div key={s.stage} className="pt-row"><span>{labels[s.stage] || s.stage}</span><span>{s.measured ? `${dollars(s.measured.costUsd)} · ${s.measured.llmCalls} выз. · ${Math.round(s.measured.durationMs/1000)} с` : `Расчётно ${dollars(s.estimate.costUsd)}`}</span></div>)}
      <Button variant="outline" onClick={() => void action.run(async () => { await navigator.clipboard.writeText(JSON.stringify(costs.data,null,2)); return 'Статистика скопирована.'; })}>Скопировать статистику</Button></>}
  </Card><Card className="p-5 gap-3"><h3>Запуски редактуры и читательской проверки</h3>
    <ActionFeedback error={runs?.error}/>
    {!runs ? <p role="status">Загружаем запуски…</p> : runs.data && (runs.data.runs.length ? runs.data.runs.map(r => <div className="pt-row" key={r.runId}><span>{labels[r.kind] || r.kind}<small className="block pt-muted">{r.startedAt ? new Date(r.startedAt).toLocaleString('ru') : ''} · {r.model}</small></span><span>{dollars(r.total.costUsd)}</span></div>) : <p>У этого перевода пока нет учтённых запусков этих этапов.</p>)}
  </Card></div>;
}
