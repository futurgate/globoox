'use client';

import { useState } from 'react';
import { CopyTextButton } from '@/components/ui/copy-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { BookTranslationEstimate, FictionCosts, QaReportV2, ReaderCheckCostStageBreakdown } from '@/lib/api';
import { downloadText } from '@/app/prototype/_components/downloads';
import { BookExportCover } from './BookExportCover';
import { RecipeRuns } from './RecipeRuns';
import { ActionFeedback, stages } from './BookStage';
import { bookEndpoint, bookPost, downloadBookFile, useBookAction, useBookData } from './bookRequests';

export function Planned({ title, description }: { title: string; description: string }) {
  return <Card className="p-5 gap-2"><div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="opacity-60">{title}</h3><span className="pt-muted text-sm">Планируется</span></div><p className="pt-muted">{description}</p></Card>;
}
const dollars = (v: number | null) => v == null ? 'Тариф не указан' : new Intl.NumberFormat('ru', { style:'currency', currency:'USD', maximumFractionDigits:4 }).format(v);

export function Estimate({ bookId, lang, model }: {bookId: string; lang: string; model: string | null}) {
  const [show, setShow] = useState(false);
  const [version, setVersion] = useState(0);
  const result = useBookData<BookTranslationEstimate>(show && model ? bookEndpoint(bookId, 'translation-estimate', lang) + '&model=' + encodeURIComponent(model) : null, version);
  const estimate = result?.data?.byLanguage.find(l => l.lang === lang);
  return <Card className="p-5 gap-3"><h3>Оценка перевода текста</h3>
    <p className="pt-muted">{model ? 'По оставшимся блокам книги и тарифу модели ' + model + '.' : 'Оценка доступна после загрузки параметров перевода.'}</p>
    <Button variant="outline" disabled={!model || (show && !result)} onClick={() => { setShow(true); setVersion(v => v + 1); }}>{model && show && !result ? 'Расчёт…' : 'Рассчитать'}</Button>
    <ActionFeedback error={result?.error}/>
    {result?.data && <p>{estimate ? `${dollars(estimate.cost.totalUsd)} · осталось блоков: ${estimate.blocksRemaining} · модель ${result.data.model}` : 'Для этого направления оценка отсутствует.'}</p>}
  </Card>;
}

export function BookEdition({ bookId, title, lang, isAdmin }: { bookId: string; title: string; lang: string; isAdmin: boolean }) {
  const [report, setReport] = useState<QaReportV2>();
  const [reload, setReload] = useState(0);
  const action = useBookAction();
  const coverAction = useBookAction();
  const coverage = useBookData<BookTranslationEstimate>(bookEndpoint(bookId, 'translation-estimate', lang), reload);
  const target = coverage?.data?.byLanguage.find(l => l.lang === lang);
  const covered = target && target.blocksRemaining === 0 && target.blocksTranslated > 0;
  const download = bookEndpoint(bookId, 'download-translated', lang);
  return <div className="pt-stack">
    <BookExportCover bookId={bookId} lang={lang} action={coverAction} disabled={action.busy}/>
    <Card className="p-5 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2>Переведённый EPUB</h2><Button variant="ghost" onClick={() => setReload(v => v + 1)}>Обновить</Button></div>
      {coverage?.error ? <ActionFeedback error={coverage.error}/> : <p className="pt-muted">{!coverage ? 'Проверяем готовность текста…' : target ? `Переведено блоков: ${target.blocksTranslated}, осталось: ${target.blocksRemaining}.` : 'Не удалось определить готовность по статистике блоков.'}</p>}
      <div className="flex flex-wrap gap-2">
        {covered || coverage?.error || (coverage?.data && !target)
          ? <Button disabled={action.busy || coverAction.busy} onClick={() => void action.run(signal => downloadBookFile(download, (title || bookId) + ' (' + lang + ')', signal))}>Скачать EPUB</Button>
          : <Button disabled>Скачать EPUB после перевода</Button>}
        {isAdmin && <Button variant="outline" disabled={action.busy || coverAction.busy || (!!target && !covered)} onClick={() => void action.run(async signal => {
          const r = await bookPost(bookEndpoint(bookId,'translation-quality',lang),{ targetLang:lang, genre:'fiction' },signal);
          const next: QaReportV2 = await r.json();
          if (!signal.aborted) setReport(next);
        })}>Проверить качество EPUB</Button>}
      </div>
      <ActionFeedback error={action.error}/>
      {isAdmin && report && <div className="grid gap-2"><h3>Результат проверки</h3>
        <p>Ошибок текста: {report.summary.errors} · замечаний: {report.summary.review} · ошибок структуры EPUB: {report.epub.blocking.length}.</p>
        {[...report.epub.blocking, ...report.epub.warnings].map((s,i) => <p key={i}>{s}</p>)}
        {report.issues.length > 0 && <details><summary>Замечания по тексту</summary>{report.issues.map((issue, i) => <p key={i} className="py-1">{issue.message}</p>)}</details>}
        <Button variant="outline" onClick={() => downloadText(`quality-${bookId}-${lang}.json`,JSON.stringify(report,null,2),'application/json')}>Скачать результат проверки</Button></div>}
    </Card>
    <Planned title="EPUB для продажи" description="Подготовка выходных данных, аннотации и титульного листа для магазинов."/>
    <Planned title="Проверенный выпуск и итоговый отчёт" description="Выдача выпуска после обязательной проверки и сводный отчёт по книге."/>
  </div>;
}

type RunStage = 'revise' | 'reader-check' | 'correction';
type CostRun = {
  runId: string;
  kind: 'revision' | 'reader-check';
  model: string | null;
  startedAt: string | null;
  stages: (ReaderCheckCostStageBreakdown & { stage: RunStage })[];
  total: ReaderCheckCostStageBreakdown;
};
const costLabels = {
  ...Object.fromEntries(Object.entries(stages).map(([key, stage]) => [key, stage.title])),
  revision: 'Стилистическая редактура',
  correction: 'Исправление замечаний',
} as Record<string, string>;
const counts = new Intl.NumberFormat('ru');
const seconds = new Intl.NumberFormat('ru', { maximumFractionDigits: 1 });

type CostRow = {
  label: string;
  calls: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  durationMs?: number;
};

function CostTable({ rows, label }: { rows: CostRow[]; label: string }) {
  return <div className="overflow-x-auto">
    <table aria-label={label} className="w-full text-right text-sm tabular-nums [&_td]:px-2 [&_td]:py-2 [&_th]:px-2 [&_th]:py-2">
      <thead className="pt-muted"><tr>
        <th scope="col" className="text-left">Показатели</th>
        <th scope="col">Вызовы</th><th scope="col">Входные токены</th><th scope="col">Выходные токены</th>
        <th scope="col">Стоимость</th><th scope="col">Время LLM</th>
      </tr></thead>
      <tbody>{rows.map(row => <tr key={row.label} className="border-t border-[var(--app-border)]">
        <th scope="row" className="text-left font-medium">{row.label}</th>
        <td>{counts.format(row.calls)}</td><td>{counts.format(row.tokensIn)}</td><td>{counts.format(row.tokensOut)}</td>
        <td className="whitespace-nowrap">{dollars(row.costUsd)}</td>
        <td className="whitespace-nowrap">{row.durationMs == null ? '—' : seconds.format(row.durationMs / 1000) + ' с'}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}

export function BookRuns({ bookId, lang }: { bookId: string; lang: string }) {
  const [version, setVersion] = useState(0);
  const costs = useBookData<FictionCosts>(bookEndpoint(bookId, 'fiction-costs', lang), version);
  const runs = useBookData<{ runs: CostRun[] }>(bookEndpoint(bookId, 'fiction-cost-runs', lang), version);
  const visibleStages = costs?.data?.stages.filter(stage => stage.ran || stage.measured) ?? [];

  return <div className="pt-stack">
    <Card className="p-5 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2>Расходы по этапам</h2>
        <Button variant="ghost" onClick={() => setVersion(v => v + 1)}>Обновить</Button>
      </div>
      <ActionFeedback error={costs?.error}/>
      {!costs && <p role="status">Загружаем статистику…</p>}
      {costs?.data && <>
        {costs.data.hasMeasured && <p>Учтённый расход по книге · {dollars(costs.data.totals.measured.costUsd)}</p>}
        {!visibleStages.length && <p>Пока нет данных о выполненных этапах.</p>}
        {visibleStages.map(({ stage, estimate, measured }) => {
          const rows: CostRow[] = [
            { ...estimate, label: estimate.priceKnown ? 'Расчётно' : 'Расчётно по примерному тарифу', calls: estimate.llmCalls },
          ];
          if (measured) rows.push({ ...measured, label: 'Фактически', calls: measured.llmCalls });
          return <details key={stage} className="border-t border-[var(--app-border)] py-2">
            <summary>{costLabels[stage]} · {measured ? dollars(measured.costUsd) : 'расчётно ' + dollars(estimate.costUsd)}</summary>
            <CostTable label={'Расходы этапа «' + costLabels[stage] + '»'} rows={rows}/>
            {measured?.modelVersion && <p className="pt-muted text-sm">Модель · {measured.modelVersion}</p>}
            {measured && (measured.cachedTokensIn > 0 || measured.thoughtsTokens > 0) && <p className="pt-muted text-sm">
              Входные токены из кеша · {counts.format(measured.cachedTokensIn)}. Токены рассуждений · {counts.format(measured.thoughtsTokens)}.
            </p>}
          </details>;
        })}
        <div><CopyTextButton subject="Статистика расхода" text={JSON.stringify(costs.data, null, 2)}/></div>
      </>}
    </Card>
    <RecipeRuns bookId={bookId} lang={lang} version={version}/>
    <Card className="p-5 gap-3">
      <h3>Запуски редактуры и читательской проверки</h3>
      <ActionFeedback error={runs?.error}/>
      {!runs && <p role="status">Загружаем запуски…</p>}
      {runs?.data && !runs.data.runs.length && <p>У этого перевода пока нет учтённых запусков этих этапов.</p>}
      {runs?.data?.runs.map(run => {
        const rows: CostRow[] = run.stages.map(stage => ({
          ...stage, label: stage.stage === 'reader-check' ? 'Поиск замечаний' : costLabels[stage.stage],
        }));
        if (rows.length !== 1) rows.push({ ...run.total, label: 'Всего за запуск' });
        return <details key={run.runId} className="border-t border-[var(--app-border)] py-2">
          <summary>{costLabels[run.kind]} · {dollars(run.total.costUsd)}
            <small className="pt-muted ml-2">{[run.startedAt && new Date(run.startedAt).toLocaleString('ru'), run.model].filter(Boolean).join(' · ')}</small>
          </summary>
          <CostTable label={'Расходы за запуск ' + run.runId} rows={rows}/>
        </details>;
      })}
    </Card>
  </div>;
}
