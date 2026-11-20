'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { BookStagePrompt } from '@/lib/api';
import { listPersonalPrompts, type PersonalPrompt } from '@/lib/translationPromptVariants';
import { templateLink } from '@/lib/translationWorkspacePath';
import { bookEndpoint, useBookData } from './bookRequests';

type TemplateLink = Pick<BookStagePrompt, 'name' | 'stage' | 'overridden'>;
const stageLabels: Record<TemplateLink['stage'], string> = {
  glossary: 'Глоссарий',
  translate: 'Перевод текста',
  revision: 'Стилистическая редактура',
  readerCheck: 'Читательская проверка',
  correction: 'Исправление замечаний',
};

export function StageTemplateLinks({ bookId, lang, glossaryOnly = false }: {
  bookId: string; lang: string; glossaryOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const result = useBookData<TemplateLink[]>(open ? bookEndpoint(bookId, 'stage-prompts', lang) : null, version);
  const [personal, setPersonal] = useState<PersonalPrompt[] | null>(null);
  const [personalError, setPersonalError] = useState(false);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    listPersonalPrompts(controller.signal).then(items => { if (!controller.signal.aborted) { setPersonal(items); setPersonalError(false); } })
      .catch(() => { if (!controller.signal.aborted) { setPersonal(null); setPersonalError(true); } });
    return () => controller.abort();
  }, [open, version]);
  const stages = result?.data?.filter(item => !glossaryOnly || item.stage === 'glossary');

  return <details className="rounded-lg border p-4" onToggle={event => { setOpen(event.currentTarget.open); if (!event.currentTarget.open) { setPersonal(null); setPersonalError(false); } }}>
    <summary className="cursor-pointer font-medium">{glossaryOnly ? 'Шаблон глоссария' : 'Шаблоны для этого направления'}</summary>
    {open && <div className="grid gap-2 pt-3">
      <p className="pt-muted">Для каждого этапа можно открыть шаблон, выбранный для переводов ваших книг.</p>
      {personalError && <div role="alert">Не удалось загрузить выбор вашего аккаунта. <Button variant="ghost" onClick={() => setVersion(n => n + 1)}>Повторить загрузку</Button></div>}
      {!result && <p role="status">Загружаем шаблоны…</p>}
      {result?.error && <div><p role="alert">{result.error}</p><Button variant="ghost" onClick={() => setVersion(n => n + 1)}>Повторить</Button></div>}
      {stages?.length === 0 && <p>У сервера нет шаблонов для этого направления.</p>}
      {stages?.map(({ stage, name }) => {
        const active = personal?.find(item => item.template === name && item.active && !item.deletedAt);
        return <div key={name} className="flex flex-wrap items-center justify-between gap-2 border-t py-2">
          <div><Link className="font-medium underline" href={templateLink(name,active?.id)}>{stageLabels[stage] || name}</Link>
            <small className="block pt-muted">{personalError ? 'Открыть базовый шаблон' : !personal ? 'Проверяем личный вариант…' : active?.label || 'Базовый шаблон'}</small>
          </div>
          {personal && <Button asChild size="sm" variant="outline"><Link href={templateLink(name, 'new')} aria-label={'Добавить вариант · ' + (stageLabels[stage] || name)}>Добавить вариант</Link></Button>}
        </div>;
      })}
    </div>}
  </details>;
}
