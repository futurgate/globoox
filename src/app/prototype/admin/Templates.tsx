'use client';

import { useState } from 'react';
import { stageLabels, stages, templates, type Lang, type Stage } from './model';

export function Templates({
  lang,
  prompts,
  save,
  back,
}: {
  lang: Lang;
  prompts: Record<string, string>;
  save: (key: string, v: string) => void;
  back: () => void;
}) {
  const [stage, setStage] = useState<Stage>('translate');
  const key = lang + '/' + stage;
  return (
    <section className="adm-card">
      <h2>Промпты направления RU → {lang}</h2>
      <p>
        Шаблон используется всеми книгами этого направления при следующем
        запуске.
      </p>
      <label className="adm-field">
        Этап
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value as Stage)}
        >
          {stages.map((s) => (
            <option key={s} value={s}>
              {stageLabels[s]}
            </option>
          ))}
        </select>
      </label>
      <Editor
        key={key}
        original={templates[stage]}
        saved={prompts[key] ?? templates[stage]}
        save={(v) => save(key, v)}
      />
      <div className="adm-foot">
        <button className="adm-link" onClick={back}>
          К настройке перевода →
        </button>
      </div>
    </section>
  );
}
function Editor({
  original,
  saved,
  save,
}: {
  original: string;
  saved: string;
  save: (v: string) => void;
}) {
  const [value, setValue] = useState(saved);
  const [notice, setNotice] = useState('');
  const missing = (original.match(/\{[A-Z_]+\}/g) ?? []).filter(
    (token) => !value.includes(token),
  );
  return (
    <>
      <label className="adm-field">
        Текст шаблона
        <textarea
          className="adm-code"
          rows={7}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setNotice('');
          }}
        />
      </label>
      {missing.length > 0 && (
        <p role="alert">
          Добавьте обязательные подстановки: {missing.join(', ')}
        </p>
      )}
      <div className="adm-actions">
        <button
          className="adm-btn"
          disabled={missing.length > 0 || value === saved}
          onClick={() => {
            save(value);
            setNotice('Шаблон сохранён');
          }}
        >
          Сохранить шаблон
        </button>
        <button
          className="adm-btn light"
          disabled={value === saved}
          onClick={() => {
            setValue(saved);
            setNotice('Изменения отменены');
          }}
        >
          Отменить правки
        </button>
        <button
          className="adm-link"
          onClick={() => {
            setValue(original);
            save(original);
            setNotice('Встроенный шаблон восстановлен');
          }}
        >
          Вернуть встроенный
        </button>
      </div>
      <p className="adm-note" role="status">
        {notice}
      </p>
    </>
  );
}
