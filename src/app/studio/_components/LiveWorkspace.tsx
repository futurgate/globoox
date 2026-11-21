'use client';

import { studioFetch } from '@/lib/studioFetch';
import { clearBrowserAccessTokenCache, forgetLegacyBrowserSession } from '@/lib/api';

import Link from 'next/link';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Layers3, ListOrdered, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { workspaceBase as base } from '@/lib/translationWorkspacePath';
import type { WorkspaceData } from '@/lib/translationWorkspaceTypes';
import { PrototypeShell, type NavItem } from '@/app/prototype/_components/PrototypeShell';
import ProjectLibrary from './ProjectLibrary';
import BookWorkspace from './BookWorkspace';
import { projectPath } from './projectLinks';
import WorkspaceActivity from './WorkspaceActivity';
import WorkspaceSettings from './WorkspaceSettings';

const projects = { label: 'Мои проекты', href: base + '/projects' };
const bookTabs = new Set(['glossary', 'review', 'runs', 'editions']);
const sectionNames: Record<string, string> = {
  projects: 'Мои проекты', decisions: 'Требуют решения', queue: 'Очередь', settings: 'Настройки перевода',
};

function WorkspaceLogin() {
  const path = usePathname();
  const query = useSearchParams().toString();
  const next = path + (query ? '?' + query : '');
  return <Button asChild className="mt-5">
    <Link href={'/auth?next=' + encodeURIComponent(next)}>Войти в Globoox</Link>
  </Button>;
}

export default function LiveWorkspace() {
  const parts = useParams<{ path?: string[] }>().path ?? [];
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [guest, setGuest] = useState(false);
  const [error, setError] = useState('');
  const [reauth, setReauth] = useState(false);
  const sdkAccount = useRef<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const account = useRef<string | null | undefined>(undefined);

  const refresh = useCallback(async (sessionToken?: string) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setError('');
    setReauth(false);
    try {
      const response = await studioFetch('/api/translation-workspace', { cache: 'no-store', signal: controller.signal }, sessionToken);
      if (controller.signal.aborted) return;
      if (response.status === 401) {
        account.current = null;
        setData(null);
        if (sdkAccount.current) {
          setGuest(false);
          setReauth(true);
          setError('Кабинету не удалось подтвердить текущий сеанс.');
        } else setGuest(true);
        return;
      }
      if (!response.ok) throw new Error('Не удалось загрузить книги (' + response.status + ').');
      const current: WorkspaceData = await response.json();
      if (controller.signal.aborted) return;
      if (sdkAccount.current && current.userId !== sdkAccount.current) {
        setData(null); setReauth(true);
        throw new Error('Аккаунт в кабинете изменился. Обновите сеанс.');
      }
      account.current = current.userId;
      setData(current);
      setGuest(false);
    } catch (err) {
      if (controller.signal.aborted) return;
      setGuest(false);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить кабинет.');
    }
  }, []);

  useEffect(() => {
    const client = createClient();
    let initialized = false;
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      const userId = session?.user.id ?? null;
      sdkAccount.current = userId;
      const first = !initialized;
      initialized = true;
      if (event === 'SIGNED_OUT') forgetLegacyBrowserSession();
      else clearBrowserAccessTokenCache();
      if (!first && event !== 'SIGNED_OUT' && account.current === userId) {
        if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') void refresh(session?.access_token);
        return;
      }

      account.current = userId;
      request.current?.abort();
      setData(null);
      setError('');
      // The API authenticates the initial request against the server session.
      const loadWorkspace = event !== 'SIGNED_OUT' && (first || !!userId);
      setGuest(!loadWorkspace);
      if (loadWorkspace) void refresh(session?.access_token);
    });
    // Reader sessions from an earlier release can change in another tab without
    // emitting an SDK auth event. Clear the previous owner's view before revalidation.
    const storageChanged = (event: StorageEvent) => {
      if (event.key && event.key !== 'globoox:access_token' && !/^sb-.+-auth-token$/.test(event.key)) return;
      clearBrowserAccessTokenCache();
      request.current?.abort();
      setData(null); setGuest(false); setError('');
      void refresh();
    };
    window.addEventListener('storage', storageChanged);
    return () => {
      request.current?.abort(); subscription.unsubscribe();
      window.removeEventListener('storage', storageChanged);
    };
  }, [refresh]);

  if (!data) {
    return <main className="pt-index" aria-busy={!guest && !error}>
      <h1>Кабинет перевода</h1>
      {guest ? <><p className="pt-lead">Войдите, чтобы открыть свои книги и переводы.</p>
        <WorkspaceLogin /></>
        : error ? <><p className="pt-lead" role="alert">{error}</p><Button variant="outline" className="mt-5" onClick={() => void refresh()}>Попробовать снова</Button>{reauth && <WorkspaceLogin />}</>
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
  } else if (first === 'projects' && id && (parts.length === 2 || (parts.length === 3 && sub === 'upload'))) {
    const project = data.projects?.find(item => item.id === id);
    if (project) {
      const upload = sub === 'upload';
      title = upload ? 'Добавить книгу' : project.name;
      if (upload) ancestors.push({ label: project.name, href: projectPath(id) });
      panel = <ProjectLibrary key={id} data={data} view={upload ? 'new' : 'project'} projectId={id} refresh={refresh} />;
    }
  } else if (first === 'series' && id && parts.length === 2) {
    const series = data.series.find(item => item.id === id);
    if (series || data.books.some(book => book.seriesId === id)) {
      title = series?.name || 'Серия';
      const sourceProject = data.projects?.find(item => item.sourceSeriesId === id);
      if (sourceProject) ancestors.push({ label: sourceProject.name, href: projectPath(sourceProject.id) });
      panel = <ProjectLibrary key={id} data={data} view="series" seriesId={id} refresh={refresh} />;
    }
  } else if (first === 'books' && id && (parts.length === 2 ||
      (sub === 'translations' && /^[a-z]{2}$/i.test(lang || '') && (parts.length === 4 || (parts.length === 5 && bookTabs.has(tab)))))) {
    const book = data.books.find(item => item.id === id);
    if (book) {
      title = book.title || 'Книга без названия';
      const series = data.series.find(item => book.seriesId === item.id);
      const project = data.projects?.find(item => item.id === book.projectId);
      if (project) ancestors.push({ label: project.name, href: projectPath(project.id) });
      else if (book.seriesId) ancestors.push({ label: series?.name || 'Серия', href: base + '/series/' + book.seriesId });
      panel = <BookWorkspace key={[data.userId, id, lang].join('/')} ownerId={data.userId} book={book} books={data.books} isAdmin={admin} lang={lang?.toUpperCase()} section={tab} />;
    }
  } else if ((first === 'decisions' || (admin && first === 'queue')) && parts.length === 1) {
    active = first;
    title = sectionNames[first];
    ancestors = [];
    panel = <WorkspaceActivity key={data.userId + first} view={first} workspace={data} />;
  } else if (admin && first === 'settings' && (parts.length === 1 || (id === 'templates' && parts.length === 3))) {
    title = sub ? 'Шаблон этапа' : sectionNames.settings;
    active = first;
    ancestors = sub ? [{ label: sectionNames.settings, href: base + '/settings' }] : [];
    panel = <WorkspaceSettings key={data.userId} ownerId={data.userId} name={sub} />;
  }

  return <PrototypeShell live role={data.role} items={items} active={active} title={title}
    detail={ancestors.length ? { ancestors } : undefined} itemHref={page => base + '/' + page}>
    {error && <div role="alert" className="mb-4 flex items-center gap-3">{error}
      <Button variant="outline" onClick={() => void refresh()}>Попробовать снова</Button></div>}
    {panel}
  </PrototypeShell>;
}
