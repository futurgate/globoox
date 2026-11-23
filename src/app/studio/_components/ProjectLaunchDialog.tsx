'use client';

import { useId, useRef, useState } from 'react';
import Link from 'next/link';
import { bookRunPath } from './projectLinks';
import { Button } from '@/components/ui/button';
import IOSDialog from '@/components/ui/ios-dialog';
import type { WorkspaceBook } from '@/lib/translationWorkspaceTypes';
import { recipeEndpoint, recipeGenres, type RecipeSettings } from '@/lib/studioRecipe';
import { languages } from '@/lib/studioLanguages';
import { ActionFeedback } from './BookStage';
import { bookPost, useBookAction, useBookData } from './bookRequests';
import { runScope, stageInProgress, type ProjectOperation, type QueueProgress } from './projectQueue';

function BookRecipe({ book, lang }: { book: WorkspaceBook; lang: string }) {
  const [expanded, setExpanded] = useState(false);
  const sourceLang = (book.sourceLanguage || 'RU').toUpperCase();
  const info = useBookData<RecipeSettings>(expanded ? recipeEndpoint({scope:'book',scopeId:book.id,sourceLang,targetLang:lang}) : null);
  return <details className="mt-1 text-sm pt-muted" onToggle={event => setExpanded(event.currentTarget.open)}>
    <summary>Параметры книги</summary>
    {expanded && (info?.data ? <p>{[
      recipeGenres.find(g => g.id === info.data?.genre)?.label ?? info.data.genre,
      info.data.effective.glossaryModel && 'Глоссарий · ' + info.data.effective.glossaryModel,
      info.data.effective.translateModel && 'Перевод · ' + info.data.effective.translateModel,
    ].filter(Boolean).join(' / ')}</p> : <p role={info?.error ? 'alert' : 'status'}>{info?.error || 'Загружаем параметры…'}</p>)}
  </details>;
}

export function ProjectLaunchDialog({ projectId, books, progress, lang, operation, bookId, onClose, onAccepted }: {
  projectId: string; bookId?: string; books: WorkspaceBook[]; progress: readonly QueueProgress[]; lang: string; operation: ProjectOperation;
  onClose: () => void; onAccepted: (groupId: string) => void;
}) {
  // The confirmation always refers to the displayed snapshot, including after another tab changes the order.
  const [ordered] = useState(() => [...books]);
  const [selected, setSelected] = useState(() => new Set(bookId ? [bookId] : ordered.map(book => book.id)));
  const request = useRef({ key: '', requestId: '' });
  const title = useId();
  const action = useBookAction();
  const { scope, reason } = runScope(ordered, selected, lang);
  const changed = ordered.length !== books.length || ordered.some((book,index) => book.id !== books[index].id);
  const byBook = new Map(progress.map(item => [item.bookId, item]));
  const active = scope.find(book => {
    const info = byBook.get(book.id);
    return stageInProgress(info?.glossary) || stageInProgress(info?.translate);
  });
  const missingBook = bookId && !books.some(book => book.id === bookId);
  const activeState = active && byBook.get(active.id);
  const activeRunId = activeState && (stageInProgress(activeState.glossary) ? activeState.glossary.runId : activeState.translate.runId);
  const block = missingBook ? 'Книга больше не находится в очереди проекта.' : changed ? 'Очередь изменилась. Закройте окно и проверьте новый порядок.' :
    reason || (active ? 'У книги «' + active.title + '» уже выполняется этап. Откройте его из очереди проекта.' : '');
  const glossaryOnly = operation === 'glossary';
  async function confirm(signal: AbortSignal) {
    const bookIds = ordered.filter(book => selected.has(book.id)).map(book => book.id);
    const key = JSON.stringify([projectId,lang,operation,bookIds,ordered.map(book => book.id)]);
    if (request.current.key !== key) request.current = {key, requestId: crypto.randomUUID()};
    const response = await bookPost('/api/studio/project-run', {
      projectId, lang, operation, bookIds, order: ordered.map(book => book.id), requestId:request.current.requestId,
    }, signal);
    const result = await response.json();
    if (result.projectId !== projectId || result.lang?.toUpperCase() !== lang || !result.groupId) throw Error('Сервер не подтвердил запуск проекта.');
    onAccepted(result.groupId);
  }
  return <IOSDialog open onOpenChange={open => { if (!open && !action.busy) onClose(); }} labelledBy={title}
    closeOnOverlay={!action.busy} className="flex max-h-[85dvh] flex-col gap-4 overflow-y-auto p-5 sm:max-w-xl sm:pb-5">
    <h2 id={title} className="text-xl font-semibold">{glossaryOnly ? 'Собрать глоссарий' : bookId ? 'Перевести книгу' : 'Перевести проект'}</h2>
    <p>Язык перевода · {languages[lang] || lang}</p>
    <fieldset className="min-w-0" disabled={action.busy}><legend className="mb-2 font-medium">
      {bookId ? 'Книги в запуске' : glossaryOnly ? 'Для каких книг подготовить глоссарий?' : 'Какие книги перевести?'}
    </legend>
      {ordered.map((book,index) => {
        const included = scope.includes(book);
        if (bookId && !included) return null;
        const selectedBook = selected.has(book.id);
        return <div className="border-t py-2" key={book.id}>
          <label className="flex items-start gap-3">
            {!bookId && <input type="checkbox" className="mt-1 shrink-0" checked={selectedBook} onChange={e => {
              const next = new Set(selected);
              if (e.target.checked) next.add(book.id); else next.delete(book.id);
              setSelected(next);
            }}/>}
            <span><strong>{index + 1}. {book.title}</strong>
              {included && <small className="block pt-muted">{!selectedBook ? 'Только глоссарий для следующих книг' :
                glossaryOnly ? 'Подготовка глоссария' : 'Глоссарий и перевод'}</small>}
            </span>
          </label>
          {included && <BookRecipe book={book} lang={lang}/>}
        </div>;
      })}
    </fieldset>
    <p className="pt-muted text-sm">Глоссарий собирается в указанном порядке. Обработка по сохранённым параметрам книг расходует токены.</p>
    {scope.some(book => byBook.get(book.id)?.glossary.orderChanged) &&
      <p role="status" className="pt-callout">Порядок книг изменился после сборки словаря. Сервер проверит глоссарии затронутых книг с учётом их нового порядка.</p>}
    {scope.some(book => byBook.get(book.id)?.glossary.status === 'done') &&
      <p className="pt-muted text-sm">Для прежнего глоссария без сведений об исходном порядке может потребоваться повторная обработка глав.</p>}
    {block && <p role="status" className="pt-callout">{block}</p>}
    {active && activeRunId && <Button asChild variant="outline"><Link href={bookRunPath(active.id,lang,activeRunId)}>Открыть текущий запуск</Link></Button>}
    <ActionFeedback pending={action.pending} error={action.error}/>
    <div className="flex flex-wrap justify-end gap-2">
      <Button variant="outline" disabled={action.busy} onClick={onClose}>Отмена</Button>
      <Button disabled={!!block || action.busy} onClick={() => void action.run(confirm,'Отправляем запуск проекта…')}>Подтвердить запуск</Button>
    </div>
  </IOSDialog>;
}
