'use client';

import { studioFetch } from '@/lib/studioFetch';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Archive, BookOpen, ChevronRight, FolderInput, Layers3, Pencil, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import IOSSettingsRow from '@/components/ui/ios-settings-row';
import type { WorkspaceBook, WorkspaceData, WorkspaceProject } from '@/lib/translationWorkspaceTypes';
import { useBookAction } from './bookRequests';
import { seriesGenres } from './seriesGenres';
import { bookPath, projectPath, processingLabel, seriesPath } from './projectLinks';

class ProjectWriteError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

async function projectWrite(path: string, method: 'POST' | 'PATCH', ownerId: string, body: object, signal: AbortSignal) {
  const response = await studioFetch('/api/translation-workspace/projects' + path, {
    method, signal, headers: { 'Content-Type': 'application/json', 'X-Workspace-Account': ownerId },
    body: JSON.stringify(body),
  });
  const value = await response.json().catch(() => null);
  if (!response.ok) throw new ProjectWriteError(response.status, value?.message || value?.error || 'Не удалось сохранить изменения (' + response.status + ').');
  return value;
}

export function BookRow({ book, context }: { book: WorkspaceBook; context?: string }) {
  const status = book.processingStatus && processingLabel[book.processingStatus];
  return (
    <Link href={bookPath(book.id)} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 text-[var(--app-text)] hover:bg-[var(--fill-tertiary)] focus-visible:outline-ring focus-visible:outline-2">
      <BookOpen className="size-5 shrink-0 text-[var(--app-text-muted)]" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="break-words font-medium">{book.title || 'Без названия'}</p>
        <p className="text-sm text-[var(--app-text-muted)]">{[context, book.author, book.sourceLanguage, status].filter(Boolean).join(' · ')}</p>
      </div>
      <ChevronRight className="size-4 shrink-0" aria-hidden />
    </Link>
  );
}

export function ProjectNameForm({ ownerId, project, refresh, close }: {
  ownerId: string; project?: WorkspaceProject; refresh: () => Promise<void>; close: () => void;
}) {
  const [name, setName] = useState(project?.name ?? '');
  const [requestId] = useState(() => crypto.randomUUID());
  const action = useBookAction();
  const router = useRouter();
  return <Card className="p-4">
    <form className="space-y-3" onSubmit={event => {
      event.preventDefault();
      if (!name.trim()) return;
      void action.run(async signal => {
        const saved = await projectWrite(project ? '/' + encodeURIComponent(project.id) : '', project ? 'PATCH' : 'POST', ownerId, { name: name.trim(), ...(!project && { requestId }) }, signal);
        if (!saved?.id) throw new Error('Сервер не подтвердил сохранение проекта.');
        await refresh();
        if (signal.aborted) return;
        close();
        if (!project) router.push(projectPath(saved.id));
      });
    }}>
      <label className="block space-y-1 text-sm font-medium">Название проекта
        <Input autoFocus required maxLength={200} disabled={action.busy} value={name} onChange={e => setName(e.target.value)} />
      </label>
      {action.error && <p role="alert">{action.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={action.busy || !name.trim()}>{project ? 'Сохранить' : 'Создать проект'}</Button>
        <Button type="button" variant="ghost" disabled={action.busy} onClick={close}>Отмена</Button>
      </div>
    </form>
  </Card>;
}

type SeriesChoice = { id: string; label: string; previous: WorkspaceBook | null };

function appendChoices(data: WorkspaceData): SeriesChoice[] {
  // A migrated, owner-scoped project also identifies an owned series on installations
  // where series metadata isn't readable by the signed-in account.
  const names = new Map<string, string>();
  for (const project of data.projects ?? []) {
    if (project.sourceSeriesId) names.set(project.sourceSeriesId, project.name);
  }
  for (const series of data.series) {
    if (series.ownerVerified || names.has(series.id)) names.set(series.id, series.name || names.get(series.id) || 'Серия без названия');
  }
  const last = new Map<string, WorkspaceBook>();
  for (const book of data.books) {
    if (!book.seriesId || !names.has(book.seriesId)) continue;
    const old = last.get(book.seriesId);
    if (!old || (book.volumeNumber ?? 0) > (old.volumeNumber ?? 0)) last.set(book.seriesId, book);
  }
  return [...names].map(([id, label]) => ({ id, label, previous: last.get(id) ?? null })).sort((a, b) => a.label.localeCompare(b.label, 'ru'));
}

function SeriesMembershipForm({ book, data, choices, candidates, refresh, action, close }: {
  book: WorkspaceBook; data: WorkspaceData; choices: SeriesChoice[]; candidates: WorkspaceBook[];
  refresh: () => Promise<void>; action: ReturnType<typeof useBookAction>; close: () => void;
}) {
  const [seriesId, setSeriesId] = useState(choices.length ? '' : 'new');
  const [firstId, setFirstId] = useState('');
  const [name, setName] = useState('');
  const [genre, setGenre] = useState('litrpg');
  const request = useRef({ key: '', id: '' });
  const creating = seriesId === 'new';
  const firstBook = candidates.find(item => item.id === firstId);
  const selected = choices.find(choice => choice.id === seriesId);
  const canSave = creating ? Boolean(name.trim() && firstBook) : Boolean(selected);
  const projects = new Map(data.projects?.map(project => [project.id, project.name]));
  const save = () => {
    if (!canSave) return;
    void action.run(async signal => {
      let body;
      if (creating) {
        const key = JSON.stringify([book.id, firstId, name.trim(), genre]);
        if (request.current.key !== key) request.current = { key, id: crypto.randomUUID() };
        body = { action: 'start-series', firstBookId: firstId, name: name.trim(), genre, requestId: request.current.id };
      } else if (selected) {
        body = { action: 'append-to-series', seriesId: selected.id, previousBookId: selected.previous?.id ?? null };
      } else return;
      let result;
      try {
        result = await projectWrite('/books/' + encodeURIComponent(book.id), 'PATCH', data.userId, body, signal);
      } catch (error) {
        if (error instanceof ProjectWriteError && error.status === 409) {
          await refresh();
          if (!signal.aborted) { setSeriesId(choices.length ? '' : 'new'); setFirstId(''); }
        }
        throw error;
      }
      await refresh();
      if (signal.aborted) return;
      close();
      return creating ? 'Серия «' + name.trim() + '» создана.' : 'Книга добавлена в серию «' + selected?.label + '», том ' + result.volumeNumber + '.';
    });
  };
  return <div className="space-y-3 p-4 pt-0">
    {choices.length > 0 && <IOSSettingsRow label="Серия для нового тома" value={seriesId} disabled={action.busy} onChange={setSeriesId}
      options={[{ id: '', label: 'Выберите серию' }, ...choices.map(choice => ({ id: choice.id, label: choice.label })),
        ...(candidates.length ? [{ id: 'new', label: 'Начать новую серию' }] : [])]}/>}
    {creating ? <>
      <label className="block space-y-1 text-sm font-medium">Название новой серии
        <Input maxLength={200} value={name} onChange={event => setName(event.target.value)} disabled={action.busy}/>
      </label>
      <IOSSettingsRow label="Жанр серии" value={genre} options={seriesGenres} onChange={setGenre} disabled={action.busy}/>
      <IOSSettingsRow label="Первый том" value={firstId} disabled={action.busy} onChange={setFirstId}
        options={[{ id: '', label: 'Выберите книгу' }, ...candidates.map(item => ({
          id: item.id, label: [item.title, projects.get(item.projectId || '')].filter(Boolean).join(' · '),
        }))]}/>
      {firstBook && <p className="text-sm pt-muted">Том 1 · {firstBook.title}. Том 2 · {book.title}. Книги останутся в своих проектах.</p>}
    </> : selected && <p className="text-sm pt-muted">{selected.previous
      ? 'Предыдущий том: ' + (selected.previous.volumeNumber ?? '—') + ' · ' + selected.previous.title + '. При запуске серии его словарь перейдёт новому тому.'
      : 'Книга станет первым томом серии.'}</p>}
    <Button size="sm" disabled={action.busy || !canSave} onClick={save}>{creating ? 'Создать серию из двух книг' : 'Подтвердить добавление тома'}</Button>
  </div>;
}

type Props = { data: WorkspaceData; project: WorkspaceProject; refresh: () => Promise<void> };

export default function ProjectWorkspace({ data, project, refresh }: Props) {
  const [renaming, setRenaming] = useState(false);
  const [archived, setArchived] = useState(false);
  const [adding, setAdding] = useState(false);
  const [incoming, setIncoming] = useState('');
  const [movingBookId, setMovingBookId] = useState('');
  const [destination, setDestination] = useState('');
  const [appendBookId, setAppendBookId] = useState('');
  const action = useBookAction();
  const projects = data.projects ?? [];
  const otherProjects = projects.filter(p => p.id !== project.id);
  const members = data.books.filter(book => book.projectId === project.id);
  const visible = members.filter(book => Boolean(book.projectArchived) === archived);
  const outside = data.books.filter(book => book.projectId && book.projectId !== project.id && !book.projectArchived);
  const incomingBook = outside.find(book => book.id === incoming);
  const canMove = otherProjects.some(p => p.id === destination);
  const projectById = new Map(projects.map(p => [p.id, p.name]));
  const seriesById = new Map(data.series.map(s => [s.id, s.name || 'Серия']));
  const choices = appendChoices(data);
  const standalone = data.books.filter(book => book.projectId && !book.seriesId && !book.projectArchived);
  const relatedSeries = new Set(members.filter(book => !book.projectArchived && book.seriesId).map(book => book.seriesId!));
  const sorted = [...visible].sort((a, b) =>
    (a.seriesId ?? '').localeCompare(b.seriesId ?? '') ||
    (a.volumeNumber ?? Infinity) - (b.volumeNumber ?? Infinity) ||
    a.title.localeCompare(b.title, 'ru'));

  const changeBook = (book: WorkspaceBook, operation: 'move' | 'archive' | 'restore', target?: string) => {
    if (operation === 'move' && !target) return;
    void action.run(async signal => {
      await projectWrite('/books/' + encodeURIComponent(book.id), 'PATCH', data.userId, { action: operation, ...(target && { projectId: target }) }, signal);
      await refresh();
      if (signal.aborted) return;
      setMovingBookId(''); setDestination(''); setAppendBookId(''); setIncoming(''); setAdding(false);
      if (operation === 'archive') return 'Книга перемещена в архив проекта.';
      if (operation === 'restore') return 'Книга восстановлена.';
      return 'Книга перемещена в проект «' + projectById.get(target!) + '».';
    });
  };
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2">
      <Button asChild><Link href={projectPath(project.id) + '/upload'}><Upload />Загрузить EPUB</Link></Button>
      {outside.length > 0 && <Button variant="outline" disabled={action.busy} onClick={() => { setAdding(!adding); setMovingBookId(''); setAppendBookId(''); }}><FolderInput />Добавить из проекта</Button>}
      <Button variant="ghost" onClick={() => setRenaming(!renaming)}><Pencil />Переименовать</Button>
    </div>
    {renaming && <ProjectNameForm ownerId={data.userId} project={project} refresh={refresh} close={() => setRenaming(false)} />}
    {adding && outside.length > 0 && <Card className="space-y-3 p-4">
      <IOSSettingsRow label="Книга из другого проекта" value={incoming} disabled={action.busy}
        options={[{ id: '', label: 'Выберите книгу' }, ...outside.map(b => ({ id: b.id, label: b.title + ' · ' + (projectById.get(b.projectId!) || 'Проект') }))]}
        onChange={setIncoming}/>
      {incomingBook?.seriesId && <p className="text-sm pt-muted">Книга останется в серии «{seriesById.get(incomingBook.seriesId) || 'Без названия'}».</p>}
      <div className="flex gap-2"><Button disabled={!incomingBook || action.busy} onClick={() => incomingBook && changeBook(incomingBook, 'move', project.id)}>Переместить в этот проект</Button>
        <Button variant="ghost" disabled={action.busy} onClick={() => setAdding(false)}>Отмена</Button></div>
    </Card>}
    {action.error && <p role="alert">{action.error}</p>}
    {action.notice && <p role="status">{action.notice}</p>}
    <Card className="gap-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 p-4">
        <h2 className="text-lg font-semibold">{archived ? 'Архив проекта' : 'Книги проекта'}</h2>
        {(archived || members.some(b => b.projectArchived)) && <Button variant="outline" size="sm" onClick={() => { setArchived(!archived); setMovingBookId(''); setAppendBookId(''); }}>
          {archived ? <BookOpen /> : <Archive />}{archived ? 'К книгам' : 'Архив проекта'}
        </Button>}
      </div>
      {sorted.length === 0 && <p className="px-4 pb-4 text-sm pt-muted">{archived ? 'В архиве пока нет книг.' : 'В проекте пока нет книг.'}</p>}
      {sorted.map(book => <div key={book.id} className="border-t border-[var(--app-border)]">
        <div className="flex flex-wrap items-center gap-x-2">
          <BookRow book={book} context={book.seriesId ? [seriesById.get(book.seriesId) || 'Серия', book.volumeNumber != null && 'том ' + book.volumeNumber].filter(Boolean).join(' · ') : undefined} />
          <div className="flex flex-wrap gap-1 px-3 pb-2 sm:pb-0">
            {archived ? <Button variant="outline" size="sm" disabled={action.busy} onClick={() => changeBook(book, 'restore')}>Восстановить</Button>
            : <>
              {!book.seriesId && (choices.length > 0 || standalone.length > 1) && <Button variant="outline" size="sm" disabled={action.busy} onClick={() => {
                setAppendBookId(appendBookId === book.id ? '' : book.id); setMovingBookId(''); setAdding(false);
              }}>{choices.length ? 'Добавить в серию' : 'Начать серию'}</Button>}
              {otherProjects.length > 0 && <Button variant="outline" size="sm" disabled={action.busy} onClick={() => {
                setMovingBookId(movingBookId === book.id ? '' : book.id); setDestination(''); setAppendBookId(''); setAdding(false);
              }}>Переместить</Button>}
              <Button variant="ghost" size="sm" disabled={action.busy} onClick={() => changeBook(book, 'archive')}>В архив</Button>
            </>}
          </div>
        </div>
        {appendBookId === book.id && !book.seriesId && !archived && <SeriesMembershipForm key={book.id} book={book} data={data} choices={choices}
          candidates={standalone.filter(item => item.id !== book.id)} refresh={refresh} action={action} close={() => setAppendBookId('')} />}
        {movingBookId === book.id && <div className="space-y-2 p-4 pt-0">
          <IOSSettingsRow label="Проект назначения" value={destination} disabled={action.busy} onChange={setDestination}
            options={[{ id: '', label: 'Выберите проект' }, ...otherProjects.map(p => ({ id: p.id, label: p.name }))]}/>
          {book.seriesId && <p className="text-sm pt-muted">После переноса книга останется в своей серии.</p>}
          <Button size="sm" disabled={action.busy || !canMove} onClick={() => changeBook(book, 'move', destination)}>Подтвердить перенос</Button>
        </div>}
      </div>)}
    </Card>
    {relatedSeries.size > 0 && <Card className="gap-0 p-4">
      <h2 className="mb-2 text-lg font-semibold">Перевод серий</h2>
      <p className="mb-2 text-sm pt-muted">Общий запуск и порядок глоссариев относятся ко всем томам серии, включая тома в других проектах.</p>
      {[...relatedSeries].map(id => <Link key={id} className="flex items-center gap-2 py-2 hover:underline" href={seriesPath(id)}>
        <Layers3 size={18} aria-hidden />{seriesById.get(id) || 'Серия'}<ChevronRight size={16} aria-hidden />
      </Link>)}
    </Card>}
  </div>;
}
