'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PendingText, RefreshButton } from './RequestFeedback';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import IOSSettingsRow from '@/components/ui/ios-settings-row';
import type { WorkspaceBook, WorkspaceProject } from '@/lib/translationWorkspaceTypes';
import type { PlaygroundModels } from '@/lib/api';
import { RecipeEditor } from './RecipeSettings';
import type { RecipeSettings } from '@/lib/studioRecipe';
import { StageTemplateLinks } from './StageTemplateLinks';
import { StudioEntityMenu, StudioHeaderTools, type StudioMenuAction } from './StudioEntityMenu';
import { BookEdition, BookRuns, Estimate } from './BookEdition';
import { BookGlossaryPanel } from './BookGlossary';
import { BookProjectRun } from './BookProjectRun';
import { BookFlow } from './BookFlow';
import { LaunchAccessNotice, useLaunchAccess } from './LaunchAccess';
import { RecipeRuns } from './RecipeRuns';
import { BookReview } from './BookReview';
import { withStudioDraftGuard } from './StudioDraftActions';
import { StudioSectionNavigation } from './StudioSectionNavigation';
import { ActionFeedback, BookExecution, StageCard } from './BookStage';
import { bookEndpoint, downloadBookFile, useBookAction, useBookData } from './bookRequests';
import { bookTranslationPath, processingLabel, projectsPath } from './projectLinks';

import { targets, languages } from '@/lib/studioLanguages';

export const bookSections = [
  { id:'', label:'Обзор' }, { id:'glossary', label:'Глоссарий' }, { id:'review', label:'Решения по тексту' },
  { id:'runs', label:'Запуски и расход' }, { id:'editions', label:'Издания' },
];

interface Props {
  ownerId: string; project?: WorkspaceProject; book: WorkspaceBook; books: readonly WorkspaceBook[]; isAdmin: boolean; lang?: string; section?: string;
}

type ProgressEstimate = {
  studioTargetLang?: string;
  byLanguage: { lang: string; blocksTranslated: number; blocksRemaining: number; cost: { totalUsd: number | null } }[];
};

export function AuthorProgress({ bookId, lang }: { bookId: string; lang: string }) {
  const [version, setVersion] = useState(0);
  const url = bookEndpoint(bookId, 'translation-estimate', lang) + '&studioTargetLang=' + encodeURIComponent(lang);
  const state = useBookData<ProgressEstimate>(url, version);
  const info = state?.data?.byLanguage.find(l => l.lang === lang);
  const confirmed = state?.data?.studioTargetLang === lang;
  return <Card className="p-5 gap-3">
    <div className="flex flex-wrap justify-between gap-2"><h3>Перевод на {languages[lang]?.toLowerCase() || lang}</h3><RefreshButton pending={!state || state.refreshing} onClick={() => setVersion(v => v+1)}/></div>
    <ActionFeedback error={state?.error}/>
    {!state && <p role="status">Загрузка состояния книги…</p>}
    {info && <><p>Переведено блоков: {info.blocksTranslated} из {info.blocksTranslated + info.blocksRemaining}.</p>
      <p className="pt-muted">{!confirmed ? 'Прогноз стоимости по сохранённому рецепту пока недоступен.'
        : info.cost.totalUsd == null ? 'Для сохранённого рецепта пока нет тарифа.'
        : 'Прогноз на перевод оставшегося текста по сохранённому рецепту: ' +
          info.cost.totalUsd.toLocaleString('ru', {style:'currency', currency:'USD', maximumFractionDigits:4}) + '.'}</p></>}
    {state?.data && !info && <p>Статистика для этого языка отсутствует.</p>}
  </Card>;
}

export default function BookWorkspace({ ownerId, project, book, books, isAdmin, lang, section = '' }: Props) {
  const router = useRouter();
  const original = useBookAction();
  const [modelRetry, setModelRetry] = useState(0);
  const [recipe, setRecipe] = useState<RecipeSettings | null>(null);
  const [settingsReady, setSettingsReady] = useState(false);
  const [estimateModel, setEstimateModel] = useState<string | null>(null);
  const source = (book.sourceLanguage || 'RU').toUpperCase();
  const available = targets[source] || [];
  const target = lang || available[0] || '';
  const validDirection = available.includes(target);
  const editorialSection = section === 'review' || section === 'glossary';
  const projectQueue = project && project.orderRevision !== undefined ? project : undefined;
  const access = useLaunchAccess(!isAdmin && validDirection && (editorialSection || (!section && (Boolean(projectQueue) || !book.seriesId))));
  const showModels = isAdmin && validDirection && (!section || section === 'glossary');
  const modelList = useBookData<PlaygroundModels>(showModels ? '/api/admin/models' : null, modelRetry);
  const models = modelList?.data?.models ?? [];
  const route = (targetLang: string, tab: string) => bookTranslationPath(book.id, targetLang, tab);
  const ready = !book.processingStatus || book.processingStatus === 'ready';
  const status = book.processingStatus ? processingLabel[book.processingStatus] || book.processingStatus : '';
  const glossaryPage = ready && validDirection && section === 'glossary' && access.allowed;
  const downloadOriginal: StudioMenuAction = {
    label: 'Скачать оригинал', disabled: original.busy,
    onClick: () => void original.run(signal => downloadBookFile(bookEndpoint(book.id, 'download', target), book.title || book.id, signal), 'Загружаем оригинал…'),
  };

  return <BookExecution><div className="pt-stack">
    {ready && available.length > 0 && <StudioHeaderTools>
      <IOSSettingsRow label="Перевод на" value={target} aria-label={`Язык перевода: ${languages[source] || source} → ${languages[target] || target}`}
        compactLabels={{ label: source + ' →', value: target }} className="rounded-lg text-[var(--app-text)]"
        onChange={next => { if (next !== target) withStudioDraftGuard(() => router.push(route(next, section))); }}
        options={available.map(id => ({ id, label: languages[id] || id }))}/>
    </StudioHeaderTools>}
    {!glossaryPage && <StudioEntityMenu inHeader label="Действия с книгой" actions={[downloadOriginal]}/>}
    {(!section || !ready) && <p className="pt-muted text-sm">{[book.author, `Оригинал: ${languages[source] || source}`, status].filter(Boolean).join(' · ')}</p>}
    <ActionFeedback pending={original.pending} error={original.error} notice={original.notice}/>
    {!ready && <Card className="p-5 gap-2"><h3>{status}</h3><p className="pt-muted">Перевод доступен после успешной обработки исходного файла.</p><Button asChild variant="outline"><Link href={projectsPath + '/projects'}>К проектам</Link></Button></Card>}
    {ready && <>
      {!validDirection ? <p className="pt-callout">Для этого направления нет доступного перевода.{available.length > 0 ? ' Выберите поддерживаемый язык.' : ''}</p> : <>
        <StudioSectionNavigation label="Разделы перевода" compactLabel="Раздел книги" items={bookSections}
          active={section} hrefFor={id => route(target, id)}/>
        {showModels && !modelList && <PendingText>Загружаем список моделей…</PendingText>}
        {showModels && modelList?.error && <div className="pt-callout">Не удалось загрузить список моделей. Можно запустить этап с моделью по умолчанию. <Button variant="ghost" onClick={() => setModelRetry(v => v+1)}>Повторить</Button></div>}
        {section === '' && <RecipeEditor key={[ownerId,book.id,target].join('/')} ownerId={ownerId} admin={isAdmin} models={models}
          locator={{ scope: 'book', scopeId: book.id, sourceLang: source, targetLang: target }} onResolved={setRecipe} onReadyToRun={setSettingsReady}/>}
        {(section === '' || section === 'glossary') && projectQueue && (access.allowed
          ? <BookProjectRun key={[book.id,target,section].join('/')} book={book} books={books} project={projectQueue} lang={target} ready={section === 'glossary' || settingsReady} glossaryOnly={section === 'glossary'}/>
          : !section && <LaunchAccessNotice access={access}/>)}
        {section === '' && !book.seriesId && (!projectQueue || access.allowed) && (access.allowed
          ? <BookFlow key={book.id + target} bookId={book.id} lang={target} legacyOnly={!!projectQueue} settingsReady={settingsReady} editionsUrl={route(target,'editions')}/>
          : <LaunchAccessNotice access={access}/>)}
        {section === '' && (isAdmin ? <>
          <Estimate bookId={book.id} lang={target} model={estimateModel}/>
          <StageTemplateLinks bookId={book.id} lang={target} sourceLang={source}/>
          <section className="pt-stack"><h2>Этапы перевода</h2>
            {(['glossary','translate','revise','reader-check'] as const).map(stage => <StageCard key={stage} stage={stage} models={models} inheritedModel={stage === 'glossary' ? recipe?.effective.glossaryModel : stage === 'translate' ? recipe?.effective.translateModel : undefined}
              books={books} onEstimateModel={stage === 'translate' ? setEstimateModel : undefined} bookId={book.id} lang={target}/>)}
          </section>
        </> : <>
          <AuthorProgress key={recipe?.revision ?? 0} bookId={book.id} lang={target}/>
          {book.seriesId && !projectQueue && <Button variant="outline" asChild><Link href={projectsPath + '/series/' + encodeURIComponent(book.seriesId)}>Открыть перевод серии</Link></Button>}
        </>)}
        {editorialSection && !access.allowed && <LaunchAccessNotice access={access} editorial/>}
        {glossaryPage && <BookGlossaryPanel key={book.id + '/' + target} bookId={book.id} lang={target} sourceLang={source}
          models={models} books={books} admin={isAdmin} downloadOriginal={downloadOriginal}/>}
        {section === 'review' && access.allowed && <BookReview bookId={book.id} lang={target}/>}
        {section === 'runs' && (isAdmin ? <BookRuns bookId={book.id} lang={target}/> : <RecipeRuns bookId={book.id} lang={target} version={0} admin={false}/>)}
        {section === 'editions' && <BookEdition key={book.id + '/' + target} bookId={book.id} title={book.title} sourceLang={source} lang={target} isAdmin={isAdmin}/>}
      </>}
    </>}
  </div></BookExecution>;
}
