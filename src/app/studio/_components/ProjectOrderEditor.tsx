'use client';

import { useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WorkspaceBook } from '@/lib/translationWorkspaceTypes';
import { StudioDraftActions, withStudioDraftGuard } from './StudioDraftActions';
import { PendingText } from './RequestFeedback';

type Props = {
  books: WorkspaceBook[]; revision: number; busy: boolean; error: string;
  onSave: (bookIds: string[], revision: number) => void; onClose: () => void;
};

function MovableBook({ book, position, busy, shift }: {
  book: WorkspaceBook; position: number; busy: boolean; shift: (offset: number) => void;
}) {
  const controls = useDragControls();
  return <Reorder.Item value={book.id} dragListener={false} dragControls={controls}
    className="flex items-center gap-3 border-t bg-[var(--app-surface-bg)] px-4 py-2">
    <Button type="button" variant="ghost" size="icon" disabled={busy}
      aria-label={'Переместить «' + book.title + '», позиция ' + position}
      className="touch-none cursor-grab active:cursor-grabbing"
      onPointerDown={e => controls.start(e)} onKeyDown={e => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault(); shift(e.key === 'ArrowDown' ? 1 : -1);
      }}><GripVertical aria-hidden/></Button>
    <span className="tabular-nums pt-muted">{position}.</span><span>{book.title}</span>
  </Reorder.Item>;
}

export function ProjectOrderEditor({ books, revision, busy, error, onSave, onClose }: Props) {
  const [initial] = useState(() => ({ books, revision }));
  const [order, setOrder] = useState(() => initial.books.map(book => book.id));
  const byId = new Map(initial.books.map(book => [book.id, book]));
  const firstChange = order.findIndex((id,index) => id !== initial.books[index].id);
  const dirty = firstChange >= 0;
  const changedElsewhere = initial.revision !== revision;
  function shift(id: string, offset: number) {
    if (busy) return;
    const from = order.indexOf(id), to = from + offset;
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    [next[from], next[to]] = [next[to], next[from]];
    setOrder(next);
  }
  return <>
    <div className="grid gap-2 px-4 pb-4">
      <div className="pt-callout" role="note">Глоссарий собирается по книгам сверху вниз. Перетаскивайте за ручку или используйте клавиши ↑ и ↓. Новый порядок применяется к следующим запускам.</div>
      {dirty && <p className="text-sm" role="status">Изменение затрагивает цепочку глоссариев с позиции {firstChange+1} — «{byId.get(order[firstChange])?.title}». Для готовых словарей следующих книг может понадобиться обновление.</p>}
      {changedElsewhere && <p role="alert">Очередь уже изменилась. Выйдите из режима и откройте актуальный порядок.</p>}
      {busy && <PendingText>Сохраняем порядок книг…</PendingText>}
      <Button className="justify-self-start" variant="ghost" size="sm" disabled={busy}
        onClick={() => withStudioDraftGuard(onClose)}>Выйти из режима</Button>
    </div>
    <Reorder.Group axis="y" values={order} onReorder={busy ? () => {} : setOrder} aria-label="Порядок перевода книг">
      {order.map((id,index) => <MovableBook key={id} book={byId.get(id)!} position={index+1} busy={busy} shift={offset => shift(id,offset)}/>)}
    </Reorder.Group>
    <StudioDraftActions dirty={dirty} busy={busy} disabled={changedElsewhere} error={error} saveLabel="Сохранить порядок"
      onReset={() => setOrder(initial.books.map(book => book.id))} onSave={() => onSave(order, initial.revision)}/>
  </>;
}
