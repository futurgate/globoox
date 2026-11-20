'use client';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import IOSItemsStack from '@/components/ui/ios-items-stack';
import IOSAlertDialog from '@/components/ui/ios-alert-dialog';
import {
  uiFilterPillBase,
  uiFilterPillActive,
  uiFilterPillInactive,
  uiMenuItemButton,
} from '@/components/ui/button-styles';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import IOSSettingsRow from '@/components/ui/ios-settings-row';

import { useEffect, useState, useSyncExternalStore } from 'react';
import {
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
  Settings2,
  SlidersHorizontal,
} from 'lucide-react';
import { SectionNav } from '../_components/SectionNav';
import { PrototypeShell, type NavItem } from '../_components/PrototypeShell';
import { downloadDemoEpub } from '../_components/downloads';
import {
  books,
  initialDatabase,
  languages,
  languageOptions,
  modelOptions,
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
function TranslationStatus({ phase }: { phase: Phase }) {
  return (
    <Badge variant="secondary" className={'adm-status ' + phase}>
      {statusText(phase)}
    </Badge>
  );
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
    <button className={`adm-choice ${uiMenuItemButton}`} onClick={onClick}>
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
    <IOSItemsStack className="adm-list">
      {entries.length ? (
        entries.map((e) => (
          <div className="adm-history" key={runKey(e.book, e.lang)}>
            <button
              className={uiMenuItemButton}
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
            <TranslationStatus phase={e.run.jobs.translate.status} />
            {e.run.jobs.translate.status === 'done' && (
              <Button
                variant="ghost"
                size="icon"
                title={'Скачать ' + e.book.title}
                aria-label={'Скачать ' + e.book.title}
                onClick={() => void download(e.book, e.lang)}
              >
                <Download size={18} />
              </Button>
            )}
          </div>
        ))
      ) : (
        <p>Здесь появятся выполненные и незавершённые запуски.</p>
      )}
    </IOSItemsStack>
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
      detail={
        across
          ? undefined
          : {
              backLabel: 'К книгам',
              onBack: () => jump('books'),
              action: (
                <IOSSettingsRow
                  label="Русский →"
                  aria-label="Целевой язык книги"
                  compactLabels={{ label: 'RU →', value: lang }}
                  value={lang}
                  options={languageOptions}
                  onChange={(value) => jump('overview', book, value as Lang)}
                />
              ),
            }
      }
      items={nav}
      active={active}
      onSelect={(id) => jump(id as Screen)}
    >
      <div className="adm">
        {!across && (
          <SectionNav
            label="Разделы книги"
            items={tabs}
            active={activeTab}
            onSelect={(view) =>
              jump(
                view === 'setup' && job.status !== 'idle' ? 'progress' : view,
              )
            }
          />
        )}
        {error && (
          <div role="alert" className="adm-warning">
            {error}
          </div>
        )}
        {screen === 'books' && (
          <div className="adm-stack">
            <Card className="block adm-card">
              <div className="adm-section-title">
                <div>
                  <h2>Библиотека переводов</h2>
                  <p>Выберите книгу и направление перевода.</p>
                </div>
                <LibraryBig size={25} />
              </div>
              <div className="adm-library-tools">
                <Input
                  type="search"
                  className="adm-search"
                  placeholder="Поиск по названию или автору"
                  aria-label="Поиск по книгам"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <IOSSettingsRow
                  label="Перевести на"
                  value={lang}
                  options={languageOptions}
                  onChange={(value) => jump('books', book, value as Lang)}
                />
              </div>
              <div className="adm-filter" aria-label="Фильтр статуса">
                {[
                  ['all', 'Все книги'],
                  ['active', 'В работе'],
                  ['done', 'Готовые'],
                ].map(([v, l]) => (
                  <Button
                    variant="outline"
                    size="sm"
                    className={`${uiFilterPillBase} ${filter === v ? uiFilterPillActive : uiFilterPillInactive}`}
                    key={v}
                    aria-pressed={filter === v}
                    onClick={() => setFilter(v)}
                  >
                    {l}
                  </Button>
                ))}
              </div>
              <IOSItemsStack className="adm-list">
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
                      className={`adm-bookrow ${uiMenuItemButton}`}
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
                      <TranslationStatus
                        phase={db.runs[runKey(b, lang)].jobs.translate.status}
                      />
                      <ChevronRight size={17} />
                    </button>
                  ))}
              </IOSItemsStack>
              <p className="adm-no-results">
                По этому запросу книг нет. Попробуйте другой фильтр.
              </p>
            </Card>
            <Card className="block adm-card">
              <div className="adm-section-title">
                <h2>История переводов</h2>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => jump('history')}
                >
                  Открыть историю <ArrowRight size={15} />
                </Button>
              </div>
              {history}
            </Card>
          </div>
        )}
        {screen === 'history' && (
          <Card className="block adm-card">
            <h2>Книги и языковые пары</h2>
            <p>Продолжите начатый перевод или скачайте уже готовый файл.</p>
            {history}
          </Card>
        )}
        {screen === 'overview' && (
          <div className="adm-stack">
            <Card className="block adm-card adm-hero">
              <div>
                <TranslationStatus phase={job.status} />
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
              <Button onClick={nextStep}>
                {job.status === 'idle'
                  ? 'Настроить перевод'
                  : job.status === 'done'
                    ? 'Открыть EPUB'
                    : 'Открыть перевод'}
                <ArrowRight size={16} />
              </Button>
            </Card>
            <Card className="block adm-card">
              <h2>Работа с книгой</h2>
              <IOSItemsStack className="adm-list">
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
              </IOSItemsStack>
            </Card>
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
          <Card className="block adm-card">
            <h2>Настройка перевода</h2>
            <p>
              {quantity(book.chapters, ['глава', 'главы', 'глав'])} · Русский →{' '}
              {languages[lang]}
            </p>
            <IOSSettingsRow
              label="Модель перевода"
              value={run.models.translate}
              options={modelOptions}
              onChange={(value) =>
                update((r) => ({
                  ...r,
                  models: { ...r.models, translate: value },
                }))
              }
            />
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
            <Button variant="link" size="sm" onClick={() => jump('glossary')}>
              Открыть глоссарий →
            </Button>
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
              <Button
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
              </Button>
              <Button
                variant="link"
                size="sm"
                onClick={() => jump('templates')}
              >
                <Settings2 size={15} /> Шаблоны направления
              </Button>
            </div>
          </Card>
        )}
        {screen === 'progress' && (
          <div className="adm-stack">
            <Card className="block adm-card">
              <div className="adm-section-title">
                <h2>Ход перевода</h2>
                <TranslationStatus phase={job.status} />
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
                  <Button variant="outline" onClick={() => stop('translate')}>
                    <Pause size={16} /> Остановить
                  </Button>
                ) : job.status === 'done' ? (
                  <Button onClick={() => jump('file')}>
                    Открыть файл <ArrowRight size={16} />
                  </Button>
                ) : (
                  <Button
                    disabled={busy}
                    onClick={() => startTranslation(false)}
                  >
                    <Play size={16} />
                    {job.done ? 'Продолжить с пропусков' : 'Начать перевод'}
                  </Button>
                )}
                {job.status !== 'running' && (
                  <Button variant="outline" onClick={() => jump('setup')}>
                    Настройки запуска
                  </Button>
                )}
                <Button variant="link" size="sm" onClick={() => jump('costs')}>
                  Расходы
                </Button>
              </div>
              {job.status === 'paused' && (
                <p className="adm-note">
                  Готовые главы сохранены. Продолжение переведёт оставшиеся
                  блоки.
                </p>
              )}
            </Card>
            <Card className="block adm-card">
              <div className="adm-section-title">
                <h2>Журнал глав</h2>
                <IOSSettingsRow
                  label="Глава"
                  aria-label="Глава журнала"
                  value={String(chapter)}
                  options={Array.from({ length: book.chapters }, (_, i) => ({
                    id: String(i + 1),
                    label: String(i + 1),
                  }))}
                  onChange={(value) => {
                    setChapter(Number(value));
                    setCopied(false);
                  }}
                />
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
                  <Button
                    variant="link"
                    size="sm"
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
                  </Button>
                </>
              ) : (
                <p className="adm-note">
                  {run.useGlossary
                    ? 'Состав появится после перевода главы.'
                    : 'Для этого запуска глоссарий выключен.'}
                </p>
              )}
            </Card>
            {job.status === 'done' && (
              <Card className="block adm-card">
                <Choice
                  title="Проверить готовый перевод"
                  detail="Необязательная редактура и читательская проверка"
                  icon={ClipboardCheck}
                  onClick={() => jump('revision')}
                />
              </Card>
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
          <Card className="block adm-card">
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
            <IOSItemsStack>
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
            </IOSItemsStack>
          </Card>
        )}
        {screen === 'file' && (
          <Card className="block adm-card">
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
              <Button
                disabled={job.status !== 'done'}
                onClick={() => void download()}
              >
                <Download size={17} /> Скачать EPUB
              </Button>
              <Button
                variant="link"
                size="sm"
                onClick={() =>
                  jump(job.status === 'done' ? 'reader' : 'progress')
                }
              >
                {job.status === 'done' ? 'Проверить текст' : 'К ходу перевода'}{' '}
                →
              </Button>
            </div>
          </Card>
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
        <IOSAlertDialog
          open={confirm}
          onOpenChange={setConfirm}
          title="Перезаписать перевод?"
          description={`Сохранённый перевод «${book.title}» на выбранный язык и результаты проверки будут очищены. Начнётся новый проход с первой главы.`}
          showCancel
          destructive
          cancelLabel="Отмена"
          confirmLabel="Перезаписать перевод"
          onConfirm={() => startTranslation(true)}
        />
      </div>
    </PrototypeShell>
  );
}
