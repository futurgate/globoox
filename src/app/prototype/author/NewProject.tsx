'use client';

import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Files,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { readAuthorRecipe, recipes } from './editor/config';
import {
  demoTitles,
  newVolume,
  openAuthor,
  updateProject,
  type Project,
} from './mock';

export type Draft = Pick<
  Project,
  'title' | 'source' | 'target' | 'genre' | 'units' | 'wishes'
> & {
  files: string[];
  series: boolean;
};
export const emptyDraft: Draft = {
  title: '',
  series: false,
  files: [],
  source: 'Русский',
  target: 'Английский',
  genre: 'ЛитРПГ',
  units: 'Метрические',
  wishes: '',
};
const baseName = (s: string) => s.replace(/\.epub$/i, '');
export function NewProject({
  step,
  draft,
  setDraft,
}: {
  step: string;
  draft: Draft;
  setDraft: (d: Draft) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const change = (d: Partial<Draft>) => {
    setError('');
    setDraft({ ...draft, ...d });
  };
  const add = (names: string[]) => {
    if (!names.length) return;
    if (names.some((n) => !/\.epub$/i.test(n))) {
      setError('Выберите файлы с расширением .epub.');
      return;
    }
    const files = draft.series
      ? [...new Set([...draft.files, ...names])]
      : [names[0]];
    change({ files });
  };
  const reorder = (index: number, offset: number) => {
    const files = [...draft.files];
    [files[index], files[index + offset]] = [
      files[index + offset],
      files[index],
    ];
    change({ files });
  };
  const chooseRecipe = (genre: string) => {
    const preset = recipes.find((r) => r.genre === genre);
    if (!preset) return;
    const settings = readAuthorRecipe(
      preset.genre,
      preset.source,
      preset.target,
    );
    change({
      genre: preset.genre,
      source: preset.source,
      target: preset.target,
      units: settings?.units || preset.units,
    });
  };
  const create = () => {
    if (!draft.files.length) {
      openAuthor('import');
      return;
    }
    const id = crypto.randomUUID();
    const snapshot = readAuthorRecipe(
      draft.genre,
      draft.source,
      draft.target,
      draft.series ? draft.title : undefined,
    );
    const p: Project = {
      id,
      recipeVersion: snapshot?.version,
      seedEntries: snapshot?.glossary,
      title: draft.title.trim() || baseName(draft.files[0]),
      source: draft.source,
      target: draft.target,
      units: draft.units,
      wishes: draft.wishes,
      genre: draft.genre,
      volumes: draft.files.map((file, i) => ({
        ...newVolume(baseName(file), i),
        file,
      })),
    };
    updateProject(p);
    openAuthor('overview', id);
  };
  return (
    <div className="au-form-area">
      <div className="au-steps" aria-label="Подготовка проекта">
        <button
          onClick={() => openAuthor('import')}
          aria-current={step === 'import' ? 'step' : undefined}
        >
          1. Исходные файлы
        </button>
        <span aria-hidden="true">→</span>
        <button
          disabled={!draft.files.length}
          onClick={() => openAuthor('recipe')}
          aria-current={step === 'recipe' ? 'step' : undefined}
        >
          2. Параметры перевода
        </button>
      </div>
      {step === 'import' ? (
        <>
          <section className="pt-panel au-form-panel">
            <h2>Что переводим?</h2>
            <div className="au-choice">
              <button
                className={!draft.series ? 'selected' : ''}
                onClick={() =>
                  change({ series: false, files: draft.files.slice(0, 1) })
                }
              >
                <BookOpen size={19} />
                Одну книгу
              </button>
              <button
                className={draft.series ? 'selected' : ''}
                onClick={() => change({ series: true })}
              >
                <Files size={19} />
                Серию
              </button>
            </div>
            <label className="au-label">
              {draft.series ? 'Название серии' : 'Название проекта'}
              <input
                placeholder={
                  draft.series ? 'Например, Хроники Севера' : 'Из имени файла'
                }
                value={draft.title}
                onChange={(e) => change({ title: e.target.value })}
              />
            </label>
            <input
              hidden
              ref={input}
              type="file"
              accept=".epub"
              multiple={draft.series}
              onChange={(e) => {
                add(Array.from(e.target.files || []).map((f) => f.name));
                e.target.value = '';
              }}
            />
            <div
              className="au-drop"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                add(Array.from(e.dataTransfer.files).map((f) => f.name));
              }}
            >
              <Upload size={24} />
              <strong>Добавьте исходный EPUB</strong>
              <small>В демо сохраняется только имя файла.</small>
              <button
                type="button"
                className="pt-btn secondary"
                onClick={() => input.current?.click()}
              >
                Выбрать {draft.series ? 'файлы' : 'файл'}
              </button>
            </div>
            <button
              className="au-text-button"
              onClick={() =>
                add(
                  (draft.series ? demoTitles : [demoTitles[0]]).map(
                    (s) => s + '.epub',
                  ),
                )
              }
            >
              <Plus size={15} /> Использовать демо-файлы
            </button>
          </section>
          {draft.files.length > 0 && (
            <section className="pt-panel au-form-panel">
              <h2>{draft.series ? 'Порядок томов' : 'Файл книги'}</h2>
              {draft.series && (
                <p className="au-muted">
                  Каждый том наследует проверенный словарь предыдущего.
                </p>
              )}
              {draft.files.map((name, i) => (
                <div className="au-file" key={name}>
                  <span className="au-number">{i + 1}</span>
                  <strong>{name}</strong>
                  <div className="au-mini-actions">
                    {draft.series && (
                      <>
                        <button
                          title="Выше"
                          aria-label={'Поднять ' + name}
                          disabled={!i}
                          onClick={() => reorder(i, -1)}
                        >
                          <ArrowUp size={17} />
                        </button>
                        <button
                          title="Ниже"
                          aria-label={'Опустить ' + name}
                          disabled={i === draft.files.length - 1}
                          onClick={() => reorder(i, 1)}
                        >
                          <ArrowDown size={17} />
                        </button>
                      </>
                    )}
                    <button
                      title="Удалить"
                      aria-label={'Удалить ' + name}
                      onClick={() =>
                        change({ files: draft.files.filter((f) => f !== name) })
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}
          {error && (
            <p role="alert" className="au-error">
              {error}
            </p>
          )}
          <button
            className="pt-btn"
            disabled={!draft.files.length}
            onClick={() => openAuthor('recipe')}
          >
            Настроить перевод →
          </button>
        </>
      ) : (
        <>
          <section className="pt-panel au-form-panel">
            <h2>{draft.title || baseName(draft.files[0] || 'Новая книга')}</h2>
            <label className="au-label">
              Направление и жанр
              <select
                value={draft.genre}
                onChange={(e) => chooseRecipe(e.target.value)}
              >
                {recipes.map((r) => (
                  <option value={r.genre} key={r.id}>
                    {r.genre} · {r.source} → {r.target}
                  </option>
                ))}
              </select>
            </label>
            <label className="au-label">
              Единицы измерения
              <select
                value={draft.units}
                onChange={(e) => change({ units: e.target.value })}
              >
                <option>Метрические</option>
                <option>Оставить как в оригинале</option>
              </select>
            </label>
            <label className="au-label">
              Ваши пожелания
              <textarea
                value={draft.wishes}
                onChange={(e) => change({ wishes: e.target.value })}
                placeholder="Например, сохранить короткие реплики и иронию рассказчика"
                rows={3}
              />
            </label>
          </section>
          <div className="pt-panel au-estimate">
            <div>
              <strong>Оценка для проекта</strong>
              <small>Демонстрационный расчёт · {draft.files.length} EPUB</small>
            </div>
            <b>
              ${(draft.files.length * 3.8).toFixed(2)}–
              {(draft.files.length * 4.6).toFixed(2)}
            </b>
          </div>
          <div className="au-actions">
            <button className="pt-btn" onClick={create}>
              Начать подготовку
            </button>
            <button
              className="pt-btn secondary"
              onClick={() => openAuthor('import')}
            >
              Назад к файлам
            </button>
          </div>
        </>
      )}
    </div>
  );
}
