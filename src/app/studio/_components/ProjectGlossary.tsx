'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { downloadText } from '@/app/prototype/_components/downloads';
import { studioFetch } from '@/lib/studioFetch';
import type { GlossaryDocument } from '@/lib/studioGlossaryDraft';
import { checkedResponse, useBookData } from './bookRequests';
import { bookRunPath } from './projectLinks';
import { GlossaryEditor } from './GlossaryEditor';
import { LaunchAccessNotice, useLaunchAccess } from './LaunchAccess';
import { PendingText, RefreshButton } from './RequestFeedback';
import { StudioEntityMenu } from './StudioEntityMenu';

type Coverage = 'included' | 'unknown' | 'missing';
type ProjectDocument = {
  glossary: GlossaryDocument;
  revision: string;
  archived: boolean;
  books: Array<{ bookId: string; title: string | null; coverage: Coverage; runId: string | null }>;
};
const labels: Record<Coverage, string> = {
  included: 'Учтена', missing: 'Ещё не учтена', unknown: 'Состав прежнего глоссария не записан',
};
type Props = { projectId: string; lang: string; admin: boolean; onDirty?: (value: boolean) => void; buildAction?: ReactNode };

function ProjectDocumentPanel({ projectId, lang, onDirty, buildAction }: Omit<Props, 'admin'>) {
  const [reload, setReload] = useState(0);
  const url = '/api/studio/project-glossary?' + new URLSearchParams({projectId, lang});
  const result = useBookData<ProjectDocument>(url, reload);
  // Keep the editor and any unsaved text mounted when a refresh or save fails.
  const [seen, setSeen] = useState<ProjectDocument>();
  const [current, setCurrent] = useState<ProjectDocument>();
  if (result?.data && result.data !== seen) {
    setSeen(result.data);
    setCurrent(result.data);
  }
  useEffect(() => () => onDirty?.(false), [onDirty]);

  async function save(glossary: GlossaryDocument, expectedRevision: string | null, signal: AbortSignal) {
    try {
      const response = await checkedResponse(await studioFetch(url, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ glossary, expectedRevision }), signal,
      }));
      const saved: ProjectDocument = await response.json();
      signal.throwIfAborted();
      setCurrent(saved);
    } finally {
      if (!signal.aborted) setReload(value => value + 1);
    }
  }

  const included = current?.books.filter(book => book.coverage === 'included').length ?? 0;
  const unknown = current?.books.filter(book => book.coverage === 'unknown').length ?? 0;
  return <Card className="gap-3 p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2>Глоссарий проекта</h2>
      <div role="group" aria-label="Действия с глоссарием проекта" className="flex min-w-0 flex-wrap items-center gap-2">
        {!current?.archived && buildAction}
        <RefreshButton size="sm" pending={!result || result.refreshing} onClick={() => setReload(n => n + 1)}/>
        {current && <StudioEntityMenu label="Действия с глоссарием" actions={[{
          label: 'Скачать сохранённый JSON', onClick: () => downloadText('glossary-' + projectId + '-' + lang + '.json',
            JSON.stringify(current.glossary, null, 2), 'application/json'),
        }]}/>}
      </div>
    </div>
    {result?.error && <p role="alert">{result.error}</p>}
    {!current && !result?.error && <PendingText>Загружаем глоссарий проекта…</PendingText>}
    {current && <>
      {current.books.length ? <details className="rounded-md border border-[var(--app-border)] px-3 py-2 text-sm">
        <summary className="cursor-pointer font-medium">Учтено книг: {included} из {current.books.length}{unknown > 0 && <> · вклад не подтверждён для {unknown}</>}</summary>
        <ul className="mt-2 divide-y divide-[var(--app-border)]">
          {current.books.map(book => <li key={book.bookId} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
            {book.runId ? <Link className="underline" href={bookRunPath(book.bookId,lang,book.runId)}>{book.title || 'Без названия'}</Link> :
              <span>{book.title || 'Без названия'}</span>}
            <span className="pt-muted">{labels[book.coverage]}</span>
          </li>)}
        </ul>
      </details> : <p className="pt-muted text-sm">В очереди проекта пока нет книг.{!current.archived && ' Записи можно добавить вручную.'}</p>}
      <GlossaryEditor projectId={projectId} lang={lang} glossary={current.glossary} updatedAt={current.revision}
        frozen={false} locked={current.archived} lockedMessage="Глоссарий в архиве доступен для чтения."
        onSave={save} onDirtyChange={onDirty}/>
    </>}
  </Card>;
}

export function ProjectGlossary({ projectId, lang, admin, onDirty, buildAction }: Props) {
  const access = useLaunchAccess(!admin);
  if (!access.allowed) return <LaunchAccessNotice access={access}/>;
  return <ProjectDocumentPanel key={projectId + '/' + lang} projectId={projectId} lang={lang} onDirty={onDirty} buildAction={buildAction}/>;
}
