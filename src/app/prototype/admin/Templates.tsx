'use client';

import { CopyableTextarea } from '@/components/ui/copy-text';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import IOSSettingsRow from '@/components/ui/ios-settings-row';

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
    <Card className="block adm-card">
      <h2>Промпты направления RU → {lang}</h2>
      <p>
        Шаблон используется всеми книгами этого направления при следующем
        запуске.
      </p>
      <IOSSettingsRow
        label="Этап"
        value={stage}
        options={stages.map((id) => ({ id, label: stageLabels[id] }))}
        onChange={(value) => setStage(value as Stage)}
      />
      <Editor
        key={key}
        original={templates[stage]}
        saved={prompts[key] ?? templates[stage]}
        save={(v) => save(key, v)}
      />
      <div className="adm-foot">
        <Button variant="link" size="sm" onClick={back}>
          К настройке перевода →
        </Button>
      </div>
    </Card>
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
      <CopyableTextarea fieldClassName="adm-field" label="Текст шаблона"
        className="font-mono"
        rows={7}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setNotice('');
        }}
      />
      {missing.length > 0 && (
        <p role="alert">
          Добавьте обязательные подстановки: {missing.join(', ')}
        </p>
      )}
      <div className="adm-actions">
        <Button
          disabled={missing.length > 0 || value === saved}
          onClick={() => {
            save(value);
            setNotice('Шаблон сохранён');
          }}
        >
          Сохранить шаблон
        </Button>
        <Button
          variant="outline"
          disabled={value === saved}
          onClick={() => {
            setValue(saved);
            setNotice('Изменения отменены');
          }}
        >
          Отменить правки
        </Button>
        <Button
          variant="link"
          size="sm"
          onClick={() => {
            setValue(original);
            save(original);
            setNotice('Встроенный шаблон восстановлен');
          }}
        >
          Вернуть встроенный
        </Button>
      </div>
      <p className="adm-note" role="status">
        {notice}
      </p>
    </>
  );
}
