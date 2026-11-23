'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { StudioSectionNavigation } from './StudioSectionNavigation';
import { RefreshButton } from './RequestFeedback';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { StudioRun } from '@/lib/studioRecipe';
import IOSAlertDialog from '@/components/ui/ios-alert-dialog';
import { ActionFeedback } from './BookStage';
import { useLaunchAccess } from './LaunchAccess';
import { bookPost, useBookAction, useBookData } from './bookRequests';
import { bookRunPath, projectPath } from './projectLinks';
import { activeStatus, operationNames, runCost, runDate, runStatusNames, stageNames, type RunStatus } from './runDisplay';

type Volume = {
  runId: string; bookId: string; title: string; volumeNumber: number | null; lang: string; status: RunStatus;
  projectId?: string | null; projectName?: string | null;
  activeStage: keyof typeof stageNames | null; progress?: { done: number; total: number; updatedAt: string } | null;
};
type Group = {
  groupId: string; createdAt: string; operation: StudioRun['operation'] | 'project' | 'project-glossary'; seriesName: string | null;
  projectId?: string | null; projectName?: string | null;
  projectInferred: boolean; lang: string; status: RunStatus; doneVolumes: number; totalVolumes: number;
  costUsd: number | null; usageComplete: boolean; volumes: Volume[]; canStop?: boolean; canResume?: boolean; stopRequested?: boolean; replacedBy?: string | null;
};
type Page = { groups: Group[]; nextCursor: string | null };
const hasActive = (page: Page) => page.groups.some(group =>
  activeStatus(group.status) || group.volumes.some(volume => activeStatus(volume.status))
);

export function ProjectTabs({ projectId, active }: { projectId: string; active?: string }) {
  const url = projectPath(projectId);
  const language = useSearchParams()?.get('lang');
  const suffix = language ? '?' + new URLSearchParams({ lang: language }) : '';
  return <StudioSectionNavigation label="Разделы проекта" compactLabel="Раздел проекта" active={active || ''}
    items={[{id:'', label:'Книги'}, {id:'glossary', label:'Глоссарий'}, {id:'runs', label:'Запуски'}]}
    hrefFor={id => url + (id ? '/' + id : '') + suffix}/>;

}

function Progress({ volume }: { volume: Volume }) {
  return <>{runStatusNames[volume.status]}{volume.activeStage && ' · ' + stageNames[volume.activeStage]}
    {volume.progress && <> · глав {volume.progress.done} из {volume.progress.total}</>}</>;
}

type Command = 'resume' | 'stop';

function GroupActions({ group, projectId, archived, refresh }: {
  group: Group; projectId: string; archived: boolean; refresh: () => void;
}) {
  const [confirm, setConfirm] = useState<Command | null>(null);
  const action = useBookAction();
  // Stop is available only on server versions that support the whole command.
  const stop = group.canStop === true;
  const resume = !archived && group.canResume === true;
  async function apply(command: Command, signal: AbortSignal) {
    const result = await (await bookPost('/api/studio/project-run',{
      projectId,lang:group.lang,groupId:group.groupId,...(command === 'stop' ? {action:'stop'} : {}),
    },signal)).json();
    if (result.groupId !== group.groupId || result.projectId !== projectId) throw Error('Сервер не подтвердил изменение запуска.');
    refresh();
    return command === 'stop' ? 'Остановка запрошена.' : 'Команда на продолжение принята.';
  }
  return <div className="grid gap-2">
    <div className="flex flex-wrap gap-2">
      {resume && <Button size="sm" disabled={action.busy} onClick={() => setConfirm('resume')}>Продолжить запуск</Button>}
      {stop && <Button size="sm" variant="outline" disabled={action.busy} onClick={() => setConfirm('stop')}>Остановить запуск</Button>}
    </div>
    <ActionFeedback pending={action.pending} error={action.error} notice={action.notice}/>
    {confirm && <IOSAlertDialog open showCancel title={confirm === 'stop' ? 'Остановить запуск проекта?' : 'Продолжить запуск проекта?'}
      description={confirm === 'stop' ? 'Обработка очереди приостановится. Уже выполняющиеся обращения к модели могут завершиться.' :
        'Обработка продолжится по сохранённым параметрам запуска. Оставшаяся работа расходует токены.'}
      confirmLabel={confirm === 'stop' ? 'Остановить' : 'Продолжить'} cancelLabel="Отмена" onOpenChange={open => {if (!open) setConfirm(null);}}
      onConfirm={() => {
        const command = confirm; setConfirm(null);
        void action.run(signal => apply(command,signal), command === 'stop' ? 'Запрашиваем остановку…' : 'Продолжаем запуск…');
      }}/>}
  </div>;
}

export function ProjectRunHistory({ projectId, archived = false, admin = false }: { projectId?: string; archived?: boolean; admin?: boolean }) {
  const [pages, setPages] = useState<string[]>(['']);
  const [version, setVersion] = useState(0);
  const [expanded, setExpanded] = useState('');
  const search = useSearchParams() ?? new URLSearchParams();
  const target = projectId ? search.get('group') : null;
  const cursor = pages[pages.length - 1];
  const params = new URLSearchParams();
  if (projectId) params.set('projectId',projectId);
  if (target) params.set('groupId',target);
  else if (cursor) params.set('cursor',cursor);
  const endpoint = projectId ? '/api/studio/project-runs' : '/api/studio/workspace-runs';
  const response = useBookData<Page>(endpoint + (params.size ? '?' + params : ''), version, hasActive);
  const page = response?.data;
  const groups = target ? page?.groups.filter(group => group.groupId === target) : page?.groups;
  const scoped = !!projectId && !!groups?.some(group => group.operation === 'project' || group.operation === 'project-glossary');
  const access = useLaunchAccess(!admin && scoped);
  const listUrl = projectId ? projectPath(projectId) + '/runs' : '';
  const back = search.get('lang') ? listUrl + '?' + new URLSearchParams({lang:search.get('lang')!}) : listUrl;
  return <Card className="min-w-0 gap-3 p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2>{target ? 'Запуск проекта' : projectId ? 'Запуски проекта' : 'История запусков'}</h2>
      <RefreshButton pending={!response || response.refreshing} variant="ghost" size="sm" onClick={() => setVersion(v => v + 1)}>Обновить</RefreshButton></div>
    {target && <Link className="w-fit underline" href={back} scroll={false}>Все запуски проекта</Link>}
    {response?.error && <p role="alert">{response.error}</p>}
    {!response && <p role="status">Загружаем запуски…</p>}
    {page && !groups?.length && <p className="pt-muted">{target ? 'Запуск не найден в этом проекте.' : projectId ? 'В этом проекте пока нет учтённых запусков Studio.' : 'У вас пока нет запусков Studio.'}</p>}
    {!!groups?.length && <div className="min-w-0 overflow-x-auto"><table className="w-full text-left text-sm [&_th]:px-2 [&_th]:py-2 [&_td]:px-2 [&_td]:py-3">
      <caption className="sr-only">{projectId ? 'История запусков проекта' : 'История моих запусков по всем проектам'}</caption>
      <thead><tr>{['Запуск', 'Состояние', 'Расход, USD'].map(c => <th scope="col" key={c}>{c}</th>)}</tr></thead>
      <tbody>{groups.map(group => {
        const book = group.volumes[0];
        if (!book) return null;
        const projectRun = group.operation === 'project' || group.operation === 'project-glossary';
        const grouped = projectRun || group.operation === 'series';
        const open = group.groupId === target || expanded === group.groupId;
        const launchProject = projectId || group.projectId;
        const href = launchProject && projectPath(launchProject) + '/runs?' + new URLSearchParams({lang:group.lang,group:group.groupId});
        const title = projectRun ? (group.operation === 'project-glossary' ? 'Глоссарий проекта' : 'Перевод проекта') : grouped ? group.seriesName || 'Серия' : book.title;
        return <Fragment key={group.groupId}><tr className="border-t align-top">
          <td>{projectRun && href ? (target ? <strong>{title}</strong> : <Link className="font-medium underline" scroll={false} href={href}>{title}</Link>)
            : grouped ? <button type="button" className="break-words text-left font-medium underline" aria-expanded={open}
              onClick={() => setExpanded(open ? '' : group.groupId)}>{title}</button> :
              <Link className="font-medium underline" href={bookRunPath(book.bookId,book.lang,book.runId)}>{title}</Link>}
            {!projectId && group.projectId && <Link className="block text-xs underline" href={projectPath(group.projectId)}>
              {group.projectName || 'Открыть проект'}</Link>}
            <small className="block pt-muted">{group.operation === 'project' || group.operation === 'project-glossary' ? 'Книг: ' + group.totalVolumes : operationNames[group.operation]} · {group.lang} · {runDate(group.createdAt)}</small>
          </td>
          <td>{grouped ? <>{group.replacedBy ? 'Заменён новым запуском' : group.stopRequested && activeStatus(group.status) ? 'Останавливается' : runStatusNames[group.status]}<small className="block pt-muted">Готово томов в проекте: {group.doneVolumes} из {group.totalVolumes}</small></> : <Progress volume={book}/>}</td>
          <td className="tabular-nums">{runCost(group.costUsd)}
            {group.costUsd != null && !group.usageComplete && <small className="block pt-muted">Учтено частично</small>}</td>
        </tr>
        {grouped && open && <tr><td colSpan={3}><ul className="grid gap-2">{group.volumes.map(v => <li key={v.runId} className="flex flex-wrap items-baseline justify-between gap-x-4">
          <Link className="min-w-0 break-words underline" href={bookRunPath(v.bookId,v.lang,v.runId)}>{v.volumeNumber != null && 'Том ' + v.volumeNumber + ' · '}{v.title}</Link>
          {!projectId && !group.projectId && v.projectId && <Link className="text-xs underline" href={projectPath(v.projectId)}>{v.projectName || 'Открыть проект'}</Link>}
          <span className="pt-muted"><Progress volume={v}/></span>
        </li>)}</ul>
          {projectRun && projectId && access.allowed && <GroupActions group={group} projectId={projectId} archived={archived} refresh={() => setVersion(v => v+1)}/>}
        </td></tr>}
        </Fragment>;
      })}</tbody>
    </table></div>}
    {groups?.some(g => g.projectInferred) && <p className="text-sm pt-muted">Часть прежних запусков отнесена к проекту по тому, где находилась книга при переносе истории.</p>}
    {!target && (pages.length > 1 || page?.nextCursor) && <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" disabled={pages.length === 1} onClick={() => {setExpanded('');setPages(prev => prev.slice(0,-1));}}>Новее</Button>
      <Button variant="outline" size="sm" disabled={!page?.nextCursor} onClick={() => {if (page?.nextCursor) { setExpanded('');setPages(prev => [...prev,page.nextCursor!]); }}}>Старее</Button>
    </div>}
  </Card>;
}
