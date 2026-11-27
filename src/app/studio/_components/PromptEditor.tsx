'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useRef, useState } from 'react';
import { StudioDraftActions } from './StudioDraftActions';
import { StudioEntityMenu } from './StudioEntityMenu';
import { PendingText } from './RequestFeedback';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CopyableText, CopyableTextarea } from '@/components/ui/copy-text';
import { X } from 'lucide-react';
import IOSDialog from '@/components/ui/ios-dialog';
import IOSAlertDialog from '@/components/ui/ios-alert-dialog';
import type { ServerPrompt } from '@/lib/api';
import { studioErrorMessage } from '@/lib/studioFetch';
import { createPersonalPrompt, listPersonalPrompts, PersonalPromptError, updatePersonalPrompt, type LegacyPrompt, type PersonalPrompt } from '@/lib/translationPromptVariants';
import { templateLink, workspaceBase } from '@/lib/translationWorkspacePath';
import SampleRun from './SampleRun';

export const labels = { glossary: 'Глоссарий', translate: 'Перевод', revise: 'Стилистическая редактура', 'reader-check': 'Читательская проверка' };
const settings = workspaceBase + '/settings';

export function templateLabel(template: ServerPrompt) {
  if (template.name.endsWith('_x_ru.txt')) return 'EN → RU и FR → RU';
  const direction = /_([a-z]{2})_([a-z]{2})\.txt$/.exec(template.name);
  if (direction) return direction[1].toUpperCase() + ' → ' + direction[2].toUpperCase();
  if (template.name === 'reader_check_fiction.txt') return 'Взгляд читателя';
  if (template.name === 'reader_check_calques.txt') return 'Поиск калек';
  if (template.name === 'correct_fiction.txt') return 'Точечные исправления';
  return template.label;
}

type EditorProps = {
  ownerId: string; template: ServerPrompt; catalog: ServerPrompt[]; variant?: PersonalPrompt; local?: LegacyPrompt; active?: PersonalPrompt;
  onClose?: () => void;
  refreshError?: string;
  personal: boolean; personalReady: boolean; onSaved: (v: PersonalPrompt) => void; loadLatest: () => void;
};

export function PromptEditor({ ownerId, template, catalog, variant, local, active, personal, personalReady, onSaved, loadLatest, onClose, refreshError }: EditorProps) {
  const router = useRouter();
  const id = useId();
  const [discard, setDiscard] = useState(false);
  const initialActivation = variant?.active ?? (!onClose && !local);
  const source = variant ?? local;
  const [label, setLabel] = useState(source?.label ?? 'Мой вариант');
  const [value, setValue] = useState(source?.content ?? template.content);
  const [useForBooks, setUseForBooks] = useState(initialActivation);
  const [revision, setRevision] = useState(variant?.revision);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const newId = useRef<string | null>(null);
  const archived = !!variant?.deletedAt;
  const editable = personal && personalReady && !archived;
  const required = new Set(template.shipped.match(/\{[A-Z0-9_]+\}/g));
  if (template.group === 'translate') required.add('[N]');
  const missing = [...required].filter(field => !value.includes(field));
  const valid = !!value.trim() && !missing.length;
  const dirty = label !== (source?.label ?? 'Мой вариант') || value !== (source?.content ?? template.content) ||
    useForBooks !== initialActivation;
  const copyId = useRef<string | null>(null);
  async function duplicate() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const variants = await listPersonalPrompts();
      const original = variant?.label ?? templateLabel(template);
      const baseName = original.replace(/ copy(?: \d+)?$/, '').slice(0, 105);
      const names = new Set(variants.filter(p => p.template === template.name).map(p => p.label));
      let suffix = ' copy';
      for (let i = 2; names.has(baseName + suffix); i++) suffix = ' copy ' + i;
      copyId.current ??= crypto.randomUUID();
      const copy = await createPersonalPrompt(ownerId, { id: copyId.current, template: template.name, label: baseName + suffix,
        content: variant?.content ?? template.content, activate: false });
      onSaved(copy); router.push(templateLink(template.name, copy.id));
    } catch (err) { setError(studioErrorMessage(err, 'Не удалось создать дубликат.')); }
    finally { setBusy(false); }
  }

  async function mutate(op: 'save' | 'archive' | 'restore' | 'base') {
    if (!personalReady || busy) return;
    setBusy(true); setNotice(''); setError('');
    try {
      let result: PersonalPrompt;
      if (op === 'base' && active) {
        result = await updatePersonalPrompt(ownerId, active.id, { revision: active.revision, active: false });
      } else if (op === 'save' && !variant) {
        newId.current ??= local?.id ?? crypto.randomUUID();
        result = await createPersonalPrompt(ownerId, { id:newId.current, template:template.name, label:label.trim(), content:value, activate:useForBooks });
      } else if (variant && revision != null) {
        result = await updatePersonalPrompt(ownerId, variant.id, op === 'save'
          ? {revision, label:label.trim(), content:value, active:useForBooks}
          : {revision, deleted:op === 'archive'});
      } else return;
      onSaved(result);
      if (op !== 'base') {
        setRevision(result.revision); setUseForBooks(result.active); setLabel(result.label); setValue(result.content);
      }
      if (onClose) { onClose(); return; }
      if (op === 'archive') router.replace(settings);
      else if (op === 'save' && !variant) router.replace(templateLink(template.name, result.id));
      setNotice(op === 'restore' ? 'Вариант восстановлен.' : op === 'base' ? 'Для ваших переводов выбран базовый шаблон.' : 'Сохранено в аккаунте.');
    } catch (err) {
      setError(studioErrorMessage(err, 'Не удалось сохранить изменения.'));
      if (err instanceof PersonalPromptError && err.status === 409) loadLatest();
    } finally { setBusy(false); setConfirmDelete(false); }
  }

  function reloadForm() {
    if (!variant) return;
    setLabel(variant.label); setValue(variant.content); setRevision(variant.revision); setUseForBooks(variant.active); setError('');
  }

  function close() {
    if (busy || !onClose) return;
    if (dirty) setDiscard(true);
    else onClose();
  }

  const form = <Card className="p-5 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3"><div>
        <h2 id={id}>{archived ? 'Удалённый вариант' : local && !variant ? 'Черновик с устройства' : personal ? (variant ? 'Личный вариант' : 'Новый вариант') : 'Базовый шаблон'}</h2>
        <p>{labels[template.group]} · {templateLabel(template)}</p></div>
        {onClose && <Button variant="ghost" size="icon-sm" aria-label="Закрыть редактор шаблона" disabled={busy} onClick={close}><X aria-hidden/></Button>}
        {!personal && personalReady && <Button asChild variant="outline"><Link href={templateLink(template.name,'new')}>Изменить для себя</Link></Button>}
      </div>
      {personal && <label className="pt-field">Название варианта<Input value={label} maxLength={120} readOnly={!editable} disabled={busy} onChange={e => {setLabel(e.target.value); setNotice('');}}/></label>}
      <CopyableTextarea fieldClassName="pt-field" label="Текст шаблона" rows={13} spellCheck={false} className="font-mono text-sm" readOnly={!editable} disabled={busy}
        value={personal ? value : template.content} onChange={e => {setValue(e.target.value); setNotice('');}}/>
      {!personal && template.content !== template.shipped && <details><summary>Исходный текст поставки</summary><CopyableText label="Исходный текст поставки" text={template.shipped} className="pt-2 text-sm"/></details>}
      {editable && <>
        {!onClose && <label><input type="checkbox" checked={useForBooks} disabled={busy} onChange={e => {setUseForBooks(e.target.checked); setNotice('');}}/> Использовать в моих переводах</label>}
        {!onClose && <p className="pt-muted">{useForBooks ? 'После сохранения следующие запуски этого этапа в ваших книгах и сериях получат этот текст.' : 'Вариант будет доступен в аккаунте. Его можно выбрать для перевода позже.'}</p>}
        {onClose && variant?.active && <p className="pt-muted">Этот вариант используется по умолчанию в вашем аккаунте. Следующие запуски получат сохранённый текст.</p>}
        {missing.length > 0 && <p role="alert">Сохраните в тексте маркеры {missing.join(', ')}.</p>}
      </>}
      {archived && <p className="pt-muted">Вариант скрыт из списка. После восстановления его снова можно выбрать для перевода.</p>}
      <div className="flex flex-wrap gap-2">
        {editable && !variant && !dirty && <Button disabled={busy || !valid} onClick={() => void mutate('save')}>{local ? 'Сохранить в аккаунт' : 'Создать вариант'}</Button>}
        {!personal && active && personalReady && <Button variant="outline" disabled={busy} onClick={() => mutate('base')}>Использовать базовый в моих переводах</Button>}
        {!onClose && personalReady && (!personal || variant) && <StudioEntityMenu inHeader label="Действия с шаблоном" actions={[
          { label: 'Дублировать', disabled: busy || dirty, onClick: () => void duplicate() },
          ...(variant ? [{ label: archived ? 'Восстановить' : 'Скрыть', disabled: busy || dirty,
            onClick: () => archived ? void mutate('restore') : setConfirmDelete(true) }] : []),
        ]}/>}
      </div>
      {editable && <StudioDraftActions inDialog={Boolean(onClose)} dirty={dirty} busy={busy && dirty} disabled={!label.trim() || !valid || Boolean(variant && revision !== variant.revision)}
        saveLabel={local && !variant ? 'Сохранить в аккаунт' : 'Сохранить вариант'} onSave={() => void mutate('save')} onReset={() => {
          setLabel(source?.label ?? 'Мой вариант'); setValue(source?.content ?? template.content);
          setRevision(variant?.revision); setUseForBooks(initialActivation); setError(''); setNotice('');
        }}/>}
      {busy && !dirty && <PendingText>Сохраняем изменения шаблона…</PendingText>}
      {variant && revision !== variant.revision && <div role="alert">Сохранённая версия изменилась. <Button variant="outline" onClick={reloadForm}>Загрузить сохранённый текст</Button></div>}
      {error && <p role="alert">{error}</p>}
      {refreshError && <p role="alert">{refreshError} <Button variant="ghost" onClick={loadLatest}>Повторить загрузку</Button></p>}
      {notice && <p role="status">{notice}</p>}
    </Card>;
  if (onClose) return <>
    <IOSDialog open onOpenChange={next => { if (!next) close(); }} labelledBy={id}
      className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">{form}</IOSDialog>
    <IOSAlertDialog open={discard} onOpenChange={setDiscard} title="Закрыть без сохранения изменений?"
      description="Изменения шаблона будут потеряны." showCancel cancelLabel="Продолжить редактирование"
      confirmLabel="Закрыть без сохранения" onConfirm={onClose}/>
  </>;
  return <>{form}
    {!archived && personalReady && <SampleRun template={template} catalog={catalog} draft={personal ? value : template.content} valid={valid}/>}
    <IOSAlertDialog open={confirmDelete} onOpenChange={open => { if (!open) setConfirmDelete(false); }} showCancel destructive loading={busy}
      title="Скрыть личный вариант?" description={variant?.active ? 'Для следующих запусков будет выбран базовый шаблон. Вариант можно восстановить через фильтр удалённых.' : 'Вариант можно восстановить через фильтр удалённых.'}
      confirmLabel="Скрыть" cancelLabel="Отмена" onConfirm={() => mutate('archive')}/>
  </>;
}
