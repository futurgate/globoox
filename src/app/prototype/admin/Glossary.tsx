'use client';

import { CopyableTextarea } from '@/components/ui/copy-text';
import { Badge } from '@/components/ui/badge';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import IOSAlertDialog from '@/components/ui/ios-alert-dialog';
import IOSSettingsRow from '@/components/ui/ios-settings-row';

import { useState } from 'react';
import { Copy, LockKeyhole, Plus, Snowflake } from 'lucide-react';
import {
  modelOptions,
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
    <Card className="block adm-card">
      <div className="adm-section-title">
        <div>
          <h2>Глоссарий книги</h2>
          <p>Имена, термины и их написание для перевода на выбранный язык.</p>
        </div>
        <Badge variant="secondary">
          {run.frozen ? (
            <>
              <LockKeyhole size={13} /> Закреплён
            </>
          ) : (
            quantity(run.glossary.length, ['запись', 'записи', 'записей'])
          )}
        </Badge>
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
            <Button variant="outline" onClick={stop}>
              Остановить сборку
            </Button>
          ) : (
            <Button
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
            </Button>
          )}
          <Button
            variant="outline"
            disabled={blocked}
            onClick={() => {
              setMode('copy');
              setDonor(donors[0]?.id ?? '');
            }}
          >
            <Copy size={16} /> Из другой книги
          </Button>
          <Button
            variant="outline"
            disabled={blocked}
            onClick={() => {
              setMode('paste');
              setError('');
            }}
          >
            <Plus size={16} /> Вставить JSON
          </Button>
          {run.glossary.length > 0 && (
            <Button
              variant="link"
              size="sm"
              disabled={job.status === 'running'}
              onClick={() => update((r) => ({ ...r, frozen: !r.frozen }))}
            >
              <Snowflake size={16} />
              {run.frozen ? 'Разморозить' : 'Заморозить'}
            </Button>
          )}
        </div>
      )}
      <IOSSettingsRow
        label="Модель глоссария"
        value={run.models.glossary}
        options={modelOptions}
        disabled={blocked}
        onChange={(value) =>
          update((r) => ({ ...r, models: { ...r.models, glossary: value } }))
        }
      />
      <IOSAlertDialog
        open={reset && !blocked}
        onOpenChange={setReset}
        title="Пересобрать глоссарий с первой главы?"
        description="Текущий список будет заменён."
        showCancel
        destructive
        cancelLabel="Отмена"
        confirmLabel="Пересобрать"
        onConfirm={() => {
          start(true);
          setReset(false);
        }}
      />
      {mode === 'copy' && (
        <div className="adm-inset">
          <IOSSettingsRow
            label="Книга со словарём"
            value={donor}
            disabled={!donors.length || blocked}
            options={
              donors.length
                ? donors.map((b) => ({ id: b.id, label: b.title }))
                : [{ id: '', label: 'Нет готовых словарей для этого языка' }]
            }
            onChange={setDonor}
          />
          <div className="adm-actions">
            <Button
              disabled={!donor || blocked}
              onClick={() =>
                load(
                  db.runs[donor + '/' + lang].glossary.map((p) => ({ ...p })),
                )
              }
            >
              Скопировать записи
            </Button>
            <Button variant="link" size="sm" onClick={() => setMode('list')}>
              Отмена
            </Button>
          </div>
        </div>
      )}
      {mode === 'paste' && (
        <div className="adm-inset">
          <CopyableTextarea fieldClassName="adm-field" label="JSON глоссария"
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
          <p className="adm-note">Импорт заменит текущие записи.</p>
          {error && <p role="alert">{error}</p>}
          <div className="adm-actions">
            <Button disabled={!raw.trim() || blocked} onClick={paste}>
              Сохранить JSON
            </Button>
            <Button variant="link" size="sm" onClick={() => setMode('list')}>
              Отмена
            </Button>
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
        <Button variant="link" size="sm" onClick={next}>
          К настройкам перевода →
        </Button>
      </div>
    </Card>
  );
}
