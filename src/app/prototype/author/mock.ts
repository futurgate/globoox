export type Phase =
  | 'glossary'
  | 'card'
  | 'queue'
  | 'review'
  | 'materials'
  | 'preflight'
  | 'ready';

export type Volume = {
  id: string;
  title: string;
  file: string;
  phase: Phase;
  term: string;
  edition: string;
  creator: string;
  description: string;
  order: string;
  correction: string;
  caption: string;
  retry: boolean;
};
export type Project = {
  id: string;
  title: string;
  source: string;
  target: string;
  genre: string;
  units: string;
  wishes: string;
  recipeVersion?: number;
  seedEntries?: { source: string; target: string }[];
  seriesTerm?: string;
  volumes: Volume[];
};
export const phaseLabels: Record<Phase, string> = {
  glossary: 'Нужен выбор термина',
  card: 'Проверить карточку',
  queue: 'В очереди перевода',
  review: 'Проверить перевод',
  materials: 'Проверить иллюстрацию',
  preflight: 'Проверить EPUB',
  ready: 'Готово к скачиванию',
};
export const phaseActions: Record<Phase, string> = {
  glossary: 'Выбрать перевод',
  card: 'Открыть карточку',
  queue: 'Открыть очередь',
  review: 'Проверить фрагмент',
  materials: 'Сверить надпись',
  preflight: 'Открыть проверку',
  ready: 'Скачать издание',
};
export const demoTitles = ['Северный архив', 'За туманом', 'Берег ветров'];
export const newVolume = (title: string, i: number): Volume => ({
  id: 'vol-' + (i + 1),
  title,
  file: title + '.epub',
  phase: 'glossary',
  term: '',
  edition: title === demoTitles[0] ? 'The Northern Archive' : title,
  creator: 'Анна Волкова',
  description: '',
  order: 'Титул → Аннотация → Оглавление',
  correction: '',
  caption: '',
  retry: false,
});
export const demoProject: Project = {
  id: 'north',
  title: 'Хроники Севера',
  source: 'Русский',
  target: 'Английский',
  genre: 'ЛитРПГ',
  units: 'Метрические',
  wishes: 'Сохранить короткие реплики и иронию рассказчика.',
  volumes: demoTitles.map(newVolume),
};
export function isUnlocked(p: Project, index: number) {
  return index === 0 || p.volumes[index - 1].phase !== 'glossary';
}

export function openAuthor(view: string, project = '', volume = '') {
  const search = new URLSearchParams({ view });
  if (project) search.set('project', project);
  if (volume) search.set('volume', volume);
  window.location.hash = search.toString();
}
export function subscribeHash(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}
const KEY = 'globoox:prototype:author:v1';
let cache: Project[] | null = null;
const SEED = [demoProject];
const listeners = new Set<() => void>();
export function readProjects(): Project[] {
  if (typeof window === 'undefined') return SEED;
  if (cache) return cache;
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (
      Array.isArray(data) &&
      data.length &&
      data.every(
        (p) =>
          Array.isArray(p?.volumes) &&
          p.volumes.length &&
          typeof p.id === 'string',
      )
    )
      cache = data;
  } catch {
    /* Private browser mode can still run the demo in memory. */
  }
  return (cache ??= SEED);
}
export const initialProjects = () => SEED;
export function subscribeProjects(fn: () => void) {
  listeners.add(fn);
  const reload = (e: StorageEvent) => {
    if (e.key === KEY || !e.key) {
      cache = null;
      fn();
    }
  };
  window.addEventListener('storage', reload);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('storage', reload);
  };
}
export function saveProjects(list: Project[]) {
  cache = list;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* Current session remains usable. */
  }
  listeners.forEach((fn) => fn());
}
export function updateProject(project: Project) {
  const list = readProjects();
  saveProjects(
    list.some((p) => p.id === project.id)
      ? list.map((p) => (p.id === project.id ? project : p))
      : [project, ...list],
  );
}
export function flowFor(p: Project, v: Volume) {
  openAuthor(v.phase === 'glossary' ? 'term' : v.phase, p.id, v.id);
}

export function volumeCount(n: number) {
  const form =
    n % 10 === 1 && n % 100 !== 11
      ? 'том'
      : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
        ? 'тома'
        : 'томов';
  return n + ' ' + form;
}
