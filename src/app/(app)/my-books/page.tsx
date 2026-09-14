'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check, SlidersHorizontal, BookMarked, Smartphone, Globe } from 'lucide-react';
import IOSBottomDrawer from '@/components/ui/ios-bottom-drawer';
import IOSBottomDrawerHeader from '@/components/ui/ios-bottom-drawer-header';
import { useAdaptiveDropdown } from '@/components/ui/useAdaptiveDropdown';
import IOSItemsStack from '@/components/ui/ios-items-stack';
import {
  uiDrawerItemButton,
  uiDropdownItemButton,
  uiFilterPillActive,
  uiFilterPillBase,
  uiFilterPillInactive,
  uiTextActionButton,
  uiTextActionButtonPressed,
} from '@/components/ui/button-styles';
import BookCard from '@/components/Store/BookCard';
import DeleteBookConfirmDialog from '@/components/Store/DeleteBookConfirmDialog';
import UploadBookModal from '@/components/UploadBookModal';
import { useAppStore } from '@/lib/store';
import { useBooks } from '@/lib/useBooks';
import { useAuth } from '@/lib/hooks/useAuth';
import GoogleOneTap from '@/components/GoogleOneTap';
import PageHeader from '@/components/ui/PageHeader';
import { trackBookOpened } from '@/lib/posthog';
import { BookReadingProgress, ApiBook, fetchReadingPosition, getGuestScopeKey } from '@/lib/api';
import {
  getCachedLibraryViewSnapshotSync,
  getCachedLibraryViewSnapshot,
  getCachedReadingPosition,
  setCachedLibraryViewSnapshot,
  setCachedReadingPosition,
} from '@/lib/contentCache';

const FALLBACK_AUTHOR = 'Unknown author';
const BOOKS_BATCH_SIZE = 6;

type ProgressRow = BookReadingProgress & {
  server_updated_at?: string | null;
  idb_updated_at?: string | null;
};

function toMs(ts: string | null | undefined): number {
  if (!ts) return Number.NEGATIVE_INFINITY;
  const ms = Date.parse(ts);
  return Number.isFinite(ms) ? ms : Number.NEGATIVE_INFINITY;
}

function chooseNewestTs(...candidates: Array<string | null | undefined>): string | null {
  let best: string | null = null;
  let bestMs = Number.NEGATIVE_INFINITY;
  for (const ts of candidates) {
    const ms = toMs(ts);
    if (ms > bestMs) {
      best = ts ?? null;
      bestMs = ms;
    }
  }
  return best;
}

function chooseByPriority(...candidates: Array<string | null | undefined>): string | null {
  for (const ts of candidates) {
    if (!ts) continue;
    if (Number.isFinite(toMs(ts))) return ts;
  }
  return null;
}

function sameOrder(a: string[] | null | undefined, b: string[] | null | undefined): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function mergeProgressMonotonic(existing: ProgressRow | undefined, incoming: ProgressRow): ProgressRow {
  if (!existing) {
    const normalizedUpdated = chooseNewestTs(
      incoming.server_updated_at,
      incoming.idb_updated_at,
      incoming.updated_at,
    );
    return {
      ...incoming,
      updated_at: normalizedUpdated,
      server_updated_at: incoming.server_updated_at ?? incoming.updated_at ?? null,
      idb_updated_at: incoming.idb_updated_at ?? incoming.updated_at ?? null,
    };
  }

  const serverUpdated = chooseNewestTs(existing.server_updated_at, incoming.server_updated_at);
  const idbUpdated = chooseNewestTs(existing.idb_updated_at, incoming.idb_updated_at);
  const effectiveUpdated = chooseNewestTs(serverUpdated, idbUpdated, existing.updated_at, incoming.updated_at);

  const useIncomingBlockData = toMs(incoming.updated_at) >= toMs(existing.updated_at);
  const source = useIncomingBlockData ? incoming : existing;

  return {
    ...source,
    server_updated_at: serverUpdated,
    idb_updated_at: idbUpdated,
    updated_at: effectiveUpdated,
  };
}

export default function MyBooksPage() {
  const { progress, touchLastRead, updateServerProgress, syncVersions } = useAppStore();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const scopeKey = isAuthenticated && user?.id ? user.id : getGuestScopeKey();
  const { books, loading, error, hideBook, unhideBook, removeBook, refresh } = useBooks({ scopeKey });
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [progressData, setProgressData] = useState<Record<string, ProgressRow>>({});
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeletingBook, setIsDeletingBook] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'visible' | 'hidden' | 'all'>('visible');
  const SORT_STORAGE_KEY = 'globoox:library_sort';
  const [sortOrder, setSortOrder] = useState<'title_asc' | 'title_desc' | 'recently_added' | 'recently_opened'>(() => {
    if (typeof window === 'undefined') return 'recently_opened';
    const saved = localStorage.getItem(SORT_STORAGE_KEY);
    return (saved as 'title_asc' | 'title_desc' | 'recently_added' | 'recently_opened') || 'recently_opened';
  });
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [sortDrawerOpen, setSortDrawerOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(BOOKS_BATCH_SIZE);
  const [progressHydrated, setProgressHydrated] = useState(false);
  const [recentlyOpenedSnapshotOrder, setRecentlyOpenedSnapshotOrder] = useState<string[] | null>(() => {
    const cached = getCachedLibraryViewSnapshotSync(scopeKey, 'recently_opened');
    return cached?.order ?? null;
  });
  const savedSnapshotOrderRef = useRef<string[] | null>(recentlyOpenedSnapshotOrder);
  const progressRef = useRef(progress);
  const readingPositionControllersRef = useRef<Set<AbortController>>(new Set());
  const revalidatedBookIdsRef = useRef<Set<string>>(new Set());
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const sortTriggerRef = useRef<HTMLButtonElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const { menuStyle, isPositioned } = useAdaptiveDropdown({
    isOpen: sortDropdownOpen,
    setIsOpen: setSortDropdownOpen,
    triggerRef: sortTriggerRef,
    menuRef: sortMenuRef,
    menuWidth: 200,
    menuHeight: 220,
  });

  useEffect(() => {
    document.documentElement.classList.add('library-scroll-lock-x');
    document.body.classList.add('library-scroll-lock-x');
    return () => {
      document.documentElement.classList.remove('library-scroll-lock-x');
      document.body.classList.remove('library-scroll-lock-x');
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (sortOrder !== 'recently_opened') {
      setRecentlyOpenedSnapshotOrder(null);
      return;
    }

    const syncSnapshot = getCachedLibraryViewSnapshotSync(scopeKey, 'recently_opened');
    if (syncSnapshot?.order?.length) {
      setRecentlyOpenedSnapshotOrder((prev) => (sameOrder(prev, syncSnapshot.order) ? prev : syncSnapshot.order));
    }

    void getCachedLibraryViewSnapshot(scopeKey, 'recently_opened').then((snapshot) => {
      if (cancelled) return;
      const nextOrder = snapshot?.order ?? null;
      setRecentlyOpenedSnapshotOrder((prev) => (sameOrder(prev, nextOrder) ? prev : nextOrder));
    });
    return () => {
      cancelled = true;
    };
  }, [scopeKey, sortOrder]);

  useEffect(() => {
    savedSnapshotOrderRef.current = recentlyOpenedSnapshotOrder;
  }, [recentlyOpenedSnapshotOrder]);

  // After OAuth redirect back with ?upload=1, auto-open upload modal
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('upload') === '1') {
      setIsUploadOpen(true);
      window.history.replaceState({}, '', '/my-books');
    }
  }, [authLoading, isAuthenticated]);

  const handleUploadClick = () => {
    if (isAuthenticated) {
      setIsUploadOpen(true);
    } else {
      window.location.href = '/auth?next=/my-books';
    }
  };

  const handleRequestDelete = useCallback((bookId: string) => {
    const book = books.find((entry) => entry.id === bookId);
    if (!book) return;
    setDeleteTarget({ id: book.id, title: book.title });
  }, [books]);

  const handleCancelDelete = useCallback(() => {
    if (isDeletingBook) return;
    setDeleteTarget(null);
  }, [isDeletingBook]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;

    setIsDeletingBook(true);
    const targetId = deleteTarget.id;
    try {
      setDeleteTarget(null);
      await removeBook(targetId);
    } catch {
      // useBooks already restores the removed book and exposes the error to the page
    } finally {
      setIsDeletingBook(false);
    }
  }, [deleteTarget, removeBook]);

  // Hydrate server reading positions from IndexedDB on load to avoid N requests on refresh.
  useEffect(() => {
    if (books.length === 0) {
      setProgressData({});
      setProgressHydrated(false);
      return;
    }

    let cancelled = false;
    setProgressHydrated(false);
    void (async () => {
      const entries = await Promise.all(
        books.map(async (b) => {
          const cached = await getCachedReadingPosition(scopeKey, b.id);
          return [b.id, cached] as const;
        })
      );

      if (cancelled) return;

      const progressMap: Record<string, ProgressRow> = {};
      for (const [bookId, cached] of entries) {
        if (!cached) continue;
        const pos = cached.position;
        const effectiveUpdatedAt = chooseNewestTs(pos.updated_at, cached.updatedAt);
        progressMap[bookId] = {
          book_id: pos.book_id,
          chapter_id: pos.chapter_id,
          block_id: pos.block_id,
          block_position: pos.block_position,
          total_blocks: pos.total_blocks ?? progressRef.current[bookId]?.totalBlocks ?? 0,
          content_version: 0,
          updated_at: effectiveUpdatedAt,
          server_updated_at: pos.updated_at ?? null,
          idb_updated_at: cached.updatedAt ?? null,
        };
      }
      setProgressData((prev) => {
        const next = { ...prev };
        for (const [bookId, incoming] of Object.entries(progressMap)) {
          next[bookId] = mergeProgressMonotonic(prev[bookId], incoming);
        }
        return next;
      });
      setProgressHydrated(true);
    })();

    return () => { cancelled = true; };
  }, [books, scopeKey]);

  // Revalidate reading positions from server so Recently Read is consistent cross-device.
  useEffect(() => {
    const controllers = readingPositionControllersRef.current;
    const abortAllReadingPositionRequests = () => {
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
    };

    const handleNavigationIntent = () => {
      abortAllReadingPositionRequests();
    };

    window.addEventListener('globoox:navigation-intent', handleNavigationIntent);
    return () => {
      window.removeEventListener('globoox:navigation-intent', handleNavigationIntent);
      abortAllReadingPositionRequests();
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || books.length === 0) return;

    const targetIds = books
      .slice(0, Math.min(books.length, visibleCount + BOOKS_BATCH_SIZE))
      .map((book) => book.id)
      .filter((bookId) => !revalidatedBookIdsRef.current.has(bookId));
    if (targetIds.length === 0) return;

    const controllers = readingPositionControllersRef.current;
    let cancelled = false;
    const controller = new AbortController();
    controllers.add(controller);
    void (async () => {
      const updates: Array<{ bookId: string; remote: Awaited<ReturnType<typeof fetchReadingPosition>> } | null> = [];
      const CONCURRENCY = 4;
      for (let i = 0; i < targetIds.length && !cancelled; i += CONCURRENCY) {
        const batchIds = targetIds.slice(i, i + CONCURRENCY);
        const batchUpdates = await Promise.all(
          batchIds.map(async (bookId) => {
            try {
              const remote = await fetchReadingPosition(bookId, controller.signal);
              void setCachedReadingPosition(scopeKey, bookId, { position: remote, updatedAt: remote.updated_at ?? null });
              return { bookId, remote };
            } catch {
              return null;
            }
          })
        );
        updates.push(...batchUpdates);
      }

      if (cancelled) return;

      const serverUpdates: Array<{
        bookId: string;
        blockPosition?: number;
        totalBlocks?: number;
        serverUpdatedAt: string;
      }> = [];

      setProgressData((prev) => {
        const next = { ...prev };
        for (const item of updates) {
          if (!item) continue;
          const { bookId, remote } = item;
          if (!remote.chapter_id) continue;
          const totalBlocks = prev[bookId]?.total_blocks ?? progressRef.current[bookId]?.totalBlocks ?? 0;
          const incoming: ProgressRow = {
            book_id: remote.book_id,
            chapter_id: remote.chapter_id,
            block_id: remote.block_id,
            block_position: remote.block_position,
            total_blocks: totalBlocks,
            content_version: 0,
            updated_at: remote.updated_at,
            server_updated_at: remote.updated_at,
            idb_updated_at: remote.updated_at,
          };
          next[bookId] = mergeProgressMonotonic(prev[bookId], incoming);
          const currentServerTs = progressRef.current[bookId]?.serverUpdatedAt;
          if (remote.updated_at && currentServerTs !== remote.updated_at) {
            serverUpdates.push({
              bookId,
              blockPosition: remote.block_position ?? undefined,
              totalBlocks,
              serverUpdatedAt: remote.updated_at,
            });
          }
        }
        return next;
      });

      for (const update of serverUpdates) {
        updateServerProgress(update.bookId, {
          blockPosition: update.blockPosition,
          totalBlocks: update.totalBlocks,
          serverUpdatedAt: update.serverUpdatedAt,
        });
      }
      if (!cancelled) {
        targetIds.forEach((bookId) => revalidatedBookIdsRef.current.add(bookId));
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      controllers.delete(controller);
    };
  }, [books, isAuthenticated, scopeKey, syncVersions.progress, updateServerProgress, visibleCount]);

  useEffect(() => {
    revalidatedBookIdsRef.current.clear();
  }, [scopeKey, syncVersions.progress]);

  // Get block-based progress for a book
  const getBookProgress = useCallback((book: ApiBook) => {
    const local = progress[book.id];
    const server = progressData[book.id];

    // Priority: server data, fallback to local
    const blockPosition = server?.block_position ?? local?.blockPosition;
    const totalBlocks = server?.total_blocks ?? local?.totalBlocks;

    if (totalBlocks && totalBlocks > 0 && blockPosition != null) {
      return Math.min(100, Math.round((blockPosition / totalBlocks) * 100));
    }

    return 0;
  }, [progress, progressData]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const getEffectiveLastRead = useCallback((bookId: string) => {
    const p = progressData[bookId];
    return chooseByPriority(
      p?.server_updated_at,
      p?.idb_updated_at,
      progress[bookId]?.lastRead ?? null,
    );
  }, [progressData, progress]);

  const snapshotRank = useMemo(() => {
    if (!recentlyOpenedSnapshotOrder) return new Map<string, number>();
    return new Map(recentlyOpenedSnapshotOrder.map((id, index) => [id, index]));
  }, [recentlyOpenedSnapshotOrder]);

  const filteredBooks = useMemo(() => {
    const filtered = statusFilter === 'hidden'
      ? books.filter((b) => b.status === 'hidden')
      : statusFilter === 'all'
        ? books
        : books.filter((b) => b.status !== 'hidden');

    const sorted = [...filtered].sort((a, b) => {
      if (sortOrder === 'title_asc') return a.title.localeCompare(b.title);
      if (sortOrder === 'title_desc') return b.title.localeCompare(a.title);
      if (sortOrder === 'recently_opened') {
        if (!progressHydrated && snapshotRank.size > 0) {
          const aRank = snapshotRank.get(a.id);
          const bRank = snapshotRank.get(b.id);
          const aKnown = aRank != null;
          const bKnown = bRank != null;
          if (aKnown && bKnown && aRank !== bRank) return aRank - bRank;
          if (aKnown !== bKnown) return aKnown ? -1 : 1;
          const createdDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          if (createdDiff !== 0) return createdDiff;
          return a.id.localeCompare(b.id);
        }
        const aMs = toMs(getEffectiveLastRead(a.id));
        const bMs = toMs(getEffectiveLastRead(b.id));
        if (bMs !== aMs) return bMs - aMs;
        return a.id.localeCompare(b.id);
      }
      // recently_added
      const createdDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (createdDiff !== 0) return createdDiff;
      return a.id.localeCompare(b.id);
    });

    return sorted;
  }, [books, statusFilter, sortOrder, getEffectiveLastRead, progressHydrated, snapshotRank]);

  useEffect(() => {
    if (sortOrder !== 'recently_opened') return;
    if (!progressHydrated) return;
    if (filteredBooks.length === 0) return;

    const order = filteredBooks.map((book) => book.id);
    if (sameOrder(savedSnapshotOrderRef.current, order)) return;
    const effectiveLastReadByBookId: Record<string, string | null> = {};
    for (const book of filteredBooks) {
      effectiveLastReadByBookId[book.id] = getEffectiveLastRead(book.id);
    }
    savedSnapshotOrderRef.current = order;
    void setCachedLibraryViewSnapshot(scopeKey, 'recently_opened', {
      order,
      effectiveLastReadByBookId,
      computedAt: Date.now(),
    });
  }, [filteredBooks, getEffectiveLastRead, progressHydrated, scopeKey, sortOrder]);

  const visibleBooks = useMemo(
    () => filteredBooks.slice(0, Math.min(visibleCount, filteredBooks.length)),
    [filteredBooks, visibleCount]
  );
  const hasMoreBooks = visibleCount < filteredBooks.length;
  const loadingBatchCount = hasMoreBooks
    ? Math.min(BOOKS_BATCH_SIZE, Math.max(0, filteredBooks.length - visibleBooks.length))
    : 0;

  useEffect(() => {
    setVisibleCount(BOOKS_BATCH_SIZE);
  }, [statusFilter, sortOrder, scopeKey]);

  useEffect(() => {
    if (!hasMoreBooks) return;
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setVisibleCount((prev) => Math.min(filteredBooks.length, prev + BOOKS_BATCH_SIZE));
          break;
        }
      },
      { rootMargin: '240px 0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredBooks.length, hasMoreBooks]);

  return (
    <div className="min-h-screen bg-[var(--app-shell-bg)] pb-[calc(60px+env(safe-area-inset-bottom))] text-[var(--app-text)]">
      <GoogleOneTap />
      <PageHeader
        title="My Books"
        action={authLoading ? undefined : {
          label: isAuthenticated ? 'Upload book' : 'Sign In',
          onClick: handleUploadClick,
          className: isAuthenticated ? '' : 'bg-primary text-primary-foreground hover:bg-primary/90 px-4 h-8 rounded-full text-[13px]',
        }}
      />

      <div className="container max-w-2xl mx-auto px-4 sm:px-6 pt-[calc(2rem+env(safe-area-inset-top)+72px)] pb-4 space-y-6 overflow-x-clip">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {(authLoading || isAuthenticated) && (
        <div className="flex items-center gap-2 relative">
          <div className="relative hidden max-[395px]:block">
            <button
              type="button"
              onClick={() => setFilterDropdownOpen((v) => !v)}
              className={[
                `${uiTextActionButton} flex items-center gap-[6px] px-[12px] min-h-[40px] rounded-full border text-[14px] font-medium`,
                filterDropdownOpen
                  ? `border-[var(--app-border)] text-[var(--app-text)] ${uiTextActionButtonPressed}`
                  : 'border-[var(--app-border)] bg-[var(--app-surface-bg)] text-[var(--app-text)]',
              ].join(' ')}
              aria-label="Filter"
            >
              <SlidersHorizontal className="size-4" strokeWidth={1.8} />
              <span>
                {statusFilter === 'visible' ? 'Visible' : statusFilter === 'hidden' ? 'Archived' : 'All'}
              </span>
            </button>

            {filterDropdownOpen && (
              <div className="absolute left-0 top-[calc(100%+8px)] w-[180px] z-[100]">
              <IOSItemsStack className="py-[8px] bg-[var(--app-surface-bg)] shadow-lg border border-[var(--app-border)]">
                {([
                  { value: 'visible', label: 'Visible' },
                  { value: 'hidden', label: 'Archived' },
                  { value: 'all', label: 'All' },
                ] as const).map(({ value, label }, i, arr) => (
                  <div key={value}>
                    <button
                      onClick={() => { setStatusFilter(value); setFilterDropdownOpen(false); }}
                      className={uiDropdownItemButton}
                    >
                      <span className="text-[17px]">{label}</span>
                      {statusFilter === value && <Check className="w-[18px] h-[18px] text-[var(--app-accent)]" />}
                    </button>
                    {i < arr.length - 1 && <div className="mx-4 h-[0.5px] bg-[var(--app-border)]" />}
                  </div>
                ))}
              </IOSItemsStack>
              </div>
            )}
          </div>

          {(['visible', 'hidden', 'all'] as const).map((f) => (
            <Button
              key={f}
              variant="outline"
              size="sm"
              onClick={() => setStatusFilter(f)}
              className={[
                `${uiFilterPillBase} max-[395px]:hidden`,
                statusFilter === f
                  ? uiFilterPillActive
                  : uiFilterPillInactive,
              ].join(' ')}
            >
              {f === 'visible' ? 'Visible' : f === 'hidden' ? 'Archived' : 'All'}
            </Button>
          ))}
          <button
            ref={sortTriggerRef}
            onClick={() => {
              setFilterDropdownOpen(false);
              if (typeof window !== 'undefined' && window.innerWidth < 640) {
                setSortDrawerOpen(true);
              } else {
                setSortDropdownOpen((v) => !v);
              }
            }}
            className={`${uiTextActionButton} ml-auto relative flex items-center justify-end text-right gap-[4px] px-[8px] min-h-[44px] after:absolute after:inset-y-[-10px] after:left-[-4px] after:right-0`}
            aria-label="Sort"
          >
            <span className="text-[15px] font-medium">
              {sortOrder === 'recently_opened' ? 'Recently Read' : sortOrder === 'recently_added' ? 'Recently Added' : sortOrder === 'title_asc' ? 'Title A→Z' : 'Title Z→A'}
            </span>
            <ChevronDown className={`w-[16px] h-[16px] transition-transform ${sortDropdownOpen || sortDrawerOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Desktop dropdown */}
          {sortDropdownOpen && (
            <div
              ref={sortMenuRef}
              className="fixed w-[200px] z-[100]"
              style={{ ...menuStyle, visibility: isPositioned ? 'visible' : 'hidden' }}
            >
            <IOSItemsStack className="py-[8px] bg-[var(--app-surface-bg)] shadow-lg border border-[var(--app-border)]">
              {([
                { value: 'recently_added', label: 'Recently Added' },
                { value: 'recently_opened', label: 'Recently Read' },
                { value: 'title_asc', label: 'Title A → Z' },
                { value: 'title_desc', label: 'Title Z → A' },
              ] as const).map(({ value, label }, i, arr) => (
                <div key={value}>
                  <button
                    onClick={() => { setSortOrder(value); localStorage.setItem(SORT_STORAGE_KEY, value); setSortDropdownOpen(false); }}
                    className={uiDropdownItemButton}
                  >
                    <span className="text-[17px]">{label}</span>
                    {sortOrder === value && <Check className="w-[18px] h-[18px] text-[var(--app-accent)]" />}
                  </button>
                  {i < arr.length - 1 && <div className="mx-4 h-[0.5px] bg-[var(--app-border)]" />}
                </div>
              ))}
            </IOSItemsStack>
            </div>
          )}
        </div>
        )}


        <section>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-[2/3] rounded-md bg-muted animate-pulse" />
              ))}
            </div>
          ) : filteredBooks.length === 0 ? (
            <p className="text-sm text-[var(--app-text-muted)]">No books yet.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {visibleBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    id={book.id}
                    title={book.title}
                    author={book.author ?? FALLBACK_AUTHOR}
                    cover={book.cover_url}
                    progress={getBookProgress(book)}
                    onHide={book.status === 'hidden' ? unhideBook : hideBook}
                    onDelete={handleRequestDelete}
                    hideLabel={book.status === 'hidden' ? 'Restore' : 'Archive'}
                    onOpen={() => {
                      touchLastRead(book.id);
                      const nowIso = new Date().toISOString();
                      setRecentlyOpenedSnapshotOrder((prev) => {
                        const base = prev?.length ? prev : filteredBooks.map((b) => b.id);
                        const next = [book.id, ...base.filter((id) => id !== book.id)];
                        if (sameOrder(prev, next)) return prev;
                        const effectiveLastReadByBookId: Record<string, string | null> = {};
                        next.forEach((id) => {
                          effectiveLastReadByBookId[id] = id === book.id ? nowIso : getEffectiveLastRead(id);
                        });
                        savedSnapshotOrderRef.current = next;
                        void setCachedLibraryViewSnapshot(scopeKey, 'recently_opened', {
                          order: next,
                          effectiveLastReadByBookId,
                          computedAt: Date.now(),
                        });
                        return next;
                      });
                      trackBookOpened({ book_id: book.id, title: book.title, source: 'library' });
                    }}
                  />
                ))}
              </div>
              {loadingBatchCount > 0 && (
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-6">
                  {Array.from({ length: loadingBatchCount }, (_, index) => (
                    <div key={`batch-skeleton-${index}`} className="aspect-[2/3] rounded-md bg-muted animate-pulse" />
                  ))}
                </div>
              )}
              {hasMoreBooks && <div ref={loadMoreSentinelRef} className="h-1" aria-hidden="true" />}
            </>
          )}
        </section>

        {!isAuthenticated && !authLoading && (
          <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-bg)] p-4 sm:p-5">
            <div className="space-y-3">
              <div>
                <h2 className="text-[17px] leading-6 font-semibold">Upload your own books</h2>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                  Sign in to upload and translate your own EPUBs.
                </p>
              </div>
              <ul className="space-y-2 text-sm text-foreground/90">
                <li className="flex items-center gap-2">
                  <BookMarked className="size-4 text-primary" />
                  <span>Your library stays saved</span>
                </li>
                <li className="flex items-center gap-2">
                  <Smartphone className="size-4 text-primary" />
                  <span>Reading progress syncs across devices</span>
                </li>
                <li className="flex items-center gap-2">
                  <Globe className="size-4 text-primary" />
                  <span>Translate EPUBs with AI</span>
                </li>
              </ul>
              <div className="pt-1">
                <Button
                  size="sm"
                  className="h-8 rounded-full px-4"
                  onClick={() => { window.location.href = '/auth?next=/my-books'; }}
                >
                  Sign In
                </Button>
              </div>
            </div>
          </section>
        )}
      </div>

      <footer className="container max-w-2xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-[var(--app-text-muted)]">
        Need help?{' '}
        <a href="mailto:support@globoox.co" className="underline underline-offset-2 hover:text-foreground transition-colors">
          support@globoox.co
        </a>
      </footer>

      {/* Mobile bottom drawer */}
      <IOSBottomDrawer
        open={sortDrawerOpen}
        onOpenChange={setSortDrawerOpen}
        enableDragDismiss
        dragHandle={<div className="h-1 w-12 rounded-full bg-black/12 dark:bg-white/16" />}
        dragRegion={<IOSBottomDrawerHeader title="Sort by" onClose={() => setSortDrawerOpen(false)} />}
      >
        <div className="pb-2">
          {([
            { value: 'recently_added', label: 'Recently Added' },
            { value: 'recently_opened', label: 'Recently Read' },
            { value: 'title_asc', label: 'Title A → Z' },
            { value: 'title_desc', label: 'Title Z → A' },
          ] as const).map(({ value, label }, i, arr) => (
            <button
              key={value}
              onClick={() => { setSortOrder(value); localStorage.setItem(SORT_STORAGE_KEY, value); setSortDrawerOpen(false); }}
              className={[
                uiDrawerItemButton,
                i < arr.length - 1 ? 'border-b border-[var(--app-border)]' : '',
              ].join(' ')}
            >
              <span>{label}</span>
              {sortOrder === value && <Check className="w-[18px] h-[18px] text-primary" />}
            </button>
          ))}
        </div>
      </IOSBottomDrawer>

      <UploadBookModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={() => refresh(true)}
      />

      <DeleteBookConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget?.title ?? ''}
        deleting={isDeletingBook}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
