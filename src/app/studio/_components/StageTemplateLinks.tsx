'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { BookStagePrompt } from '@/lib/api';
import { listPersonalPrompts, type PersonalPrompt } from '@/lib/translationPromptVariants';
import { recipeEndpoint, type RecipeSettings } from '@/lib/studioRecipe';
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

type TemplateContext = { bookId: string; lang: string; sourceLang: string };

export function StageTemplateLinks(props: TemplateContext) {
  const [open, setOpen] = useState(false);
  return <details className="rounded-lg border p-4" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer font-medium">Шаблоны для этого направления</summary>
    {open && <StageTemplateList {...props}/>}
  </details>;
}

export function StageTemplateList({ bookId, lang, sourceLang, glossaryOnly = false }: TemplateContext & { glossaryOnly?: boolean }) {
  const [version, setVersion] = useState(0);
  const result = useBookData<TemplateLink[]>(bookEndpoint(bookId, 'stage-prompts', lang), version);
  const recipe = useBookData<RecipeSettings>(recipeEndpoint({scope:'book', scopeId:bookId, sourceLang, targetLang:lang}), version);
  const [personal, setPersonal] = useState<PersonalPrompt[] | null>(null);
  const [personalError, setPersonalError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    listPersonalPrompts(controller.signal).then(items => { if (!controller.signal.aborted) { setPersonal(items); setPersonalError(false); } })
      .catch(() => { if (!controller.signal.aborted) { setPersonal(null); setPersonalError(true); } });
    return () => controller.abort();
  }, [version]);
  function retry() {
    setPersonalError(false);
    setVersion(n => n + 1);
  }
  const stages = result?.data?.filter(item => !glossaryOnly || item.stage === 'glossary');

  return <div className="grid gap-2 pt-3">
      {!glossaryOnly && <p className="pt-muted">Для каждого этапа можно открыть шаблон, выбранный для переводов ваших книг.</p>}
      {personalError && <div role="alert">Не удалось загрузить выбор вашего аккаунта. <Button variant="ghost" onClick={retry}>Повторить загрузку</Button></div>}
      {(!result || (!personal && !personalError)) && <p role="status">Загружаем шаблоны…</p>}
      {result?.error && <div><p role="alert">{result.error}</p><Button variant="ghost" onClick={retry}>Повторить</Button></div>}
      {stages?.length === 0 && <p>У сервера нет шаблонов для этого направления.</p>}
      {stages?.map(({ stage, name }) => {
        const tracked = stage === 'glossary' || stage === 'translate';
        const promptId = tracked ? recipe?.data?.effective[stage === 'glossary' ? 'glossaryPromptId' : 'translatePromptId'] : undefined;
        const active = personal?.find(item => item.template === name && !item.deletedAt && (tracked ? item.id === promptId : item.active));
        const waiting = tracked && !recipe?.data;
        return <div key={name} className="flex flex-wrap items-center justify-between gap-2 border-t py-2">
          <div><Link className="font-medium underline" href={templateLink(name,active?.id)}>{stageLabels[stage] || name}</Link>
            <small className="block pt-muted">{personalError || recipe?.error ? 'Открыть базовый шаблон' : !personal || waiting ? 'Проверяем выбор для книги…' : active?.label || 'Базовый шаблон'}</small>
          </div>
          {personal && <Button asChild size="sm" variant="outline"><Link href={templateLink(name, 'new')} aria-label={'Добавить вариант · ' + (stageLabels[stage] || name)}>Добавить вариант</Link></Button>}
        </div>;
      })}
  </div>;
}
