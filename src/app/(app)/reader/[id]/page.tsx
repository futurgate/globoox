'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import ReaderView from '@/components/Reader/ReaderView';
import type { ApiBook } from '@/lib/api';
import { resolveCatalogContext, fetchCatalogManifest, catalogItemToApiBook } from '@/lib/catalogApi';
import { getCachedCatalogBook, loadCatalogCache, putCatalogManifest } from '@/lib/catalogCache';
import type { CatalogContext } from '@/lib/catalogTypes';
import { flushReadingActivity } from '@/lib/readingActivity';
import { useAuth } from '@/lib/hooks/useAuth';
import { useAppStore } from '@/lib/store';
import { READER_THEME_CONFIGS, getReaderUiColors } from '@/lib/readerTheme';
import { getThemeStyle, isThemeId } from '@/lib/themes';

interface ReaderPageProps {
  params: Promise<{ id: string }>;
}

export default function ReaderPage({ params }: ReaderPageProps) {
  const { id } = use(params);
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const readerThemeId = useAppStore((s) => s.settings.readerTheme);
  const safeReaderThemeId = isThemeId(readerThemeId) ? readerThemeId : 'light';
  const [loaded, setLoaded] = useState<{ book: ApiBook; context: CatalogContext } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const readerUiColors = getReaderUiColors(READER_THEME_CONFIGS[safeReaderThemeId] ?? READER_THEME_CONFIGS.light);
  const themeStyle = getThemeStyle(safeReaderThemeId);
  const currentUserId = isAuthenticated ? user?.id ?? null : null;
  const identityReady = !authLoading || isAuthenticated;
  const matchesIdentity = loaded?.context.userId === currentUserId && loaded.book.id === id;
  const book = matchesIdentity ? loaded.book : null;

  useEffect(() => {
    if (!identityReady) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      setLoaded(null);
      setLoadFailed(true);
      setLoading(false);
    }, 10_000);
    setLoading(true);
    setNotFound(false);
    setLoadFailed(false);

    const loadBook = async () => {
      try {
        const context = await resolveCatalogContext(controller.signal, currentUserId);
        let nextBook = await getCachedCatalogBook(context.scopeKey, id);
        if (controller.signal.aborted) return;
        if (!nextBook) {
          const legacyScope = context.userId ?? (context.shareToken ? `share:${context.shareToken}` : 'guest');
          const cached = await loadCatalogCache(context, legacyScope);
          const item = cached?.manifest.items.find((entry) => entry.id === id);
          if (item) nextBook = catalogItemToApiBook(item);
        }
        if (controller.signal.aborted) return;
        if (!nextBook) {
          const minimumVersion = await flushReadingActivity(context, controller.signal);
          const manifest = await fetchCatalogManifest(context, controller.signal, minimumVersion);
          if (controller.signal.aborted) return;
          await putCatalogManifest(manifest);
          const item = manifest.items.find((entry) => entry.id === id);
          nextBook = item ? catalogItemToApiBook(item) : null;
        }
        if (controller.signal.aborted) return;
        setLoaded(nextBook ? { book: nextBook, context } : null);
        setNotFound(!nextBook);
      } catch {
        if (!controller.signal.aborted) {
          setLoaded(null);
          setLoadFailed(true);
        }
      } finally {
        clearTimeout(timeout);
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadBook();

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [id, identityReady, currentUserId]);

  if (loading || (loaded !== null && !matchesIdentity)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center" style={{ ...themeStyle, backgroundColor: readerUiColors.background, color: readerUiColors.text }}>
        <div className="max-w-sm">
          <div className="mx-auto mb-4 h-8 w-8 rounded-full animate-pulse" style={{ backgroundColor: readerUiColors.border }} />
          <p className="text-lg font-semibold">Loading your book...</p>
          <p className="mt-2 text-sm" style={{ color: readerUiColors.mutedText }}>
            Downloading the file and checking compatibility.
          </p>
        </div>
      </div>
    );
  }

  if (notFound || !book) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center" style={{ ...themeStyle, backgroundColor: readerUiColors.background, color: readerUiColors.text }}>
        <div>
          <p className="text-lg font-semibold mb-2">{loadFailed ? 'Book could not be loaded' : 'Book not found'}</p>
          <Link href="/my-books" style={{ color: readerUiColors.accent }}>
            Back to My Books
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ReaderView
      key={`${loaded!.context.scopeKey}:${book.id}`}
      bookId={book.id}
      title={book.title}
      author={book.author}
      availableLanguages={book.available_languages}
      originalLanguage={book.original_language}
      serverLanguage={book.selected_language}
      coverUrl={book.cover_url}
      catalogContext={loaded!.context}
    />
  );
}
