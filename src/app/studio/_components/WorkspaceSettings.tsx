'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { PendingText } from './RequestFeedback';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import IOSSettingsRow from '@/components/ui/ios-settings-row';
import type { ServerPrompt } from '@/lib/api';
import { bookGet } from './bookRequests';
import { listPersonalPrompts, readLegacyPrompts, type LegacyPrompt, type PersonalPrompt } from '@/lib/translationPromptVariants';
import { templateLink, workspaceBase } from '@/lib/translationWorkspacePath';
import { AccountRecipes } from './RecipeSettings';
import { AuthorGrants } from './AuthorGrants';
import { LanguageSettings } from './StudioLanguages';

import { PromptEditor, labels, templateLabel } from './PromptEditor';

type Group = keyof typeof labels;
const groups = Object.keys(labels) as Group[];
const settings = workspaceBase + '/settings';

export default function WorkspaceSettings({ name, ownerId, admin = true }: { name?: string; ownerId: string; admin?: boolean }) {
  const section = useSearchParams().get('section');
  const access = admin && section === 'access' && !name;
  const languageSection = !admin || (section === 'languages' && !name);
  return <div className="pt-stack">
    {!name && admin && <nav className="pt-sections flex-wrap" aria-label="Разделы настроек">
      <Button variant="ghost" asChild><Link aria-current={!access && !languageSection ? 'page' : undefined} href={settings}>Рецепты и шаблоны</Link></Button>
      <Button variant="ghost" asChild><Link aria-current={languageSection ? 'page' : undefined} href={settings + '?section=languages'}>Языки</Link></Button>
      <Button variant="ghost" asChild><Link aria-current={access ? 'page' : undefined} href={settings + '?section=access'}>Доступ авторов</Link></Button>
    </nav>}
    {languageSection ? <LanguageSettings key={ownerId} ownerId={ownerId}/> : access ? <AuthorGrants key={ownerId} ownerId={ownerId}/> : <PromptSettings name={name} ownerId={ownerId}/>}
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
  const [completedAttempt, setCompletedAttempt] = useState(-1);
  const refreshing = attempt > 0 && completedAttempt !== attempt;
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const shared = bookGet<{ prompts: ServerPrompt[] }>('/api/admin/prompts', signal).then(({ prompts }) => {
      if (!signal.aborted) { setTemplates(prompts); setCatalogError(''); }
    }).catch(() => { if (!signal.aborted) setCatalogError('Не удалось загрузить базовые шаблоны.'); });
    const personal = listPersonalPrompts(signal).then(items => { if (!signal.aborted) { setVariants(items); setPersonalError(''); } })
      .catch(() => { if (!signal.aborted) setPersonalError('Сервер личных шаблонов сейчас недоступен.'); });
    void Promise.all([shared, personal]).then(() => { if (!signal.aborted) setCompletedAttempt(attempt); });
    readLegacyPrompts(ownerId).then(items => { if (!signal.aborted) setLegacy(items); }).catch(() => {});
    return () => controller.abort();
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
    {refreshing && <PendingText>Обновляем шаблоны…</PendingText>}
    {!refreshing && (catalogError || personalError) && <div className="grid justify-items-start gap-2" role="alert"><p>{catalogError || personalError}</p>{retry}</div>}
    {!personalError && !variants && <p role="status">Загружаем личные варианты…</p>}
    {!name && <AccountRecipes ownerId={ownerId} variants={variants ?? undefined} onPromptSaved={saved}/>}
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
