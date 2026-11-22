import { workspaceBase } from '@/lib/translationWorkspacePath';

export const projectsPath = workspaceBase;
export const projectPath = (id: string) => projectsPath + '/projects/' + encodeURIComponent(id);
export const bookPath = (id: string) => projectsPath + '/books/' + encodeURIComponent(id);
export const bookRunPath = (bookId: string, lang: string, runId: string) =>
  bookPath(bookId) + '/translations/' + encodeURIComponent(lang) + '/runs/' + encodeURIComponent(runId);
export const seriesPath = (id: string) => projectsPath + '/series/' + encodeURIComponent(id);
export const processingLabel: Record<string, string> = {
  pending: 'В очереди на импорт', processing: 'Идёт импорт', ready: 'Оригинал готов', error: 'Ошибка импорта',
};
