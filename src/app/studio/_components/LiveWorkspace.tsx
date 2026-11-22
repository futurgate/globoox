'use client';

import { studioErrorMessage, studioFetch, studioRequestToken } from '@/lib/studioFetch';
import { clearBrowserAccessTokenCache, forgetLegacyBrowserSession, renewLegacyReaderSession } from '@/lib/api';

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
import { StudioHeaderActions } from './StudioEntityMenu';
import { ProjectGlossary } from './ProjectGlossary';
import BookWorkspace, { bookSections } from './BookWorkspace';
import { bookTranslationPath, projectPath, seriesPath } from './projectLinks';
import { ProjectRunHistory, ProjectTabs } from './ProjectRunHistory';
import { RunTimeline } from './RunTimeline';
import WorkspaceActivity from './WorkspaceActivity';
import WorkspaceSettings from './WorkspaceSettings';

const projects = { label: 'Мои проекты', href: base + '/projects' };
const sectionNames: Record<string, string> = {
  projects: 'Мои проекты', decisions: 'Требуют решения', queue: 'Очередь', settings: 'Настройки перевода',
};

function WorkspaceLogin({ reauth = false }: { reauth?: boolean }) {
  const path = usePathname();
  const query = useSearchParams().toString();
  const next = path + (query ? '?' + query : '');
  return <Button asChild className="mt-5">
    <Link href={'/auth?next=' + encodeURIComponent(next) + (reauth ? '&reauth=1' : '')}>Войти в Globoox</Link>
  </Button>;
}

export default function LiveWorkspace() {
  const [headerActions, setHeaderActions] = useState<HTMLDivElement | null>(null);
  const parts = useParams<{ path?: string[] }>().path ?? [];
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [guest, setGuest] = useState(false);
  const [error, setError] = useState('');
  const [reauth, setReauth] = useState(false);
  const sdkAccount = useRef<string | null>(null);
  const sdkToken = useRef<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const account = useRef<string | null | undefined>(undefined);

  const refresh = useCallback(async (sessionToken?: string) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setError('');
    setReauth(false);
    const deadline = window.setTimeout(() => {
      if (request.current !== controller || controller.signal.aborted) return;
      request.current = null;
      controller.abort();
      setGuest(false);
      setError('Не удалось дождаться ответа при загрузке проектов. Попробуйте снова.');
    }, 20_000);
    try {
      const token = sessionToken ?? studioRequestToken();
      const options = { cache: 'no-store', signal: controller.signal } as const;
      let response = await studioFetch('/api/translation-workspace', options, token);
      if (response.status === 401 && !controller.signal.aborted) {
        const renewed = sdkToken.current
          ? (sdkToken.current !== token ? sdkToken.current : null)
          : await renewLegacyReaderSession(token, controller.signal);
        if (renewed && !controller.signal.aborted) response = await studioFetch('/api/translation-workspace', options, renewed);
      }
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
      setError(studioErrorMessage(err, 'Не удалось загрузить кабинет.'));
    } finally {
      window.clearTimeout(deadline);
      if (request.current === controller) request.current = null;
    }
  }, []);

  useEffect(() => {
    // Start with the host cookie even if another tab holds Supabase's auth lock.
    void refresh();
    const client = createClient();
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      const userId = session?.user.id ?? null;
      sdkAccount.current = userId;
      sdkToken.current = session?.access_token ?? null;
      if (event === 'SIGNED_OUT') {
        forgetLegacyBrowserSession();
        request.current?.abort();
        account.current = null;
        setData(null); setError(''); setGuest(true);
        return;
      }

      clearBrowserAccessTokenCache();
      if (event === 'INITIAL_SESSION' && (!userId || request.current || account.current === userId)) return;
      if (!userId) return;
      if (account.current !== userId) {
        account.current = userId;
        setData(null); setGuest(false);
      } else if (event !== 'TOKEN_REFRESHED' && event !== 'USER_UPDATED') return;
      void refresh(session?.access_token);
    });
    // Reader sessions from an earlier release can change in another tab without
    // emitting an SDK auth event. Clear the previous owner's view before revalidation.
    const storageChanged = (event: StorageEvent) => {
      if (event.key && event.key !== 'globoox:access_token' && !/^sb-.+-auth-token$/.test(event.key)) return;
      clearBrowserAccessTokenCache();
      sdkToken.current = null;
      request.current?.abort();
      setData(null); setGuest(false); setError('');
      void refresh();
    };
    window.addEventListener('storage', storageChanged);
    return () => {
      request.current?.abort(); request.current = null; subscription.unsubscribe();
      window.removeEventListener('storage', storageChanged);
    };
  }, [refresh]);

  if (!data) {
    return <main className="pt-index" aria-busy={!guest && !error}>
      <h1>Кабинет перевода</h1>
      {guest ? <><p className="pt-lead">{window.location.hostname === 'dev.globoox.co'
        ? 'Войдите в dev.globoox.co, чтобы открыть свои книги. У тестового кабинета отдельный сеанс входа.'
        : 'Войдите, чтобы открыть свои книги и переводы.'}</p>
        <WorkspaceLogin /></>
        : error ? <><p className="pt-lead" role="alert">{error}</p><Button variant="outline" className="mt-5" onClick={() => void refresh()}>Попробовать снова</Button>{reauth && <WorkspaceLogin reauth />}</>
        : <p className="pt-lead" role="status">Загружаем ваши проекты…</p>}
    </main>;
  }

  const admin = data.role === 'admin';
  const [first = 'projects', id, sub, lang, tab, runId] = parts;
  const bookSection = bookSections.find(section => section.id === tab);
  const items: NavItem[] = [
    { id: 'projects', label: sectionNames.projects, icon: Layers3 },
    { id: 'decisions', label: sectionNames.decisions, icon: Bell },
    ...(admin ? [{ id: 'queue', label: sectionNames.queue, icon: ListOrdered }, { id: 'settings', label: sectionNames.settings, icon: Settings2 }] : []),
  ];
  let title = 'Страница недоступна';
  let active = 'projects';
  let parent: typeof projects | undefined = projects;
  let panel = <p>Проверьте адрес или откройте книгу из своих проектов.</p>;

  if (first === 'projects' && (!id || id === 'new') && parts.length <= 2) {
    const isNew = id === 'new';
    title = isNew ? 'Загрузка книги или серии' : projects.label;
    parent = isNew ? projects : undefined;
    panel = <ProjectLibrary data={data} view={isNew ? 'new' : 'projects'} refresh={refresh} />;
  } else if (first === 'projects' && id && (parts.length === 2 || (parts.length === 3 && (sub === 'upload' || sub === 'runs' || sub === 'glossary')))) {
    const project = data.projects?.find(item => item.id === id);
    if (project) {
      const upload = sub === 'upload';
      title = upload ? 'Добавить книгу' : project.name;
      if (sub) {
        parent = { label: project.name, href: projectPath(id) };
        if (sub === 'runs') title = 'Запуски';
        if (sub === 'glossary') title = 'Глоссарий проекта';
      }
      panel = upload ? <ProjectLibrary key={id} data={data} view="new" projectId={id} refresh={refresh}/> : <>
        <ProjectTabs projectId={id} active={sub}/>
        {sub === 'glossary' ? <ProjectGlossary key={id} projectId={id} books={data.books} admin={admin}/> : sub === 'runs' ? <ProjectRunHistory key={id} projectId={id}/> : <ProjectLibrary key={id} data={data} view="project" projectId={id} refresh={refresh}/>}
      </>;
    }
  } else if (first === 'series' && id && parts.length === 2) {
    const series = data.series.find(item => item.id === id);
    if (series || data.books.some(book => book.seriesId === id)) {
      title = series?.name || 'Серия';
      const sourceProject = data.projects?.find(item => item.sourceSeriesId === id);
      if (sourceProject) parent = { label: sourceProject.name, href: projectPath(sourceProject.id) };
      panel = <ProjectLibrary key={id} data={data} view="series" seriesId={id} refresh={refresh} />;
    }
  } else if (first === 'books' && id && (parts.length === 2 ||
      (sub === 'translations' && /^[a-z]{2}$/i.test(lang || '') && (parts.length === 4 || (parts.length === 5 && bookSection) ||
        (parts.length === 6 && tab === 'runs' && /^[0-9a-f-]{36}$/i.test(runId)))))) {
    const book = data.books.find(item => item.id === id);
    if (book) {
      title = book.title || 'Книга без названия';
      const series = data.series.find(item => book.seriesId === item.id);
      const project = data.projects?.find(item => item.id === book.projectId);
      if (runId && bookSection) {
        parent = { label: bookSection.label, href: bookTranslationPath(id, lang, tab) };
        title = 'Запуск перевода';
        panel = <RunTimeline key={runId} bookId={id} lang={lang.toUpperCase()} runId={runId} title={book.title}/>;
      } else {
        if (bookSection) {
          parent = { label: title, href: bookTranslationPath(id, lang) };
          title = bookSection.label;
        } else if (project) parent = { label: project.name, href: projectPath(project.id) };
        else if (book.seriesId) parent = { label: series?.name || 'Серия', href: seriesPath(book.seriesId) };
        panel = <BookWorkspace key={[data.userId, id, lang].join('/')} ownerId={data.userId} book={book} books={data.books} isAdmin={admin} lang={lang?.toUpperCase()} section={tab} />;
      }
    }
  } else if ((first === 'decisions' || (admin && first === 'queue')) && parts.length === 1) {
    active = first;
    title = sectionNames[first];
    parent = undefined;
    panel = <WorkspaceActivity key={data.userId + first} view={first} workspace={data} />;
  } else if (admin && first === 'settings' && (parts.length === 1 || (id === 'templates' && parts.length === 3))) {
    title = sub ? 'Шаблон этапа' : sectionNames.settings;
    active = first;
    parent = sub ? { label: sectionNames.settings, href: base + '/settings' } : undefined;
    panel = <WorkspaceSettings key={data.userId} ownerId={data.userId} name={sub} />;
  }

  return <StudioHeaderActions.Provider value={headerActions}><PrototypeShell live role={data.role} items={items} active={active} title={title}
    detail={parent ? { parent, action: <div id="studio-page-actions" ref={setHeaderActions}/> } : undefined} itemHref={page => base + '/' + page}>
    {error && <div role="alert" className="mb-4 flex items-center gap-3">{error}
      <Button variant="outline" onClick={() => void refresh()}>Попробовать снова</Button></div>}
    {panel}
  </PrototypeShell></StudioHeaderActions.Provider>;
}
