'use client';

import { studioErrorMessage, studioFetch } from '@/lib/studioFetch';

import { useCallback, useEffect, useRef, useState } from 'react';

export function bookEndpoint(bookId: string, action: string, lang: string) {
  return `/api/translation-workspace/books/${encodeURIComponent(bookId)}/${action}?lang=${encodeURIComponent(lang)}`;
}

export async function checkedResponse(response: Response) {
  if (response.ok) return response;
  const body = await response.json().catch(() => null);
  const detail = body?.message || body?.statusMessage || body?.error;
  throw new Error(studioErrorMessage(detail, `Сервер вернул ошибку ${response.status}.`, response.status));
}

export async function bookGet<T>(url: string, signal?: AbortSignal): Promise<T> {
  const r = await checkedResponse(await studioFetch(url, { cache: 'no-store', signal }));
  return r.json();
}

export async function downloadBookFile(url: string, filename: string, signal: AbortSignal, format: 'epub' | 'zip' = 'epub') {
  const response = await checkedResponse(await studioFetch(url, { cache: 'no-store', signal }));
  const mime = response.headers.get('content-type') || '';
  const expected = format === 'zip' ? 'application/zip' : 'application/epub+zip';
  if (!mime.includes(expected) && !mime.includes('application/octet-stream')) {
    throw new Error('Сервер не вернул файл ' + format.toUpperCase() + '.');
  }
  const blob = await response.blob();
  signal.throwIfAborted();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename.replace(/[/\\]/g, '_') + '.' + format;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  if (format === 'zip') {
    const skipped = response.headers.get('X-Skipped-Volumes');
    return skipped ? 'Скачивание началось. В архив не вошли тома: ' + skipped.split(',').join(', ') + '.' : 'Скачивание архива началось.';
  }
}

export async function bookPost(url: string, body: object, signal?: AbortSignal) {
  return checkedResponse(await studioFetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), cache: 'no-store', signal,
  }));
}

export function useBookData<T>(url: string | null, version = 0, poll: boolean | ((data: T) => boolean) = false) {
  const [result, setResult] = useState<{ url: string; data?: T; error?: string } | null>(null);
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      let continuePolling = poll === true;
      try {
        const data = await bookGet<T>(url, controller.signal);
        if (!controller.signal.aborted) {
          setResult({ url, data });
          if (typeof poll === 'function') continuePolling = poll(data);
        }
      } catch (e) {
        if (!controller.signal.aborted) setResult({ url, error: studioErrorMessage(e, 'Не удалось получить данные.') });
      } finally {
        if (continuePolling && !controller.signal.aborted) timer = setTimeout(refresh, 5500);
      }
    };
    void refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [url, version, poll]);
  return result?.url === url ? result : null;
}

export function useBookAction() {
  const active = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => () => { active.current?.abort(); }, []);
  const run = useCallback(async (work: (signal: AbortSignal) => Promise<string | void>) => {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true); setError(''); setNotice('');
    try {
      const message = await work(controller.signal);
      if (!controller.signal.aborted) setNotice(message || '');
    } catch (e) {
      if (!controller.signal.aborted) setError(studioErrorMessage(e, 'Не удалось выполнить действие.'));
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false); setVersion(n => n + 1);
      }
      active.current = null;
    }
  }, []);
  return { busy, error, notice, run, version };
}

export async function consumeStage(response: Response): Promise<string> {
  if (!response.body || !response.headers.get('content-type')?.includes('ndjson')) {
    throw new Error('Сервер не вернул поток этапа. Обновите состояние книги перед повторным запуском.');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '', done = false, error = '', stopped = false;
  function eventLine(line: string) {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.type === 'error' || event.type === 'chapter_error' || event.type === 'block_error') {
      error = event.error || 'При выполнении этапа возникла ошибка.';
    }
    if (event.type === 'book_done') {
      done = true;
      stopped = event.stopped || event.status === 'stopped';
      if (event.errors || event.status === 'error') error ||= 'При выполнении этапа возникли ошибки.';
    }
    if (event.type === 'book_stopped' || event.type === 'stopped') stopped = true;
  }
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      pending += decoder.decode(chunk.value, { stream: true });
      const lines = pending.split('\n');
      pending = lines.pop() ?? '';
      lines.forEach(eventLine);
    }
    eventLine(pending + decoder.decode());
  } finally {
    reader.releaseLock();
  }
  if (error) throw new Error(error);
  if (stopped) return 'Этап остановлен.';
  return done ? 'Этап завершён.' : 'Поток завершился без итогового статуса. Проверьте состояние этапа перед повторным запуском.';
}
