import type { WorkspaceBook } from '@/lib/translationWorkspaceTypes';
import { targets } from '@/lib/studioLanguages';
import type { RunStatus } from './runDisplay';

export type ProjectOperation = 'translate' | 'glossary';
export interface StageProgress {
  status: RunStatus | 'idle';
  runId?: string | null;
  groupId?: string | null;
  orderChanged?: boolean;
  waitingForBookId?: string | null;
  done?: number | null;
  total?: number | null;
}
export interface QueueProgress {
  bookId: string;
  glossary: StageProgress;
  translate: StageProgress;
}

export const stageInProgress = (stage?: StageProgress) => stage?.status === 'queued' || stage?.status === 'running';
export const queueInProgress = ({books}: {books: QueueProgress[]}) =>
  books.some(book => stageInProgress(book.glossary) || stageInProgress(book.translate));

export function queueBooks(books: readonly WorkspaceBook[], projectId: string, archived = false) {
  return books.filter(book => book.projectId === projectId && Boolean(book.projectArchived) === archived)
    .sort((a,b) => (a.projectPosition ?? Infinity) - (b.projectPosition ?? Infinity)
      || (a.volumeNumber ?? Infinity) - (b.volumeNumber ?? Infinity)
      || a.title.localeCompare(b.title, 'ru') || a.id.localeCompare(b.id));
}

export function projectLanguages(books: readonly WorkspaceBook[]) {
  return [...new Set(books.flatMap(book => targets[(book.sourceLanguage || 'RU').toUpperCase()] ?? []))];
}

// A selected book needs the predecessor's glossary even if the predecessor's translation was deselected.
export function runScope(books: readonly WorkspaceBook[], selected: ReadonlySet<string>, lang: string) {
  let end = -1;
  books.forEach((book, index) => { if (selected.has(book.id)) end = index; });
  const scope = books.slice(0, end + 1);
  const unsupported = scope.find(book => !targets[(book.sourceLanguage || 'RU').toUpperCase()]?.includes(lang));
  const unready = scope.find(book => book.processingStatus && book.processingStatus !== 'ready');
  const reason = unsupported ? 'Для книги «' + unsupported.title + '» не поддерживается выбранное направление.'
    : unready ? 'Дождитесь успешного импорта книги «' + unready.title + '».'
    : !scope.length ? 'Выберите хотя бы одну книгу.' : '';
  return { scope, reason };
}
