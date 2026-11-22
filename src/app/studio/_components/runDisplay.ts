import type { StudioRun } from '@/lib/studioRecipe';

export type RunStatus = 'queued' | 'running' | 'done' | 'stopped' | 'error';
export const runStatusNames: Record<RunStatus, string> = {
  queued: 'В очереди', running: 'В работе', done: 'Завершён', stopped: 'Остановлен', error: 'Ошибка',
};
export const operationNames: Record<StudioRun['operation'], string> = {
  book: 'Перевод книги', series: 'Перевод серии', glossary: 'Глоссарий', translate: 'Перевод текста',
};
export const stageNames = { glossary: 'Глоссарий', translate: 'Перевод текста' };
export const activeStatus = (status: RunStatus) => status === 'queued' || status === 'running';
const money = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'USD', maximumFractionDigits: 5 });
const date = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const runCost = (value: number | null | undefined) => value == null ? '—' : money.format(value);
export const runDate = (value: string) => date.format(new Date(value));
