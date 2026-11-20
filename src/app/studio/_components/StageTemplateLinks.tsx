'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { BookStagePrompt } from '@/lib/api';
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
  const stages = result?.data?.filter(item => !glossaryOnly || item.stage === 'glossary');

  return <details className="rounded-lg border p-4" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer font-medium">{glossaryOnly ? 'Шаблон глоссария' : 'Шаблоны для этого направления'}</summary>
    {open && <div className="grid gap-2 pt-3">
      <p className="pt-muted">Эти шаблоны действуют для всех книг, которые их используют. Можно открыть действующий текст или подготовить свой вариант.</p>
      {!result && <p role="status">Загружаем шаблоны…</p>}
      {result?.error && <div><p role="alert">{result.error}</p><Button variant="ghost" onClick={() => setVersion(n => n + 1)}>Повторить</Button></div>}
      {stages?.length === 0 && <p>У сервера нет шаблонов для этого направления.</p>}
      {stages?.map(({ stage, name, overridden }) => {
        return <div key={name} className="flex flex-wrap items-center justify-between gap-2 border-t py-2">
          <div><Link className="font-medium underline" href={templateLink(name)}>{stageLabels[stage] || name}</Link>
            <small className="block pt-muted">{overridden ? 'Изменён администратором' : 'Исходный шаблон'}</small>
          </div>
          <Button asChild size="sm" variant="outline"><Link href={templateLink(name, 'new')} aria-label={'Добавить вариант · ' + (stageLabels[stage] || name)}>Добавить вариант</Link></Button>
        </div>;
      })}
    </div>}
  </details>;
}
