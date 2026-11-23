'use client';

import { studioFetch } from '@/lib/studioFetch';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Archive, BookOpen, ChevronRight, FolderInput, Layers3, ListOrdered, Play, SlidersHorizontal, Upload, X } from 'lucide-react';
import { StudioEntityMenu } from './StudioEntityMenu';
import { PendingText, RefreshButton } from './RequestFeedback';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import IOSSettingsRow from '@/components/ui/ios-settings-row';
import type { WorkspaceBook, WorkspaceData, WorkspaceProject } from '@/lib/translationWorkspaceTypes';
import { useBookAction, useBookData } from './bookRequests';
import { languages, targets, validLanguageCode } from '@/lib/studioLanguages';
import IOSDialog from '@/components/ui/ios-dialog';
import IOSAlertDialog from '@/components/ui/ios-alert-dialog';
import { ActionFeedback } from './BookStage';
import { LaunchAccessNotice, useLaunchAccess } from './LaunchAccess';
import { ProjectLaunchDialog } from './ProjectLaunchDialog';
import { RecipeEditor } from './RecipeSettings';
import { ProjectOrderEditor } from './ProjectOrderEditor';
import { ProjectTabs, ProjectRunHistory } from './ProjectRunHistory';
import { ProjectGlossary } from './ProjectGlossary';
import { StudioLanguagePicker, useStudioLanguageCatalog, useStudioLanguageName } from './StudioLanguages';
import { queueBooks, queueInProgress, projectLanguages, type QueueProgress, type StageProgress, type ProjectOperation } from './projectQueue';
import { StudioDraftLeaveGuard, withStudioDraftGuard } from './StudioDraftActions';
import { bookPath, bookRunPath, bookTranslationPath, projectPath, processingLabel, seriesPath } from './projectLinks';

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

export function ProjectNameForm({ ownerId, project, refresh, close, onCreated }: {
  ownerId: string; project?: WorkspaceProject; refresh: () => Promise<void>; close: () => void; onCreated?: (id: string) => void;
}) {
  const [name, setName] = useState(project?.name ?? '');
  const [requestId] = useState(() => crypto.randomUUID());
  const action = useBookAction();
  const router = useRouter();
  const dirty = name !== (project?.name ?? '');
  return <Card className="p-4">
    <StudioDraftLeaveGuard dirty={dirty} busy={action.busy}/>
    <form className="space-y-3" onSubmit={event => {
      event.preventDefault();
      if (!name.trim()) return;
      void action.run(async signal => {
        const saved = await projectWrite(project ? '/' + encodeURIComponent(project.id) : '', project ? 'PATCH' : 'POST', ownerId, { name: name.trim(), ...(!project && { requestId }) }, signal);
        if (!saved?.id) throw new Error('Сервер не подтвердил сохранение проекта.');
        await refresh();
        if (signal.aborted) return;
        close();
        if (onCreated) onCreated(saved.id);
        else if (!project) router.push(projectPath(saved.id));
      });
    }}>
      <label className="block space-y-1 text-sm font-medium">Название проекта
        <Input autoFocus required maxLength={200} disabled={action.busy} value={name} onChange={e => setName(e.target.value)} />
      </label>
      {action.busy && <PendingText>Сохраняем изменения проекта…</PendingText>}
      {action.error && <p role="alert">{action.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={action.busy || !name.trim()}>{project ? 'Сохранить' : 'Создать проект'}</Button>
        <Button type="button" variant="ghost" disabled={action.busy} onClick={() => withStudioDraftGuard(close)}>Отмена</Button>
      </div>
    </form>
  </Card>;
}

type Props = {
  data: WorkspaceData; project: WorkspaceProject; refresh: () => Promise<void>;
  section?: string;
};

export function projectTargetLanguage(books: WorkspaceBook[]) {
  return projectLanguages(books)[0] || 'EN';
}

function StageLabel({ book, lang, stage, state, waiting }: {
  book: WorkspaceBook; lang: string; stage: 'glossary'|'translate'; state?: StageProgress; waiting?: string;
}) {
  if (!state) return <span className="pt-muted" aria-label="Нет данных">—</span>;
  const names = {
    idle:'Не начат', queued:waiting || 'В очереди', running:stage === 'glossary' ? 'Собирается' : 'Переводится',
    done:'Готов', error:'Ошибка', stopped:'Остановлен',
  };
  const count = state.total != null && state.done != null && state.total > 0 ? ' · ' + state.done + ' из ' + state.total + ' гл.' : '';
  const label = state.orderChanged && state.status === 'done' ? 'Изменился порядок книг' : names[state.status];
  return state.runId ? <Link className="underline decoration-dotted underline-offset-4" href={bookRunPath(book.id,lang,state.runId)}>
    {label}{count}</Link> : <span>{label}{count}</span>;
}

export default function ProjectWorkspace({ data, project, refresh, section = '' }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const catalog = useStudioLanguageCatalog();
  const languageName = useStudioLanguageName();
  const members = queueBooks(data.books, project.id);
  const archivedBooks = queueBooks(data.books, project.id, true);
  const languageOptions = projectLanguages(members.length ? members : archivedBooks);
  const pendingImport = members.some(book => book.processingStatus === 'pending' || book.processingStatus === 'processing');
  useEffect(() => {
    if (!pendingImport) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const update = async () => {
      try { if (document.visibilityState === 'visible') await refresh(); }
      finally { if (active) timer = setTimeout(update, 5500); }
    };
    timer = setTimeout(update, 5500);
    return () => { active = false; clearTimeout(timer); };
  }, [pendingImport,refresh]);
  const requestedLang = search.get('lang')?.toUpperCase() ?? '';
  const lang = validLanguageCode(requestedLang) ? requestedLang : languageOptions[0] || 'EN';
  const automaticLanguage = Object.hasOwn(languages, lang);
  const knownLanguage = automaticLanguage || catalog?.languages.some(item => item.code === lang.toLowerCase());
  const [showArchive, setShowArchive] = useState(false);
  const [orderMode, setOrderMode] = useState(false);
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [glossaryDirty, setGlossaryDirty] = useState(false);
  const [chosenSource, setChosenSource] = useState('');
  const sources = [...new Set(members.map(book => (book.sourceLanguage || 'RU').toUpperCase()))].filter(source => targets[source]?.includes(lang));
  const recipeSource = sources.includes(chosenSource) ? chosenSource : sources[0];
  const [form, setForm] = useState<''|'rename'|'archive'|'adding'|'new-destination'>('');
  const [moving, setMoving] = useState('');
  const [destination, setDestination] = useState('');
  const [incoming, setIncoming] = useState('');
  const [launch, setLaunch] = useState<ProjectOperation | null>(null);
  const [previousSection, setPreviousSection] = useState(section);
  if (previousSection !== section) {
    setPreviousSection(section);
    setRecipeOpen(false);
    setOrderMode(false);
    setForm('');
    setMoving('');
    setLaunch(null);
  }
  const [version, refreshProgress] = useState(0);
  const [accepted, setAccepted] = useState('');
  const dialogTitle = useId();
  const action = useBookAction();
  const access = useLaunchAccess(data.role !== 'admin');
  const supportsQueue = project.orderRevision !== undefined;
  const progress = useBookData<{books:QueueProgress[]}>(supportsQueue && members.length && access.allowed && automaticLanguage
    ? '/api/studio/project-progress?' + new URLSearchParams({projectId:project.id,lang}) : null, version, queueInProgress);
  const entries = progress?.data?.books ?? [];
  const statusByBook = new Map(entries.map(row => [row.bookId,row]));
  const projects = data.projects ?? [];
  const bookNames = new Map(data.books.map(book => [book.id,book.title]));
  const otherProjects = projects.filter(p => p.id !== project.id && !p.archived);
  const outside = data.books.filter(book => !book.projectArchived && otherProjects.some(p => p.id === book.projectId));
  const shown = showArchive ? archivedBooks : members;
  const readyToLaunch = supportsQueue && access.allowed && !!recipeSource && members.length > 0 && !project.archived;
  const selected = data.books.find(book => book.id === moving);
  const failures = new Set<string>();
  for (const row of entries) {
    for (const stage of [row.glossary, row.translate]) {
      if (stage.groupId && (stage.status === 'error' || stage.status === 'stopped')) failures.add(stage.groupId);
    }
  }
  function setLanguage(next: string) {
    if (next === lang) return;
    withStudioDraftGuard(() => {
      const params = new URLSearchParams(search.toString());
      params.set('lang',next);
      params.delete('group');
      setAccepted('');
      router.replace(pathname + '?' + params,{scroll:false});
    });
  }
  function changeBook(bookId: string, operation: 'move'|'archive'|'restore', target?: string) {
    void action.run(async signal => {
      await projectWrite('/books/' + encodeURIComponent(bookId),'PATCH',data.userId,{action:operation,...(target && {projectId:target})},signal);
      await refresh(); if (signal.aborted) return;
      setMoving(''); setForm(''); setIncoming(''); setDestination(''); refreshProgress(v => v+1);
      if (operation === 'move') return 'Книга перемещена в проект «' + (projects.find(p => p.id === target)?.name || project.name) + '».';
      return operation === 'archive' ? 'Книга перемещена в архив проекта.' : 'Книга восстановлена.';
    });
  }
  function changeArchive() {
    const archived = Boolean(project.archived);
    void action.run(async signal => {
      await projectWrite('/' + encodeURIComponent(project.id),'PATCH',data.userId,{action:archived ? 'restore' : 'archive'},signal);
      await refresh(); if (signal.aborted) return;
      setForm('');
      return archived ? 'Проект восстановлен.' : 'Проект перемещён в архив.';
    }, archived ? 'Восстанавливаем проект…' : 'Архивируем проект…');
  }
  function saveOrder(bookIds: string[], expectedRevision: number) {
    void action.run(async signal => {
      try {
        await projectWrite('/' + encodeURIComponent(project.id),'PATCH',data.userId,{action:'reorder',bookIds,expectedRevision},signal);
      } catch (error) {
        if (error instanceof ProjectWriteError && error.status === 409) await refresh();
        throw error;
      }
      await refresh(); if (signal.aborted) return;
      setOrderMode(false); refreshProgress(v => v+1);
      return 'Порядок книг сохранён.';
    },'Сохраняем порядок книг…');
  }
  function archiveMenu(book: WorkspaceBook) {
    return <StudioEntityMenu label={'Действия с книгой «' + book.title + '»'}
      actions={showArchive ? [{label:'Восстановить',onClick:() => changeBook(book.id,'restore'),disabled:action.busy}] : [
        {label:'Переместить',onClick:() => {setMoving(book.id);setDestination('');},disabled:action.busy},
        {label:'В архив',onClick:() => changeBook(book.id,'archive'),disabled:action.busy},
      ]}/>;
  }
  function onAccepted(groupId: string) {
    setAccepted(groupId); setLaunch(null); refreshProgress(v => v+1);
  }
  const isBusy = action.busy || orderMode;
  const projectActions = [
    ...(!project.archived ? [{label:'Переименовать',onClick:() => setForm('rename'),disabled:isBusy}] : []),
    ...(supportsQueue ? [{label:project.archived ? 'Восстановить проект' : 'Архивировать проект',
      onClick:() => project.archived ? changeArchive() : setForm('archive'),disabled:isBusy}] : []),
  ];
  return <>
    <StudioEntityMenu inHeader label="Действия с проектом" actions={projectActions}/>
    <div className="studio-project-context" role="group" aria-label="Язык и действия перевода">
      <StudioLanguagePicker ownerId={data.userId} value={lang} supported={members.length || archivedBooks.length ? languageOptions : Object.keys(languages)} allowManualGlossary
        canManage={access.allowed} preferVisibleDefault={!requestedLang} onChange={setLanguage} disabled={isBusy} className="min-w-0 rounded-lg border border-[var(--app-border)]"/>
      {readyToLaunch && <div className="flex flex-wrap items-center gap-2">
        {recipeSource && <Button variant="outline" disabled={isBusy || glossaryDirty} aria-haspopup="dialog" onClick={() => setRecipeOpen(true)}>
          <SlidersHorizontal aria-hidden/>Параметры перевода</Button>}
        <Button disabled={isBusy || glossaryDirty || !recipeSource || !progress?.data}
          onClick={() => setLaunch('translate')}><Play aria-hidden/>Перевести проект</Button>
      </div>}
    </div>
    <ProjectTabs projectId={project.id} active={section}/>
    <div className="pt-stack">
      {access.allowed && !knownLanguage && <p className="pt-muted" role="status">{catalog ? 'Этот язык отсутствует в вашем каталоге. Выберите или добавьте язык.' : 'Для этого языка нужен ваш личный каталог.'}</p>}
      {knownLanguage && (!automaticLanguage || (members.length > 0 && !recipeSource)) && <p className="pt-callout">Для этого языка можно вести глоссарий вручную. Автоматический перевод пока недоступен.</p>}
      {project.archived && <p className="pt-callout">Проект в архиве. Книги и результаты доступны для просмотра.
        <Button size="sm" variant="ghost" disabled={action.busy} onClick={changeArchive}>Восстановить проект</Button></p>}
      {(section === 'glossary' && readyToLaunch) && <Button variant="outline" disabled={isBusy || glossaryDirty || !recipeSource || !progress?.data}
        onClick={() => setLaunch('glossary')}><BookOpen aria-hidden/>Собрать глоссарий</Button>}
      {progress?.error && <div className="pt-callout flex flex-wrap items-center gap-2" role="alert">{progress.error}
        <RefreshButton size="sm" pending={progress.refreshing} onClick={() => refreshProgress(v => v+1)}/></div>}
      {accepted && <p role="status">Запуск принят. <Link className="underline" href={projectPath(project.id)+'/runs?'+new URLSearchParams({lang,group:accepted})}>Открыть запуски проекта</Link></p>}
      <ActionFeedback pending={orderMode ? undefined : action.pending} notice={action.notice} error={orderMode ? undefined : action.error}/>
      {glossaryDirty && <p className="pt-muted text-sm">Перед запуском сохраните или сбросьте изменения глоссария.</p>}
      {section === 'glossary' && (knownLanguage || !access.allowed) && <ProjectGlossary key={lang} projectId={project.id} lang={lang} admin={data.role === 'admin'} onDirty={setGlossaryDirty}/>}
      {section === 'runs' && knownLanguage && <ProjectRunHistory key={lang} projectId={project.id} lang={lang} archived={project.archived} admin={data.role === 'admin'}/>}
      {!section && <>
        {!access.allowed && !project.archived && <LaunchAccessNotice access={access}/>}
        <Card className="min-w-0 gap-0">
          <div className="flex flex-wrap items-center justify-between gap-2 p-4">
            <h2 className="text-lg font-semibold">{showArchive ? 'Архив книг' : 'Очередь книг'}</h2>
            {!orderMode && <div role="group" aria-label="Действия со списком книг" className="flex flex-wrap items-center gap-2">
              {!project.archived && !showArchive && <>
                <Button variant="outline" size="sm" asChild><Link href={projectPath(project.id)+'/upload?'+new URLSearchParams({lang})}><Upload/>Загрузить EPUB</Link></Button>
                {!!outside.length && <Button size="sm" variant="outline" disabled={action.busy} onClick={() => setForm('adding')}><FolderInput/>Добавить из проекта</Button>}
              </>}
              {!showArchive && !project.archived && supportsQueue && members.length > 1 &&
                <Button variant="outline" size="sm" disabled={action.busy} onClick={() => {setOrderMode(true);setMoving('');}}>
                  <ListOrdered/>Изменить порядок</Button>}
              {(showArchive || !!archivedBooks.length) && <Button size="sm" variant="ghost" onClick={() => setShowArchive(!showArchive)}>
                {showArchive ? <BookOpen/> : <Archive/>}{showArchive ? 'К очереди' : 'Архив книг'}</Button>}
            </div>}
          </div>
          {orderMode ? <ProjectOrderEditor books={members} revision={project.orderRevision!} busy={action.busy} error={action.error}
            onClose={() => setOrderMode(false)} onSave={saveOrder}/> : !shown.length ?
            <p className="px-4 pb-4 pt-muted">{showArchive ? 'В архиве пока нет книг.' : 'В проекте пока нет книг.'}</p> :
            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm [&_td]:px-2 [&_td]:py-3 [&_th]:px-2 [&_th]:py-2">
                <caption className="sr-only">{showArchive ? 'Архив книг' : 'Очередь книг проекта и состояния перевода'}</caption>
                <thead><tr className="text-left pt-muted"><th scope="col">Книга</th>{!showArchive && <><th scope="col">Глоссарий</th><th scope="col">Перевод</th></>}<th scope="col"><span className="sr-only">Действия</span></th></tr></thead>
                <tbody>{shown.map((book,index) => {
                  const state = statusByBook.get(book.id);
                  return <tr key={book.id} className="border-t align-middle">
                    <td><Link className="block break-words font-medium hover:underline" href={targets[(book.sourceLanguage || 'RU').toUpperCase()]?.includes(lang) ? bookTranslationPath(book.id,lang) : bookPath(book.id)}>{!showArchive && (index+1)+'. '}{book.title}</Link>
                      <small className="pt-muted">{book.processingStatus && book.processingStatus !== 'ready' ? processingLabel[book.processingStatus] || book.processingStatus : book.author}</small></td>
                    {!showArchive && <><td><StageLabel book={book} lang={lang} stage="glossary" state={state?.glossary}
                      waiting={state?.glossary.waitingForBookId ? 'Ждёт глоссарий «' + (bookNames.get(state.glossary.waitingForBookId) || 'предыдущая книга') + '»' : undefined}/></td>
                      <td><StageLabel book={book} lang={lang} stage="translate" state={state?.translate}
                      waiting={state?.translate.waitingForBookId ? 'Ждёт глоссарий книги' : undefined}/></td></>}
                    <td>{!project.archived && archiveMenu(book)}</td>
                  </tr>;
                })}</tbody>
              </table>
              {supportsQueue && access.allowed && automaticLanguage && !progress && !showArchive && <div className="p-3"><PendingText>Загружаем этапы перевода…</PendingText></div>}
            </div>}
        </Card>
        {!project.archived && access.allowed && [...failures].map(groupId => <Button key={groupId} asChild variant="outline">
          <Link className="h-auto whitespace-normal text-left" href={projectPath(project.id)+'/runs?'+new URLSearchParams({lang,group:groupId})}>
            Открыть прерванный запуск · {members.filter(b => {
              const p = statusByBook.get(b.id); return p?.glossary.groupId === groupId || p?.translate.groupId === groupId;
            }).map(b => b.title).join(', ')}
          </Link></Button>)}
        {members.some(book => book.seriesId) &&
          <details><summary>Прежние серии проекта</summary>{[...new Set(members.flatMap(b => b.seriesId ? [b.seriesId] : []))].map(id =>
            <Link key={id} className="flex items-center gap-2 py-2 underline" href={seriesPath(id)}><Layers3 size={16}/>{data.series.find(s => s.id === id)?.name || 'Открыть серию'}</Link>)}</details>}
      </>}
    </div>
    {recipeOpen && recipeSource && !project.archived && <IOSDialog open labelledBy={dialogTitle} mobileLayout="sheet"
      className="grid max-h-[85dvh] gap-4 overflow-y-auto p-5 sm:max-w-xl sm:pb-5"
      onOpenChange={open => { if (!open) withStudioDraftGuard(() => setRecipeOpen(false)); }}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={dialogTitle} className="text-xl font-semibold">Параметры перевода проекта</h2>
        <Button size="icon-sm" variant="ghost" aria-label="Закрыть параметры перевода" onClick={() => withStudioDraftGuard(() => setRecipeOpen(false))}><X aria-hidden/></Button>
      </div>
      {sources.length > 1 && <IOSSettingsRow label="Исходный язык рецепта" value={recipeSource}
        options={sources.map(id => ({id,label:languageName(id)}))}
        onChange={id => withStudioDraftGuard(() => setChosenSource(id))}/>}
      <RecipeEditor key={project.id+recipeSource+lang} inDialog ownerId={data.userId} admin={data.role==='admin'}
        locator={{scope:'project',scopeId:project.id,sourceLang:recipeSource,targetLang:lang}}/>
    </IOSDialog>}
    {launch && <ProjectLaunchDialog key={project.id+lang+launch} projectId={project.id} books={members} progress={entries}
      operation={launch} lang={lang} onClose={() => setLaunch(null)} onAccepted={onAccepted}/>}
    {form === 'archive' && <IOSAlertDialog open title="Архивировать проект?" description="Проект будет скрыт из основного списка. Книги, глоссарии и результаты останутся в архиве."
      confirmLabel="Архивировать" cancelLabel="Отмена" showCancel onOpenChange={open => {if (!open) setForm('');}} onConfirm={() => {setForm('');changeArchive();}}/>}
    {(form === 'rename' || form === 'new-destination') && <IOSDialog open labelledBy={dialogTitle} onOpenChange={open => {if (!open) withStudioDraftGuard(() => setForm(''));}}>
      <h2 className="px-4 pt-4 font-semibold" id={dialogTitle}>{form === 'rename' ? 'Переименовать проект' : 'Создать проект'}</h2>
      <ProjectNameForm ownerId={data.userId} project={form === 'rename' ? project : undefined} refresh={refresh}
        onCreated={form === 'new-destination' ? setDestination : undefined} close={() => setForm('')}/>
    </IOSDialog>}
    {form === 'adding' && <IOSDialog open labelledBy={dialogTitle} className="grid gap-4 p-5 sm:pb-5" onOpenChange={open => {if (!open && !action.busy) setForm('');}}>
      <h2 className="font-semibold" id={dialogTitle}>Добавить книгу</h2>
      <IOSSettingsRow label="Книга из другого проекта" value={incoming} disabled={action.busy} onChange={setIncoming}
        options={[{id:'',label:'Выберите книгу'},...outside.map(b => ({id:b.id,label:b.title+' · '+otherProjects.find(p=>p.id===b.projectId)?.name}))]}/>
      <ActionFeedback pending={action.pending} error={action.error}/>
      <div className="flex flex-wrap gap-2"><Button disabled={!incoming || action.busy} onClick={() => changeBook(incoming,'move',project.id)}>Переместить в этот проект</Button>
        <Button variant="outline" disabled={action.busy} onClick={() => setForm('')}>Отмена</Button></div>
    </IOSDialog>}
    {selected && form !== 'new-destination' && <IOSDialog open labelledBy={dialogTitle} className="grid gap-4 p-5 sm:pb-5" onOpenChange={open => {if (!open && !action.busy) setMoving('');}}>
      <h2 className="font-semibold" id={dialogTitle}>Переместить «{selected.title}»</h2>
      <IOSSettingsRow label="Проект назначения" value={destination} disabled={action.busy} onChange={id => {
        if (id === 'new') setForm('new-destination'); else setDestination(id);
      }} options={[{id:'',label:'Выберите проект'},...otherProjects.map(p => ({id:p.id,label:p.name})),{id:'new',label:'Создать проект…'}]}/>
      <ActionFeedback pending={action.pending} error={action.error}/>
      <div className="flex gap-2"><Button disabled={!destination || action.busy} onClick={() => changeBook(selected.id,'move',destination)}>Подтвердить перенос</Button>
        <Button variant="outline" disabled={action.busy} onClick={() => setMoving('')}>Отмена</Button></div>
    </IOSDialog>}
  </>;
}
