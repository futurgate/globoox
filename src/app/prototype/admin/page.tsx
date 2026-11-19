'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BookText,
  Check,
  ChevronRight,
  ClipboardCheck,
  Coins,
  Download,
  FileText,
  History,
  LibraryBig,
  ListTree,
  Pause,
  Play,
  Search,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react';
import { PrototypeShell, type NavItem } from '../_components/PrototypeShell';
import { downloadDemoEpub } from '../_components/downloads';
import {
  books,
  initialDatabase,
  languages,
  money,
  phaseLabels,
  quantity,
  rates,
  resetTranslation,
  runKey,
  stageLabels,
  stages,
  startJob,
  stepDatabase,
  type Book,
  type Database,
  type Lang,
  type Phase,
  type Run,
  type Screen,
  type Stage,
} from './model';
import { Review } from './Review';
import { Glossary } from './Glossary';
import { Templates } from './Templates';
import './admin.css';

const KEY = 'globoox-prototype-admin-1';
const nav: NavItem[] = [
  { id: 'books', label: 'Переводы книг', icon: LibraryBig },
  { id: 'history', label: 'История переводов', icon: History },
  {
    id: 'templates',
    label: 'Шаблоны промптов',
    icon: SlidersHorizontal,
    section: 'Инструменты',
  },
];
const views: Screen[] = [
  'books',
  'overview',
  'glossary',
  'setup',
  'progress',
  'revision',
  'reader',
  'costs',
  'file',
  'history',
  'templates',
];
const tabs: { id: Screen; label: string }[] = [
  { id: 'overview', label: 'Обзор' },
  { id: 'glossary', label: 'Глоссарий' },
  { id: 'setup', label: 'Перевод' },
  { id: 'reader', label: 'Проверка' },
  { id: 'file', label: 'Файл' },
];
function listenHash(fn: () => void) {
  window.addEventListener('hashchange', fn);
  return () => window.removeEventListener('hashchange', fn);
}
function go(screen: Screen, book: Book, lang: Lang) {
  window.location.hash = [screen, book.id, lang].join('/');
}
function statusText(s: Phase) {
  return s === 'idle'
    ? 'К запуску'
    : s === 'done'
      ? 'Готово к скачиванию'
      : phaseLabels[s];
}
function Badge({ phase }: { phase: Phase }) {
  return <span className={'adm-pill ' + phase}>{statusText(phase)}</span>;
}
function BookMark({ book }: { book: Book }) {
  return (
    <span aria-hidden="true" className={'adm-bookmark ' + book.id}>
      <BookText size={25} strokeWidth={1.3} />
    </span>
  );
}
function Choice({
  title,
  detail,
  icon: Icon,
  onClick,
}: {
  title: string;
  detail: string;
  icon: typeof BookOpen;
  onClick: () => void;
}) {
  return (
    <button className="adm-choice" onClick={onClick}>
      <Icon size={20} />
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <ChevronRight size={18} />
    </button>
  );
}

export default function AdminPrototype() {
  const hash = useSyncExternalStore(
    listenHash,
    () => window.location.hash,
    () => '',
  );
  const [a, b, c] = hash.replace(/^#/, '').split('/');
  const screen = views.includes(a as Screen) ? (a as Screen) : 'books';
  const book = books.find((item) => item.id === b) ?? books[0];
  const lang: Lang = c === 'FR' ? 'FR' : 'EN';
  const key = runKey(book, lang);
  const [db, setDb] = useState<Database>(initialDatabase);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [overwrite, setOverwrite] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chapter, setChapter] = useState(1);
  const [error, setError] = useState('');
  useEffect(() => {
    let restored: Database | undefined;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const stored = JSON.parse(raw) as Database;
        if (
          stored.prompts &&
          books.every((book) =>
            ['EN', 'FR'].every(
              (lang) => stored.runs?.[book.id + '/' + lang]?.jobs?.reader,
            ),
          )
        )
          restored = stored;
      }
    } catch {
      /* Mock storage may be disabled. */
    }
    const id = window.setTimeout(() => {
      if (restored) setDb(restored);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(KEY, JSON.stringify(db));
      } catch {
        /* In-memory walkthrough remains available. */
      }
  }, [ready, db]);
  const running = Object.values(db.runs).some((r) =>
    Object.values(r.jobs).some((j) => j.status === 'running'),
  );
  useEffect(() => {
    if (!running || !ready) return;
    const id = window.setInterval(() => setDb(stepDatabase), 850);
    return () => window.clearInterval(id);
  }, [running, ready]);
  const run = db.runs[key];
  const job = run.jobs.translate;
  const jump = (s: Screen, nextBook = book, nextLang = lang) => {
    setConfirm(false);
    setOverwrite(false);
    setError('');
    setCopied(false);
    setChapter(1);
    go(s, nextBook, nextLang);
  };
  const update = (fn: (r: Run) => Run) =>
    setDb((d) => ({ ...d, runs: { ...d.runs, [key]: fn(d.runs[key]) } }));
  const start = (stage: Stage, clear = false) =>
    update((r) => {
      let next = r;
      if (clear && stage === 'translate') next = resetTranslation(r, lang);
      if (clear && stage === 'glossary') next = { ...r, glossary: [] };
      if (clear && stage === 'reader') next = { ...r, proposals: [] };
      if (clear && stage === 'revise') next = { ...r, revisions: [] };
      return startJob(next, stage, clear);
    });
  const stop = (s: Stage) =>
    update((r) => ({
      ...r,
      jobs: { ...r.jobs, [s]: { ...r.jobs[s], status: 'paused' } },
      latestAction: 'Прогресс сохранён',
    }));
  const startTranslation = (clear: boolean) => {
    start('translate', clear);
    jump('progress');
  };
  const download = async (target = book, targetLang = lang) => {
    const r = db.runs[runKey(target, targetLang)];
    if (r.jobs.translate.status !== 'done') return;
    try {
      await downloadDemoEpub(target.title, r.text, targetLang.toLowerCase());
      setError('');
    } catch {
      setError('Не удалось собрать демонстрационный EPUB. Попробуйте ещё раз.');
    }
  };
  const entries = books
    .flatMap((b) =>
      (['EN', 'FR'] as Lang[]).map((l) => ({
        book: b,
        lang: l,
        run: db.runs[runKey(b, l)],
      })),
    )
    .filter((e) => e.run.jobs.translate.starts > 0);
  const across = ['books', 'history', 'templates'].includes(screen);
  const activeTab =
    screen === 'progress'
      ? 'setup'
      : screen === 'revision'
        ? 'reader'
        : screen === 'costs'
          ? 'overview'
          : screen;
  const active =
    screen === 'history'
      ? 'history'
      : screen === 'templates'
        ? 'templates'
        : 'books';
  const title =
    screen === 'books'
      ? 'Переводы книг'
      : screen === 'history'
        ? 'История переводов'
        : screen === 'templates'
          ? 'Шаблоны промптов'
          : book.title;
  const totalCost = stages.reduce(
    (n, s) => n + run.jobs[s].charged * rates[s],
    0,
  );
  const busy = Object.values(run.jobs).some((j) => j.status === 'running');
  const nextStep = () =>
    jump(
      job.status === 'done'
        ? 'file'
        : job.status === 'idle'
          ? 'setup'
          : 'progress',
    );
  const history = (
    <div className="adm-list">
      {entries.length ? (
        entries.map((e) => (
          <div className="adm-history" key={runKey(e.book, e.lang)}>
            <button
              onClick={() =>
                jump(
                  e.run.jobs.translate.status === 'done' ? 'file' : 'progress',
                  e.book,
                  e.lang,
                )
              }
            >
              <BookOpen size={19} />
              <span>
                <strong>{e.book.title}</strong>
                <small>
                  Русский → {languages[e.lang]} · {e.run.jobs.translate.done} из{' '}
                  {e.book.chapters} глав
                </small>
              </span>
            </button>
            <Badge phase={e.run.jobs.translate.status} />
            {e.run.jobs.translate.status === 'done' && (
              <button
                className="adm-icon"
                title={'Скачать ' + e.book.title}
                aria-label={'Скачать ' + e.book.title}
                onClick={() => void download(e.book, e.lang)}
              >
                <Download size={18} />
              </button>
            )}
          </div>
        ))
      ) : (
        <p>Здесь появятся выполненные и незавершённые запуски.</p>
      )}
    </div>
  );
  return (
    <PrototypeShell
      role="admin"
      title={title}
      subtitle={
        across
          ? 'Рабочее место администратора'
          : book.author + ' · ' + book.series
      }
      items={nav}
      active={active}
      onSelect={(id) => jump(id as Screen)}
    >
      <div className="adm">
        {!across && (
          <>
            <div className="adm-context">
              <button className="adm-link" onClick={() => jump('books')}>
                <ArrowLeft size={15} /> К книгам
              </button>
              <label className="adm-language">
                Русский →{' '}
                <select
                  aria-label="Целевой язык книги"
                  value={lang}
                  onChange={(e) =>
                    jump('overview', book, e.target.value as Lang)
                  }
                >
                  {Object.entries(languages).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <nav aria-label="Разделы книги" className="adm-tabs">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  aria-current={activeTab === t.id ? 'page' : undefined}
                  onClick={() =>
                    jump(
                      t.id === 'setup' && job.status !== 'idle'
                        ? 'progress'
                        : t.id,
                    )
                  }
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </>
        )}
        {error && (
          <div role="alert" className="adm-warning">
            {error}
          </div>
        )}
        {screen === 'books' && (
          <div className="adm-stack">
            <div className="adm-card">
              <div className="adm-section-title">
                <div>
                  <h2>Библиотека переводов</h2>
                  <p>Выберите книгу и направление перевода.</p>
                </div>
                <LibraryBig size={25} />
              </div>
              <div className="adm-library-tools">
                <label className="adm-search">
                  <Search size={17} />
                  <input
                    placeholder="Поиск по названию или автору"
                    aria-label="Поиск по книгам"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <label className="adm-inline">
                  Перевести на{' '}
                  <select
                    value={lang}
                    onChange={(e) =>
                      jump('books', book, e.target.value as Lang)
                    }
                  >
                    <option value="EN">Английский</option>
                    <option value="FR">Французский</option>
                  </select>
                </label>
              </div>
              <div className="adm-filter" aria-label="Фильтр статуса">
                {[
                  ['all', 'Все книги'],
                  ['active', 'В работе'],
                  ['done', 'Готовые'],
                ].map(([v, l]) => (
                  <button
                    key={v}
                    aria-pressed={filter === v}
                    onClick={() => setFilter(v)}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <div className="adm-list">
                {books
                  .filter((b) => {
                    const st = db.runs[runKey(b, lang)].jobs.translate.status;
                    return (
                      (b.title + ' ' + b.author)
                        .toLowerCase()
                        .includes(query.trim().toLowerCase()) &&
                      (filter === 'all' ||
                        (filter === 'done'
                          ? st === 'done'
                          : st === 'paused' || st === 'running'))
                    );
                  })
                  .map((b) => (
                    <button
                      key={b.id}
                      className="adm-bookrow"
                      onClick={() => jump('overview', b)}
                    >
                      <BookMark book={b} />
                      <span className="adm-bookinfo">
                        <strong>{b.title}</strong>
                        <small>
                          {b.author} ·{' '}
                          {quantity(b.chapters, ['глава', 'главы', 'глав'])}
                        </small>
                      </span>
                      <Badge
                        phase={db.runs[runKey(b, lang)].jobs.translate.status}
                      />
                      <ChevronRight size={17} />
                    </button>
                  ))}
              </div>
              <p className="adm-no-results">
                По этому запросу книг нет. Попробуйте другой фильтр.
              </p>
            </div>
            <div className="adm-card">
              <div className="adm-section-title">
                <h2>История переводов</h2>
                <button className="adm-link" onClick={() => jump('history')}>
                  Открыть историю <ArrowRight size={15} />
                </button>
              </div>
              {history}
            </div>
          </div>
        )}
        {screen === 'history' && (
          <section className="adm-card">
            <h2>Книги и языковые пары</h2>
            <p>Продолжите начатый перевод или скачайте уже готовый файл.</p>
            {history}
          </section>
        )}
        {screen === 'overview' && (
          <div className="adm-stack">
            <section className="adm-card adm-hero">
              <div>
                <Badge phase={job.status} />
                <h2>
                  {job.status === 'idle'
                    ? 'Книга готова к переводу'
                    : job.status === 'done'
                      ? 'Перевод завершён'
                      : job.status === 'paused'
                        ? 'Перевод остановлен'
                        : 'Идёт перевод'}
                </h2>
                <p>
                  {job.done} из {book.chapters} глав · Русский →{' '}
                  {languages[lang]}
                </p>
              </div>
              <button className="adm-btn" onClick={nextStep}>
                {job.status === 'idle'
                  ? 'Настроить перевод'
                  : job.status === 'done'
                    ? 'Открыть EPUB'
                    : 'Открыть перевод'}
                <ArrowRight size={16} />
              </button>
            </section>
            <section className="adm-card">
              <h2>Работа с книгой</h2>
              <Choice
                title="Глоссарий"
                detail={
                  run.glossary.length
                    ? quantity(run.glossary.length, [
                        'запись',
                        'записи',
                        'записей',
                      ])
                    : 'Имена и термины · по желанию'
                }
                icon={ListTree}
                onClick={() => jump('glossary')}
              />
              <Choice
                title="Расходы и запуски"
                detail={'Текущий расход ' + money(totalCost)}
                icon={Coins}
                onClick={() => jump('costs')}
              />
              <Choice
                title="Проверка перевода"
                detail="Редактура и читательские предложения"
                icon={ClipboardCheck}
                onClick={() => jump('revision')}
              />
            </section>
          </div>
        )}
        {screen === 'glossary' && (
          <Glossary
            key={key}
            book={book}
            lang={lang}
            db={db}
            run={run}
            start={(clear) => start('glossary', clear)}
            stop={() => stop('glossary')}
            update={update}
            next={() => jump('setup')}
          />
        )}
        {screen === 'setup' && (
          <section className="adm-card">
            <h2>Настройка перевода</h2>
            <p>
              {quantity(book.chapters, ['глава', 'главы', 'глав'])} · Русский →{' '}
              {languages[lang]}
            </p>
            <label className="adm-field">
              Модель перевода
              <select
                value={run.models.translate}
                onChange={(e) =>
                  update((r) => ({
                    ...r,
                    models: { ...r.models, translate: e.target.value },
                  }))
                }
              >
                {['По умолчанию', 'Flash', 'Hydrogen'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="adm-toggle">
              <span>
                <strong>Использовать глоссарий</strong>
                <small>
                  {run.glossary.length
                    ? quantity(run.glossary.length, [
                        'запись',
                        'записи',
                        'записей',
                      ])
                    : 'Сначала подготовьте глоссарий книги'}
                </small>
              </span>
              <input
                type="checkbox"
                disabled={!run.glossary.length}
                checked={run.useGlossary && run.glossary.length > 0}
                onChange={(e) =>
                  update((r) => ({ ...r, useGlossary: e.target.checked }))
                }
              />
            </label>
            <button className="adm-link" onClick={() => jump('glossary')}>
              Открыть глоссарий →
            </button>
            <label className="adm-toggle">
              <span>
                <strong>Редактура после перевода</strong>
                <small>Сразу выполнить стилистический проход</small>
              </span>
              <input
                type="checkbox"
                checked={run.autoRevise}
                onChange={(e) =>
                  update((r) => ({ ...r, autoRevise: e.target.checked }))
                }
              />
            </label>
            {job.done > 0 && (
              <label className="adm-toggle">
                <span>
                  <strong>Перезаписать перевод</strong>
                  <small>
                    Удалить сохранённый перевод и результаты его проверки
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={overwrite}
                  onChange={(e) => setOverwrite(e.target.checked)}
                />
              </label>
            )}
            <div className="adm-actions">
              <button
                className="adm-btn"
                disabled={busy || (job.status === 'done' && !overwrite)}
                onClick={() =>
                  overwrite ? setConfirm(true) : startTranslation(false)
                }
              >
                <Play size={17} />
                {overwrite
                  ? 'Перезаписать'
                  : job.done
                    ? 'Продолжить перевод'
                    : 'Начать перевод'}
              </button>
              <button className="adm-link" onClick={() => jump('templates')}>
                <Settings2 size={15} /> Шаблоны направления
              </button>
            </div>
          </section>
        )}
        {screen === 'progress' && (
          <div className="adm-stack">
            <section className="adm-card">
              <div className="adm-section-title">
                <h2>Ход перевода</h2>
                <Badge phase={job.status} />
              </div>
              <strong className="adm-big">
                {job.done} <span>из {book.chapters} глав</span>
              </strong>
              <div className="adm-meter">
                <progress value={job.done} max={book.chapters} />
                <small>{Math.round((job.done / book.chapters) * 100)}%</small>
              </div>
              <div className="adm-actions">
                {job.status === 'running' ? (
                  <button
                    className="adm-btn light"
                    onClick={() => stop('translate')}
                  >
                    <Pause size={16} /> Остановить
                  </button>
                ) : job.status === 'done' ? (
                  <button className="adm-btn" onClick={() => jump('file')}>
                    Открыть файл <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    className="adm-btn"
                    disabled={busy}
                    onClick={() => startTranslation(false)}
                  >
                    <Play size={16} />
                    {job.done ? 'Продолжить с пропусков' : 'Начать перевод'}
                  </button>
                )}
                {job.status !== 'running' && (
                  <button
                    className="adm-btn light"
                    onClick={() => jump('setup')}
                  >
                    Настройки запуска
                  </button>
                )}
                <button className="adm-link" onClick={() => jump('costs')}>
                  Расходы
                </button>
              </div>
              {job.status === 'paused' && (
                <p className="adm-note">
                  Готовые главы сохранены. Продолжение переведёт оставшиеся
                  блоки.
                </p>
              )}
            </section>
            <section className="adm-card">
              <div className="adm-section-title">
                <h2>Журнал глав</h2>
                <label className="adm-inline">
                  Глава{' '}
                  <select
                    aria-label="Глава журнала"
                    value={chapter}
                    onChange={(e) => {
                      setChapter(Number(e.target.value));
                      setCopied(false);
                    }}
                  >
                    {Array.from({ length: book.chapters }, (_, i) => (
                      <option key={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </label>
              </div>
              <p>
                Глава {chapter} ·{' '}
                {chapter <= job.done
                  ? 'Переведена'
                  : chapter === job.done + 1 && job.status === 'running'
                    ? 'Переводится'
                    : 'Ожидает'}
              </p>
              {run.useGlossary &&
              chapter <= job.done &&
              run.glossary.length > 0 ? (
                <>
                  <h3>Словарь в запросе</h3>
                  <div className="adm-terms">
                    {run.glossary.slice(0, 2).map((t, i) => (
                      <div key={i}>
                        <span>{t.source}</span>
                        <span>{t.target}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    className="adm-link"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          run.glossary
                            .slice(0, 2)
                            .map((t) => t.source + ' → ' + t.target)
                            .join('\n'),
                        );
                        setCopied(true);
                      } catch {
                        setError(
                          'Браузер запретил копирование. Выделите пары в журнале.',
                        );
                      }
                    }}
                  >
                    {copied ? 'Скопировано' : 'Скопировать список'}
                  </button>
                </>
              ) : (
                <p className="adm-note">
                  {run.useGlossary
                    ? 'Состав появится после перевода главы.'
                    : 'Для этого запуска глоссарий выключен.'}
                </p>
              )}
            </section>
            {job.status === 'done' && (
              <section className="adm-card">
                <Choice
                  title="Проверить готовый перевод"
                  detail="Необязательная редактура и читательская проверка"
                  icon={ClipboardCheck}
                  onClick={() => jump('revision')}
                />
              </section>
            )}
          </div>
        )}
        {(screen === 'reader' || screen === 'revision') && (
          <Review
            key={key + screen}
            run={run}
            lang={lang}
            total={book.chapters}
            kind={screen === 'reader' ? 'reader' : 'revise'}
            start={start}
            stop={stop}
            update={update}
            switchView={jump}
          />
        )}
        {screen === 'costs' && (
          <section className="adm-card">
            <div className="adm-section-title">
              <div>
                <h2>Расходы по этапам</h2>
                <p>Расчёт для демонстрационных запусков книги.</p>
              </div>
              <strong className="adm-total">{money(totalCost)}</strong>
            </div>
            <div className="adm-table">
              <table>
                <thead>
                  <tr>
                    <th>Этап</th>
                    <th>Оценка</th>
                    <th>Расход</th>
                    <th>Прогоны</th>
                  </tr>
                </thead>
                <tbody>
                  {stages.map((s) => (
                    <tr key={s}>
                      <th>{stageLabels[s]}</th>
                      <td>{money(book.chapters * rates[s])}</td>
                      <td>{money(run.jobs[s].charged * rates[s])}</td>
                      <td>{run.jobs[s].starts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3>Последние прогоны проверки</h3>
            {(['revise', 'reader'] as const).map((s) => (
              <Choice
                key={s}
                title={stageLabels[s]}
                detail={
                  run.jobs[s].starts
                    ? phaseLabels[run.jobs[s].status] +
                      ' · ' +
                      run.jobs[s].charged * 120 +
                      ' токенов · ' +
                      run.jobs[s].charged * 2 +
                      ' сек.'
                    : 'Ещё не запускалась'
                }
                icon={History}
                onClick={() => jump(s === 'reader' ? 'reader' : 'revision')}
              />
            ))}
          </section>
        )}
        {screen === 'file' && (
          <section className="adm-card">
            <div className="adm-section-title">
              <div>
                <h2>Переведённая книга</h2>
                <p>
                  {book.title} · {languages[lang]} · EPUB
                </p>
              </div>
              <FileText size={30} />
            </div>
            <div className="adm-file-state">
              {job.status === 'done' ? (
                <Check size={19} />
              ) : (
                <BookOpen size={19} />
              )}{' '}
              {job.done} из {book.chapters} глав переведено
            </div>
            <p>
              {job.status === 'done'
                ? 'В демонстрационный EPUB войдут три образца текста с принятыми правками.'
                : 'Скачивание откроется после перевода всех глав.'}
            </p>
            <div className="adm-actions">
              <button
                className="adm-btn"
                disabled={job.status !== 'done'}
                onClick={() => void download()}
              >
                <Download size={17} /> Скачать EPUB
              </button>
              <button
                className="adm-link"
                onClick={() =>
                  jump(job.status === 'done' ? 'reader' : 'progress')
                }
              >
                {job.status === 'done' ? 'Проверить текст' : 'К ходу перевода'}{' '}
                →
              </button>
            </div>
          </section>
        )}
        {screen === 'templates' && (
          <Templates
            key={lang}
            lang={lang}
            prompts={db.prompts}
            save={(k, v) =>
              setDb((d) => ({ ...d, prompts: { ...d.prompts, [k]: v } }))
            }
            back={() => jump('setup')}
          />
        )}
        {confirm && (
          <div className="adm-overlay">
            <section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="adm-confirm-title"
              className="adm-dialog"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setConfirm(false);
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const buttons = e.currentTarget.querySelectorAll('button');
                  (document.activeElement === buttons[0]
                    ? buttons[1]
                    : buttons[0]
                  ).focus();
                }
              }}
            >
              <h2 id="adm-confirm-title">Перезаписать перевод?</h2>
              <p>
                Сохранённый перевод «{book.title}» на выбранный язык и
                результаты проверки будут очищены. Начнётся новый проход с
                первой главы.
              </p>
              <div className="adm-actions">
                <button
                  autoFocus
                  className="adm-btn light"
                  onClick={() => setConfirm(false)}
                >
                  Отмена
                </button>
                <button
                  className="adm-btn danger"
                  onClick={() => startTranslation(true)}
                >
                  Перезаписать перевод
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </PrototypeShell>
  );
}
