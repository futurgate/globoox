'use client';

import { studioFetch } from '@/lib/studioFetch';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FileArchive, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import IOSSettingsRow from '@/components/ui/ios-settings-row';
import { ApiRequestError, BookJobError, getSignedUploadUrl, processBook, uploadToStorage, waitForBookJob } from '@/lib/api';
import type { WorkspaceData } from '@/lib/translationWorkspaceTypes';
import { bookPath, projectsPath, projectPath, seriesPath } from './projectLinks';

import { seriesGenres } from './seriesGenres';

type SeriesUpload = {
  seriesId: string;
  books: { bookId: string; fileName: string; volumeNumber: number }[];
  failures: { fileName: string; error: string }[];
};
type Uploaded = { bookId: string } | { series: SeriesUpload };
export default function ProjectImport({ data, refresh, projectId }: { data: WorkspaceData; refresh: () => Promise<void>; projectId?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<'epub' | 'zip'>('epub');
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [genre, setGenre] = useState('litrpg');
  const [phase, setPhase] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<Uploaded | null>(null);
  const [checkCatalog, setCheckCatalog] = useState(false);
  const [job, setJob] = useState<{jobId: string; bookId: string} | null>(null);
  const [retryBookId, setRetryBookId] = useState<string>();
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const reset = () => { setFile(null); setResult(null); setError(''); setJob(null); setCheckCatalog(false); setRetryBookId(undefined); };
  const openImported = async (bookId: string, signal: AbortSignal) => {
    setResult({ bookId });
    await refresh();
    if (!signal.aborted) router.replace(bookPath(bookId));
  };
  const poll = async (jobId: string, signal: AbortSignal) => {
    const ready = await waitForBookJob(jobId, signal, (progress) => setPhase('Обработка книги · ' + progress + '%'));
    if (signal.aborted) return;
    setJob(null);
    await openImported(ready.bookId, signal);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (controller.current || !file || result || checkCatalog) return;
    const request = new AbortController();
    controller.current = request;
    const { signal } = request;
    let sentForProcessing = false;
    let acceptedBookId = job?.bookId;
    setError('');
    try {
      if (job) {
        setPhase('Проверяем состояние импорта…');
        await poll(job.jobId, signal);
        return;
      }
      setPhase('Проверяем файл…');
      if (!file.name.toLowerCase().endsWith('.' + mode) || file.size === 0) throw new Error('Выберите непустой файл .' + mode + '.');
      const bytes = new Uint8Array(await file.slice(0, 4).arrayBuffer());
      if (bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 3 || bytes[3] !== 4) throw new Error('Не удалось прочитать архив. Проверьте файл и выберите его ещё раз.');
      const suffix = crypto.randomUUID();
      const prefix = mode === 'zip' ? 'series-' + data.userId + '-' : data.projects ? 'studio-' + data.userId + '-' : '';
      const key = prefix + suffix + '.' + mode;
      setPhase('Загружаем файл…');
      const { signedUrl } = await getSignedUploadUrl('books', key, signal);
      await uploadToStorage(signedUrl, file, mode === 'zip' ? 'application/zip' : 'application/epub+zip', signal);
      setPhase(mode === 'zip' ? 'Регистрируем тома серии…' : 'Обрабатываем EPUB…');
      sentForProcessing = true;
      if (mode === 'zip') {
        const response = await studioFetch('/api/translation-workspace/series/import', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
          body: JSON.stringify({ zip_path: key, file_name: file.name, name: name.trim() || undefined, genre }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          if (response.status >= 400 && response.status < 500) sentForProcessing = false;
          const message = payload?.message ?? payload?.error;
          throw new Error(typeof message === 'string' ? message : 'Не удалось импортировать серию (' + response.status + ').');
        }
        if (!payload?.seriesId || !Array.isArray(payload.books) || !Array.isArray(payload.failures)) throw new Error('Сервер не подтвердил результат импорта.');
        setResult({ series: payload });
      } else {
        const response = await processBook(key, file.name, file.size, signal, retryBookId, data.projects ? { studio: true, projectId } : undefined);
        if ('jobId' in response && response.jobId && response.bookId) {
          acceptedBookId = response.bookId;
          setJob({ bookId: response.bookId, jobId: response.jobId });
          sentForProcessing = false;
          await poll(response.jobId, signal);
          return;
        }
        if (!('id' in response) || !response.id) throw new Error('Сервер не подтвердил результат импорта.');
        await openImported(response.id, signal);
        return;
      }
      void refresh().catch(() => {});
    } catch (cause) {
      if (signal.aborted) return;
      if (cause instanceof BookJobError && cause.kind === 'processing_failed') {
        setRetryBookId(acceptedBookId);
        setJob(null);
      }
      const rejected = cause instanceof ApiRequestError && [400, 401, 403, 413, 415, 422].includes(cause.status);
      setCheckCatalog(sentForProcessing && !rejected);
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить файл.');
    } finally {
      if (!signal.aborted) setPhase('');
      controller.current = null;
    }
  };
  const zipProject = result && 'series' in result ? data.projects?.find(project => project.sourceSeriesId === result.series.seriesId) : undefined;
  if (result) return (
    <Card className="items-start gap-4 p-5 sm:p-6">
      {'series' in result ? <>
        <p className="font-medium">Импорт серии завершён. Принято томов: {result.series.books.length}.</p>
        {result.series.failures.length > 0 && <div role="status"><p>Не удалось импортировать:</p><ul className="list-disc break-words pl-5">{result.series.failures.map((f, i) => <li key={i}>{f.fileName} — {f.error}</li>)}</ul></div>}
        <Button asChild><Link href={zipProject ? projectPath(zipProject.id) : seriesPath(result.series.seriesId)}>{zipProject ? 'Открыть проект' : 'Открыть серию'}</Link></Button>
      </> : <>
        <p className="font-medium">Книга готова к работе.</p>
        <Button asChild><Link href={bookPath(result.bookId)}>Открыть книгу</Link></Button>
      </>}
      <Button variant="ghost" onClick={reset}>Загрузить ещё</Button>
    </Card>
  );
  const locked = Boolean(phase || job || checkCatalog);
  return (
    <Card className="max-w-2xl p-5 sm:p-6">
      <form onSubmit={submit} className="space-y-5" aria-busy={Boolean(phase)}>
        {!projectId && <IOSSettingsRow label="Что загрузить" value={mode} disabled={locked} options={[
          { id: 'epub', label: 'Книгу в EPUB' }, { id: 'zip', label: 'Серию в ZIP' },
        ]} onChange={(value) => { reset(); setMode(value === 'zip' ? 'zip' : 'epub'); }} />}
        {mode === 'zip' && data.role !== 'admin' ? (
          <div className="space-y-2">
            <Button type="button" disabled><Upload />Загрузить ZIP</Button>
            <p className="text-sm font-semibold">Планируется</p>
            <p className="text-sm text-[var(--app-text-muted)]">Сейчас вы можете загружать книги по одной в EPUB.</p>
          </div>
        ) : <>
          {mode === 'zip' && <>
            <label className="block space-y-1 text-sm font-medium">Название серии
              <Input disabled={locked} value={name} onChange={(e) => setName(e.target.value)} placeholder="По умолчанию — имя архива" />
            </label>
            <IOSSettingsRow label="Жанр серии" value={genre} options={seriesGenres} onChange={setGenre} disabled={locked} />
          </>}
          <label className="block space-y-2 text-sm font-medium" key={mode}>
            <span className="flex items-center gap-2"><FileArchive size={17} />{mode === 'zip' ? 'ZIP с томами серии' : 'Файл EPUB'}</span>
            <Input type="file" accept={mode === 'zip' ? '.zip,application/zip' : '.epub,application/epub+zip'} disabled={locked} onChange={(e) => { setError(''); setFile(e.target.files?.[0] ?? null); setRetryBookId(undefined); }} />
          </label>
          {mode === 'zip' && <p className="text-sm text-[var(--app-text-muted)]">Положите EPUB каждого тома в корень архива. Порядок определяется именами файлов.</p>}
          {error && <p className="break-words text-sm" role="alert">{error}</p>}
          {phase && <p role="status" aria-live="polite" className="text-sm">{phase}</p>}
          {checkCatalog ? (
            <div className="space-y-3 text-sm"><p>Результат запроса не подтверждён. Проверьте каталог перед повторной загрузкой.</p><Button asChild variant="outline"><Link href={projectsPath + '/projects'}>Открыть каталог</Link></Button></div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={!file || Boolean(phase)}><Upload />{job ? 'Проверить состояние' : retryBookId ? 'Повторить импорт' : 'Загрузить'}</Button>
              {job && <Button asChild variant="outline"><Link href={bookPath(job.bookId)}>Открыть книгу</Link></Button>}
            </div>
          )}
        </>}
      </form>
    </Card>
  );
}
