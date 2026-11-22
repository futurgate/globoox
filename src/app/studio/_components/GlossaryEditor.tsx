'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { Expand, TriangleAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CopyableTextarea } from '@/components/ui/copy-text';
import IOSDialog from '@/components/ui/ios-dialog';
import IOSAlertDialog from '@/components/ui/ios-alert-dialog';
import { emptyGlossary, inspectGlossary, type GlossaryDocument, type GlossaryRow } from '@/lib/studioGlossaryDraft';
import { GlossaryTable } from './GlossaryTable';
import { StudioJsonDiagnostic } from './StudioJsonDiagnostic';
import { GlossaryTermUsage } from './GlossaryTermUsage';
import { StudioDraftActions } from './StudioDraftActions';
import { ActionFeedback } from './BookStage';
import { useBookAction } from './bookRequests';

type Draft = { raw: string; base: string; expectedAt: string | null; lastGood?: GlossaryDocument };
type Props = {
  bookId: string; lang: string; glossary: unknown; updatedAt: string | null; frozen: boolean; locked: boolean;
  onSave: (doc: GlossaryDocument, expectedAt: string | null, signal: AbortSignal) => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
};

export function GlossaryEditor({ bookId, lang, glossary, updatedAt, frozen, locked, onSave, onDirtyChange }: Props) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [modal, setModal] = useState(false);
  const [discardModal, setDiscardModal] = useState(false);
  const [onOpening, setOnOpening] = useState<Draft | null>(null);
  const [tab, setTab] = useState<'table'|'json'>('table');
  const [usage, setUsage] = useState<GlossaryRow | null>(null);
  const action = useBookAction();
  const [showSaveFeedback, setShowSaveFeedback] = useState(false);
  const id = useId();
  const savedRaw = useMemo(() => JSON.stringify(glossary ?? emptyGlossary, null, 2), [glossary]);
  const raw = draft?.raw ?? savedRaw;
  const { doc, issue } = useMemo(() => inspectGlossary(raw), [raw]);
  const dirty = Boolean(draft && raw !== draft.base);
  const stale = Boolean(draft && draft.expectedAt !== updatedAt);
  const cannotEdit = locked || action.busy;
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);

  function update(rawText: string) {
    setShowSaveFeedback(false);
    const base = draft?.base ?? savedRaw;
    if (rawText === base) { setDraft(null); return; }
    setDraft({ raw:rawText, base, expectedAt: draft ? draft.expectedAt : updatedAt, lastGood: doc && !issue ? doc : draft?.lastGood });
  }
  function closeModal() {
    if (action.busy) return;
    if (dirty && draft?.raw !== onOpening?.raw) {
      setDiscardModal(true);
      return;
    }
    setModal(false);
  }
  function showIssue() {
    setTab('json');
    requestAnimationFrame(() => {
      const el = document.getElementById(id + '-json');
      if (!(el instanceof HTMLTextAreaElement)) return;
      el.focus();
      if (issue?.offset != null) el.setSelectionRange(issue.offset, Math.min(raw.length, issue.offset + 1));
    });
  }
  const save = () => {
    if (!draft || !doc || issue || stale || cannotEdit) return;
    setShowSaveFeedback(true);
    void action.run(async signal => {
      await onSave(doc, draft.expectedAt, signal);
      if (!signal.aborted) { setDraft(null); setOnOpening(null); }
      return 'Изменения глоссария сохранены.';
    });
  };
  const table = doc ?? draft?.lastGood;
  const feedback = issue && <StudioJsonDiagnostic id={id + '-error'} issue={issue} raw={raw}
    onOpenJson={tab === 'table' ? showIssue : undefined} showingPrevious={!doc && !!table}/>;

  const controls = <StudioDraftActions dirty={dirty} busy={action.busy} disabled={Boolean(issue) || locked || stale}
    inDialog={modal} onReset={() => { setDraft(null); setOnOpening(null); setShowSaveFeedback(false); }} onSave={save}/>;
  const editor = <div className="grid min-w-0 gap-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="pt-sections" aria-label="Представление глоссария">
        <Button variant="ghost" aria-pressed={tab === 'table'} onClick={() => setTab('table')}>Таблица</Button>
        <Button variant="ghost" aria-pressed={tab === 'json'} onClick={() => setTab('json')}>JSON{issue && <TriangleAlert aria-label="Ошибка JSON" className="size-4"/>}</Button>
      </div>
      {!modal && <Button variant="ghost" size="sm" onClick={() => { setOnOpening(draft); setModal(true); }}><Expand aria-hidden="true"/>Развернуть</Button>}
    </div>
    {frozen && <p className="pt-muted text-sm">Глоссарий зафиксирован. Сохранение правки создаст рабочую версию.</p>}
    {locked && <p role="status">Глоссарий формируется. Редактирование станет доступно после завершения.</p>}
    {stale && <p className="pt-callout" role="alert">Есть более новая сохранённая версия. Скопируйте нужные правки, затем нажмите «Сбросить изменения», чтобы открыть её.</p>}
    {feedback}
    {tab === 'json' ? <CopyableTextarea id={id + '-json'} label="JSON глоссария" value={raw} onChange={e => update(e.target.value)} spellCheck={false}
      className="min-h-72 font-mono text-sm" readOnly={cannotEdit} aria-invalid={Boolean(issue)} aria-describedby={issue ? id + '-error' : undefined} /> :
      table && <GlossaryTable doc={table} onChange={next => update(JSON.stringify(next, null, 2))} disabled={cannotEdit || !doc}
        issue={issue} canFind={!dirty && !locked && !!updatedAt} onFind={setUsage}/>}
    {showSaveFeedback && <ActionFeedback error={action.error} notice={!dirty ? action.notice : ''}/>}
  </div>;

  return <>
    {modal ? <IOSDialog open={modal} onOpenChange={next => { if (!next) closeModal(); }}
      labelledBy={id + '-title'} className="flex max-h-[90dvh] max-w-[68rem] flex-col sm:max-w-[68rem]">
      <div className="flex items-center justify-between gap-2 border-b p-4"><h2 id={id + '-title'}>Глоссарий</h2>
        <Button variant="ghost" size="icon-sm" aria-label="Закрыть глоссарий" disabled={action.busy} onClick={closeModal}><X aria-hidden="true"/></Button></div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{editor}</div>{controls}
    </IOSDialog> : <>{editor}{controls}</>}
    <IOSAlertDialog open={discardModal} onOpenChange={setDiscardModal} title="Закрыть без сохранения?"
      description="Изменения, сделанные в этом диалоге, будут сброшены." destructive showCancel
      cancelLabel="Продолжить редактирование" confirmLabel="Выйти без сохранения" actionsLayout="vertical"
      onConfirm={() => { setDraft(onOpening); setDiscardModal(false); setModal(false); }}/>
    {usage && updatedAt && <GlossaryTermUsage bookId={bookId} lang={lang} updatedAt={updatedAt} entry={{
      kind: usage.list === 'named_entities' ? 'named_entity' : 'terminology', source: usage.source, target: usage.target, forms: usage.forms,
    }} onClose={() => setUsage(null)}/>}
  </>;
}
