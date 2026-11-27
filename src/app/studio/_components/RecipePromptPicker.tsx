'use client';

import { useEffect, useId, useState } from 'react';
import IOSSettingsRow from '@/components/ui/ios-settings-row';
import IOSDialog from '@/components/ui/ios-dialog';
import { Button } from '@/components/ui/button';
import type { ServerPrompt } from '@/lib/api';
import { listPersonalPrompts, type PersonalPrompt } from '@/lib/translationPromptVariants';
import { studioErrorMessage } from '@/lib/studioFetch';
import { bookGet } from './bookRequests';
import { PromptEditor } from './PromptEditor';

type PickedPrompt = { variant?: PersonalPrompt; selectAfterSave: boolean };

function RecipePromptDialog({ ownerId, name, initial, onSaved, onClose }: {
  ownerId: string; name: string; initial?: PersonalPrompt; onSaved: (item: PersonalPrompt) => void; onClose: () => void;
}) {
  const title = useId();
  const [template, setTemplate] = useState<ServerPrompt>();
  const [variant, setVariant] = useState(initial);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    async function read() {
      try {
        const [base, personal] = await Promise.all([
          bookGet<{ prompts: ServerPrompt[] }>('/api/admin/prompts', signal),
          initial ? listPersonalPrompts(signal) : Promise.resolve([]),
        ]);
        const current = base.prompts.find(p => p.name === name);
        const saved = personal.find(p => p.id === initial?.id && p.template === name);
        if (!current || (initial && !saved)) throw Error('Шаблон больше недоступен.');
        if (!signal.aborted) { setTemplate(current); setVariant(saved); setError(''); }
      } catch (err) {
        if (!signal.aborted) setError(studioErrorMessage(err, 'Не удалось загрузить шаблон.'));
      }
    }
    void read();
    return () => controller.abort();
  }, [name, initial, reload]);
  // Keep the same editor mounted on a failed conflict refresh, preserving its text.
  if (template) return <PromptEditor ownerId={ownerId} template={template} catalog={[]} variant={variant}
    personal personalReady onSaved={onSaved} onClose={onClose} loadLatest={() => setReload(n => n + 1)}
    refreshError={error}/>;
  return <IOSDialog open labelledBy={title} onOpenChange={open => { if (!open) onClose(); }} className="grid gap-3 p-5">
    <h2 id={title}>Личный шаблон</h2>
    {error ? <><p role="alert">{error}</p><Button variant="outline" onClick={() => { setError(''); setReload(n => n + 1); }}>Повторить</Button></>
      : <p role="status">Загружаем редактор…</p>}
    <Button variant="ghost" onClick={onClose}>Закрыть</Button>
  </IOSDialog>;
}

export function RecipePromptPicker({ ownerId, label, name, value, inherited, inheritedLabel = 'По рецепту', choices, disabled, onChange, onSaved }: {
  ownerId: string; label: string; name?: string; value: string; inherited?: PersonalPrompt; inheritedLabel?: string;
  choices: PersonalPrompt[]; disabled: boolean; onChange: (id: string) => void; onSaved: (item: PersonalPrompt) => void;
}) {
  const [picked, setPicked] = useState<PickedPrompt | null>(null);
  return <>
    <IOSSettingsRow label={label} value={value} onChange={onChange} disabled={disabled}
      addAction={name ? { label: 'Добавить вариант', onClick: () => setPicked({ selectAfterSave: true }) } : undefined}
      options={[{ id: '', label: inheritedLabel + ' · ' + (inherited?.label ?? 'базовый шаблон') },
        { id: 'default', label: 'Базовый шаблон', onEdit: name ? () => setPicked({ selectAfterSave: value === 'default' || (!value && !inherited) }) : undefined },
        ...choices.map(variant => ({ id: variant.id, label: variant.label,
          onEdit: name ? () => setPicked({ variant, selectAfterSave: false }) : undefined }))]}/>
    {picked && name && <RecipePromptDialog key={name + '/' + (picked.variant?.id ?? 'new')} ownerId={ownerId}
      name={name} initial={picked.variant} onClose={() => setPicked(null)} onSaved={saved => {
        onSaved(saved);
        if (picked.selectAfterSave) onChange(saved.id);
      }}/>}
  </>;
}
