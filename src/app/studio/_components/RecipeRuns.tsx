'use client';

import { useState } from 'react';
import Link from 'next/link';
import { bookRunPath } from './projectLinks';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { runEndpoint, runsEndpoint, type FrozenRecipe, recipeSourceNames, type StudioRun } from '@/lib/studioRecipe';
import { useBookData } from './bookRequests';

interface StageSpend {
  stage: 'translate' | 'glossary'; attempts: number; calls: number; costUsd: number | null;
  tokensIn: number | null; tokensOut: number | null; cachedTokens: number | null; reasoningTokens: number | null;
  complete: boolean; models: string[];
}
interface HistoryRow extends StudioRun { costUsd: number | null; spend?: StageSpend[]; usageComplete: boolean }
const stageName = { glossary:'Глоссарий', translate:'Перевод текста', series:'Перевод в серии', book:'Перевод книги' };
const stateName = { done:'Завершён', running:'Выполняется', error:'Ошибка', stopped:'Остановлен' };
const formatCost = new Intl.NumberFormat('ru', { style:'currency', currency:'USD', maximumFractionDigits:5 });
const formatCount = new Intl.NumberFormat('ru');
function count(value: number | null) { return value == null ? '—' : formatCount.format(value); }
function statusOf(run: StudioRun) {
  const stages = Object.values(run.stages);
  if (!stages.length) return 'В очереди';
  const unfinished = stages.find(s => s.status === 'running') ?? stages.find(s => s.status === 'error' || s.status === 'stopped');
  if (unfinished) return stateName[unfinished.status];
  return (run.operation === 'series' || run.operation === 'book') && !run.stages.translate ? 'Ожидает перевода' : 'Завершён';
}

function RunDetails({ run, lang }: { run: HistoryRow; lang: string }) {
  const url = runEndpoint(run.bookId, lang, run.id);
  const result = useBookData<{ config: FrozenRecipe }>(url);
  const config = result?.data?.config;
  return <div className="grid gap-2 rounded-md bg-[var(--app-elevated-bg)] p-3">
    {result?.error && <p role="alert">{result.error}</p>}
    {!result && <p role="status">Загружаем параметры запуска…</p>}
    {config && <>
      <p><strong>Рецепт</strong> · {config.recipeId}</p>
      {config.wishes && <p><strong>Пожелания</strong> · {config.wishes}</p>}
      <p><strong>Единицы</strong> · {{ keep:'Как в оригинале', us:'Американские', metric:'Метрические' }[config.units] || config.units}</p>
      {(['glossary','translate'] as const).filter(stage => run.operation === 'series' || run.operation === 'book' || run.operation === stage).map(stage => {
        const frozen = config[stage];
        const spent = run.spend?.find(row => row.stage === stage);
        const source = config.sources[stage === 'glossary' ? 'glossaryModel' : 'translateModel'];
        return <div className="grid gap-1 border-t py-2" key={stage}>
          <h4 className="font-medium">{stageName[stage]}</h4>
          <p>Выбрана модель {frozen.model}{source ? ' · ' + recipeSourceNames[source] : ''}</p>
          {spent && <p>Попыток {spent.attempts} · учтено вызовов {spent.calls} · модели {spent.models.join(', ') || '—'} · вход из кэша {count(spent.cachedTokens)} · токены рассуждений {count(spent.reasoningTokens)}</p>}
          <details><summary>Шаблон на момент старта · {frozen.template}</summary>
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs">{frozen.prompt}</pre>
          </details>
        </div>;
      })}
    </>}
  </div>;
}

export function RecipeRuns({ bookId, lang, version, admin = true }: { bookId: string; lang: string; version: number; admin?: boolean }) {
  const [open, setOpen] = useState('');
  const [reload, setReload] = useState(0);
  const result = useBookData<{ runs: HistoryRow[]; limit: number }>(runsEndpoint(bookId, lang), version + reload);
  return <Card className="p-5 gap-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3>Запуски глоссария и перевода</h3>
      <Button size="sm" variant="ghost" onClick={() => setReload(v => v + 1)}>Обновить историю</Button></div>
    {result?.error && <p role="alert">{result.error}</p>}
    {!result && <p role="status">Загружаем историю…</p>}
    {result?.data && !result.data.runs.length && <p>Для этого перевода ещё нет запусков с сохранёнными параметрами.</p>}
    {!!result?.data?.runs.length && <div className="overflow-x-auto"><table className="w-full text-left text-sm tabular-nums [&_td]:p-2 [&_th]:p-2">
      <caption className="text-left pt-muted">Последние {result.data.limit} запусков · {lang}</caption>
      <thead><tr>{['Запуск','Состояние',...(admin ? ['Вход','Выход'] : []),'Расход, USD',...(admin ? [''] : [])].map((title,i) => <th key={i} scope="col">{title}</th>)}</tr></thead>
      <tbody>{result.data.runs.map(run => {
        const details = open === run.id;
        const sum = (key: 'tokensIn' | 'tokensOut') => {
          const measured = (run.spend ?? []).filter(s => s[key] !== null);
          return measured.length ? measured.reduce((v,s) => v + s[key]!,0) : null;
        };
        return <RunRows key={run.id} run={run} lang={lang} admin={admin} details={details} tokensIn={sum('tokensIn')} tokensOut={sum('tokensOut')}
          toggle={() => setOpen(details ? '' : run.id)}/>;
      })}</tbody>
    </table></div>}
  </Card>;
}

function RunRows({ run, lang, admin, details, toggle, tokensIn, tokensOut }: {
  run: HistoryRow; lang: string; admin: boolean; details: boolean; toggle: () => void; tokensIn: number | null; tokensOut: number | null;
}) {
  return <><tr className="border-t align-top"><td><Link className="underline" href={bookRunPath(run.bookId,lang,run.id)}>{stageName[run.operation]}</Link><small className="block pt-muted">{new Date(run.createdAt).toLocaleString('ru')}</small></td>
    <td>{statusOf(run)}</td>{admin && <><td>{count(tokensIn)}</td><td>{count(tokensOut)}</td></>}
    <td>{run.costUsd == null ? '—' : formatCost.format(run.costUsd)}
      {!run.usageComplete && (run.costUsd != null || tokensIn != null || tokensOut != null) && <small className="block pt-muted">Данные неполные</small>}</td>
    {admin && <td><Button size="sm" variant="ghost" onClick={toggle} aria-expanded={details}>{details ? 'Свернуть' : 'Подробнее'}</Button></td>}</tr>
    {admin && details && <tr><td colSpan={6}><RunDetails run={run} lang={lang}/></td></tr>}</>;
}
