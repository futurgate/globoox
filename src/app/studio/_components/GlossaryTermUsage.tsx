'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { GlossarySources } from './GlossarySources';
import IOSDialog from '@/components/ui/ios-dialog';
import { Button } from '@/components/ui/button';
import { bookEndpoint, bookPost, useBookAction, useBookData } from './bookRequests';
import { PendingText, RefreshButton } from './RequestFeedback';
import { studioErrorMessage } from '@/lib/studioFetch';

type Entry = { kind: 'named_entity' | 'terminology'; source: string; target: string; forms: string[] };
type Selection = { blockId: string; fingerprint: string };
type Match = Selection & { bookId: string; bookTitle: string; chapterId: string; chapterTitle: string; original: string; translation: string; manual: boolean };
type Page = { items: Match[]; total: number; previousTarget?: string; nextOffset: number | null; updatedAt: string };
const statuses = { pending: 'В очереди', running: 'Обрабатывается', unchanged: 'Без изменений', applied: 'Обновлён', skipped: 'Пропущен', failed: 'Ошибка' };
type Result = Selection & { status: keyof typeof statuses; message?: string };
type Intent = { requestId: string; lang: string; source: string; kind: Entry['kind']; expectedUpdatedAt: string; blocks: Selection[] };
type Run = { bookId: string; requestId: string; createdAt: string; updatedAt: string; source: string; target: string; kind: Entry['kind']; items: Result[] };

function canResume(run: Run) {
  return run.items.some(item => item.status === 'failed' || item.status === 'pending');
}
function Summary({ items }: { items: Result[] }) {
  return <ul className="flex flex-wrap gap-x-4 text-sm">{Object.entries(statuses).map(([key, label]) => {
    const count = items.filter(item => item.status === key).length;
    return count ? <li key={key}>{label} · {count}</li> : null;
  })}</ul>;
}

export function ProjectTermUsage({ projectId, revision, lang, entry, onClose }: {
  projectId: string; revision: string; lang: string; entry: Entry; onClose: () => void;
}) {
  const title = useId();
  const [reload, setReload] = useState(0);
  const query = new URLSearchParams({projectId, revision, lang, kind:entry.kind, source:entry.source});
  const result = useBookData<{bookId: string | null; updatedAt: string | null}>('/api/studio/project-glossary?' + query,reload);
  const context = result?.data;
  if (context?.bookId && context.updatedAt) return <GlossaryTermUsage bookId={context.bookId} updatedAt={context.updatedAt}
    entry={entry} lang={lang} onClose={onClose}/>;
  return <IOSDialog open labelledBy={title} onOpenChange={open => { if (!open) onClose(); }} className="space-y-3 p-5">
    <h2 id={title}>Употребления · {entry.source}</h2>
    {!result && <PendingText>Ищем сохранённый перевод термина…</PendingText>}
    {result?.error && <div role="alert">{result.error}{' '}
      <RefreshButton pending={result.refreshing} onClick={() => setReload(n => n + 1)}/></div>}
    {context && <p>Этот вариант сохранился в истории проекта. Для поиска употреблений нужен такой же вариант в текущем словаре книги.</p>}
    <Button variant="outline" onClick={onClose}>Закрыть</Button>
  </IOSDialog>;
}

export function GlossaryTermUsage({ bookId, lang, entry, updatedAt, onClose }: {
  bookId: string; lang: string; entry: Entry; updatedAt: string; onClose: () => void;
}) {
  const [pages, setPages] = useState<Page[]>([]);
  const [offset, setOffset] = useState(0);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState('');
  const [chosen, setChosen] = useState<Map<string, Selection>>(new Map());
  const [sent, setSent] = useState<{ intent: Intent; bookId: string } | null>(null);
  const [result, setResult] = useState<Result[] | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const action = useBookAction();
  const requestLock = useRef(false);
  const url = bookEndpoint(bookId, 'glossary-retranslate', lang);
  const history = useBookData<{ runs: Run[] }>(url, action.version + historyVersion);
  const previewUrl = bookEndpoint(bookId, 'glossary-usages', lang);
  const { source, kind, target } = entry;
  useEffect(() => {
    const controller = new AbortController();
    void bookPost(previewUrl, { lang, kind, source, expectedUpdatedAt: updatedAt, offset }, controller.signal)
      .then(async response => {
        const page: Page = await response.json();
        if (controller.signal.aborted) return;
        if (page.updatedAt !== updatedAt || !Array.isArray(page.items)) throw new Error('Версия словаря изменилась. Откройте список употреблений заново.');
        setPages(old => offset === 0 ? [page] : [...old, page]);
        setChosen(old => {
          const next = new Map(offset === 0 ? [] : old);
          for (const item of page.items) {
            if (!item.manual && next.size < 100) next.set(item.blockId, { blockId: item.blockId, fingerprint: item.fingerprint });
          }
          return next;
        });
      }).catch(e => { if (!controller.signal.aborted) setProblem(studioErrorMessage(e, 'Не удалось найти употребления.')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [previewUrl, lang, kind, source, updatedAt, offset, version]);

  const last = pages.at(-1);
  const matches = pages.flatMap(page => page.items);
  function toggle(item: Match) {
    setChosen(old => {
      const next = new Map(old);
      if (!next.delete(item.blockId) && next.size < 100) next.set(item.blockId, { blockId: item.blockId, fingerprint: item.fingerprint });
      return next;
    });
  }
  function send(intent: Intent, sourceBookId = bookId) {
    if (requestLock.current || !intent.blocks.length) return;
    requestLock.current = true;
    setSent({ intent, bookId: sourceBookId }); setResult(null);
    void action.run(async signal => {
      const response = await bookPost(bookEndpoint(sourceBookId, 'glossary-retranslate', lang), intent, signal);
      const body = await response.json();
      if (body.requestId !== intent.requestId || !Array.isArray(body.items)) throw new Error('Не удалось подтвердить результат. Обновите историю этого запуска.');
      if (!signal.aborted) setResult(body.items);
    }, 'Обновляем выбранные абзацы…').finally(() => { requestLock.current = false; });
  }
  function resume(run: Run) {
    send({ requestId: run.requestId, lang, kind: run.kind, source: run.source, expectedUpdatedAt: run.updatedAt,
      blocks: run.items.map(({ blockId, fingerprint }) => ({ blockId, fingerprint })) }, run.bookId);
  }
  const relevant = history?.data?.runs.filter(run => run.kind === kind && run.source === source) || [];
  return <IOSDialog open onOpenChange={open => { if (!open) onClose(); }} labelledBy="studio-glossary-usage-title"
    className="flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl sm:max-w-3xl">
    <header className="flex items-start justify-between gap-3 border-b border-[var(--app-border)] p-4">
      <div><h2 id="studio-glossary-usage-title" className="text-lg font-semibold">Употребления в проекте</h2><p>{source} · {lang}</p><p>{last?.previousTarget && <><del>{last.previousTarget}</del> → </>}{target}</p></div>
      <Button size="sm" variant="ghost" onClick={onClose}>Закрыть</Button>
    </header>
    <div className="space-y-4 overflow-auto p-4">
      <GlossarySources bookId={bookId} lang={lang} entry={{source,kind}}/>
    {loading && <PendingText>Ищем в книгах проекта…</PendingText>}
      {problem && <p role="alert">{problem} <Button variant="ghost" onClick={() => { setLoading(true); setProblem(''); setVersion(v => v + 1); }}>Повторить поиск</Button></p>}
      {last && <p className="pt-muted">Найдено абзацев в готовом переводе · {last.total}</p>}
      {matches.map(item => <label key={item.blockId} className="flex items-start gap-3 border-t border-[var(--app-border)] pt-3">
        <input type="checkbox" className="mt-1" checked={chosen.has(item.blockId)} onChange={() => toggle(item)}
          disabled={!!sent || (!chosen.has(item.blockId) && chosen.size >= 100)}/>
        <span className="min-w-0 space-y-1"><strong className="block text-sm">{item.bookTitle} · {item.chapterTitle}</strong>
          {item.manual && <span className="block text-sm font-medium">Есть ручная правка</span>}
          <span className="block whitespace-pre-wrap break-words text-sm pt-muted">{item.original}</span>
          <span className="block whitespace-pre-wrap break-words">{item.translation}</span></span>
      </label>)}
      {!loading && !problem && last?.nextOffset != null && !sent && <Button variant="outline" onClick={() => { setLoading(true); setOffset(last.nextOffset!); }}>Показать ещё</Button>}
      {chosen.size >= 100 && <p className="pt-muted">За один запуск можно обновить до 100 абзацев.</p>}
      <details open={sent ? true : undefined}><summary>История обновлений этого термина</summary>
        <RefreshButton pending={history?.refreshing || !history} size="sm" onClick={() => setHistoryVersion(n => n + 1)}/>
        {history?.error && <p role="alert">{history.error}</p>}
        {history?.data && !relevant.length && <p>Обновлений пока нет.</p>}
        {relevant.map(run => <div key={run.requestId} className="space-y-1 border-t border-[var(--app-border)] py-2">
          <p>{new Date(run.createdAt).toLocaleString('ru')} · {run.target}</p><Summary items={run.items}/>
          {run.items.filter(item => item.message).map(item => <p className="text-sm" key={item.blockId}>{statuses[item.status]} · {item.message}</p>)}
          {canResume(run) && <Button size="sm" variant="outline" disabled={action.busy} onClick={() => resume(run)}>Продолжить этот запуск</Button>}
        </div>)}
      </details>
    </div>
    <footer className="space-y-2 border-t border-[var(--app-border)] p-4">
      {action.busy && <PendingText>Обновляем выбранные абзацы…</PendingText>}
      {action.error && <p role="alert">{action.error}</p>}
      {result && <div role="status"><Summary items={result}/></div>}
      {!sent ? <><p className="pt-muted text-sm">Повторный перевод выбранных абзацев расходует токены модели.</p>
        <Button disabled={!chosen.size || loading || !!problem} onClick={() => send({ requestId: crypto.randomUUID(), lang, source, kind, expectedUpdatedAt: updatedAt, blocks: [...chosen.values()] })}>Обновить абзацы · {chosen.size}</Button></> :
        !action.busy && !result && <Button variant="outline" onClick={() => send(sent.intent, sent.bookId)}>Проверить и продолжить этот запуск</Button>}
    </footer>
  </IOSDialog>;
}
