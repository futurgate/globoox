'use client';

import { createContext, useContext, useEffect, useId, useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import IOSDialog from '@/components/ui/ios-dialog';
import IOSAlertDialog from '@/components/ui/ios-alert-dialog';
import IOSSettingsRow from '@/components/ui/ios-settings-row';
import { catalogChoices, defaultCatalog, languages, validLanguageCode, type AccountLanguage, type LanguageCatalog } from '@/lib/studioLanguages';
import { studioErrorMessage, studioFetch } from '@/lib/studioFetch';
import { checkedResponse, useBookAction } from './bookRequests';
import { PendingText, RefreshButton } from './RequestFeedback';
import { StudioDraftActions } from './StudioDraftActions';
import { StudioEntityMenu } from './StudioEntityMenu';

const endpoint = '/api/studio/languages';
async function readCatalog(ownerId: string, signal: AbortSignal): Promise<LanguageCatalog> {
  const response = await checkedResponse(await studioFetch(endpoint, {
    cache: 'no-store', signal, headers: { 'X-Workspace-Account': ownerId },
  }));
  const data = await response.json();
  if (!Array.isArray(data?.languages) || !Array.isArray(data.supportedDirections)) {
    throw new Error('Сервер вернул неполный каталог языков.');
  }
  return data;
}

function writeLanguage(ownerId: string, code: string, label: string, hidden: boolean, revision: number, signal: AbortSignal) {
  return studioFetch(endpoint, {
    method: 'PATCH', signal, headers: { 'Content-Type': 'application/json', 'X-Workspace-Account': ownerId },
    body: JSON.stringify({ code, label: label.trim(), hidden, expectedRevision: revision }),
  });
}

function useLanguageCatalog(ownerId: string, enabled: boolean) {
  const [loaded, setLoaded] = useState<{ owner: string; catalog: LanguageCatalog }>();
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void readCatalog(ownerId, controller.signal).then(catalog => {
      if (!controller.signal.aborted) { setLoaded({ owner: ownerId, catalog }); setError(''); }
    }).catch(err => {
      if (!controller.signal.aborted) setError(studioErrorMessage(err, 'Не удалось загрузить ваши языки.'));
    });
    return () => controller.abort();
  }, [ownerId, enabled, retry]);
  const catalog = enabled && loaded?.owner === ownerId ? loaded.catalog : undefined;
  function saved(language: AccountLanguage) {
    setLoaded(previous => !previous || previous.owner !== ownerId ? previous : {
      owner: ownerId,
      catalog: { ...previous.catalog, languages: [...previous.catalog.languages.filter(item => item.code !== language.code), language] },
    });
  }
  return { catalog, error, saved, refresh: () => { setError(''); setRetry(v => v + 1); } };
}

const LanguageContext = createContext<ReturnType<typeof useLanguageCatalog> | null>(null);

export function StudioLanguageProvider({ ownerId, enabled, children }: { ownerId: string; enabled: boolean; children: ReactNode }) {
  const state = useLanguageCatalog(ownerId, enabled);
  return <LanguageContext.Provider value={state}>{children}</LanguageContext.Provider>;
}

export function useStudioLanguageCatalog() {
  return useContext(LanguageContext)?.catalog;
}

export function useStudioLanguageName() {
  const catalog = useStudioLanguageCatalog();
  return (code: string) => catalog?.languages.find(item => item.code === code.toLowerCase())?.label || languages[code.toUpperCase()] || code;
}

type EditLanguage = { original?: AccountLanguage; copyLabel?: string };
function LanguageDialog({ ownerId, initial, catalog, onClose, onSaved }: {
  ownerId: string; initial: EditLanguage; catalog: LanguageCatalog; onClose: () => void; onSaved: (item: AccountLanguage) => void;
}) {
  const title = useId();
  const [base, setBase] = useState(initial.original);
  const [code, setCode] = useState(initial.original?.code ?? '');
  const [label, setLabel] = useState(initial.original?.label ?? initial.copyLabel ?? '');
  const [hidden, setHidden] = useState(initial.original?.hidden ?? false);
  const [conflict, setConflict] = useState(false);
  const [discard, setDiscard] = useState(false);
  const action = useBookAction();
  const canonical = code.trim().toLowerCase();
  const taken = !base && catalog.languages.some(item => item.code === canonical);
  const invalidCode = !validLanguageCode(code);
  const invalidLabel = !label.trim() || [...label.trim()].length > 80;
  const dirty = code !== (base?.code ?? '') || label !== (base?.label ?? '') || hidden !== (base?.hidden ?? false);
  const target = canonical.toUpperCase();
  const supported = catalog.supportedDirections.filter(item => item.targetLang === target);
  function reset(item = base) {
    setCode(item?.code ?? ''); setLabel(item?.label ?? ''); setHidden(item?.hidden ?? false);
  }
  function save() {
    if (taken || invalidCode || invalidLabel || conflict) return;
    void action.run(async signal => {
      const response = await writeLanguage(ownerId, canonical, label, hidden, base?.revision ?? 0, signal);
      if (response.status === 409) setConflict(true);
      const { language } = await (await checkedResponse(response)).json() as { language: AccountLanguage };
      if (!signal.aborted) onSaved(language);
    });
  }
  function loadLatest() {
    void action.run(async signal => {
      const latest = (await readCatalog(ownerId, signal)).languages.find(item => item.code === canonical);
      if (signal.aborted) return;
      setBase(latest); reset(latest); setConflict(false);
    }, 'Загружаем сохранённую версию…');
  }
  function close() {
    if (action.busy) return;
    if (dirty) setDiscard(true);
    else onClose();
  }
  return <IOSDialog open labelledBy={title} onOpenChange={open => { if (!open) close(); }}
    className="max-h-[85dvh] overflow-y-auto">
    <div className="grid gap-4 p-5">
      <h2 id={title} className="text-xl font-semibold">{base ? 'Редактировать язык' : 'Добавить язык'}</h2>
      {initial.copyLabel && !base && <p className="pt-muted text-sm">Укажите код другого языка для копии.</p>}
      <label className="grid gap-1">Название языка<Input value={label} disabled={action.busy} maxLength={160} onChange={e => setLabel(e.target.value)}/></label>
      <label className="grid gap-1">Код языка<Input value={code} placeholder="de или pt-BR" readOnly={!!base} disabled={action.busy}
        autoCapitalize="none" spellCheck={false} maxLength={14} onChange={e => setCode(e.target.value)}/></label>
      {taken ? <p role="alert">Этот код уже есть в вашем каталоге. Откройте язык для редактирования.</p>
        : !!code.trim() && invalidCode ? <p role="alert">Введите код языка, например de или pt-BR.</p> : null}
      {[...label.trim()].length > 80 && <p role="alert">Сократите название до 80 символов.</p>}
      {!invalidCode && !taken && <p className="pt-muted text-sm">{supported.length
        ? 'Доступные направления перевода: ' + supported.map(item => item.sourceLang + ' → ' + item.targetLang).join(', ') + '.'
        : 'Этот язык можно сохранить в каталоге. Направления перевода для него пока не подключены.'}</p>}
      {base && <label className="flex items-center gap-2"><input type="checkbox" checked={hidden} disabled={action.busy}
        onChange={e => setHidden(e.target.checked)}/>Скрыть в моём списке языков</label>}
      {conflict && <div role="alert">Язык уже изменён. Загрузите сохранённую версию, чтобы продолжить правку.
        <Button variant="outline" disabled={action.busy} onClick={loadLatest}>Загрузить сохранённую версию</Button></div>}
      <div><Button variant="ghost" disabled={action.busy} onClick={close}>Закрыть</Button></div>
    </div>
    <StudioDraftActions inDialog dirty={dirty} busy={action.busy} error={conflict ? undefined : action.error}
      disabled={invalidCode || invalidLabel || taken || conflict} onReset={() => reset()} onSave={save}/>
    <IOSAlertDialog open={discard} onOpenChange={setDiscard} showCancel title="Выйти без сохранения?"
      description="Изменения языка будут потеряны." confirmLabel="Выйти без сохранения" cancelLabel="Продолжить редактирование" onConfirm={onClose}/>
  </IOSDialog>;
}

interface PickerProps {
  ownerId: string;
  supported: readonly string[];
  value: string;
  onChange: (code: string) => void;
  label?: string;
  disabled?: boolean;
  canManage?: boolean;
  preferVisibleDefault?: boolean;
  allowManualGlossary?: boolean;
  compactLabels?: { label: string; value: string };
  className?: string;
}
export function StudioLanguagePicker({ ownerId, supported, value, onChange, canManage = false, preferVisibleDefault = false, allowManualGlossary = false, label = 'Язык перевода', className, ...appearance }: PickerProps) {
  const state = useContext(LanguageContext);
  const catalog = canManage ? state?.catalog : undefined;
  const [edit, setEdit] = useState<EditLanguage>();
  const [notice, setNotice] = useState('');
  const choices = catalogChoices(catalog || defaultCatalog, supported, value, allowManualGlossary);
  const visibleDefault = preferVisibleDefault && choices.some(choice => choice.code === value && choice.language.hidden)
    ? choices.find(choice => choice.available && !choice.language.hidden)?.code ?? choices.find(choice => choice.selectable && !choice.language.hidden)?.code : undefined;
  useEffect(() => { if (visibleDefault) onChange(visibleDefault); }, [visibleDefault, onChange]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  return <div className="relative"><div className={className}>
    <IOSSettingsRow {...appearance} label={label} value={value} onChange={onChange}
      options={choices.map(({ language, code, available, selectable }) => ({
        id: code, label: language.label,
        description: language.hidden ? 'Скрыт в вашем каталоге' : available ? undefined : allowManualGlossary ? 'Глоссарий вручную · автоперевод недоступен' : 'Направление пока недоступно',
        disabled: !selectable, onEdit: catalog ? () => setEdit({ original: language }) : undefined,
      }))}
      addAction={catalog ? { label: 'Добавить язык', onClick: () => setEdit({}) } : undefined}/></div>
    {canManage && state?.error && <div className="text-sm" role="alert">{state.error} <Button size="sm" variant="ghost" onClick={state.refresh}>Обновить языки</Button></div>}
    {notice && <p className="absolute start-0 top-full z-20 mt-1 w-max max-w-[min(18rem,80vw)] rounded-md border bg-[var(--app-surface-bg)] px-3 py-2 text-sm shadow-sm" role="status">{notice}</p>}
    {catalog && edit && <LanguageDialog ownerId={ownerId} initial={edit} catalog={catalog} onClose={() => setEdit(undefined)} onSaved={item => {
      const creating = !edit.original;
      state?.saved(item); setEdit(undefined);
      const available = supported.includes(item.code.toUpperCase());
      if (creating && !available) {
        setNotice(allowManualGlossary ? 'Язык добавлен. Можно заполнять глоссарий вручную.' : 'Язык добавлен в каталог. Это направление перевода пока недоступно.');
      } else setNotice('Язык сохранён.');
      if (creating && !item.hidden && (available || allowManualGlossary)) onChange(item.code.toUpperCase());
    }}/>}
  </div>;
}

export function LanguageSettings({ ownerId }: { ownerId: string }) {
  const state = useContext(LanguageContext);
  const catalog = state?.catalog;
  const [showHidden, setShowHidden] = useState(false);
  const action = useBookAction();
  const [edit, setEdit] = useState<EditLanguage>();
  const [notice, setNotice] = useState('');
  function duplicate(language: AccountLanguage) {
    const base = language.label.replace(/ copy(?: \d+)?$/, '').slice(0, 68);
    let label = base + ' copy';
    for (let i = 2; catalog?.languages.some(item => item.label === label); i++) label = base + ' copy ' + i;
    setEdit({ copyLabel: label });
  }
  function toggleHidden(item: AccountLanguage) {
    void action.run(async signal => {
      const response = await writeLanguage(ownerId, item.code, item.label, !item.hidden, item.revision, signal);
      if (response.status === 409) state?.refresh();
      const data: { language: AccountLanguage } = await (await checkedResponse(response)).json();
      if (!signal.aborted) { state?.saved(data.language); setNotice(data.language.hidden ? 'Язык скрыт.' : 'Язык восстановлен.'); }
    }, item.hidden ? 'Восстанавливаем язык…' : 'Скрываем язык…');
  }
  return <Card className="grid gap-4 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2>Мои языки перевода</h2>
      <Button variant="outline" disabled={!catalog} onClick={() => setEdit({})}><Plus aria-hidden/>Добавить язык</Button></div>
    {state?.error && <div role="alert">{state.error} <RefreshButton pending={false} onClick={state.refresh}>Повторить</RefreshButton></div>}
    {!catalog && !state?.error && <PendingText>Загружаем языки…</PendingText>}
    {action.busy && <PendingText>{action.pending}</PendingText>}
    {action.error && <p role="alert">{action.error}</p>}
    {notice && !action.busy && <p role="status">{notice}</p>}
    {catalog && <>
      <label className="flex items-center gap-2"><input type="checkbox" checked={showHidden}
        onChange={e => setShowHidden(e.target.checked)}/>Показать скрытые</label>
      <ul>{catalog.languages.filter(item => !item.hidden || showHidden).sort((a,b) => a.label.localeCompare(b.label, 'ru')).map(item => {
        const directions = catalog.supportedDirections.filter(d => d.targetLang === item.code.toUpperCase());
        return <li key={item.code} className="flex items-center justify-between gap-3 border-t py-3">
          <button type="button" className="min-w-0 text-start" onClick={() => setEdit({ original: item })}>
            <span className="break-words font-medium">{item.label} · {item.code.toUpperCase()}{item.hidden && ' · Скрыт'}</span>
            <small className="block pt-muted">{directions.length ? directions.map(d => d.sourceLang + ' → ' + d.targetLang).join(', ') : 'Направления перевода пока не подключены'}</small>
          </button>
          <StudioEntityMenu disabled={action.busy} label={'Действия с языком «' + item.label + '»'} actions={[
            { label:'Редактировать', onClick: () => setEdit({ original: item }) },
            { label:'Дублировать', onClick: () => duplicate(item) },
            { label:item.hidden ? 'Восстановить' : 'Скрыть', onClick: () => toggleHidden(item) },
          ]}/>
        </li>;
      })}</ul>
      {edit && <LanguageDialog ownerId={ownerId} initial={edit} catalog={catalog} onClose={() => setEdit(undefined)} onSaved={item => {
        state?.saved(item); setEdit(undefined); setNotice(item.hidden ? 'Язык скрыт.' : 'Язык сохранён.');
      }}/>}
    </>}
  </Card>;
}
