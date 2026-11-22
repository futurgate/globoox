'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { RefreshButton } from './RequestFeedback';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CopyableText, CopyableTextarea } from '@/components/ui/copy-text';
import type { ReaderCheckJournal, RevisionDiffEntry } from '@/lib/api';
import { readerCheckJournalRows } from '@/lib/readerCheckJournalCsv';
import { downloadCsv } from '@/app/prototype/_components/downloads';
import { ActionFeedback } from './BookStage';
import { bookEndpoint, bookPost, useBookAction, useBookData } from './bookRequests';

type Revision = RevisionDiffEntry & { outcome?: string };
type ReviewItem = {
  id: string; label: string; before: string; after: string; original?: string;
  problem?: string; outcome: string; editable: boolean;
};
const outcomes: Record<string, string> = {
  proposed: 'На рассмотрении', fixed: 'Применено', approved: 'Подтверждено', applied: 'Уже применено',
  rejected: 'Отклонено', unmatched: 'Фрагмент не найден', skipped: 'Пропущено', unchanged: 'Без изменений',
};
function ReviewRow({ item, revision, onApply, busy }: {
  item: ReviewItem; revision: boolean; busy: boolean;
  onApply: (action: 'approve' | 'reject', text?: string) => void;
}) {
  const [text, setText] = useState(item.after);
  const reverted = item.outcome === 'rejected';
  return <details className="border-t border-[var(--app-border)] py-3">
    <summary>{item.label} · {outcomes[item.outcome] || item.outcome}</summary>
    <div className="grid gap-2 pt-3">
      {item.problem && <p>{item.problem}</p>}
      {item.original && <div><strong>Исходный фрагмент</strong><CopyableText as="p" label="Исходный фрагмент" text={item.original}/></div>}
      <div><strong>{revision ? 'Черновик перевода' : 'До правки'}</strong><CopyableText as="p" label={revision ? 'Черновик перевода' : 'До правки'} text={item.before}/></div>
      {item.editable ? <>
        <CopyableTextarea fieldClassName="pt-field" label={revision ? 'После редактуры' : 'Предложение'} value={text} onChange={e => setText(e.target.value)} rows={4} />
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy || !text.trim()} onClick={() => onApply('approve', text)}>{text !== item.after ? 'Применить свой вариант' : 'Подтвердить'}</Button>
          <Button variant="outline" disabled={busy || reverted} onClick={() => onApply('reject')}>{revision ? 'Вернуть черновик' : item.outcome === 'fixed' ? 'Отменить применённую правку' : 'Отклонить предложение'}</Button>
        </div>
      </> : item.after ? <CopyableText as="p" label="После правки" text={item.after}/> : null}
    </div>
  </details>;
}

type FocusBlock = { id: string; original: string; translated: string | null; chapterTitle: string | null; chapterNumber: number | null; position: number };

function FocusedBlock({bookId,lang}: {bookId: string; lang: string}) {
  const blockId = useSearchParams().get('block');
  const valid = blockId && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(blockId);
  const url = valid ? bookEndpoint(bookId, 'review-block', lang) + '&blockId=' + encodeURIComponent(blockId) : null;
  const result = useBookData<FocusBlock>(url);
  if (!blockId) return null;
  const block = result?.data;
  return <Card className="p-5 gap-2">
    <h2>Фрагмент, требующий решения</h2>
    {!valid || result?.error ? <p role="alert">{result?.error || 'Некорректная ссылка на фрагмент.'}</p> : !block ? <p role="status">Загрузка фрагмента…</p> : <>
      <p className="pt-muted">{block.chapterTitle || (block.chapterNumber != null ? 'Глава '+block.chapterNumber : 'Глава')} · блок {block.position}</p>
      <h3>Исходный текст</h3>{block.original ? <CopyableText as="p" label="Исходный текст" text={block.original}/> : <p>Текст отсутствует.</p>}
      <h3>Текущий перевод</h3>{block.translated ? <CopyableText as="p" label="Текущий перевод" text={block.translated}/> : <p>Для этого языка перевод блока ещё не записан.</p>}
    </>}
  </Card>;
}

export function BookReview({ bookId, lang }: { bookId: string; lang: string }) {
  const action = useBookAction();
  const [revision, setRevision] = useState(false);
  const [reload, setReload] = useState(0);
  const version = action.version + reload;
  const journal = useBookData<ReaderCheckJournal>(!revision ? bookEndpoint(bookId, 'reader-check-journal', lang) : null, version);
  const diff = useBookData<{entries: Revision[]}>(revision ? bookEndpoint(bookId, 'revision-diff', lang) : null, version);
  const current = revision ? diff : journal;
  const rows: ReviewItem[] = revision
    ? (diff?.data?.entries ?? []).map(r => ({ id: r.blockId, label: `Глава ${r.chapterNumber} · блок ${r.position}`,
        before: r.draft, after: r.revised, original: r.source, outcome: r.outcome || 'applied', editable: r.changed }))
    : (journal?.data?.items ?? []).map(r => ({ id: r.id, label: r.chapterTitle || `Глава ${r.chapterNumber ?? '—'}`,
        before: r.before || r.quote, after: r.after || '', problem: r.problem, outcome: r.outcome,
        editable: Boolean(r.blockId && r.after && ['fixed','proposed','rejected'].includes(r.outcome)) }));
  const pending = rows.filter(r => r.editable && r.outcome === 'proposed');
  const apply = (id: string, choice: 'approve' | 'reject', signal: AbortSignal, text?: string) => bookPost(
    bookEndpoint(bookId, revision ? 'revise-apply' : 'reader-check-apply', lang),
    { lang, ...(revision ? { blockId: id } : { itemId: id }), action: choice, ...(text !== undefined ? { editedText: text } : {}) }, signal,
  );
  return <div className="pt-stack"><Suspense fallback={null}><FocusedBlock bookId={bookId} lang={lang}/></Suspense><Card className="p-5 gap-3">
    <div className="flex flex-wrap justify-between gap-2"><h2>Решения по тексту</h2><RefreshButton pending={!current || current.refreshing} variant="ghost" onClick={() => setReload(v => v + 1)}>Обновить</RefreshButton></div>
    <div className="flex flex-wrap gap-2"><Button variant={revision ? 'outline' : 'default'} disabled={action.busy} onClick={() => setRevision(false)}>Читательская проверка</Button>
      <Button variant={revision ? 'default' : 'outline'} disabled={action.busy} onClick={() => setRevision(true)}>Стилистическая редактура</Button></div>
    <p className="pt-muted">{revision ? 'Стилистические правки уже записаны в перевод. Для каждого блока можно вернуть черновик.' : 'Предложения читательской проверки попадают в книгу после подтверждения.'}</p>
    <ActionFeedback pending={action.pending} error={current?.error || action.error} notice={action.notice}/>
    {!current && <p role="status">Загрузка журнала…</p>}
    {current?.data && !rows.length && <p>В журнале этого перевода пока нет записей.</p>}
    {!!rows.length && <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => {
        if (revision) {
          downloadCsv(`review-${bookId}-${lang}.csv`, [['Фрагмент','Статус','До','После'], ...rows.map(r => [r.label,r.outcome,r.before,r.after])]);
        } else if (journal?.data) {
          downloadCsv(`reader-check-${bookId}-${lang}.csv`, readerCheckJournalRows(journal.data.items));
        }
      }}>Скачать журнал CSV</Button>
      {pending.length > 0 && <Button variant="outline" disabled={action.busy} onClick={() => {
        if (!window.confirm(`Записать в книгу все предложенные правки (${pending.length})?`)) return;
        void action.run(async signal => {
          for (const item of pending) { signal.throwIfAborted(); await apply(item.id, 'approve', signal); }
          return 'Предложения применены.';
        });
      }}>Принять предложенные ({pending.length})</Button>}
    </div>}
    {rows.map(r => <ReviewRow key={[r.id,r.outcome,r.after].join(':')} item={r} revision={revision} busy={action.busy} onApply={(choice, text) => {
      void action.run(async signal => { await apply(r.id, choice, signal, text); return 'Решение сохранено.'; });
    }}/>)}
  </Card></div>;
}
