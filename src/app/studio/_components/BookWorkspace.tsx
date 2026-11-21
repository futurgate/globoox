'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import IOSSettingsRow from '@/components/ui/ios-settings-row';
import type { WorkspaceBook } from '@/lib/translationWorkspaceTypes';
import type { BookTranslationEstimate, PlaygroundModels } from '@/lib/api';
import { RecipeEditor } from './RecipeSettings';
import type { RecipeSettings } from '@/lib/studioRecipe';
import { StageTemplateLinks } from './StageTemplateLinks';
import { BookEdition, BookRuns, Estimate, Planned } from './BookEdition';
import { BookGlossaryPanel } from './BookGlossary';
import { BookReview } from './BookReview';
import { ActionFeedback, BookExecution, StageCard } from './BookStage';
import { bookEndpoint, bookGet, downloadBookFile, useBookAction, useBookData } from './bookRequests';
import { bookPath, processingLabel, projectsPath } from './projectLinks';

const targets: Record<string, string[]> = { RU: ['EN','FR'], EN:['RU'], FR:['EN','RU'] };
const languages: Record<string,string> = { RU:'Русский', EN:'Английский', FR:'Французский' };
const tabs = [
  { id:'', label:'Обзор' }, { id:'glossary', label:'Глоссарий' }, { id:'review', label:'Решения по тексту' },
  { id:'runs', label:'Запуски и расход' }, { id:'editions', label:'Издания' },
];

interface Props {
  ownerId: string; book: WorkspaceBook; books: readonly WorkspaceBook[]; isAdmin: boolean; lang?: string; section?: string;
}

function AuthorProgress({ bookId, lang }: { bookId: string; lang: string }) {
  const [version, setVersion] = useState(0);
  const state = useBookData<BookTranslationEstimate>(bookEndpoint(bookId,'translation-estimate',lang),version);
  const info = state?.data?.byLanguage.find(l => l.lang === lang);
  return <Card className="p-5 gap-3">
    <div className="flex flex-wrap justify-between gap-2"><h3>Перевод на {languages[lang]?.toLowerCase() || lang}</h3><Button variant="ghost" onClick={() => setVersion(v => v+1)}>Обновить</Button></div>
    <ActionFeedback error={state?.error}/>
    {!state && <p role="status">Загрузка состояния книги…</p>}
    {info && <><p>Переведено блоков: {info.blocksTranslated} из {info.blocksTranslated + info.blocksRemaining}.</p>
      <p className="pt-muted">Оценка оставшегося перевода на модели {state?.data?.model}: {info.cost.totalUsd == null ? 'тариф не указан' : info.cost.totalUsd.toLocaleString('ru', {style:'currency', currency:'USD',maximumFractionDigits:4})}.</p></>}
    {state?.data && !info && <p>Статистика для этого языка отсутствует.</p>}
  </Card>;
}

export default function BookWorkspace({ ownerId, book, books, isAdmin, lang, section = '' }: Props) {
  const router = useRouter();
  const original = useBookAction();
  const [models, setModels] = useState<string[]>([]);
  const [modelError, setModelError] = useState('');
  const [modelRetry, setModelRetry] = useState(0);
  const [recipe, setRecipe] = useState<RecipeSettings | null>(null);
  const [estimateModel, setEstimateModel] = useState('');
  const source = (book.sourceLanguage || 'RU').toUpperCase();
  const available = targets[source] || [];
  const target = lang || available[0] || '';
  const validDirection = available.includes(target);
  const showModels = isAdmin && validDirection && (!section || section === 'glossary');
  useEffect(() => {
    if (!showModels) return;
    const controller = new AbortController();
    bookGet<PlaygroundModels>('/api/admin/models',controller.signal).then(response => {
      if (!controller.signal.aborted) { setModels(response.models); setModelError(''); }
    }).catch(() => {
      if (!controller.signal.aborted) setModelError('Не удалось загрузить список моделей. Можно запустить этап с моделью по умолчанию.');
    });
    return () => controller.abort();
  }, [showModels, modelRetry]);
  const bookUrl = bookPath(book.id);
  const route = (targetLang: string, tab: string) => bookUrl + '/translations/' + encodeURIComponent(targetLang) + (tab ? '/' + tab : '');
  const ready = !book.processingStatus || book.processingStatus === 'ready';
  const status = book.processingStatus ? processingLabel[book.processingStatus] || book.processingStatus : '';
  return <BookExecution><div className="pt-stack">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="pt-muted">{[book.author, `Оригинал: ${languages[source] || source}`, status].filter(Boolean).join(' · ')}</p>
      <Button size="sm" variant="outline" disabled={original.busy} onClick={() => void original.run(signal =>
        downloadBookFile(bookEndpoint(book.id,'download',target), book.title || book.id, signal)
      )}>{original.busy ? 'Загрузка…' : 'Скачать оригинал'}</Button>
    </div>
    <ActionFeedback error={original.error}/>
    {!ready && <Card className="p-5 gap-2"><h3>{status}</h3><p className="pt-muted">Перевод доступен после успешной обработки исходного файла.</p><Button asChild variant="outline"><Link href={projectsPath + '/projects'}>К проектам</Link></Button></Card>}
    {ready && <>
      {available.length > 0 && <IOSSettingsRow label="Язык перевода" value={target} onChange={v => router.push(route(v,section))}
        options={available.map(id => ({ id, label:languages[id] || id }))}/>}
      {!validDirection ? <p className="pt-callout">Для этого направления нет доступного перевода.{available.length > 0 ? ' Выберите поддерживаемый язык.' : ''}</p> : <>
        <nav className="pt-sections flex-wrap" aria-label="Разделы перевода">
          {tabs.filter(t => t.id !== 'runs' || isAdmin).map(t => <Button key={t.id} variant="ghost" asChild><Link aria-current={section === t.id ? 'page' : undefined} href={route(target,t.id)}>{t.label}</Link></Button>)}
        </nav>
        {showModels && modelError && <div className="pt-callout">{modelError} <Button variant="ghost" onClick={() => setModelRetry(v => v+1)}>Повторить</Button></div>}
        {section === '' && <RecipeEditor key={[ownerId,book.id,target].join('/')} ownerId={ownerId} admin={isAdmin} models={models}
          locator={{ scope: 'book', scopeId: book.id, sourceLang: source, targetLang: target }} onResolved={setRecipe}/>}
        {section === '' && (isAdmin ? <>
          <Estimate bookId={book.id} lang={target} model={estimateModel || recipe?.effective.translateModel}/>
          <StageTemplateLinks bookId={book.id} lang={target} sourceLang={source}/>
          <section className="pt-stack"><h2>Этапы перевода</h2>
            {(['glossary','translate','revise','reader-check'] as const).map(stage => <StageCard key={stage} stage={stage} models={models} inheritedModel={stage === 'glossary' ? recipe?.effective.glossaryModel : stage === 'translate' ? recipe?.effective.translateModel : undefined}
              onModelChange={stage === 'translate' ? setEstimateModel : undefined} bookId={book.id} lang={target}/>)}
          </section>
        </> : <>
          <AuthorProgress bookId={book.id} lang={target}/>
          <Planned title="Запустить перевод книги" description="Самостоятельный запуск по жанру и пожеланиям будет доступен после подключения авторского режима."/>
        </>)}
        {section === 'glossary' && (isAdmin ? <><StageTemplateLinks bookId={book.id} lang={target} sourceLang={source} glossaryOnly/><BookGlossaryPanel bookId={book.id} lang={target} models={models} books={books}/></> : <Planned title="Глоссарий тома" description="Авторский просмотр терминов и выбор вариантов ожидают подключения доступа к словарю своей книги."/>)}
        {section === 'review' && (isAdmin ? <BookReview bookId={book.id} lang={target}/> : <Planned title="Решения по тексту" description="Здесь автор сможет проверять предложения и выбирать формулировки в своей книге."/>)}
        {section === 'runs' && (isAdmin ? <BookRuns bookId={book.id} lang={target}/> : <p>Страница недоступна.</p>)}
        {section === 'editions' && <BookEdition bookId={book.id} title={book.title} lang={target} isAdmin={isAdmin}/>}
      </>}
    </>}
  </div></BookExecution>;
}
