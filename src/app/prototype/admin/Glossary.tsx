'use client';

import { useState } from 'react';
import { Copy, LockKeyhole, Plus, Snowflake } from 'lucide-react';
import {
  books,
  quantity,
  terms,
  type Book,
  type Database,
  type Lang,
  type Pair,
  type Run,
} from './model';

type Props = {
  book: Book;
  lang: Lang;
  db: Database;
  run: Run;
  start: (reset: boolean) => void;
  stop: () => void;
  update: (fn: (r: Run) => Run) => void;
  next: () => void;
};
export function Glossary({
  book,
  lang,
  db,
  run,
  start,
  stop,
  update,
  next,
}: Props) {
  const [mode, setMode] = useState<'list' | 'paste' | 'copy'>('list');
  const [donor, setDonor] = useState('');
  const [raw, setRaw] = useState('');
  const [error, setError] = useState('');
  const [reset, setReset] = useState(false);
  const job = run.jobs.glossary;
  const blocked =
    run.frozen ||
    job.status === 'running' ||
    run.jobs.translate.status === 'running';
  const donors = books.filter(
    (b) => b.id !== book.id && db.runs[b.id + '/' + lang].glossary.length,
  );
  function load(entries: Pair[]) {
    update((r) => ({
      ...r,
      glossary: entries,
      latestAction: 'Глоссарий сохранён',
      jobs: {
        ...r.jobs,
        glossary: { ...r.jobs.glossary, status: 'done', done: book.chapters },
      },
    }));
    setMode('list');
    setError('');
    setRaw('');
  }
  function paste() {
    try {
      const data: unknown = JSON.parse(raw);
      if (!data || typeof data !== 'object') throw new Error();
      const g = data as {
        terminology?: {
          source_term?: string;
          preferred_translation?: string;
        }[];
        named_entities?: { entity?: string; preferred_target?: string }[];
      };
      const pairs = [
        ...(g.terminology ?? []).map((t) => ({
          source: t.source_term,
          target: t.preferred_translation,
        })),
        ...(g.named_entities ?? []).map((t) => ({
          source: t.entity,
          target: t.preferred_target,
        })),
      ];
      if (
        !pairs.length ||
        !pairs.every(
          (p) =>
            typeof p.source === 'string' &&
            p.source.trim() &&
            typeof p.target === 'string' &&
            p.target.trim(),
        )
      )
        throw new Error();
      load(pairs as Pair[]);
    } catch {
      setError(
        'Нужен JSON с заполненными парами terminology или named_entities.',
      );
    }
  }
  return (
    <section className="adm-card">
      <div className="adm-section-title">
        <div>
          <h2>Глоссарий книги</h2>
          <p>Имена, термины и их написание для перевода на выбранный язык.</p>
        </div>
        <span className="adm-pill">
          {run.frozen ? (
            <>
              <LockKeyhole size={13} /> Закреплён
            </>
          ) : (
            quantity(run.glossary.length, ['запись', 'записи', 'записей'])
          )}
        </span>
      </div>
      {run.glossary.length > 0 && (
        <div className="adm-terms">
          {run.glossary.map((term, i) => (
            <div key={i}>
              <span>{term.source}</span>
              <span>{term.target}</span>
            </div>
          ))}
        </div>
      )}
      {!run.glossary.length && (
        <p className="adm-empty">
          Словарь пока пуст. Соберите его по главам или возьмите готовый.
        </p>
      )}
      {mode === 'list' && (
        <div className="adm-actions">
          {job.status === 'running' ? (
            <button className="adm-btn light" onClick={stop}>
              Остановить сборку
            </button>
          ) : (
            <button
              className="adm-btn"
              disabled={blocked}
              onClick={() =>
                job.status === 'done' ? setReset(true) : start(false)
              }
            >
              {job.status === 'paused'
                ? 'Продолжить сборку'
                : run.glossary.length
                  ? 'Пересобрать по главам'
                  : 'Сгенерировать глоссарий'}
            </button>
          )}
          <button
            className="adm-btn light"
            disabled={blocked}
            onClick={() => {
              setMode('copy');
              setDonor(donors[0]?.id ?? '');
            }}
          >
            <Copy size={16} /> Из другой книги
          </button>
          <button
            className="adm-btn light"
            disabled={blocked}
            onClick={() => {
              setMode('paste');
              setError('');
            }}
          >
            <Plus size={16} /> Вставить JSON
          </button>
          {run.glossary.length > 0 && (
            <button
              className="adm-link"
              disabled={job.status === 'running'}
              onClick={() => update((r) => ({ ...r, frozen: !r.frozen }))}
            >
              <Snowflake size={16} />
              {run.frozen ? 'Разморозить' : 'Заморозить'}
            </button>
          )}
        </div>
      )}
      <label className="adm-inline">
        Модель глоссария{' '}
        <select
          value={run.models.glossary}
          disabled={blocked}
          onChange={(e) =>
            update((r) => ({
              ...r,
              models: { ...r.models, glossary: e.target.value },
            }))
          }
        >
          {['По умолчанию', 'Flash', 'Hydrogen'].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>
      {reset && (
        <div className="adm-warning">
          <strong>Пересобрать глоссарий с первой главы?</strong>
          <p>Текущий список будет заменён.</p>
          <button
            className="adm-btn"
            disabled={blocked}
            onClick={() => {
              start(true);
              setReset(false);
            }}
          >
            Пересобрать
          </button>{' '}
          <button className="adm-btn light" onClick={() => setReset(false)}>
            Отмена
          </button>
        </div>
      )}
      {mode === 'copy' && (
        <div className="adm-inset">
          <label className="adm-field">
            Книга со словарём
            <select value={donor} onChange={(e) => setDonor(e.target.value)}>
              {!donors.length && (
                <option value="">Нет готовых словарей для этого языка</option>
              )}
              {donors.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </label>
          <div className="adm-actions">
            <button
              className="adm-btn"
              disabled={!donor || blocked}
              onClick={() =>
                load(
                  db.runs[donor + '/' + lang].glossary.map((p) => ({ ...p })),
                )
              }
            >
              Скопировать записи
            </button>
            <button className="adm-link" onClick={() => setMode('list')}>
              Отмена
            </button>
          </div>
        </div>
      )}
      {mode === 'paste' && (
        <div className="adm-inset">
          <label className="adm-field">
            JSON глоссария
            <textarea
              rows={4}
              placeholder={JSON.stringify(
                {
                  terminology: [
                    {
                      source_term: 'Северный предел',
                      preferred_translation: terms(lang)[2].target,
                    },
                  ],
                },
                null,
                2,
              )}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
            />
          </label>
          <p className="adm-note">Импорт заменит текущие записи.</p>
          {error && <p role="alert">{error}</p>}
          <div className="adm-actions">
            <button
              disabled={!raw.trim() || blocked}
              className="adm-btn"
              onClick={paste}
            >
              Сохранить JSON
            </button>
            <button className="adm-link" onClick={() => setMode('list')}>
              Отмена
            </button>
          </div>
        </div>
      )}
      {(job.status === 'running' || job.status === 'paused') && (
        <div className="adm-meter">
          <progress max={book.chapters} value={job.done} />
          <small>
            {job.done} из {book.chapters} глав
          </small>
        </div>
      )}
      <div className="adm-foot">
        <button className="adm-link" onClick={next}>
          К настройкам перевода →
        </button>
      </div>
    </section>
  );
}
