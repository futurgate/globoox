'use client';

import { ChevronRight, Layers3, Plus, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChoicePills } from '@/components/ui/choice-pills';
import { Input } from '@/components/ui/input';
import type { WorkspaceData } from '@/lib/translationWorkspaceTypes';
import ProjectImport from './ProjectImport';
import SeriesWorkspace from './SeriesWorkspace';
import ProjectWorkspace, { BookRow, ProjectNameForm } from './ProjectWorkspace';

import { projectsPath, projectPath, seriesPath } from './projectLinks';

const countBooks = new Intl.PluralRules('ru');
export function volumeCount(count: number) {
  const ending = { one: 'том', few: 'тома', many: 'томов' }[countBooks.select(count) as 'one'|'few'|'many'] ?? 'томов';
  return count + ' ' + ending;
}

function bookCount(count: number) {
  const ending = { one: 'книга', few: 'книги', many: 'книг' }[countBooks.select(count) as 'one'|'few'|'many'] ?? 'книг';
  return count + ' ' + ending;
}

type Props = {
  data: WorkspaceData;
  view: 'projects' | 'new' | 'series' | 'project';
  projectId?: string;
  seriesId?: string;
  refresh: () => Promise<void>;
};

export default function ProjectLibrary({ data, view, seriesId, projectId, refresh }: Props) {
  const params = useSearchParams();
  const search = params.get('q') ?? '';
  const archived = params.get('archived') === '1';
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const pending = data.books.some((book) =>
    (view !== 'series' || book.seriesId === seriesId) && (view !== 'project' || book.projectId === projectId) && ['pending', 'processing'].includes(book.processingStatus ?? ''));
  useEffect(() => {
    if (!pending || view === 'new') return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function update() {
      try {
        if (document.visibilityState === 'visible') await refresh();
      } catch {
        // The manual refresh action remains available if connectivity is interrupted.
      } finally {
        if (active) timer = setTimeout(update, 6500);
      }
    }
    timer = setTimeout(update, 6500);
    return () => { active = false; clearTimeout(timer); };
  }, [pending, view, refresh]);

  if (view === 'new' && projectId && data.projects?.find(p => p.id === projectId)?.archived) {
    return <Card className="gap-3 p-4"><p>Для загрузки книги восстановите проект из архива.</p>
      <Button asChild variant="outline" className="self-start"><Link href={projectPath(projectId)}>Открыть проект</Link></Button></Card>;
  }
  if (view === 'new') return <ProjectImport key={data.userId + (projectId || '')} data={data} refresh={refresh} projectId={projectId} />;
  if (view === 'project') {
    const project = data.projects?.find(entry => entry.id === projectId);
    if (!project) return <p role="status">Проект недоступен в вашем кабинете.</p>;
    return <ProjectWorkspace key={data.userId + project.id} project={project} data={data} refresh={refresh} />;
  }
  if (view === 'series') {
    const series = data.series.find((entry) => entry.id === seriesId);
    if (!series) return <p role="status">Серия недоступна в вашем кабинете.</p>;
    return <SeriesWorkspace key={data.userId + series.id} series={series} ownerId={data.userId} role={data.role} books={data.books.filter((book) => book.seriesId === series.id)} />;
  }
  const query = search.trim().toLocaleLowerCase('ru');
  const matches = (value: string | null) => (value ?? '').toLocaleLowerCase('ru').includes(query);
  const counts = new Map<string, number>();
  const seriesCounts = new Map<string, number>();
  const projectsById = new Map(data.projects?.map(project => [project.id, project.name]));
  const seriesById = new Map(data.series.map(series => [series.id, series.name]));
  for (const book of data.books) {
    if (book.projectId && !book.projectArchived) counts.set(book.projectId, (counts.get(book.projectId) ?? 0) + 1);
    if (book.seriesId) seriesCounts.set(book.seriesId, (seriesCounts.get(book.seriesId) ?? 0) + 1);
  }
  const archivedIds = new Set(data.projects?.filter(project => project.archived).map(project => project.id));
  const archiveFilter = data.projects?.some(project => project.orderRevision != null) ?? false;
  const showArchived = archiveFilter && archived;
  const groups = data.projects
    ? data.projects.filter(project => Boolean(project.archived) === showArchived).map(project => ({ id: project.id, name: project.name, href: projectPath(project.id), detail: bookCount(counts.get(project.id) ?? 0) }))
    : data.series.map(series => ({ id: series.id, name: series.name || 'Серия без названия', href: seriesPath(series.id), detail: 'Серия · ' + volumeCount(seriesCounts.get(series.id) ?? 0) }));
  const matchingGroups = groups.filter(entry => !query || matches(entry.name)).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  const books = data.books.filter(book => {
    if (book.projectArchived || Boolean(book.projectId && archivedIds.has(book.projectId)) !== showArchived) return false;
    if (query) return matches(book.title) || matches(book.author);
    // During a rolling update the old API returns only books and series.
    return !data.projects && (!book.seriesId || !seriesById.has(book.seriesId));
  });
  const noResults = !matchingGroups.length && !books.length;

  function updateFilter(key: 'q' | 'archived', value: string) {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    window.history.replaceState(null, '', url);
  }

  const reload = async () => {
    setError('');
    setRefreshing(true);
    try { await refresh(); }
    catch { setError('Не удалось обновить каталог. Попробуйте ещё раз.'); }
    finally { setRefreshing(false); }
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--app-text-muted)]">
        Здесь проекты с книгами, загруженными с вашего аккаунта. Общедоступные и сохранённые книги можно читать в{' '}
        <Link href="/my-books" className="underline underline-offset-2">библиотеке</Link>.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--app-text-muted)]" />
          <Input className="pl-9" type="search" aria-label="Поиск по названию и автору" placeholder="Название проекта, книги или автор" value={search} onChange={(e) => updateFilter('q', e.target.value)} />
        </div>
        <Button variant="outline" size="icon" onClick={reload} disabled={refreshing} aria-label="Обновить каталог" title="Обновить каталог"><RefreshCw className={refreshing ? 'animate-spin' : ''} /></Button>
        {data.projects && <Button variant="outline" onClick={() => setCreating(!creating)}>Новый проект</Button>}
        <Button asChild><Link href={projectsPath + '/projects/new'}><Plus />Загрузить</Link></Button>
      </div>
      {archiveFilter && <ChoicePills label="Фильтр проектов" value={showArchived ? 'archived' : 'active'}
        choices={[{ id: 'active', label: 'Активные' }, { id: 'archived', label: 'Архив' }]}
        onChange={value => updateFilter('archived', value === 'archived' ? '1' : '')}/>}
      {creating && data.projects && <ProjectNameForm ownerId={data.userId} refresh={refresh} close={() => setCreating(false)} />}
      {error && <p role="alert">{error}</p>}
      {noResults ? (
        <Card className="gap-2 p-6" role="status">
          <p className="font-medium">{query ? 'По вашему запросу ничего не найдено' : showArchived ? 'В архиве нет проектов' : 'Пока нет загруженных книг'}</p>
          <p className="text-sm text-[var(--app-text-muted)]">{query ? 'Попробуйте другое название или имя автора.' : showArchived ? 'Здесь появятся проекты, которые вы отправите в архив.' : 'Загрузите EPUB, чтобы начать работу со своей книгой.'}</p>
        </Card>
      ) : (
        <Card className="overflow-hidden divide-y divide-[var(--app-border)]">
          {matchingGroups.map((entry) => (
            <Link key={entry.id} href={entry.href} className="flex min-w-0 items-center gap-3 px-4 py-3.5 hover:bg-[var(--fill-tertiary)] focus-visible:outline-ring focus-visible:outline-2">
              <Layers3 className="size-5 shrink-0 text-[var(--app-text-muted)]" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium">{entry.name}</p>
                <p className="text-sm text-[var(--app-text-muted)]">{entry.detail}</p>
              </div>
              <ChevronRight className="size-4 shrink-0" aria-hidden />
            </Link>
          ))}
          {books.map((book) => <BookRow key={book.id} book={book} context={book.projectId ? projectsById.get(book.projectId) : book.seriesId ? seriesById.get(book.seriesId) || undefined : undefined} />)}
        </Card>
      )}
    </div>
  );
}
