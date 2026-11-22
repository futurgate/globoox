'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import IOSAlertDialog from '@/components/ui/ios-alert-dialog';
import IOSSettingsRow from '@/components/ui/ios-settings-row';
import { listServerPrompts, type ServerPrompt } from '@/lib/api';
import { createPersonalPrompt, listPersonalPrompts, PersonalPromptError, readLegacyPrompts, updatePersonalPrompt, type LegacyPrompt, type PersonalPrompt } from '@/lib/translationPromptVariants';
import { templateLink, workspaceBase } from '@/lib/translationWorkspacePath';
import SampleRun from './SampleRun';
import { AccountRecipes } from './RecipeSettings';
import { AuthorGrants } from './AuthorGrants';

const labels = { glossary: 'Глоссарий', translate: 'Перевод', revise: 'Стилистическая редактура', 'reader-check': 'Читательская проверка' };
type Group = keyof typeof labels;
const groups = Object.keys(labels) as Group[];
const settings = workspaceBase + '/settings';

function templateLabel(template: ServerPrompt) {
  if (template.name.endsWith('_x_ru.txt')) return 'EN → RU и FR → RU';
  const direction = /_([a-z]{2})_([a-z]{2})\.txt$/.exec(template.name);
  if (direction) return direction[1].toUpperCase() + ' → ' + direction[2].toUpperCase();
  if (template.name === 'reader_check_fiction.txt') return 'Взгляд читателя';
  if (template.name === 'reader_check_calques.txt') return 'Поиск калек';
  if (template.name === 'correct_fiction.txt') return 'Точечные исправления';
  return template.label;
}

export default function WorkspaceSettings({ name, ownerId }: { name?: string; ownerId: string }) {
  const access = useSearchParams().get('section') === 'access' && !name;
  return <div className="pt-stack">
    {!name && <nav className="pt-sections flex-wrap" aria-label="Разделы настроек">
      <Button variant="ghost" asChild><Link aria-current={!access ? 'page' : undefined} href={settings}>Рецепты и шаблоны</Link></Button>
      <Button variant="ghost" asChild><Link aria-current={access ? 'page' : undefined} href={settings + '?section=access'}>Доступ авторов</Link></Button>
    </nav>}
    {access ? <AuthorGrants key={ownerId} ownerId={ownerId}/> : <PromptSettings name={name} ownerId={ownerId}/>}
  </div>;
}

function PromptSettings({ name, ownerId }: { name?: string; ownerId: string }) {
  const query = useSearchParams();
  const variantId = query.get('variant');
  const [templates, setTemplates] = useState<ServerPrompt[] | null>(null);
  const [variants, setVariants] = useState<PersonalPrompt[] | null>(null);
  const [legacy, setLegacy] = useState<LegacyPrompt[]>([]);
  const [catalogError, setCatalogError] = useState('');
  const [personalError, setPersonalError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    listServerPrompts().then(items => { if (live) { setTemplates(items); setCatalogError(''); } })
      .catch(() => { if (live) setCatalogError('Не удалось загрузить базовые шаблоны.'); });
    listPersonalPrompts().then(items => { if (live) { setVariants(items); setPersonalError(''); } })
      .catch(() => { if (live) setPersonalError('Сервер личных шаблонов сейчас недоступен.'); });
    readLegacyPrompts(ownerId).then(items => { if (live) setLegacy(items); }).catch(() => {});
    return () => { live = false; };
  }, [ownerId, attempt]);

  function saved(item: PersonalPrompt) {
    setVariants(previous => {
      const others = (previous || []).filter(v => v.id !== item.id).map(v =>
        item.active && v.template === item.template && v.active ? { ...v, active: false } : v);
      return [...others, item];
    });
    setAttempt(n => n + 1); // Refresh revisions of other variants changed by this activation.
  }

  const personalReady = variants !== null && !personalError;
  const remainingLegacy = legacy.filter(old => !variants?.some(item => item.id === old.id));
  const template = templates?.find(t => t.name === name);
  const variant = variants?.find(item => item.id === variantId && item.template === name);
  const local = remainingLegacy.find(item => item.id === variantId && item.template === name);
  const active = variants?.find(item => item.template === name && item.active && !item.deletedAt);
  const previewCatalog = (templates || []).map(t => {
    const chosen = variants?.find(item => item.template === t.name && item.active && !item.deletedAt);
    return chosen ? { ...t, content: chosen.content } : t;
  });
  const retry = <Button variant="outline" onClick={() => setAttempt(n => n+1)}>Повторить загрузку</Button>;
  let panel;
  if (!templates) panel = !catalogError && <p role="status">Загружаем шаблоны…</p>;
  else if (!name) panel = <PromptCatalog templates={templates} variants={variants || []} legacy={remainingLegacy}
    showDeleted={query.get('deleted') === '1'} personalReady={personalReady}/>;
  else if (!template) panel = <p>Такого шаблона нет в каталоге.</p>;
  else if (variantId && !personalReady && !variants) panel = <Link href={templateLink(name)}>Открыть базовый шаблон</Link>;
  else if (variantId && variantId !== 'new' && !variant && !local) panel = <p>В этом аккаунте нет такого варианта. <Link href={templateLink(name)}>Открыть базовый шаблон</Link></p>;
  else panel = <PromptEditor key={name + '/' + (variantId || '')} ownerId={ownerId} template={template} variant={variant} local={local}
    personal={!!variantId} active={active} catalog={previewCatalog} personalReady={personalReady} onSaved={saved}
    loadLatest={() => setAttempt(n => n + 1)} />;
  return <div className="pt-stack">
    {(catalogError || personalError) && <div className="grid justify-items-start gap-2" role="alert"><p>{catalogError || personalError}</p>{retry}</div>}
    {!personalError && !variants && <p role="status">Загружаем личные варианты…</p>}
    {!name && <AccountRecipes ownerId={ownerId} variants={variants ?? undefined}/>}
    {panel}
  </div>;
}

function PromptCatalog({ templates, variants, legacy, personalReady, showDeleted }: {
  templates: ServerPrompt[]; variants: PersonalPrompt[]; legacy: LegacyPrompt[]; personalReady: boolean; showDeleted: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [group, setGroup] = useState<Group>('glossary');
  const [name, setName] = useState('');
  const choices = templates.filter(template => template.group === group);
  const selected = choices.find(template => template.name === name) ?? choices[0];
  return <>
    <Card className="p-5 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2>Шаблоны этапов</h2>
        <Button disabled={!personalReady} variant={creating ? 'outline' : 'default'} onClick={() => setCreating(!creating)}>
          {creating ? 'Отмена' : <><Plus aria-hidden />Добавить вариант</>}
        </Button>
      </div>
      <p className="pt-muted">Личные варианты доступны на всех ваших устройствах. Для каждого этапа и направления можно выбрать текст для переводов своих книг и серий.</p>
      {personalReady && <label><input type="checkbox" checked={showDeleted} onChange={event => {
        const url = new URL(window.location.href);
        if (event.target.checked) url.searchParams.set('deleted','1');
        else url.searchParams.delete('deleted');
        window.history.replaceState(null,'',url);
      }}/> Показать удалённые</label>}
      {creating && personalReady && <>
        <IOSSettingsRow label="Этап" value={group} options={groups.filter(id => templates.some(t => t.group === id)).map(id => ({id, label: labels[id]}))} onChange={v => { setGroup(v as Group); setName(''); }}/>
        {selected && <>
          <IOSSettingsRow label="Базовый шаблон" value={selected.name} options={choices.map(t => ({id:t.name, label:templateLabel(t)}))} onChange={setName}/>
          <div><Button asChild><Link href={templateLink(selected.name, 'new')}>Открыть редактор</Link></Button></div>
        </>}
      </>}
    </Card>
    {groups.map(g => {
      const items = templates.filter(t => t.group === g);
      return items.length > 0 && <Card key={g} className="gap-1 p-5"><h2>{labels[g]}</h2>
        {items.map(t => {
          const variantsForStage = variants.filter(v => v.template === t.name);
          const baseActive = personalReady && !variantsForStage.some(v => v.active && !v.deletedAt);
          return <div key={t.name}>
            <Link className="pt-row" href={templateLink(t.name)}>
              <span>{templateLabel(t)}<small className="block pt-muted">Базовый шаблон</small></span>
              <span className="pt-muted">{baseActive ? 'Используется' : ''} ›</span>
            </Link>
            {variantsForStage.filter(v => !v.deletedAt || showDeleted).sort((a, b) => a.label.localeCompare(b.label,'ru')).map(v =>
              <Link key={v.id} className="pt-row pl-5" href={templateLink(t.name,v.id)}>
                <span className="break-words">{v.label}<small className="block pt-muted">Личный вариант · {templateLabel(t)}</small></span>
                <span className="pt-muted">{v.deletedAt ? 'Удалён' : v.active ? 'Используется' : ''} ›</span>
              </Link>)}
          </div>;
        })}</Card>;
    })}
    {legacy.length > 0 && personalReady && <Card className="p-5 gap-2"><h2>Черновики на этом устройстве</h2>
      <p className="pt-muted">Откройте черновик, чтобы перенести его в аккаунт.</p>
      {legacy.filter(v => templates.some(t => t.name === v.template)).map(v => <Link key={v.id} className="pt-row" href={templateLink(v.template,v.id)}>{v.label} ›</Link>)}
    </Card>}
    <Card className="p-5 gap-1"><h2>Рецепты</h2><p>Применяемый рецепт виден в карточке серии.</p>
      <p className="pt-muted">Планируется · Публикация версий рецепта и добавление этапов в последовательность перевода.</p></Card>
  </>;
}

type EditorProps = {
  ownerId: string; template: ServerPrompt; catalog: ServerPrompt[]; variant?: PersonalPrompt; local?: LegacyPrompt; active?: PersonalPrompt;
  personal: boolean; personalReady: boolean; onSaved: (v: PersonalPrompt) => void; loadLatest: () => void;
};

function PromptEditor({ ownerId, template, catalog, variant, local, active, personal, personalReady, onSaved, loadLatest }: EditorProps) {
  const router = useRouter();
  const source = variant ?? local;
  const [label, setLabel] = useState(source?.label ?? 'Мой вариант');
  const [value, setValue] = useState(source?.content ?? template.content);
  const [useForBooks, setUseForBooks] = useState(variant?.active ?? !local);
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
  const dirty = !variant || label.trim() !== variant.label || value !== variant.content || useForBooks !== variant.active;

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
      if (op === 'archive') router.replace(settings);
      else if (op === 'save' && !variant) router.replace(templateLink(template.name, result.id));
      setNotice(op === 'restore' ? 'Вариант восстановлен.' : op === 'base' ? 'Для ваших переводов выбран базовый шаблон.' : 'Сохранено в аккаунте.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить изменения.');
      if (err instanceof PersonalPromptError && err.status === 409) loadLatest();
    } finally { setBusy(false); setConfirmDelete(false); }
  }

  function reloadForm() {
    if (!variant) return;
    setLabel(variant.label); setValue(variant.content); setRevision(variant.revision); setUseForBooks(variant.active); setError('');
  }

  return <>
    <Card className="p-5 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3"><div>
        <h2>{archived ? 'Удалённый вариант' : local && !variant ? 'Черновик с устройства' : personal ? (variant ? 'Личный вариант' : 'Новый вариант') : 'Базовый шаблон'}</h2>
        <p>{labels[template.group]} · {templateLabel(template)}</p></div>
        {!personal && personalReady && <Button asChild variant="outline"><Link href={templateLink(template.name,'new')}>Изменить для себя</Link></Button>}
      </div>
      {personal && <label className="pt-field">Название варианта<Input value={label} maxLength={120} readOnly={!editable} disabled={busy} onChange={e => {setLabel(e.target.value); setNotice('');}}/></label>}
      <label className="pt-field">Текст шаблона<Textarea rows={13} spellCheck={false} className="font-mono text-sm" readOnly={!editable} disabled={busy}
        value={personal ? value : template.content} onChange={e => {setValue(e.target.value); setNotice('');}}/></label>
      {!personal && template.content !== template.shipped && <details><summary>Исходный текст поставки</summary><pre className="whitespace-pre-wrap break-words pt-2 text-sm">{template.shipped}</pre></details>}
      {editable && <>
        <label><input type="checkbox" checked={useForBooks} disabled={busy} onChange={e => {setUseForBooks(e.target.checked); setNotice('');}}/> Использовать в моих переводах</label>
        <p className="pt-muted">{useForBooks ? 'После сохранения следующие запуски этого этапа в ваших книгах и сериях получат этот текст.' : 'Вариант будет доступен в аккаунте. Его можно выбрать для перевода позже.'}</p>
        {missing.length > 0 && <p role="alert">Сохраните в тексте маркеры {missing.join(', ')}.</p>}
      </>}
      {archived && <p className="pt-muted">Вариант скрыт из списка. После восстановления его снова можно выбрать для перевода.</p>}
      <div className="flex flex-wrap gap-2">
        {editable && <Button disabled={busy || !label.trim() || !valid || !dirty} onClick={() => mutate('save')}>{local && !variant ? 'Сохранить в аккаунт' : 'Сохранить вариант'}</Button>}
        {!personal && active && personalReady && <Button variant="outline" disabled={busy} onClick={() => mutate('base')}>Использовать базовый в моих переводах</Button>}
        {variant && personalReady && <Button variant="outline" disabled={busy} onClick={() => archived ? mutate('restore') : setConfirmDelete(true)}>
          {archived ? 'Восстановить вариант' : 'Удалить вариант'}</Button>}
        <Button variant="outline" onClick={async () => {
          try { await navigator.clipboard.writeText(personal ? value : template.content); setNotice('Скопировано.'); }
          catch { setError('Выделите текст шаблона и скопируйте его.'); }
        }}>Скопировать</Button>
      </div>
      {variant && revision !== variant.revision && <div role="alert">Сохранённая версия изменилась. <Button variant="outline" onClick={reloadForm}>Загрузить сохранённый текст</Button></div>}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
    </Card>
    {!archived && personalReady && <SampleRun template={template} catalog={catalog} draft={personal ? value : template.content} valid={valid}/>}
    <IOSAlertDialog open={confirmDelete} onOpenChange={open => { if (!open) setConfirmDelete(false); }} showCancel destructive loading={busy}
      title="Удалить личный вариант?" description={variant?.active ? 'Для следующих запусков будет выбран базовый шаблон. Вариант можно восстановить через фильтр удалённых.' : 'Вариант можно восстановить через фильтр удалённых.'}
      confirmLabel="Удалить" cancelLabel="Отмена" onConfirm={() => mutate('archive')}/>
  </>;
}
