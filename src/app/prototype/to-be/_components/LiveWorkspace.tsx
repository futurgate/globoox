'use client';

import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Layers3, ListOrdered, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { WorkspaceData } from '@/lib/translationWorkspaceTypes';
import { PrototypeShell, type NavItem } from '../../_components/PrototypeShell';
import ProjectLibrary from './ProjectLibrary';
import BookWorkspace from './BookWorkspace';
import WorkspaceActivity from './WorkspaceActivity';
import WorkspaceSettings from './WorkspaceSettings';

const base = '/prototype/to-be';
const projects = { label: 'Мои проекты', href: base + '/projects' };
const bookTabs = new Set(['glossary', 'review', 'runs', 'editions']);
const sectionNames: Record<string, string> = {
  projects: 'Мои проекты', decisions: 'Требуют решения', queue: 'Очередь', settings: 'Настройки перевода',
};

export default function LiveWorkspace() {
  const router = useRouter();
  const path = usePathname();
  const parts = useParams<{ path?: string[] }>().path ?? [];
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [guest, setGuest] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const account = useRef<string | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setError('');
    try {
      const response = await fetch('/api/translation-workspace', { cache: 'no-store', signal: controller.signal });
      if (response.status === 401) {
        setData(null);
        setGuest(true);
        return;
      }
      if (!response.ok) throw new Error('Не удалось загрузить книги (' + response.status + ').');
      const current: WorkspaceData = await response.json();
      if (controller.signal.aborted) return;
      account.current = current.userId;
      setData(current);
      setGuest(false);
    } catch (err) {
      if (controller.signal.aborted) return;
      setData(null);
      setGuest(false);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить кабинет.');
    }
  }, []);

  useEffect(() => {
    void refresh();
    const client = createClient();
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user.id ?? null;
      if (account.current !== undefined && account.current !== userId) {
        setData(null);
        setError('');
        setGuest(!userId);
        void refresh();
      }
      account.current = userId;
    });
    return () => { request.current?.abort(); subscription.unsubscribe(); };
  }, [refresh]);

  if (!data) {
    return <main className="pt-index" aria-busy={!guest && !error}>
      <h1>Кабинет перевода</h1>
      {guest ? <><p className="pt-lead">Войдите, чтобы открыть свои книги и переводы.</p>
        <Button asChild className="mt-5"><Link href={'/auth?next=' + encodeURIComponent(path)}>Войти в Globoox</Link></Button></>
        : error ? <><p className="pt-lead" role="alert">{error}</p><Button variant="outline" className="mt-5" onClick={refresh}>Попробовать снова</Button></>
        : <p className="pt-lead" role="status">Загружаем ваши проекты…</p>}
    </main>;
  }

  const admin = data.role === 'admin';
  const [first = 'projects', id, sub, lang, tab] = parts;
  const items: NavItem[] = [
    { id: 'projects', label: sectionNames.projects, icon: Layers3 },
    { id: 'decisions', label: sectionNames.decisions, icon: Bell },
    ...(admin ? [{ id: 'queue', label: sectionNames.queue, icon: ListOrdered }, { id: 'settings', label: sectionNames.settings, icon: Settings2 }] : []),
  ];
  let title = 'Страница недоступна';
  let active = 'projects';
  let ancestors = [projects];
  let panel = <p>Проверьте адрес или откройте книгу из своих проектов.</p>;

  if (first === 'projects' && (!id || id === 'new') && parts.length <= 2) {
    const isNew = id === 'new';
    title = isNew ? 'Загрузка книги или серии' : projects.label;
    ancestors = isNew ? [projects] : [];
    panel = <ProjectLibrary data={data} view={isNew ? 'new' : 'projects'} refresh={refresh} />;
  } else if (first === 'series' && id && parts.length === 2) {
    const series = data.series.find(item => item.id === id);
    if (series || data.books.some(book => book.seriesId === id)) {
      title = series?.name || 'Серия';
      panel = <ProjectLibrary key={id} data={data} view="series" seriesId={id} refresh={refresh} />;
    }
  } else if (first === 'books' && id && (parts.length === 2 ||
      (sub === 'translations' && /^[a-z]{2}$/i.test(lang || '') && (parts.length === 4 || (parts.length === 5 && bookTabs.has(tab)))))) {
    const book = data.books.find(item => item.id === id);
    if (book) {
      title = book.title || 'Книга без названия';
      const series = data.series.find(item => book.seriesId === item.id);
      if (book.seriesId) ancestors.push({ label: series?.name || 'Серия', href: base + '/series/' + book.seriesId });
      panel = <BookWorkspace key={[data.userId, id, lang].join('/')} ownerId={data.userId} book={book} books={data.books} isAdmin={admin} lang={lang?.toUpperCase()} section={tab} />;
    }
  } else if ((first === 'decisions' || (admin && first === 'queue')) && parts.length === 1) {
    active = first;
    title = sectionNames[first];
    ancestors = [];
    panel = <WorkspaceActivity key={data.userId + first} view={first} workspace={data} />;
  } else if (admin && first === 'settings' && (parts.length === 1 || (id === 'templates' && parts.length === 3))) {
    title = sub || sectionNames.settings;
    active = first;
    ancestors = sub ? [{ label: sectionNames.settings, href: base + '/settings' }] : [];
    panel = <WorkspaceSettings key={data.userId} name={sub} />;
  }

  return <PrototypeShell live role={data.role} items={items} active={active} title={title}
    detail={ancestors.length ? { ancestors } : undefined} onSelect={page => router.push(base + '/' + page)}>
    {panel}
  </PrototypeShell>;
}
