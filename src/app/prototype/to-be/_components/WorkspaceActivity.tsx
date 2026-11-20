'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { WorkspaceAttention as Attention, WorkspaceActivity as Activity, WorkspaceData } from '@/lib/translationWorkspaceTypes';
import IOSSettingsRow from '@/components/ui/ios-settings-row';
import SeriesWorkspace from './SeriesWorkspace';

function bookUrl(bookId: string, language?: string | null) {
  const book = '/prototype/to-be/books/' + encodeURIComponent(bookId);
  return language ? book + '/translations/' + encodeURIComponent(language) : book;
}

function decisionUrl(item: Attention) {
  const book = bookUrl(item.bookId, item.language);
  if (!item.language) return book;
  if (item.blockId) return book + '/review?block=' + encodeURIComponent(item.blockId);
  return book + (item.step?.startsWith('step0') ? '/glossary' : '/runs');
}

export default function WorkspaceActivity({ view, workspace }: {view: 'decisions'|'queue'; workspace: WorkspaceData}) {
  const admin = workspace.role === 'admin';
  const decisions = view === 'decisions';
  const [seriesId, setSeriesId] = useState('');
  const series = workspace.series.find(s => s.id === seriesId);
  const [data, setData] = useState<Activity | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const controller = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    try {
      const response = await fetch('/api/translation-workspace/activity', { cache: 'no-store', signal: next.signal });
      if (!response.ok) throw new Error('Не удалось загрузить события (' + response.status + ').');
      const activity: Activity = await response.json();
      if (!next.signal.aborted) { setData(activity); setError(''); }
    } catch (err) {
      if (!next.signal.aborted) setError(err instanceof Error ? err.message : 'Не удалось загрузить события.');
    }
  }, []);
  useEffect(() => {
    if (!admin) return;
    void load();
    const timer = window.setInterval(() => { if (!document.hidden) void load(); }, 30000);
    return () => { window.clearInterval(timer); controller.current?.abort(); };
  }, [admin, load]);
  async function resolve(item: Attention) {
    setBusy(item.id);
    setError('');
    try {
      const response = await fetch('/api/translation-workspace/books/' + encodeURIComponent(item.bookId) + '/resolve-attention', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id }),
      });
      if (!response.ok) throw new Error('Не удалось закрыть вопрос (' + response.status + ').');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Не удалось закрыть вопрос.'); }
    finally { setBusy(''); }
  }

  if (!admin) return <Card className="p-5"><h2>Решения по вашим книгам</h2>
    <p className="pt-muted">Планируется · Для просмотра автором нужен доступ к вопросам по своей книге.</p></Card>;
  return <div className="pt-stack">
    <div><Button size="sm" variant="outline" onClick={load}>Обновить</Button></div>
    {error && <p role="alert">{error}</p>}
    {!data && !error && <p role="status">Загружаем…</p>}
    {data && (decisions ? <Card className="gap-2 p-5">
      <h2>Открытые вопросы</h2>
      {!data.attentionAvailable ? <p role="status">Сервер сейчас не предоставляет список вопросов.</p>
        : <>
          {!data.attentionComplete && <p className="pt-muted">Сервер вернул ограниченную выборку. Более ранние вопросы могут отсутствовать.</p>}
          {data.attention.length === 0 && <p>{data.attentionComplete ? 'По вашим книгам нет открытых вопросов.' : 'В полученной выборке вопросов по вашим книгам нет.'}</p>}
          {data.attention.map(item => <div key={item.id} className="pt-row flex-wrap">
            <div><Link className="font-semibold underline" href={decisionUrl(item)}>{item.bookTitle}</Link>
              <p>{item.reason || 'Требуется проверка этапа'}</p>
              {item.step && <small className="pt-muted">{item.step}</small>}</div>
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => resolve(item)}>
              {busy === item.id ? 'Сохраняем…' : 'Отметить решённым'}</Button>
          </div>)}
        </>}
    </Card> : <Card className="gap-2 p-5">
      <h2>Ход переводов</h2>
      {!data.translationsAvailable ? <p role="status">История переводов сейчас недоступна.</p>
       : data.translations.length === 0 ? <p>По вашим книгам пока нет зарегистрированных переводов.</p>
       : data.translations.map(item => <div className="pt-row flex-wrap" key={item.bookId + item.language}>
         <Link className="font-semibold underline" href={bookUrl(item.bookId, item.language) + '/runs'}>{item.title} · {item.language}</Link>
         <span>{item.state === 'complete' ? 'Переведено' : item.state === 'partial' ? 'Частично переведено' : 'Ожидает перевода'} · глав {item.doneChapters} из {item.totalChapters}
         {item.errorChapters > 0 && ' · с ошибками ' + item.errorChapters}</span>
       </div>)}
    </Card>)}
    {!decisions && workspace.series.length > 0 && <Card className="p-5 gap-3"><h2>Обработка по томам</h2>
      <IOSSettingsRow label="Серия" value={seriesId} onChange={setSeriesId} options={[
        {id: '', label: 'Выбрать серию'}, ...workspace.series.map(s => ({id: s.id, label: s.name || workspace.books.find(b => b.seriesId === s.id)?.title || 'Серия'})),
      ]} />
      {series && <SeriesWorkspace key={series.id} series={series} role={workspace.role} books={workspace.books.filter(b => b.seriesId === series.id)} />}
    </Card>}
  </div>;
}
