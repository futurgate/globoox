'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import IOSAlertDialog from '@/components/ui/ios-alert-dialog';
import IOSSettingsRow from '@/components/ui/ios-settings-row';
import { listServerPrompts, resetServerPrompt, saveServerPrompt, type ServerPrompt } from '@/lib/api';
import { deletePromptVariant, listPromptVariants, savePromptVariant, type PromptVariant } from '@/lib/translationPromptVariants';
import { templateLink, workspaceBase } from '@/lib/translationWorkspacePath';
import SampleRun from './SampleRun';

const labels = { glossary: 'Глоссарий', translate: 'Перевод', revise: 'Стилистическая редактура', 'reader-check': 'Читательская проверка' };
type Group = keyof typeof labels;
const groups = Object.keys(labels) as Group[];
const localScope = 'Личные варианты сохраняются для вашего аккаунта в этом браузере.';

function templateLabel(template: ServerPrompt) {
  // The server labels the shared EN/FR → RU file with the first direction only.
  if (template.name.endsWith('_x_ru.txt')) return 'EN → RU и FR → RU';
  const direction = /_([a-z]{2})_([a-z]{2})\.txt$/.exec(template.name);
  if (direction) return direction[1].toUpperCase() + ' → ' + direction[2].toUpperCase();
  if (template.name === 'reader_check_fiction.txt') return 'Взгляд читателя';
  if (template.name === 'reader_check_calques.txt') return 'Поиск калек';
  if (template.name === 'correct_fiction.txt') return 'Точечные исправления';
  return template.label;
}

export default function WorkspaceSettings({ name, ownerId }: { name?: string; ownerId: string }) {
  const variantId = useSearchParams().get('variant');
  const [templates, setTemplates] = useState<ServerPrompt[] | null>(null);
  const [variants, setVariants] = useState<PromptVariant[] | null>(null);
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    listServerPrompts().then(items => { if (active) { setTemplates(items); setError(''); } })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Не удалось получить шаблоны.'); });
    listPromptVariants(ownerId).then(items => { if (active) { setVariants(items); setStorageError(''); } })
      .catch(() => { if (active) setStorageError('Хранилище браузера недоступно. Чтобы открыть или сохранить личный вариант, разрешите хранение данных сайта.'); });
    return () => { active = false; };
  }, [ownerId, attempt]);

  if (error) return <div><p role="alert">{error}</p><Button variant="outline" onClick={() => setAttempt(attempt + 1)}>Попробовать снова</Button></div>;
  if (!templates) return <p role="status">Загружаем шаблоны…</p>;
  function remember(item: PromptVariant) {
    setVariants(current => [...(current ?? []).filter(existing => existing.id !== item.id), item]);
  }
  let panel;
  if (name) {
    const template = templates.find(item => item.name === name);
    if (!template) return <p>В каталоге нет такого шаблона.</p>;
    const variant = variants?.find(item => item.id === variantId && item.template === name);
    if (variantId && !variants && !storageError) panel = <p role="status">Загружаем варианты…</p>;
    else if (variantId && storageError) panel = null;
    else if (variantId && variantId !== 'new' && !variant) panel = <p>В этом браузере у вашего аккаунта нет такого варианта. <Link href={templateLink(name)}>Открыть общий шаблон</Link></p>;
    else panel = <PromptEditor key={name + '/' + (variantId ?? '')} template={template} variant={variant}
      personal={!!variantId} ownerId={ownerId} remember={remember}
      forget={id => setVariants(current => (current ?? []).filter(item => item.id !== id))} updateCatalog={setTemplates} catalog={templates} />;
  } else {
    panel = <PromptCatalog templates={templates} variants={variants ?? []} />;
  }
  return <div className="pt-stack">
    {storageError && <div><p role="alert">{storageError}</p><Button variant="outline" onClick={() => setAttempt(attempt + 1)}>Проверить снова</Button></div>}
    {panel}
  </div>;
}

function PromptCatalog({ templates, variants }: { templates: ServerPrompt[]; variants: PromptVariant[] }) {
  const [creating, setCreating] = useState(false);
  const [group, setGroup] = useState<Group>('glossary');
  const [name, setName] = useState('');
  const choices = templates.filter(template => template.group === group);
  const selected = choices.find(template => template.name === name) ?? choices[0];
  return <>
    <Card className="p-5 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2>Шаблоны этапов</h2>
        <Button variant={creating ? 'outline' : 'default'} onClick={() => setCreating(!creating)}>
          {creating ? 'Отмена' : <><Plus aria-hidden="true" />Добавить вариант</>}
        </Button>
      </div>
      <p className="pt-muted">{localScope} Вариант задаёт другой текст для того же этапа. Порядок и число этапов задаёт сервер.</p>
      {creating && <>
        <IOSSettingsRow label="Этап" value={group} options={groups.filter(id => templates.some(template => template.group === id)).map(id => ({id, label: labels[id]}))}
          onChange={value => { setGroup(value as Group); setName(''); }} />
        {selected && <>
          <IOSSettingsRow label="Базовый шаблон" value={selected.name} options={choices.map(item => ({id: item.name, label: templateLabel(item)}))} onChange={setName} />
          <div><Button asChild><Link href={templateLink(selected.name, 'new')}>Открыть редактор</Link></Button></div>
        </>}
      </>}
    </Card>
    {groups.map(group => {
      const items = templates.filter(template => template.group === group);
      return items.length > 0 && <Card key={group} className="gap-1 p-5"><h2>{labels[group]}</h2>
        {items.map(template => <div key={template.name}>
          <Link className="pt-row" href={templateLink(template.name)}>
            <span>{templateLabel(template)}<small className="pt-muted block">Общий шаблон</small></span>
            <span className="pt-muted">{template.overridden ? 'Изменён' : 'Исходный'} ›</span>
          </Link>
          {variants.filter(item => item.template === template.name).sort((a, b) => a.label.localeCompare(b.label, 'ru')).map(item =>
            <Link key={item.id} className="pt-row pl-5" href={templateLink(template.name, item.id)}>
              <span className="min-w-0 break-words">{item.label}<small className="pt-muted block">Личный вариант · {templateLabel(template)}</small></span>
              <span aria-hidden="true">›</span>
            </Link>)}
        </div>)}</Card>;
    })}
    <Card className="p-5 gap-1"><h2>Рецепты</h2><p>Применяемый рецепт виден в карточке серии.</p>
      <p className="pt-muted">Планируется · Публикация версий рецепта и выбор варианта шаблона для отдельной книги.</p></Card>
  </>;
}

interface EditorProps {
  template: ServerPrompt;
  catalog: ServerPrompt[];
  ownerId: string;
  personal: boolean;
  variant?: PromptVariant;
  remember: (item: PromptVariant) => void;
  forget: (id: string) => void;
  updateCatalog: (items: ServerPrompt[]) => void;
}

function PromptEditor({ template, catalog, ownerId, personal, variant, remember, forget, updateCatalog }: EditorProps) {
  const router = useRouter();
  const [value, setValue] = useState(variant?.content ?? template.content);
  const [label, setLabel] = useState(variant?.label ?? '');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<'save'|'reset'|'delete'|null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const required = new Set(template.shipped.match(/\{[A-Z0-9_]+\}/g));
  if (template.group === 'translate') required.add('[N]');
  const missing = [...required].filter(field => !value.includes(field));
  const valid = !!value.trim() && !missing.length;
  const saved = !!variant && value === variant.content && label.trim() === variant.label;

  async function savePersonal() {
    setBusy(true); setError(''); setNotice('');
    try {
      const item = await savePromptVariant(ownerId, template.name, label, value, variant);
      remember(item);
      if (!variant) router.replace(templateLink(template.name, item.id));
      setNotice('Вариант сохранён в этом браузере.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Не удалось записать вариант. Проверьте доступ к хранилищу браузера.'); }
    finally { setBusy(false); }
  }

  async function apply() {
    setBusy(true); setError(''); setNotice('');
    try {
      if (confirm === 'delete' && variant) {
        await deletePromptVariant(variant);
        router.replace(workspaceBase + '/settings');
        forget(variant.id);
        return;
      }
      const expected = confirm === 'reset' ? template.shipped : value;
      if (confirm === 'reset') await resetServerPrompt(template.name);
      else await saveServerPrompt(template.name, value);
      const fresh = await listServerPrompts();
      const current = fresh.find(item => item.name === template.name);
      updateCatalog(fresh);
      if (current?.content !== expected || (confirm === 'reset' && current.overridden)) {
        throw new Error('Сервер вернул другой действующий шаблон. Проверьте изменения перед повторной попыткой.');
      }
      setValue(expected);
      setNotice('Общий шаблон обновлён.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Не удалось подтвердить сохранение общего шаблона.'); }
    finally { setConfirm(null); setBusy(false); }
  }
  return <>
    <Card className="p-5 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2>{personal ? (variant ? 'Личный вариант' : 'Новый вариант') : 'Общий шаблон'}</h2>
          <p>{labels[template.group]} · {templateLabel(template)}</p></div>
        {!personal && <Button variant="outline" asChild><Link href={templateLink(template.name, 'new')}><Plus aria-hidden="true" />Добавить вариант</Link></Button>}
      </div>
      {personal && <>
        <p className="pt-muted">{localScope} Чтобы использовать сохранённый текст для всех книг с этим шаблоном, сделайте его общим.</p>
        <label className="pt-field">Название варианта<Input value={label} maxLength={120} onChange={event => { setLabel(event.target.value); setNotice(''); }} /></label>
      </>}
      <label className="pt-field">Текст шаблона
        <Textarea rows={13} spellCheck={false} className="font-mono text-sm" value={value} onChange={event => {setValue(event.target.value); setNotice('');}} />
      </label>
      {missing.length > 0 && <p role="alert">Для запуска нужны маркеры {missing.join(', ')}.</p>}
      <div className="flex flex-wrap gap-2">
        {personal && <Button disabled={busy || !label.trim() || !value.trim() || saved} onClick={savePersonal}>Сохранить вариант</Button>}
        {(!personal || variant) && <Button variant={personal ? 'outline' : 'default'}
          disabled={busy || value === template.content || !valid || (personal && !saved)} onClick={() => setConfirm('save')}>
          {personal ? 'Сделать общим' : 'Сохранить общий шаблон'}
        </Button>}
        {variant && <Button variant="outline" disabled={busy} onClick={() => setConfirm('delete')}>Удалить вариант</Button>}
        {!personal && <Button variant="outline" disabled={busy || !template.overridden} onClick={() => setConfirm('reset')}>Вернуть исходный</Button>}
        <Button variant="outline" onClick={async () => {
          try {await navigator.clipboard.writeText(value); setError(''); setNotice('Скопировано.');}
          catch {setError('Не удалось скопировать. Выделите текст в поле шаблона.');}
        }}>Скопировать</Button>
      </div>
      {error && <p role="alert">{error}</p>}{notice ? <p role="status">{notice}</p> : saved && <p className="pt-muted" role="status">Вариант сохранён в этом браузере.</p>}
    </Card>
    <SampleRun template={template} catalog={catalog} draft={value} valid={valid} />
    <IOSAlertDialog open={!!confirm} onOpenChange={open => {if (!open) setConfirm(null);}} loading={busy} showCancel
      destructive={confirm === 'delete'} title={confirm === 'delete' ? 'Удалить личный вариант?' : confirm === 'reset' ? 'Вернуть исходный шаблон?' : 'Обновить общий шаблон?'}
      description={confirm === 'delete' ? 'Личная копия «' + variant?.label + '» будет удалена из этого браузера.' : 'Следующие запуски этапа «' + labels[template.group] + '» для «' + templateLabel(template) + '» будут использовать этот текст во всех книгах с данным шаблоном.'}
      confirmLabel={confirm === 'delete' ? 'Удалить' : confirm === 'reset' ? 'Вернуть исходный' : 'Применить для всех'} cancelLabel="Отмена" onConfirm={apply} />
  </>;
}
