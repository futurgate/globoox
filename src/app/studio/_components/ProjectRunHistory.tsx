'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { RefreshButton } from './RequestFeedback';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { StudioRun } from '@/lib/studioRecipe';
import { useBookData } from './bookRequests';
import { bookRunPath, projectPath } from './projectLinks';
import { activeStatus, operationNames, runCost, runDate, runStatusNames, stageNames, type RunStatus } from './runDisplay';

type Volume = {
  runId: string; bookId: string; title: string; volumeNumber: number | null; lang: string; status: RunStatus;
  activeStage: keyof typeof stageNames | null; progress?: { done: number; total: number; updatedAt: string } | null;
};
type Group = {
  groupId: string; createdAt: string; operation: StudioRun['operation']; seriesName: string | null;
  projectInferred: boolean; lang: string; status: RunStatus; doneVolumes: number; totalVolumes: number;
  costUsd: number | null; usageComplete: boolean; volumes: Volume[];
};
type Page = { groups: Group[]; nextCursor: string | null };
const hasActive = (page: Page) => page.groups.some(group =>
  activeStatus(group.status) || group.volumes.some(volume => activeStatus(volume.status))
);

export function ProjectTabs({ projectId, active }: { projectId: string; active?: string }) {
  const url = projectPath(projectId);
  return <nav className="pt-sections mb-4" aria-label="Разделы проекта">
    <Button variant="ghost" asChild><Link href={url} aria-current={!active ? 'page' : undefined}>Книги</Link></Button>
    <Button variant="ghost" asChild><Link href={url + '/glossary'} aria-current={active === 'glossary' ? 'page' : undefined}>Глоссарий</Link></Button>
    <Button variant="ghost" asChild><Link href={url + '/runs'} aria-current={active === 'runs' ? 'page' : undefined}>Запуски</Link></Button>
  </nav>;
}

function Progress({ volume }: { volume: Volume }) {
  return <>{runStatusNames[volume.status]}{volume.activeStage && ' · ' + stageNames[volume.activeStage]}
    {volume.progress && <> · глав {volume.progress.done} из {volume.progress.total}</>}</>;
}

export function ProjectRunHistory({ projectId }: { projectId: string }) {
  const [pages, setPages] = useState<string[]>(['']);
  const [version, setVersion] = useState(0);
  const [expanded, setExpanded] = useState('');
  const cursor = pages[pages.length - 1];
  const params = new URLSearchParams({ projectId });
  if (cursor) params.set('cursor', cursor);
  const response = useBookData<Page>('/api/studio/project-runs?' + params, version, hasActive);
  const page = response?.data;
  return <Card className="gap-3 p-4 sm:p-5">
    <div className="flex items-center justify-between gap-2"><h2>Запуски проекта</h2>
      <RefreshButton pending={!response || response.refreshing} variant="ghost" size="sm" onClick={() => setVersion(v => v + 1)}>Обновить</RefreshButton></div>
    {response?.error && <p role="alert">{response.error}</p>}
    {!response && <p role="status">Загружаем запуски…</p>}
    {page && !page.groups.length && <p className="pt-muted">В этом проекте пока нет учтённых запусков Studio.</p>}
    {!!page?.groups.length && <div className="overflow-x-auto"><table className="w-full text-left text-sm [&_th]:px-2 [&_th]:py-2 [&_td]:px-2 [&_td]:py-3">
      <caption className="sr-only">История запусков проекта</caption>
      <thead><tr>{['Запуск', 'Состояние', 'Расход, USD'].map(c => <th scope="col" key={c}>{c}</th>)}</tr></thead>
      <tbody>{page.groups.map(group => {
        const book = group.volumes[0];
        if (!book) return null;
        const series = group.operation === 'series';
        const open = expanded === group.groupId;
        const title = series ? group.seriesName || 'Серия' : book.title;
        return <Fragment key={group.groupId}><tr className="border-t align-top">
          <td>{series ? <button type="button" className="text-left font-medium underline" aria-expanded={open}
            onClick={() => setExpanded(open ? '' : group.groupId)}>{title}</button> :
            <Link className="font-medium underline" href={bookRunPath(book.bookId,book.lang,book.runId)}>{title}</Link>}
            <small className="block pt-muted">{operationNames[group.operation]} · {group.lang} · {runDate(group.createdAt)}</small>
          </td>
          <td>{series ? <>{runStatusNames[group.status]}<small className="block pt-muted">Готово томов в проекте: {group.doneVolumes} из {group.totalVolumes}</small></> : <Progress volume={book}/>}</td>
          <td className="tabular-nums">{runCost(group.costUsd)}
            {group.costUsd != null && !group.usageComplete && <small className="block pt-muted">Учтено частично</small>}</td>
        </tr>
        {series && open && <tr><td colSpan={3}><ul className="grid gap-2 pl-3">{group.volumes.map(v => <li key={v.runId} className="flex flex-wrap items-baseline justify-between gap-x-4">
          <Link className="underline" href={bookRunPath(v.bookId,v.lang,v.runId)}>{v.volumeNumber != null && 'Том ' + v.volumeNumber + ' · '}{v.title}</Link>
          <span className="pt-muted"><Progress volume={v}/></span>
        </li>)}</ul></td></tr>}
        </Fragment>;
      })}</tbody>
    </table></div>}
    {page?.groups.some(g => g.projectInferred) && <p className="text-sm pt-muted">Часть прежних запусков отнесена к проекту по тому, где находилась книга при переносе истории.</p>}
    {(pages.length > 1 || page?.nextCursor) && <div className="flex gap-2">
      <Button variant="outline" size="sm" disabled={pages.length === 1} onClick={() => {setExpanded('');setPages(prev => prev.slice(0,-1));}}>Новее</Button>
      <Button variant="outline" size="sm" disabled={!page?.nextCursor} onClick={() => {if (page?.nextCursor) { setExpanded('');setPages(prev => [...prev,page.nextCursor!]); }}}>Старее</Button>
    </div>}
  </Card>;
}
