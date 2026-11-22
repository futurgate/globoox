'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { bookTranslationPath } from './projectLinks';
import { useBookData } from './bookRequests';
import { LaunchAccessNotice, useLaunchAccess } from './LaunchAccess';
import { RefreshButton } from './RequestFeedback';

interface Decision {
  bookId: string; title: string; lang: string; kind: 'named_entity'|'terminology';
  source: string; existing: string; proposed: string; chapterIndex: number | null;
}

export function GlossaryDecisions({ admin }: {admin:boolean}) {
  const access = useLaunchAccess(!admin);
  const [reload, setReload] = useState(0);
  const state = useBookData<{ items: Decision[] }>(access.allowed ? '/api/studio/glossary-decisions' : null, reload);
  return <Card className="gap-3 p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2>Спорные термины</h2>
      {access.allowed && <RefreshButton size="sm" pending={!state || state.refreshing} onClick={() => setReload(n => n + 1)}/>}</div>
    {!access.allowed ? <LaunchAccessNotice access={access} editorial/> : !state ? <p role="status">Загружаем расхождения глоссариев…</p>
      : state.error ? <p role="alert">{state.error}</p> : !state.data?.items.length ? <p>В ваших глоссариях нет открытых расхождений.</p>
      : state.data.items.map((d, i) => <div className="pt-row flex-wrap" key={[d.bookId,d.lang,d.source,i].join('/')}>
        <div><strong>{d.source}</strong><p className="pt-muted">{d.title} · {d.lang}{d.chapterIndex != null ? ' · глава ' + (d.chapterIndex + 1) : ''}</p>
          <p>{d.existing} / {d.proposed}</p></div>
        <Button asChild size="sm" variant="outline"><Link href={bookTranslationPath(d.bookId,d.lang,'glossary') + '?' + new URLSearchParams({term:d.source,kind:d.kind})}>Выбрать перевод</Link></Button>
      </div>)}
  </Card>;
}
