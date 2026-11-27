'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { WorkspaceBook, WorkspaceProject } from '@/lib/translationWorkspaceTypes';
import { ProjectLaunchDialog } from './ProjectLaunchDialog';
import { useBookData } from './bookRequests';
import { queueBooks, queueInProgress, stageInProgress, type QueueProgress, type ProjectOperation } from './projectQueue';
import { bookRunPath, projectPath } from './projectLinks';
import { PendingText, RefreshButton } from './RequestFeedback';

export function BookProjectRun({book,books,project,lang,ready,glossaryOnly=false}: {
  book:WorkspaceBook; books:readonly WorkspaceBook[]; project:WorkspaceProject; lang:string; ready:boolean; glossaryOnly?:boolean;
}) {
  const [operation,setOperation] = useState<ProjectOperation>();
  const [accepted,setAccepted] = useState('');
  const [version,setVersion] = useState(0);
  const state = useBookData<{books:QueueProgress[]}>('/api/studio/project-progress?' + new URLSearchParams({projectId:project.id,lang}),version,queueInProgress);
  const stages = state?.data?.books.find(row => row.bookId === book.id);
  const active = [stages?.glossary,stages?.translate].find(s => stageInProgress(s));
  const members = queueBooks(books,project.id);
  if (project.archived || book.projectArchived) return <p className="pt-callout">Для запуска восстановите {project.archived ? 'проект' : 'книгу'} из архива.</p>;
  return <Card className="gap-3 p-5"><h2>{glossaryOnly ? 'Подготовка глоссария книги' : 'Перевод книги'}</h2>
    {!state && <PendingText>Проверяем состояние книги…</PendingText>}
    {state?.error && <p role="alert">{state.error} <RefreshButton pending={state.refreshing} onClick={() => setVersion(v => v+1)}/></p>}
    {active?.runId ? <Button asChild className="self-start"><Link href={bookRunPath(book.id,lang,active.runId)}>Открыть текущий запуск</Link></Button> :
      <div className="flex flex-wrap gap-2">
        {!glossaryOnly && <Button disabled={!state?.data || !ready} onClick={() => setOperation('translate')}>Запустить перевод книги</Button>}
        <Button variant={glossaryOnly ? 'default' : 'outline'} disabled={!state?.data || !ready} onClick={() => setOperation('glossary')}>Собрать глоссарий книги</Button>
      </div>}
    {!ready && <p className="pt-muted text-sm">Сначала сохраните параметры книги.</p>}
    {accepted && <Link className="underline" href={projectPath(project.id) + '/runs?lang=' + lang + '&group=' + accepted}>Команда принята · Запуски проекта</Link>}
    {operation && <ProjectLaunchDialog projectId={project.id} bookId={book.id} books={members} progress={state?.data?.books ?? []}
      lang={lang} operation={operation} onClose={() => setOperation(undefined)} onAccepted={groupId => {
        setAccepted(groupId); setOperation(undefined); setVersion(v => v+1);
      }}/>}
  </Card>;
}
