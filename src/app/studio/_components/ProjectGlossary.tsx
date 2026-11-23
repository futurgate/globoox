'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { queueBooks, projectLanguages } from './projectQueue';
import { GlossarySources } from './GlossarySources';
import IOSSettingsRow from '@/components/ui/ios-settings-row';
import { Card } from '@/components/ui/card';
import type { WorkspaceBook } from '@/lib/translationWorkspaceTypes';
import { useBookData } from './bookRequests';
import { BookGlossaryPanel } from './BookGlossary';
import { LaunchAccessNotice, useLaunchAccess } from './LaunchAccess';
import { PendingText, RefreshButton } from './RequestFeedback';
import { withStudioDraftGuard } from './StudioDraftActions';

type Version = { bookId: string; lang: string; state: string };
export function ProjectGlossary({ projectId, books, admin }: { projectId: string; books: WorkspaceBook[]; admin: boolean }) {
  const access = useLaunchAccess(!admin);
  const [reload, setReload] = useState(0);
  const requestedLang = useSearchParams().get('lang')?.toUpperCase();
  const [chosenBook, setBook] = useState('');
  const members = queueBooks(books, projectId);
  const info = useBookData<{ versions: Version[] }>(access.allowed && members.length ? '/api/translation-workspace/projects/' + projectId + '/glossaries' : null, reload);
  if (!access.allowed) return <LaunchAccessNotice access={access}/>;
  if (!members.length) return <p>В проекте пока нет книг.</p>;
  if (!info) return <PendingText>Загружаем версии глоссария…</PendingText>;
  if (!info.data) return <div role="alert">{info.error} <RefreshButton pending={info.refreshing} onClick={() => setReload(n => n + 1)}/></div>;
  const versions = info.data.versions;
  const langs = projectLanguages(members);
  const lang = requestedLang && langs.includes(requestedLang) ? requestedLang : langs[0] || 'EN';
  const saved = new Set(versions.filter(v => v.lang === lang && v.state === 'done').map(v => v.bookId));
  const book = members.find(b => b.id === chosenBook) ?? members.filter(b => saved.has(b.id)).at(-1) ?? members[0];
  return <div className="pt-stack">
    <Card className="gap-2 p-4">
      <IOSSettingsRow label="Версия для книги" value={book.id} options={members.map(b => ({
        id: b.id, label: (b.title || 'Без названия') + (saved.has(b.id) ? ' · глоссарий готов' : ''),
      }))} onChange={v => withStudioDraftGuard(() => setBook(v))}/>
    </Card>
    <GlossarySources key={book.id + lang} bookId={book.id} lang={lang}/>
    <BookGlossaryPanel key={book.id + '/' + lang} bookId={book.id} lang={lang} models={[]} books={members} admin={false} actionsInHeader={false} title="Записи глоссария"/>
  </div>;
}
