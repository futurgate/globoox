'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import IOSAlertDialog from '@/components/ui/ios-alert-dialog';
import { listServerPrompts, resetServerPrompt, saveServerPrompt, type ServerPrompt } from '@/lib/api';
import SampleRun from './SampleRun';

const labels = { glossary: 'Глоссарий', translate: 'Перевод', revise: 'Стилистическая редактура', 'reader-check': 'Читательская проверка' };
const endpoint = '/prototype/to-be/settings/templates/';

export default function WorkspaceSettings({ name }: { name?: string }) {
  const [list, setList] = useState<ServerPrompt[] | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() =>
    listServerPrompts().then(prompts => {
      setList(prompts);
      setError('');
    }).catch(err => { setError(err instanceof Error ? err.message : 'Не удалось получить шаблоны.'); }), []);
  useEffect(() => { void load(); }, [load]);
  if (error) return <div><p role="alert">{error}</p><Button variant="outline" onClick={load}>Попробовать снова</Button></div>;
  if (!list) return <p role="status">Загружаем действующие шаблоны…</p>;
  if (name) {
    const template = list.find(p => p.name === name);
    if (!template) return <p>В каталоге нет такого шаблона.</p>;
    return <PromptEditor key={template.name} template={template} refresh={load} />;
  }
  return <div className="pt-stack">
    <p>Изменения шаблона применяются при следующем запуске соответствующего этапа для всех книг, которые его используют.</p>
    {Object.entries(labels).map(([group, label]) => {
      const items = list.filter(p => p.group === group);
      return items.length > 0 && <Card key={group} className="gap-1 p-5"><h2>{label}</h2>
        {items.map(p => <Link className="pt-row" href={endpoint + encodeURIComponent(p.name)} key={p.name}>
          <span className="min-w-0 break-words">{p.label}<small className="pt-muted block">{p.name}</small></span>
          <span className="pt-muted">{p.overridden ? 'Изменён' : 'Исходный'} ›</span>
        </Link>)}</Card>;
    })}
    <Card className="p-5 gap-1"><h2>Рецепты</h2><p>Применяемый рецепт виден в карточке серии.</p>
      <p className="pt-muted">Планируется · Создание шаблонов и публикация собственных версий рецепта.</p></Card>
  </div>;
}

function PromptEditor({ template, refresh }: { template: ServerPrompt; refresh: () => Promise<void> }) {
  const [value, setValue] = useState(template.content);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<'save'|'reset'|null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const missing = Array.from(new Set(template.shipped.match(/\{[A-Z0-9_]+\}/g))).filter(field => !value.includes(field));

  async function apply() {
    setBusy(true); setError(''); setNotice('');
    try {
      if (confirm === 'reset') {
        await resetServerPrompt(template.name);
        setValue(template.shipped);
      } else { await saveServerPrompt(template.name, value); }
      await refresh();
      setNotice('Шаблон сохранён.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Не удалось сохранить шаблон.'); }
    finally { setConfirm(null); setBusy(false); }
  }
  return <div className="pt-stack">
    <Card className="p-5 gap-3">
      <h2>{labels[template.group]}</h2><p>{template.label}</p>
      <label className="pt-field">Текст шаблона
        <Textarea rows={13} spellCheck={false} className="font-mono text-sm" value={value} onChange={e => {setValue(e.target.value); setNotice('');}} />
      </label>
      {missing.length > 0 && <p role="alert">Верните обязательные подстановки {missing.join(', ')}.</p>}
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || value === template.content || !value.trim() || !!missing.length} onClick={() => setConfirm('save')}>Сохранить шаблон</Button>
        <Button variant="outline" disabled={busy || !template.overridden} onClick={() => setConfirm('reset')}>Вернуть исходный</Button>
        <Button variant="outline" onClick={async () => {
          try {await navigator.clipboard.writeText(value); setError(''); setNotice('Скопировано.');}
          catch {setError('Не удалось скопировать. Выделите текст в поле шаблона.');}
        }}>Скопировать</Button>
      </div>
      {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    </Card>
    <SampleRun template={template} draft={value} />
    <IOSAlertDialog open={!!confirm} onOpenChange={open => {if (!open) setConfirm(null);}} loading={busy}
      title={confirm === 'reset' ? 'Вернуть исходный шаблон?' : 'Сохранить общий шаблон?'}
      description="Следующий запуск этого этапа использует сохранённый текст во всех книгах с таким шаблоном."
      confirmLabel={confirm === 'reset' ? 'Вернуть исходный' : 'Сохранить'} cancelLabel="Отмена" onConfirm={apply} />
  </div>;
}
