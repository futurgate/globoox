'use client';

import { useEffect, useId, useState, type ComponentProps } from 'react';
import { Check, Copy, LoaderCircle, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const messages = {
  ru: { idle: 'Скопировать', pending: 'Копирование…', success: 'Скопировано', error: 'Не удалось скопировать. Выделите текст и скопируйте вручную.' },
  en: { idle: 'Copy', pending: 'Copying…', success: 'Copied', error: 'Could not copy. Select the text and copy it manually.' },
};
const icons = { idle: Copy, pending: LoaderCircle, success: Check, error: TriangleAlert };
type CopyLanguage = keyof typeof messages;

export function CopyTextButton({ text, subject, language = 'ru' }: {
  text: string; subject: string; language?: CopyLanguage;
}) {
  const [state, setState] = useState<keyof typeof icons>('idle');
  const labels = messages[language];
  const Icon = icons[state];
  useEffect(() => {
    if (state !== 'success' && state !== 'error') return;
    const timeout = window.setTimeout(() => setState('idle'), 2500);
    return () => window.clearTimeout(timeout);
  }, [state]);

  async function copy() {
    if (state === 'pending' || !text) return;
    setState('pending');
    try {
      await navigator.clipboard.writeText(text);
      setState('success');
    } catch {
      setState('error');
    }
  }

  return <>
    <Button type="button" size="icon-sm" variant="ghost" onClick={copy}
      disabled={!text} aria-disabled={!text || state === 'pending'} aria-label={labels[state]}
      aria-description={subject} title={state === 'idle' ? labels.idle + ' · ' + subject : labels[state]}
      className={cn('text-[var(--app-text-muted)]', state === 'success' && 'text-[var(--app-accent)]', state === 'error' && 'text-destructive')}>
      <Icon aria-hidden="true" className={state === 'pending' ? 'animate-spin motion-reduce:animate-none' : undefined}/>
    </Button>
    <span className="sr-only" aria-live="polite" aria-atomic="true">{state !== 'idle' && labels[state]}</span>
  </>;
}

export function CopyableTextarea({ label, fieldClassName, copyLanguage, id, className, value, ...props }: Omit<ComponentProps<'textarea'>, 'value'> & {
  value: string; label?: string; fieldClassName?: string; copyLanguage?: CopyLanguage;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return <div className={cn('min-w-0', fieldClassName)}>
    {label && <label htmlFor={fieldId}>{label}</label>}
    <div className="relative">
      <Textarea {...props} id={fieldId} value={value} className={cn(className, 'block pr-12')} />
      <span className="absolute end-3 top-1">
        <CopyTextButton text={value} subject={label || props['aria-label'] || ''} language={copyLanguage}/>
      </span>
    </div>
  </div>;
}

export function CopyableText({ text, label, className, role, as: Content = 'pre' }: {
  text: string; label: string; className?: string; role?: string; as?: 'pre' | 'p';
}) {
  return <div className="flex min-w-0 items-start gap-1">
    <Content className={cn('min-w-0 flex-1 whitespace-pre-wrap break-words', className)} role={role}>{text}</Content>
    <CopyTextButton text={text} subject={label}/>
  </div>;
}
