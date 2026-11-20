'use client';

import { BookOpen, ChevronRight, Layers3, Plus, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { WorkspaceBook, WorkspaceData } from '@/lib/translationWorkspaceTypes';
import ProjectImport from './ProjectImport';
import SeriesWorkspace from './SeriesWorkspace';

import { bookPath, projectsPath, seriesPath, processingLabel } from './projectLinks';

const countBooks = new Intl.PluralRules('ru');
export function volumeCount(count: number) {
  const ending = { one: 'том', few: 'тома', many: 'томов' }[countBooks.select(count) as 'one'|'few'|'many'] ?? 'томов';
  return count + ' ' + ending;
}

export function BookRow({ book, context }: { book: WorkspaceBook; context?: string }) {
  const status = book.processingStatus && processingLabel[book.processingStatus];
  return (
    <Link href={bookPath(book.id)} className="flex min-w-0 items-center gap-3 px-4 py-3.5 text-[var(--app-text)] hover:bg-[var(--fill-tertiary)] focus-visible:outline-ring focus-visible:outline-2">
      <BookOpen className="size-5 shrink-0 text-[var(--app-text-muted)]" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="break-words font-medium">{book.title || 'Без названия'}</p>
        <p className="text-sm text-[var(--app-text-muted)]">{[context, book.author, book.sourceLanguage, status].filter(Boolean).join(' · ')}</p>
      </div>
      <ChevronRight className="size-4 shrink-0" aria-hidden />
    </Link>
  );
}

type Props = {
  data: WorkspaceData;
  view: 'projects' | 'new' | 'series';
  seriesId?: string;
  refresh: () => Promise<void>;
};

export default function ProjectLibrary({ data, view, seriesId, refresh }: Props) {
  const search = useSearchParams().get('q') ?? '';
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const pending = data.books.some((book) =>
    (view !== 'series' || book.seriesId === seriesId) && ['pending', 'processing'].includes(book.processingStatus ?? ''));
  useEffect(() => {
    if (!pending || view === 'new') return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function update() {
      try {
        if (document.visibilityState === 'visible') await refresh();
      } catch {
        // The manual refresh action remains available if connectivity is interrupted.
      } finally {
        if (active) timer = setTimeout(update, 6500);
      }
    }
    timer = setTimeout(update, 6500);
    return () => { active = false; clearTimeout(timer); };
  }, [pending, view, refresh]);

  if (view === 'new') return <ProjectImport key={data.userId} data={data} refresh={refresh} />;
  if (view === 'series') {
    const series = data.series.find((entry) => entry.id === seriesId);
    if (!series) return <p role="status">Серия недоступна в вашем кабинете.</p>;
    return <SeriesWorkspace key={data.userId + series.id} series={series} role={data.role} books={data.books.filter((book) => book.seriesId === series.id)} />;
  }
  const query = search.trim().toLocaleLowerCase('ru');
  const matches = (value: string | null) => (value ?? '').toLocaleLowerCase('ru').includes(query);
  const availableSeries = new Set(data.series.map((s) => s.id));
  const volumes = new Map<string, number>();
  const firstVolume = new Map<string, WorkspaceBook>();
  for (const book of data.books) {
    if (!book.seriesId) continue;
    volumes.set(book.seriesId, (volumes.get(book.seriesId) ?? 0) + 1);
    const first = firstVolume.get(book.seriesId);
    if (!first || (book.volumeNumber ?? Infinity) < (first.volumeNumber ?? Infinity)) firstVolume.set(book.seriesId, book);
  }
  const seriesById = new Map(data.series.map((s) => [s.id, s.name]));
  const series = data.series.filter((entry) => !query || matches(entry.name)).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'ru'));
  const books = data.books.filter((book) => query
    ? matches(book.title) || matches(book.author)
    : !book.seriesId || !availableSeries.has(book.seriesId));
  const noResults = series.length === 0 && books.length === 0;

  function updateSearch(value: string) {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set('q', value);
    else url.searchParams.delete('q');
    window.history.replaceState(null, '', url);
  }

  const reload = async () => {
    setError('');
    setRefreshing(true);
    try { await refresh(); }
    catch { setError('Не удалось обновить каталог. Попробуйте ещё раз.'); }
    finally { setRefreshing(false); }
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--app-text-muted)]">
        Здесь ваши серии и книги, загруженные с этого аккаунта. Общедоступные и сохранённые книги можно читать в{' '}
        <Link href="/my-books" className="underline underline-offset-2">библиотеке</Link>.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--app-text-muted)]" />
          <Input className="pl-9" type="search" aria-label="Поиск по названию и автору" placeholder="Название книги, серии или автор" value={search} onChange={(e) => updateSearch(e.target.value)} />
        </div>
        <Button variant="outline" size="icon" onClick={reload} disabled={refreshing} aria-label="Обновить каталог" title="Обновить каталог"><RefreshCw className={refreshing ? 'animate-spin' : ''} /></Button>
        <Button asChild><Link href={projectsPath + '/projects/new'}><Plus />Загрузить</Link></Button>
      </div>
      {error && <p role="alert">{error}</p>}
      {noResults ? (
        <Card className="gap-2 p-6" role="status">
          <p className="font-medium">{query ? 'По вашему запросу ничего не найдено' : 'Пока нет загруженных книг'}</p>
          <p className="text-sm text-[var(--app-text-muted)]">{query ? 'Попробуйте другое название или имя автора.' : 'Загрузите EPUB, чтобы начать работу со своей книгой.'}</p>
        </Card>
      ) : (
        <Card className="overflow-hidden divide-y divide-[var(--app-border)]">
          {series.map((entry) => (
            <Link key={entry.id} href={seriesPath(entry.id)} className="flex min-w-0 items-center gap-3 px-4 py-3.5 hover:bg-[var(--fill-tertiary)] focus-visible:outline-ring focus-visible:outline-2">
              <Layers3 className="size-5 shrink-0 text-[var(--app-text-muted)]" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium">{entry.name || 'Серия без названия'}</p>
                <p className="text-sm text-[var(--app-text-muted)]">Серия · {volumeCount(volumes.get(entry.id) ?? 0)}{!entry.name && firstVolume.get(entry.id)?.title && ' · ' + firstVolume.get(entry.id)?.title}</p>
              </div>
              <ChevronRight className="size-4 shrink-0" aria-hidden />
            </Link>
          ))}
          {books.map((book) => <BookRow key={book.id} book={book} context={book.seriesId ? seriesById.get(book.seriesId) || undefined : undefined} />)}
        </Card>
      )}
    </div>
  );
}
