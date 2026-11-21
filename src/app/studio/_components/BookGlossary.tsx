'use client';

import { useState } from 'react';
import type { BookGlossary, GlossaryStatus } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import IOSSettingsRow from '@/components/ui/ios-settings-row';
import { downloadText } from '@/app/prototype/_components/downloads';
import { ActionFeedback, StageCard } from './BookStage';
import { bookEndpoint, bookPost, useBookAction, useBookData } from './bookRequests';

type Conflict = { source?: string; existing_target?: string; proposed_target?: string; chapter_index?: number };
type Glossary = GlossaryStatus & {
  frozen?: boolean; conflicts?: Conflict[];
  lastBuild?: { addedNamed?: unknown[]; addedTerms?: unknown[]; chaptersProcessed?: number } | null;
};

export function BookGlossaryPanel({ bookId, lang, books, models }: {
  bookId: string; lang: string; books: readonly { id: string; title: string | null }[]; models: readonly string[];
}) {
  const [source, setSource] = useState('');
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState('');
  const [reload, setReload] = useState(0);
  const action = useBookAction();
  const current = useBookData<Glossary>(bookEndpoint(bookId, 'generate-glossary', lang), action.version + reload);
  const data = current?.data, glossary = data?.glossary;
  const json = glossary ? JSON.stringify(glossary, null, 2) : '';
  const locked = !data || data.frozen || data.state === 'building' || action.busy;
  const entries = [
    ...(glossary?.terminology || []).map(t => ({ src: t.source_term, dst: t.preferred_translation, note: t.note })),
    ...(glossary?.named_entities || []).map(t => ({ src: t.entity, dst: t.preferred_target, note: t.note })),
  ];
  const visible = entries.filter(t => [t.src, t.dst].some(v => v?.toLocaleLowerCase().includes(filter.toLocaleLowerCase())));
  let parsed: BookGlossary | null = null, count = 0;
  if (draft.trim()) {
    try {
      const obj = JSON.parse(draft);
      const terms = (obj.terminology || []).filter((t: { source_term?: string; preferred_translation?: string }) => t?.source_term && t?.preferred_translation);
      const names = (obj.named_entities || []).filter((t: { entity?: string; preferred_target?: string }) => t?.entity && t?.preferred_target);
      count = terms.length + names.length;
      if (count > 0) parsed = obj;
    } catch { /* The validation message remains visible while the JSON is incomplete. */ }
  }

  function change(which: string, extra: object, message: string) {
    return action.run(async signal => {
      await bookPost(bookEndpoint(bookId, which, lang), { lang, ...extra }, signal);
      return message;
    });
  }
  return <div className="pt-stack">
    <Card className="p-5 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2>Глоссарий тома</h2><Button variant="ghost" onClick={() => setReload(v => v + 1)}>Обновить</Button></div>
      {current?.error ? <ActionFeedback error={current.error}/> : !data ? <p role="status">Загрузка глоссария…</p> : !glossary ? <p>Для этого языка глоссарий ещё не создан.</p> : <>
        <p className="pt-muted">{entries.length} записей · {data.frozen ? 'Заморожен' : 'Открыт для изменений'}</p>
        {data.lastBuild && <p>Последняя генерация добавила имён: {data.lastBuild.addedNamed?.length ?? 0}, терминов: {data.lastBuild.addedTerms?.length ?? 0}.</p>}
        <label className="pt-field">Найти запись<Input value={filter} onChange={e => setFilter(e.target.value)} /></label>
        <div className="max-h-80 overflow-auto" aria-label="Записи глоссария">{visible.map((t, i) => <div className="pt-row" key={i}><span>{t.src}</span><span>{t.dst}</span></div>)}{!visible.length && <p>Подходящих записей нет.</p>}</div>
        {!!data.conflicts?.length && <details><summary>Расхождения ({data.conflicts.length})</summary>{data.conflicts.map((c, i) => <p className="pt-row" key={i}>{c.source} · {c.existing_target} / {c.proposed_target}{c.chapter_index != null && ` · глава ${c.chapter_index + 1}`}</p>)}</details>}
        <details><summary>Полный JSON</summary><pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs">{json}</pre></details>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => downloadText(`glossary-${bookId}-${lang}.json`, json, 'application/json')}>Скачать JSON</Button>
          <Button variant="ghost" disabled={action.busy} onClick={() => void action.run(async () => { await navigator.clipboard.writeText(json); return 'Глоссарий скопирован.'; })}>Скопировать</Button>
          <Button variant="ghost" disabled={action.busy || data.state === 'building'} onClick={() => void change('glossary-freeze', { frozen: !data.frozen }, data.frozen ? 'Глоссарий разморожен.' : 'Глоссарий заморожен.')}>{data.frozen ? 'Разморозить' : 'Заморозить'}</Button>
        </div>
      </>}
      <ActionFeedback error={action.error} notice={action.notice}/>
    </Card>
    <Card className="p-5 gap-3">
      <h3>Источник словаря</h3>
      <IOSSettingsRow label="Начальный словарь" value={source} onChange={setSource} disabled={Boolean(locked)}
        options={[{ id: '', label: 'Без другой книги' }, ...books.filter(b => b.id !== bookId).map(b => ({ id: b.id, label: b.title || 'Книга без названия' }))]} />
      {source && <><p className="pt-muted">Нужен готовый словарь выбранной книги на том же языке. Можно перенести его целиком или использовать в начале новой генерации.</p><Button variant="outline" disabled={Boolean(locked)} onClick={() => {
        if (glossary && !window.confirm('Заменить словарь тома копией из выбранной книги?')) return;
        void change('copy-glossary', { sourceBookId: source }, 'Словарь перенесён.');
      }}>Перенести без генерации</Button></>}
      <details><summary>Импорт JSON</summary>
        <div className="grid gap-3 pt-3"><label className="pt-field">Словарь для полной замены<Textarea value={draft} onChange={e => setDraft(e.target.value)} rows={5} /></label>
          {draft && <p role="status">{parsed ? `Подготовлено записей: ${count}` : 'Нужен корректный JSON с парой исходного и переведённого имени или термина.'}</p>}
          <Button disabled={Boolean(locked) || !parsed} onClick={() => {
            if (!parsed || (glossary && !window.confirm('Заменить текущий глоссарий содержимым JSON?'))) return;
            void change('set-glossary', { glossary: parsed }, 'Словарь сохранён.');
          }}>Импортировать</Button></div>
      </details>
    </Card>
    <StageCard stage="glossary" bookId={bookId} lang={lang} sourceBookId={source} books={books} models={models} onChange={() => setReload(n => n + 1)} />
  </div>;
}
