'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  ArrowDownToLine,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  LockKeyhole,
} from 'lucide-react';
import { downloadDemoEpub, downloadText } from '../_components/downloads';
import {
  flowFor,
  openAuthor,
  type Phase,
  type Project,
  type Volume,
} from './mock';
import mapArt from './assets/northern-map.webp';
import cover from './assets/northern-archive.webp';

type Props = {
  view: string;
  p: Project;
  v: Volume;
  save: (v: Volume) => void;
  saveProject: (p: Project) => void;
};
const termTranslations = {
  Английский: ['Northern Reach', 'North Frontier'],
  Французский: ['Marche du Nord', 'Frontière du Nord'],
  Русский: ['Северный предел', 'Северный рубеж'],
};
const sourceTerm = (p: Project) =>
  p.source === 'Русский' ? 'Северный предел' : 'Northern Reach';
const originalSample = (p: Project) =>
  p.source === 'Русский'
    ? 'К вечеру температура упала до −10 °C.'
    : 'By nightfall the temperature had dropped to 14 °F.';
function correctionSample(p: Project) {
  const temp =
    p.units === 'Метрические'
      ? '−10 °C'
      : p.source === 'Русский'
        ? '−10 °C'
        : '14 °F';
  return p.target === 'Русский'
    ? 'К вечеру температура упала до ' + temp + '.'
    : p.target === 'Французский'
      ? 'Le soir, la température était descendue à ' + temp + '.'
      : 'By nightfall the temperature had dropped to ' + temp + '.';
}
function report(p: Project, v: Volume) {
  const body = [
    v.edition,
    'Отчёт о демонстрационной сборке',
    p.source + ' → ' + p.target,
    'Автор: ' + v.creator,
    'Жанр: ' + p.genre,
    'Единицы: ' + p.units,
    'Пожелания: ' + (p.wishes || '—'),
    'Термин: ' + sourceTerm(p) + ' → ' + v.term,
    'Сохранённый фрагмент: ' + v.correction,
    'Надпись: ' + v.caption,
    'Проверки: полнота текста, единицы, иллюстрации, связь сноски. Сборка подтверждена.',
    'Словарь $0.72 · Перевод $3.08 · Проверки $0.30. Всего $4.10.',
  ].join('\n');
  downloadText('Отчёт — ' + v.title + '.txt', body);
}
export function BookTask({ view, p, v, save, saveProject }: Props) {
  const variants =
    termTranslations[p.target as keyof typeof termTranslations] ||
    termTranslations.Английский;
  const [term, setTerm] = useState(
    v.term ||
      p.seriesTerm ||
      p.volumes[p.volumes.indexOf(v) - 1]?.term ||
      p.seedEntries?.find((entry) => entry.source === sourceTerm(p))?.target ||
      variants[0],
  );
  const [edit, setEdit] = useState<Volume>({ ...v });
  const [correct, setCorrect] = useState(v.correction || correctionSample(p));
  const [caption, setCaption] = useState(v.caption || v.term || variants[0]);
  const [selected, setSelected] = useState<string[]>([v.id]);
  const [fixed, setFixed] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [note, setNote] = useState('');
  const [art, setArt] = useState<'map' | 'cover'>('map');
  const go = (screen: string) => openAuthor(screen, p.id, v.id);
  const next = (phase: Phase, data: Partial<Volume> = {}) => {
    const updated = { ...v, ...data, phase };
    save(updated);
    flowFor(p, updated);
  };
  if (view === 'term')
    return (
      <section className="pt-panel au-form-panel">
        <span className="au-badge warning">Требует решения</span>
        <h2>{sourceTerm(p)}</h2>
        <p className="au-muted">
          Название пограничной области встретилось в тексте тома. Выберите
          единый вариант написания.
        </p>
        <blockquote>
          {p.source === 'Русский'
            ? '«К вечеру мы достигли Северного предела».'
            : '“By nightfall we had reached the Northern Reach.”'}
        </blockquote>
        <fieldset className="au-radio-group">
          <legend>Перевод термина</legend>
          {variants.map((option) => (
            <label key={option}>
              <input
                type="radio"
                name="term"
                checked={term === option}
                onChange={() => setTerm(option)}
              />
              {option}
            </label>
          ))}
        </fieldset>
        <label className="au-label">
          Свой вариант
          <input value={term} onChange={(e) => setTerm(e.target.value)} />
        </label>
        <button
          className="pt-btn"
          disabled={!term.trim()}
          onClick={() => next('card', { term: term.trim() })}
        >
          Утвердить для {p.volumes.length > 1 ? 'серии' : 'книги'}
        </button>
      </section>
    );
  if (view === 'card')
    return (
      <section className="pt-panel au-form-panel">
        <div className="au-card-fields">
          <Image
            src={cover}
            alt="Пример обложки демоиздания"
            className="au-cover"
          />
          <div>
            <h2>Данные издания</h2>
            <label className="au-label">
              Название на языке перевода
              <input
                value={edit.edition}
                onChange={(e) => setEdit({ ...edit, edition: e.target.value })}
              />
            </label>
            <label className="au-label">
              Автор
              <input
                value={edit.creator}
                onChange={(e) => setEdit({ ...edit, creator: e.target.value })}
              />
            </label>
          </div>
        </div>
        <label className="au-label">
          Аннотация
          <textarea
            placeholder="Краткое описание издания"
            value={edit.description}
            rows={3}
            onChange={(e) => setEdit({ ...edit, description: e.target.value })}
          />
        </label>
        <label className="au-label">
          Порядок страниц
          <select
            value={edit.order}
            onChange={(e) => setEdit({ ...edit, order: e.target.value })}
          >
            <option>Титул → Аннотация → Оглавление</option>
            <option>Титул → Оглавление → Аннотация</option>
          </select>
        </label>
        <button
          className="pt-btn"
          disabled={!edit.edition.trim() || !edit.creator.trim()}
          onClick={() =>
            next('queue', {
              edition: edit.edition.trim(),
              creator: edit.creator.trim(),
              description: edit.description,
              order: edit.order,
            })
          }
        >
          Подтвердить карточку
        </button>
      </section>
    );
  if (view === 'review')
    return (
      <section className="pt-panel au-form-panel">
        <span className="au-badge warning">
          <CircleAlert size={15} /> Подготовка приостановлена
        </span>
        <h2>Проверить единицы измерения</h2>
        <p className="au-muted">
          Глава 1 · Фрагмент 6. Выбранное правило — «{p.units}».
        </p>
        <div className="au-quote">
          <small>Оригинал</small>
          <p>{originalSample(p)}</p>
        </div>
        <label className="au-label">
          Текст для издания
          <textarea
            rows={3}
            value={correct}
            onChange={(e) => setCorrect(e.target.value)}
          />
        </label>
        <details className="au-details">
          <summary>Повторить перевод фрагмента</summary>
          <label className="au-label">
            Причина повтора
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Согласовать единицы измерения"
            />
          </label>
          <button
            className="pt-btn secondary"
            disabled={!note.trim() || v.retry}
            onClick={() => {
              save({ ...v, retry: true });
              setCorrect(correctionSample(p));
            }}
          >
            {v.retry ? 'Повтор выполнен' : 'Повторить один раз'}
          </button>
        </details>
        <button
          className="pt-btn"
          disabled={!correct.trim()}
          onClick={() => next('materials', { correction: correct.trim() })}
        >
          Сохранить и продолжить
        </button>
      </section>
    );
  if (view === 'impact')
    return (
      <section className="pt-panel au-form-panel">
        <h2>Применение словарной правки</h2>
        <p className="au-muted">
          Обновите термин в выбранных томах. Фрагмент с ручной правкой останется
          в авторской редакции.
        </p>
        <label className="au-label">
          Новое написание
          <input value={term} onChange={(e) => setTerm(e.target.value)} />
        </label>
        <fieldset className="au-radio-group">
          <legend>Тома с переведёнными вхождениями</legend>
          {p.volumes
            .filter((b) => b.term)
            .map((b) => (
              <label key={b.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(b.id)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, b.id]
                        : selected.filter((i) => i !== b.id),
                    )
                  }
                />
                {b.title} · глава 1
              </label>
            ))}
        </fieldset>
        <div className="au-protection">
          <LockKeyhole size={16} /> Ручная правка в главе 2 защищена
        </div>
        <button
          className="pt-btn"
          disabled={!term.trim() || !selected.length}
          onClick={() => {
            saveProject({
              ...p,
              seriesTerm: term.trim(),
              volumes: p.volumes.map((b) =>
                selected.includes(b.id)
                  ? {
                      ...b,
                      term: term.trim(),
                      caption: b.caption === b.term ? term.trim() : b.caption,
                    }
                  : b,
              ),
            });
            go('dictionary');
          }}
        >
          Обновить выбранные
        </button>
      </section>
    );
  if (view === 'materials')
    return (
      <section className="pt-panel au-form-panel">
        <h2>Материалы издания</h2>
        <div className="au-choice">
          <button
            onClick={() => setArt('map')}
            className={art === 'map' ? 'selected' : ''}
          >
            Иллюстрация
          </button>
          <button
            onClick={() => setArt('cover')}
            className={art === 'cover' ? 'selected' : ''}
          >
            Обложка
          </button>
        </div>
        {art === 'map' ? (
          <div className="au-map-pair">
            {[sourceTerm(p), caption].map((label, i) => (
              <figure key={i}>
                <figcaption>{i ? 'Перевод' : 'Оригинал'}</figcaption>
                <div className="au-map">
                  <Image src={mapArt} alt="Карта северной области" />
                  <span>{label}</span>
                </div>
              </figure>
            ))}
          </div>
        ) : (
          <div className="au-card-fields">
            <Image
              src={cover}
              className="au-cover"
              alt="Пример оформления обложки"
            />
            <div>
              <small>Данные карточки</small>
              <h3>{v.edition}</h3>
              <p>{v.creator}</p>
            </div>
          </div>
        )}
        <label className="au-label">
          Надпись на карте
          <input value={caption} onChange={(e) => setCaption(e.target.value)} />
        </label>
        <p className="au-muted">В словаре издания: {v.term}.</p>
        <button
          className="pt-btn"
          disabled={!caption.trim()}
          onClick={() => next('preflight', { caption: caption.trim() })}
        >
          Подтвердить материалы и собрать EPUB
        </button>
      </section>
    );
  if (view === 'preflight')
    return (
      <section className="pt-panel au-form-panel">
        <span className="au-badge warning">
          <CircleAlert size={15} /> Сборка приостановлена
        </span>
        <h2>Не найдена цель сноски</h2>
        <div className="au-check">
          <CheckCircle2 />
          Текст и единицы проверены
        </div>
        <div className="au-check">
          <CheckCircle2 />
          Обложка и иллюстрация готовы
        </div>
        <p>
          В главе 2 знак сноски ведёт к отсутствующему примечанию. В исходном
          EPUB найдено подходящее примечание 3.
        </p>
        <label className="au-toggle">
          <input
            type="checkbox"
            checked={fixed}
            onChange={(e) => setFixed(e.target.checked)}
          />{' '}
          Связать с примечанием 3
        </label>
        <button
          className="pt-btn"
          disabled={!fixed}
          onClick={() => next('ready')}
        >
          Исправить и пересобрать
        </button>
      </section>
    );
  if (view === 'ready')
    return (
      <section className="pt-panel au-form-panel">
        <span className="au-badge saved">
          <CheckCircle2 size={15} /> Проверка EPUB пройдена
        </span>
        <div className="au-card-fields">
          <Image
            src={cover}
            className="au-cover"
            alt="Пример обложки издания"
          />
          <div>
            <h2>{v.edition}</h2>
            <p>{v.creator}</p>
            <p className="au-muted">
              {p.source} → {p.target} · EPUB
            </p>
          </div>
        </div>
        <div className="au-metrics">
          {[
            ['Словарь', '$0,72'],
            ['Перевод', '$3,08'],
            ['Проверки', '$0,30'],
            ['Итого', '$4,10'],
          ].map(([l, x]) => (
            <div key={l}>
              <small>{l}</small>
              <strong>{x}</strong>
            </div>
          ))}
        </div>
        <div className="au-actions">
          <button
            className="pt-btn"
            onClick={async () => {
              try {
                await downloadDemoEpub(
                  v.edition,
                  [v.correction, v.caption].filter(Boolean),
                  p.target === 'Русский'
                    ? 'ru'
                    : p.target === 'Французский'
                      ? 'fr'
                      : 'en',
                );
              } catch {
                setDownloadError(
                  'Не удалось скачать файл. Попробуйте ещё раз.',
                );
              }
            }}
          >
            <ArrowDownToLine size={18} />
            Скачать EPUB
          </button>
          <button className="pt-btn secondary" onClick={() => report(p, v)}>
            Скачать отчёт
          </button>
        </div>
        {downloadError && <p role="alert">{downloadError}</p>}
        <button className="au-text-button" onClick={() => go('overview')}>
          <BookOpen size={16} /> Вернуться к проекту
        </button>
      </section>
    );
  return null;
}
