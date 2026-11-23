'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { useBookData } from './bookRequests';
import { bookRunPath } from './projectLinks';
import { PendingText, RefreshButton } from './RequestFeedback';

type Source = {bookId:string; runId:string; title:string | null; position:number; chapters:number; adopted:boolean};
type Hit = {bookId:string; runId:string; chapterId:string; chapter:number; title:string | null; target:string};
export function GlossarySources({bookId,lang,entry,runId}: {
  bookId:string; lang:string; entry?:{kind:string; source:string}; runId?:string;
}) {
  const [open,setOpen] = useState(false);
  const [refresh,setRefresh] = useState(0);
  const params = new URLSearchParams({bookId,lang,...entry,...(runId ? {runId}: {})});
  const result = useBookData<{runId:string | null;books:Source[];matches:Hit[]}>(open ? '/api/studio/glossary-sources?' + params : null,refresh);
  return <Card className="gap-2 p-4"><details open={open} onToggle={e => setOpen(e.currentTarget.open)}>
    <summary className="cursor-pointer font-medium">{entry ? 'Источники термина в последнем запуске проекта' : runId ? 'Учтённые книги' : 'Учтённые книги последнего запуска проекта'}</summary>
    {open && <div className="mt-2 grid gap-2 text-sm">
      {!result && <PendingText>Загружаем источники…</PendingText>}
      {result?.error && <div role="alert">{result.error} <RefreshButton onClick={() => setRefresh(n => n+1)} pending={result.refreshing}/></div>}
      {result?.data && (!result.data.runId ? <p>Для этой версии состав по книгам не записан.</p> :
        entry ? (result.data.matches.length ? <ul>{result.data.matches.map((m,i) => <li key={m.chapterId+i}>
          <Link className="underline" href={bookRunPath(m.bookId,lang,m.runId)}>{result.data?.books.find(b => b.bookId === m.bookId)?.title} · {m.title || 'Глава ' + m.chapter} · {m.target}</Link>
        </li>)}</ul> : <p>В сохранённых результатах глав источник этой записи не найден.</p>) :
        <ol>{result.data.books.map(b => <li key={b.runId}><Link className="underline" href={bookRunPath(b.bookId,lang,b.runId)}>{b.position}. {b.title || 'Книга без названия'}</Link>
          {' · '}{b.adopted ? 'использован готовый словарь, источник глав не зафиксирован' : b.chapters ? 'глав с сохранённым вкладом: ' + b.chapters : 'нет детализации по главам'}</li>)}</ol>)}
    </div>}
  </details></Card>;
}
