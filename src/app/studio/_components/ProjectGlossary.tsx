'use client';

import { useState } from 'react';
import IOSSettingsRow from '@/components/ui/ios-settings-row';
import { Card } from '@/components/ui/card';
import type { WorkspaceBook } from '@/lib/translationWorkspaceTypes';
import { useBookData } from './bookRequests';
import { BookGlossaryPanel } from './BookGlossary';
import { LaunchAccessNotice, useLaunchAccess } from './LaunchAccess';
import { PendingText, RefreshButton } from './RequestFeedback';
import { withStudioDraftGuard } from './StudioDraftActions';

type Version = { bookId: string; lang: string; state: string };
const displayLang = new Intl.DisplayNames(['ru'], { type: 'language' });
function langLabel(code: string) {
  try { return displayLang.of(code) || code; } catch { return code; }
}

export function ProjectGlossary({ projectId, books, admin }: { projectId: string; books: WorkspaceBook[]; admin: boolean }) {
  const access = useLaunchAccess(!admin);
  const [reload, setReload] = useState(0);
  const [chosenLang, setLang] = useState('');
  const [chosenBook, setBook] = useState('');
  const members = books.filter(book => book.projectId === projectId && !book.projectArchived)
    .sort((a,b) => (a.volumeNumber ?? Infinity) - (b.volumeNumber ?? Infinity) || a.title.localeCompare(b.title, 'ru'));
  const info = useBookData<{ versions: Version[] }>(access.allowed && members.length ? '/api/translation-workspace/projects/' + projectId + '/glossaries' : null, reload);
  if (!access.allowed) return <LaunchAccessNotice access={access}/>;
  if (!members.length) return <p>В проекте пока нет книг.</p>;
  if (!info) return <PendingText>Загружаем версии глоссария…</PendingText>;
  if (!info.data) return <div role="alert">{info.error} <RefreshButton pending={info.refreshing} onClick={() => setReload(n => n + 1)}/></div>;
  const versions = info.data.versions;
  const langs = [...new Set([...versions.map(v => v.lang), ...members.map(b => b.sourceLanguage?.toUpperCase() === 'EN' ? 'RU' : 'EN')])];
  const lang = langs.includes(chosenLang) ? chosenLang : langs[0];
  const saved = new Set(versions.filter(v => v.lang === lang && v.state === 'done').map(v => v.bookId));
  const book = members.find(b => b.id === chosenBook) ?? members.filter(b => saved.has(b.id)).at(-1) ?? members[0];
  return <div className="pt-stack">
    <Card className="gap-2 p-4">
      <IOSSettingsRow label="Язык перевода" value={lang} options={langs.map(id => ({ id, label: langLabel(id) }))}
        onChange={v => withStudioDraftGuard(() => { setLang(v); setBook(''); })}/>
      <IOSSettingsRow label="Версия для книги" value={book.id} options={members.map(b => ({
        id: b.id, label: (b.title || 'Без названия') + (saved.has(b.id) ? ' · глоссарий готов' : ''),
      }))} onChange={v => withStudioDraftGuard(() => setBook(v))}/>
    </Card>
    <BookGlossaryPanel key={book.id + '/' + lang} bookId={book.id} lang={lang} models={[]} books={members} admin={false} title="Записи глоссария"/>
  </div>;
}
