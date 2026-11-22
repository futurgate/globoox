'use client';

import { useId, useState } from 'react';
import type { GlossaryStatus } from '@/lib/api';
import IOSDialog from '@/components/ui/ios-dialog';
import { X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import IOSSettingsRow from '@/components/ui/ios-settings-row';
import { downloadText } from '@/app/prototype/_components/downloads';
import type { GlossaryDocument } from '@/lib/studioGlossaryDraft';
import { ActionFeedback, StageCard } from './BookStage';
import { bookEndpoint, bookPost, useBookAction, useBookData } from './bookRequests';
import { GlossaryEditor } from './GlossaryEditor';
import { StageTemplateList } from './StageTemplateLinks';
import { StudioEntityMenu, type StudioMenuAction } from './StudioEntityMenu';
import { RefreshButton } from './RequestFeedback';

type Glossary = Omit<GlossaryStatus,'updatedAt'|'glossary'> & {
  glossary: unknown; updatedAt?: string | null;
  lastBuild?: { addedNamed?: unknown[]; addedTerms?: unknown[]; chaptersProcessed?: number } | null;
};

export function BookGlossaryPanel({ bookId, lang, books, models, admin, sourceLang, downloadOriginal, title = 'Глоссарий тома' }: {
  bookId: string; lang: string; books: readonly { id: string; title: string | null }[]; models: readonly string[]; admin: boolean; title?: string;
  sourceLang?: string; downloadOriginal?: StudioMenuAction;
}) {
  const [showTemplate, setShowTemplate] = useState(false);
  const templateTitle = useId();
  const [source, setSource] = useState('');
  const [dirty, setDirty] = useState(false);
  const [reload, setReload] = useState(0);
  const action = useBookAction();
  const current = useBookData<Glossary>(bookEndpoint(bookId,'generate-glossary',lang), action.version + reload);
  // Keep the committed snapshot mounted if a background refresh fails while the user is typing.
  const [seen, setSeen] = useState<Glossary>();
  const [data, setData] = useState<Glossary>();
  if (current?.data && seen !== current.data) {
    setSeen(current.data);
    setData(current.data);
  }
  const building = data?.state === 'building' || data?.state === 'pending';
  const locked = !data || building || action.busy || dirty;

  async function save(glossary: GlossaryDocument, expectedUpdatedAt: string | null, signal: AbortSignal) {
    try {
      const response = await bookPost(bookEndpoint(bookId, 'set-glossary', lang), { lang, glossary, expectedUpdatedAt }, signal);
      const result = await response.json() as Glossary;
      signal.throwIfAborted();
      setData(previous => previous && { ...previous, ...result, frozen: result.frozen ?? false });
    } finally {
      if (!signal.aborted) setReload(n => n + 1);
    }
  }
  function change(which: string, extra: object, message: string) {
    void action.run(async signal => {
      await bookPost(bookEndpoint(bookId, which, lang), { lang, ...extra }, signal);
      return message;
    });
  }

  const actions: StudioMenuAction[] = [];
  if (admin && sourceLang) actions.push({ label: 'Шаблон глоссария', onClick: () => setShowTemplate(true) });
  if (data?.glossary != null) {
    actions.push({ label: 'Скачать сохранённый JSON', onClick: () =>
      downloadText(`glossary-${bookId}-${lang}.json`, JSON.stringify(data.glossary, null, 2), 'application/json') });
    if (admin) actions.push({
      label: data.frozen ? 'Разморозить' : 'Заморозить', disabled: locked,
      onClick: () => change('glossary-freeze', { frozen: !data.frozen }, data.frozen ? 'Глоссарий разморожен.' : 'Глоссарий заморожен.'),
    });
  }
  if (downloadOriginal) actions.push(downloadOriginal);

  return <div className="pt-stack">
    {showTemplate && admin && sourceLang && <IOSDialog open onOpenChange={setShowTemplate} labelledBy={templateTitle} className="p-5">
      <div className="flex items-center justify-between gap-2"><h2 id={templateTitle}>Шаблон глоссария</h2>
        <Button variant="ghost" size="icon-sm" aria-label="Закрыть шаблон" onClick={() => setShowTemplate(false)}><X aria-hidden/></Button></div>
      <StageTemplateList glossaryOnly bookId={bookId} lang={lang} sourceLang={sourceLang}/>
    </IOSDialog>}
    <Card className="min-w-0 gap-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2>{title}</h2>
        <StudioEntityMenu label="Действия с глоссарием" inHeader actions={actions}/>
        <RefreshButton pending={!current || current.refreshing} disabled={action.busy} variant="ghost" onClick={() => setReload(v => v + 1)}>Обновить</RefreshButton></div>
      <ActionFeedback error={current?.error}/>
      {!data && !current?.error && <p role="status">Загрузка глоссария…</p>}
      {data && <>
        {!data.glossary && <p className="pt-muted">Для этого языка пока нет сохранённого глоссария.</p>}
        {data.lastBuild && <p className="pt-muted text-sm">Последняя генерация добавила имён: {data.lastBuild.addedNamed?.length ?? 0}, терминов: {data.lastBuild.addedTerms?.length ?? 0}.</p>}
        <GlossaryEditor bookId={bookId} lang={lang} glossary={data.glossary} updatedAt={data.updatedAt ?? null}
          frozen={!!data.frozen} locked={building || action.busy} onSave={save} onDirtyChange={setDirty}/>
      </>}
      <ActionFeedback pending={action.pending} error={action.error} notice={action.notice}/>
    </Card>
    {admin && <>
      <Card className="gap-3 p-5"><h3>Источник словаря</h3>
        <IOSSettingsRow label="Начальный словарь" value={source} onChange={setSource} disabled={locked || data?.frozen}
          options={[{ id:'',label:'Без другой книги' }, ...books.filter(b => b.id !== bookId).map(b => ({ id:b.id,label:b.title || 'Книга без названия' }))]}/>
        {source && <><p className="pt-muted">Готовый словарь своей книги на том же языке можно перенести целиком или использовать в начале генерации.</p>
          <Button variant="outline" disabled={locked || data?.frozen} onClick={() => {
            if (data?.glossary && !window.confirm('Заменить словарь тома копией из выбранной книги?')) return;
            change('copy-glossary',{ sourceBookId:source },'Словарь перенесён.');
          }}>Перенести без генерации</Button></>}
      </Card>
      {dirty && <p className="pt-muted">Сначала сохраните изменения глоссария.</p>}
      <fieldset disabled={dirty} className="min-w-0"><StageCard stage="glossary" bookId={bookId} lang={lang} sourceBookId={source}
        books={books} models={models} onChange={() => setReload(n => n + 1)}/></fieldset>
    </>}
  </div>;
}
