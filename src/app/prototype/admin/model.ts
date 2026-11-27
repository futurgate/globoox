export const books = [
  {
    id: 'archive',
    title: 'Северный архив',
    author: 'Анна Волкова',
    series: 'Хроники Севера · Том 1',
    chapters: 24,
  },
  {
    id: 'mist',
    title: 'За туманом',
    author: 'Анна Волкова',
    series: 'Хроники Севера · Том 2',
    chapters: 18,
  },
  {
    id: 'coast',
    title: 'Берег ветров',
    author: 'Анна Волкова',
    series: 'Хроники Севера · Том 3',
    chapters: 20,
  },
] as const;
export type Book = (typeof books)[number];
export type Lang = 'EN' | 'FR';
export const languages: Record<Lang, string> = {
  EN: 'Английский',
  FR: 'Французский',
};
export const languageOptions = Object.entries(languages).map(([id, label]) => ({
  id,
  label,
}));
export const modelOptions = ['По умолчанию', 'Flash', 'Hydrogen'].map((id) => ({
  id,
  label: id,
}));
export type Stage = 'glossary' | 'translate' | 'revise' | 'reader';
export type Phase = 'idle' | 'running' | 'paused' | 'done';
export type Job = {
  status: Phase;
  done: number;
  charged: number;
  starts: number;
};
export type Screen =
  | 'books'
  | 'overview'
  | 'glossary'
  | 'setup'
  | 'progress'
  | 'revision'
  | 'reader'
  | 'costs'
  | 'file'
  | 'history'
  | 'templates';
export type Pair = { source: string; target: string };
export type Run = {
  jobs: Record<Stage, Job>;
  glossary: Pair[];
  frozen: boolean;
  useGlossary: boolean;
  autoRevise: boolean;
  models: Record<Stage, string>;
  text: string[];
  revisionBase: string[];
  readerBase: string[];
  revisions: string[];
  proposals: string[];
  latestAction: string;
};
export type Database = {
  runs: Record<string, Run>;
  prompts: Record<string, string>;
};
export const stageLabels: Record<Stage, string> = {
  glossary: 'Глоссарий',
  translate: 'Перевод',
  revise: 'Стилистическая редактура',
  reader: 'Читательская проверка',
};
export const stages: Stage[] = ['glossary', 'translate', 'revise', 'reader'];
export const rates: Record<Stage, number> = {
  glossary: 0.018,
  translate: 0.08,
  revise: 0.037,
  reader: 0.021,
};
export const templates = {
  glossary:
    'Составь словарь. Учти {EXISTING_GLOSSARY}. Текст главы: {SOURCE_TEXT}',
  translate:
    'Translate the numbered source blocks.\nGlossary: {GLOSSARY}\nSource: {SOURCE_TEXT}\nPreserve block numbering.',
  revise:
    'Проверь стиль перевода.\nОригинал: {SOURCE_NUMBERED}\nЧерновик: {DRAFT_NUMBERED}',
  reader: 'Найди проблемы для читателя.\n{CHAPTER_TEXT}',
};
export const fragments = [
  'Глава 3 · Абзац 11',
  'Глава 7 · Абзац 18',
  'Глава 12 · Абзац 9',
];
export const source = [
  'Вера взяла себя в руки.',
  'Снег заглушал шаги Веры.',
  'Она остановилась у стен Северограда.',
];
export const drafts = {
  EN: [
    'Vera took herself in hands.',
    'The snow made Vera’s footsteps quiet.',
    'She stopped at the walls of Severograd.',
  ],
  FR: [
    'Vera se prit dans les mains.',
    'La neige rendait silencieux les pas de Vera.',
    'Elle s’arrêta devant les murs de Severograd.',
  ],
};
export const polished = {
  EN: [
    'Vera took herself in hands.',
    'The snow muffled Vera’s footsteps.',
    'She paused at the walls of Severograd.',
  ],
  FR: [
    'Vera se prit dans les mains.',
    'La neige étouffait les pas de Vera.',
    'Elle marqua une pause devant les murs de Severograd.',
  ],
};
export const suggested = {
  EN: [
    'Vera pulled herself together.',
    'The snow softened Vera’s footfalls.',
    'She stopped beneath the walls of Severograd.',
  ],
  FR: [
    'Vera se ressaisit.',
    'La neige assourdissait les pas de Vera.',
    'Elle s’arrêta au pied des remparts de Severograd.',
  ],
};
export const terms = (lang: Lang): Pair[] => [
  { source: 'Вера', target: 'Vera' },
  { source: 'Североград', target: 'Severograd' },
  {
    source: 'Северный предел',
    target: lang === 'EN' ? 'Northern Reach' : 'Marche du Nord',
  },
];
export const runKey = (book: Book, lang: Lang) => book.id + '/' + lang;
export function quantity(n: number, forms: [string, string, string]) {
  const form = new Intl.PluralRules('ru').select(n);
  return n + ' ' + forms[form === 'one' ? 0 : form === 'few' ? 1 : 2];
}
export const money = (n: number) =>
  n.toLocaleString('ru-RU', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
export const phaseLabels: Record<Phase, string> = {
  idle: 'Не начат',
  running: 'В работе',
  paused: 'Остановлен',
  done: 'Готово',
};
const newJob = (): Job => ({ status: 'idle', done: 0, charged: 0, starts: 0 });
export function seedRun(book: Book, lang: Lang): Run {
  const jobs = {
    glossary: newJob(),
    translate: newJob(),
    revise: newJob(),
    reader: newJob(),
  };
  if (lang === 'EN' && book.id !== 'archive') {
    const done = book.id === 'coast' ? book.chapters : 8;
    jobs.translate = {
      status: done === book.chapters ? 'done' : 'paused',
      done,
      charged: done,
      starts: 1,
    };
    jobs.glossary = {
      status: 'done',
      done: book.chapters,
      charged: book.chapters,
      starts: 1,
    };
  }
  const reviewed = lang === 'EN' && book.id === 'coast';
  if (reviewed) {
    jobs.revise = { ...jobs.translate };
    jobs.reader = { ...jobs.translate };
  }
  return {
    jobs,
    glossary: jobs.glossary.done ? terms(lang) : [],
    frozen: false,
    useGlossary: jobs.glossary.done > 0,
    autoRevise: false,
    models: {
      glossary: 'По умолчанию',
      translate: 'По умолчанию',
      revise: 'По умолчанию',
      reader: 'По умолчанию',
    },
    text: [...(reviewed ? polished[lang] : drafts[lang])],
    revisionBase: [...drafts[lang]],
    readerBase: [...(reviewed ? polished[lang] : drafts[lang])],
    revisions: reviewed ? ['Без изменений', 'Применено', 'Применено'] : [],
    proposals: reviewed ? fragments.map(() => 'Предложено') : [],
    latestAction: '',
  };
}
export function initialDatabase(): Database {
  const runs: Record<string, Run> = {};
  for (const book of books)
    for (const lang of ['EN', 'FR'] as const)
      runs[runKey(book, lang)] = seedRun(book, lang);
  return { runs, prompts: {} };
}
export function startJob(r: Run, stage: Stage, clear = false): Run {
  const prev = r.jobs[stage];
  return {
    ...r,
    latestAction: '',
    jobs: {
      ...r.jobs,
      [stage]: {
        ...prev,
        done: clear ? 0 : prev.done,
        status: 'running',
        starts: prev.starts + 1,
      },
    },
  };
}
export function stepDatabase(db: Database): Database {
  const runs = { ...db.runs };
  let changed = false;
  for (const book of books)
    for (const lang of ['EN', 'FR'] as const) {
      const key = runKey(book, lang);
      let r = runs[key];
      for (const stage of stages) {
        const job = db.runs[key].jobs[stage];
        if (job.status !== 'running') continue;
        const done = Math.min(book.chapters, job.done + 3);
        const finished = done === book.chapters;
        r = {
          ...r,
          jobs: {
            ...r.jobs,
            [stage]: {
              ...job,
              done,
              charged: job.charged + done - job.done,
              status: finished ? 'done' : 'running',
            },
          },
        };
        changed = true;
        if (!finished) continue;
        if (stage === 'glossary') {
          const existing = new Set(r.glossary.map((g) => g.source));
          r.glossary = [
            ...r.glossary,
            ...terms(lang).filter((g) => !existing.has(g.source)),
          ];
        }
        if (stage === 'translate' && r.autoRevise)
          r = startJob(r, 'revise', true);
        if (stage === 'revise') {
          r.revisionBase = [...r.text];
          r.text = r.text.map((t, i) =>
            t === drafts[lang][i] ? polished[lang][i] : t,
          );
          r.revisions = r.text.map((t, i) =>
            t === r.revisionBase[i] ? 'Без изменений' : 'Применено',
          );
        }
        if (stage === 'reader') {
          r.readerBase = [...r.text];
          r.proposals = r.text.map((t, i) =>
            t === suggested[lang][i] ? 'Совпадает' : 'Предложено',
          );
        }
      }
      runs[key] = r;
    }
  return changed ? { ...db, runs } : db;
}
export function resetTranslation(r: Run, lang: Lang): Run {
  const jobs = { ...r.jobs };
  for (const s of ['translate', 'revise', 'reader'] as const)
    jobs[s] = { ...jobs[s], done: 0, status: 'idle' };
  return {
    ...r,
    jobs,
    text: [...drafts[lang]],
    revisionBase: [...drafts[lang]],
    readerBase: [...drafts[lang]],
    revisions: [],
    proposals: [],
  };
}
