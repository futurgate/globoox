import { workspaceBase } from '@/lib/translationWorkspacePath';

export const projectsPath = workspaceBase;
export const bookPath = (id: string) => projectsPath + '/books/' + encodeURIComponent(id);
export const seriesPath = (id: string) => projectsPath + '/series/' + encodeURIComponent(id);
export const processingLabel: Record<string, string> = {
  pending: 'В очереди на импорт', processing: 'Идёт импорт', ready: 'Оригинал готов', error: 'Ошибка импорта',
};
