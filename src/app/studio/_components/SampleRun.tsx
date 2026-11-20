'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import IOSSettingsRow from '@/components/ui/ios-settings-row';
import { fetchPlaygroundModels, runFictionFlowPlaygroundStream, type ServerPrompt } from '@/lib/api';

import { previewDirections, promptPreview } from '@/lib/translationPromptPreview';

export default function SampleRun({ template, catalog, draft, valid }: {
  template: ServerPrompt; catalog: ServerPrompt[]; draft: string; valid: boolean;
}) {
  const directions = previewDirections(template.name);
  const [direction, setDirection] = useState(directions[0]);
  const [text, setText] = useState('');
  const [model, setModel] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [output, setOutput] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    let active = true;
    fetchPlaygroundModels().then(data => { if (active) { setModels(data.models); setModel(data.models[0] ?? ''); }}).catch(() => {
      if (active) setError('Список моделей сейчас недоступен.');
    });
    return () => { active = false; controller.current?.abort(); };
  }, []);
  const { stage, enabled, prompts, available } = promptPreview(template, catalog, direction, draft);
  async function run() {
    const next = new AbortController();
    controller.current = next;
    setError(''); setOutput(''); setRunning(true);
    const [sourceLanguage, targetLanguage] = direction.split('-');
    try {
      const res = await runFictionFlowPlaygroundStream({
        sourceText: text, sourceLanguage, targetLanguage, enabled, prompts,
        stageModels: Object.fromEntries(Object.entries(enabled).filter(([, yes]) => yes).map(([key]) => [key, model])),
      }, () => {}, next.signal);
      const result = res.results[0];
      if (!result?.ok) throw new Error(result?.error || 'Сервер не вернул результат.');
      if (template.name === 'reader_check_calques.txt') {
        setOutput(result.readerCheck?.rawText || 'Модель вернула пустой ответ.');
        return;
      }
      const value = result[stage];
      setOutput(stage === 'glossary' ? result.glossary?.text || '' : stage === 'translate' ? result.translate?.draftText || '' : JSON.stringify(value, null, 2) ?? 'Нет исправлений.');
    } catch (err) {
      if (!next.signal.aborted) setError(err instanceof Error ? err.message : 'Не удалось выполнить пробу.');
    } finally { if (!next.signal.aborted) setRunning(false); }
  }
  return <Card className="p-5 gap-3"><h2>Проба на фрагменте</h2>
    <p className="pt-muted">Проба отправляет фрагмент и текущий текст шаблона в выбранную модель. Каждый вызов модели оплачивается.</p>
    {enabled.translate && stage !== 'translate' && <p className="pt-muted">{stage === 'correction'
      ? 'Сначала выполняются перевод и читательская проверка. Исправление запускается для найденных замечаний.'
      : 'Сначала выполняется перевод фрагмента шаблоном, выбранным в вашем аккаунте для этого направления.'}</p>}
    {!available && valid && <p role="alert">Для пробы не найден действующий шаблон одного из этапов этого направления.</p>}
    <IOSSettingsRow label="Направление" value={direction} options={directions.map(id => ({id, label:id.replace('-', ' → ')}))} onChange={setDirection} disabled={running || directions.length < 2}/>
    <IOSSettingsRow label="Модель" value={model} options={models.map(id => ({id, label:id}))} onChange={setModel} disabled={running || !models.length}/>
    <label className="pt-field">Фрагмент оригинала<Textarea value={text} rows={4} onChange={e=>setText(e.target.value)} /></label>
    <div><Button variant="outline" disabled={running || !model || !text.trim() || !valid || !available} onClick={run}>{running ? 'Выполняется…' : 'Запустить пробу'}</Button></div>
    {error && <p role="alert">{error}</p>}{output && <pre className="whitespace-pre-wrap break-words text-sm" role="status">{output}</pre>}
  </Card>;
}
