'use client';

import { useState } from 'react';
import { CheckCheck, Download, Pause, Play, RotateCcw } from 'lucide-react';
import { downloadCsv } from '../_components/downloads';
import {
  fragments,
  source,
  suggested,
  phaseLabels,
  type Run,
  type Lang,
  type Stage,
} from './model';

type Props = {
  run: Run;
  lang: Lang;
  kind: 'reader' | 'revise';
  total: number;
  start: (stage: Stage, clear?: boolean) => void;
  stop: (stage: Stage) => void;
  update: (fn: (r: Run) => Run) => void;
  switchView: (kind: 'reader' | 'revision') => void;
};
export function Review({
  run,
  lang,
  kind,
  total,
  start,
  stop,
  update,
  switchView,
}: Props) {
  const reader = kind === 'reader';
  const states = reader ? run.proposals : run.revisions;
  const [selected, select] = useState(0);
  const [editing, edit] = useState<string | null>(null);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const job = run.jobs[kind];
  const otherActive =
    Object.values(run.jobs).some((j) => j.status === 'running') &&
    job.status !== 'running';
  const pick = (i: number) => {
    select(i);
    edit(null);
  };
  const pending = (s: string) => s === (reader ? 'Предложено' : 'Применено');
  const field = reader ? 'proposals' : 'revisions';
  const pendingCount = states.filter(pending).length;
  const displayed =
    editing ??
    (reader && ['Предложено', 'Отклонено'].includes(states[selected])
      ? suggested[lang][selected]
      : run.text[selected]);
  const apply = (all: boolean) => {
    const list = all
      ? states.flatMap((s, i) => (pending(s) ? [i] : []))
      : [selected];
    if (!list.length) return;
    update((r) => {
      const nextStates = [...r[field]];
      const text = [...r.text];
      for (const i of list) {
        nextStates[i] = 'Подтверждено';
        text[i] =
          i === selected && editing !== null
            ? editing.trim()
            : reader && nextStates[i] !== r.proposals[i]
              ? suggested[lang][i]
              : text[i];
      }
      return {
        ...r,
        text,
        [field]: nextStates,
        latestAction: all ? 'Все правки подтверждены' : 'Правка сохранена',
      };
    });
    const next = states.findIndex((s, i) => i > selected && pending(s));
    if (!all && next >= 0) select(next);
    edit(null);
  };
  const reject = () => {
    update((r) => ({
      ...r,
      [field]: r[field].map((s, i) =>
        i === selected ? (reader ? 'Отклонено' : 'Возвращён черновик') : s,
      ),
      text: r.text.map((t, i) =>
        i !== selected
          ? t
          : !reader
            ? r.revisionBase[i]
            : r.proposals[i] === 'Подтверждено'
              ? (r.readerBase?.[i] ?? t)
              : t,
      ),
      latestAction: reader ? 'Предложение отклонено' : 'Черновик восстановлен',
    }));
    edit(null);
  };
  const exportJournal = () =>
    downloadCsv('reader-check.csv', [
      ['Фрагмент', 'Исходник', 'Текст книги', 'Предложение', 'Статус'],
      ...states.map((s, i) => [
        fragments[i],
        source[i],
        run.text[i],
        suggested[lang][i],
        s,
      ]),
    ]);
  return (
    <div className="adm-stack">
      <div className="adm-segment" aria-label="Вид проверки">
        <button aria-pressed={!reader} onClick={() => switchView('revision')}>
          Стилистическая редактура
        </button>
        <button aria-pressed={reader} onClick={() => switchView('reader')}>
          Читательская проверка
        </button>
      </div>
      <section className="adm-card">
        <div className="adm-section-title">
          <div>
            <h2>
              {reader ? 'Читательская проверка' : 'Стилистическая редактура'}
            </h2>
            <p>
              {reader
                ? 'Проверка находит трудные места в переводе. Предложения ждут вашего решения.'
                : 'Редактура сразу обновляет книгу. Сверьте изменения и при необходимости верните черновик.'}
            </p>
          </div>
          <span className="adm-pill">{phaseLabels[job.status]}</span>
        </div>
        <div className="adm-actions">
          {job.status === 'running' ? (
            <button className="adm-btn light" onClick={() => stop(kind)}>
              <Pause size={16} /> Остановить
            </button>
          ) : (
            <button
              className="adm-btn"
              disabled={run.jobs.translate.status !== 'done' || otherActive}
              onClick={() =>
                job.status === 'done' ? setConfirmRestart(true) : start(kind)
              }
            >
              <Play size={16} />
              {job.status === 'done'
                ? 'Запустить заново'
                : job.status === 'paused'
                  ? 'Продолжить'
                  : reader
                    ? 'Запустить проверку'
                    : 'Запустить редактуру'}
            </button>
          )}
          <label className="adm-inline">
            Модель{' '}
            <select
              value={run.models[kind]}
              disabled={job.status === 'running'}
              onChange={(e) =>
                update((r) => ({
                  ...r,
                  models: { ...r.models, [kind]: e.target.value },
                }))
              }
            >
              {['По умолчанию', 'Flash', 'Hydrogen'].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          {reader && states.length > 0 && (
            <button className="adm-btn light" onClick={exportJournal}>
              <Download size={16} /> Журнал CSV
            </button>
          )}
        </div>
        {run.jobs.translate.status !== 'done' && (
          <p className="adm-note">Доступно после готовности всех глав.</p>
        )}
        {(job.status === 'running' || job.status === 'paused') && (
          <div className="adm-meter">
            <progress value={job.done} max={total} />
            <small>
              {job.done} из {total} глав
            </small>
          </div>
        )}
        {confirmRestart && (
          <div
            className="adm-warning"
            role="group"
            aria-label="Подтверждение повторного запуска"
          >
            <strong>
              {reader
                ? 'Очистить журнал и проверить заново?'
                : 'Повторно проверить текущий текст?'}
            </strong>
            <p>
              {reader
                ? 'Решения в журнале будут заменены. Ранее принятые изменения останутся в тексте книги.'
                : 'Новый проход заменит результаты сравнения.'}
            </p>
            <button
              className="adm-btn"
              onClick={() => {
                start(kind, true);
                setConfirmRestart(false);
                edit(null);
                select(0);
              }}
            >
              Подтвердить запуск
            </button>{' '}
            <button
              className="adm-btn light"
              onClick={() => setConfirmRestart(false)}
            >
              Отмена
            </button>
          </div>
        )}
      </section>
      {states.length > 0 && job.status === 'done' && (
        <section className="adm-card">
          <div className="adm-section-title">
            <h2>{reader ? 'Журнал предложений' : 'Сравнение версий'}</h2>
            {pendingCount > 0 && (
              <button
                className="adm-link"
                disabled={editing !== null && !editing.trim()}
                onClick={() => apply(true)}
              >
                <CheckCheck size={16} /> Подтвердить все ({pendingCount})
              </button>
            )}
          </div>
          <div className="adm-review">
            <div className="adm-fragments">
              {states.map((s, i) => (
                <button
                  key={i}
                  onClick={() => pick(i)}
                  aria-pressed={selected === i}
                >
                  <strong>{fragments[i]}</strong>
                  <small>{s}</small>
                </button>
              ))}
            </div>
            <div className="adm-detail">
              <span className="adm-pill">{states[selected]}</span>
              <div>
                <small>Оригинал</small>
                <p>{source[selected]}</p>
              </div>
              <div>
                <small>
                  {reader ? 'Текущий перевод' : 'Черновик до редактуры'}
                </small>
                <p>
                  {reader ? run.text[selected] : run.revisionBase[selected]}
                </p>
              </div>
              <label className="adm-field">
                {reader ? 'Предложение' : 'Текст в книге'}
                <textarea
                  key={kind + selected}
                  readOnly={reader && states[selected] === 'Совпадает'}
                  value={displayed}
                  onChange={(e) => edit(e.target.value)}
                />
              </label>
              {reader && pending(states[selected]) && (
                <p className="adm-note">Попадёт в книгу после одобрения.</p>
              )}
              {(!reader || states[selected] !== 'Совпадает') && (
                <div className="adm-actions">
                  <button
                    disabled={!displayed.trim()}
                    className="adm-btn"
                    onClick={() => apply(false)}
                  >
                    {reader
                      ? 'Применить и продолжить'
                      : 'Сохранить и продолжить'}
                  </button>
                  <button className="adm-btn light" onClick={reject}>
                    {!reader && <RotateCcw size={15} />}{' '}
                    {reader ? 'Отклонить' : 'Вернуть черновик'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
