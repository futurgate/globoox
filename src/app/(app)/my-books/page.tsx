'use client';

import { Suspense, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import LoadingMyBooks from './loading';
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
import CatalogBookCard from '@/components/Store/CatalogBookCard';
import DeleteBookConfirmDialog from '@/components/Store/DeleteBookConfirmDialog';
import UploadBookModal, { type UploadBookEvent } from '@/components/UploadBookModal';
import UploadBookPlaceholder from '@/components/Store/UploadBookPlaceholder';
import { applyUploadEvent, type BookshelfUpload } from '@/lib/bookshelfUploads';
import { useCatalogCoverQueue } from '@/lib/useCatalogCoverQueue';
import { useAppStore } from '@/lib/store';
import { useCatalog } from '@/lib/useCatalog';
import type { CatalogItem } from '@/lib/catalogTypes';
import { useAuth } from '@/lib/hooks/useAuth';
import GoogleOneTap from '@/components/GoogleOneTap';
import PageHeader from '@/components/ui/PageHeader';
import { trackBookOpened } from '@/lib/posthog';
import { getGuestScopeKey, getShareToken } from '@/lib/api';
import { shareTokenFromSearch, withShareContext } from '@/lib/shareNavigation';

const BOOKS_BATCH_SIZE = 6;

export default function MyBooksPage() {
  return <Suspense fallback={<LoadingMyBooks />}><ScopedBookshelf /></Suspense>;
}

function ScopedBookshelf() {
  const searchParams = useSearchParams();
  const auth = useAuth();
  const identity = auth.isAuthenticated ? auth.user?.id : auth.loading ? undefined : null;
  const share = shareTokenFromSearch(searchParams.toString());
  const [lifetime, setLifetime] = useState({ identity, share, epoch: 0 });
  if (identity !== undefined && (identity !== lifetime.identity || share !== lifetime.share)) {
    // Resolving the initial identity must keep the deadline started on entry.
    // A later account/share switch resets dialogs and view state before paint.
    setLifetime({ identity, share, epoch: lifetime.identity === undefined ? lifetime.epoch : lifetime.epoch + 1 });
  }
  const scopeKey = auth.isAuthenticated && auth.user?.id ? auth.user.id : getGuestScopeKey();
  return <LibraryContent key={lifetime.epoch} scopeKey={scopeKey} auth={auth} />;
}

function LibraryContent({ scopeKey, auth }: { scopeKey: string; auth: ReturnType<typeof useAuth> }) {
  const progress = useAppStore((state) => state.progress);
  const { isAuthenticated, loading: authLoading } = auth;
  const { books, loading, error, offline, context, refreshing, confirmation, hideBook, unhideBook, removeBook, refresh, beginExternalMutation, acceptUploadedBook } = useCatalog({
    userId: authLoading && !isAuthenticated ? undefined : auth.user?.id ?? null,
    legacyScopeKey: scopeKey,
  });
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploads, setUploads] = useState<BookshelfUpload[]>([]);
  const uploadReleases = useRef(new Map<string, () => void>());
  const uploadBookIds = useRef(new Map<string, string>());
  const uploadAttempts = useRef(new Set<string>());
  const latestConfirmation = useRef(confirmation);
  latestConfirmation.current = confirmation;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const releases = uploadReleases.current;
    return () => { mounted.current = false; for (const finish of releases.values()) finish(); releases.clear(); };
  }, []);
  const handleUploadEvent = useCallback((event: UploadBookEvent) => {
    if (!mounted.current) return;
    if (event.phase === 'uploading') {
      uploadAttempts.current.add(event.attemptId);
      uploadReleases.current.set(event.attemptId, beginExternalMutation());
    } else if (!uploadAttempts.current.has(event.attemptId)) return;
    // A callback belongs to this page/account lifetime, never the next account's shelf.
    if (event.book) acceptUploadedBook(event.book, uploadBookIds.current.get(event.attemptId));
    if (event.bookId) uploadBookIds.current.set(event.attemptId, event.bookId);
    if (event.phase === 'complete' || event.phase === 'error') {
      uploadReleases.current.get(event.attemptId)?.();
      uploadReleases.current.delete(event.attemptId);
      uploadAttempts.current.delete(event.attemptId);
    }
    const errorConfirmation = latestConfirmation.current;
    setUploads(current => applyUploadEvent(current, event).map(entry => entry.attemptId === event.attemptId && event.phase === 'error'
      ? { ...entry, errorConfirmation } : entry));
    if (event.phase === 'complete' || event.phase === 'error') void refresh();
  }, [acceptUploadedBook, beginExternalMutation, refresh]);
  const dismissUpload = useCallback((attemptId: string) => {
    uploadAttempts.current.delete(attemptId);
    uploadReleases.current.get(attemptId)?.();
    uploadReleases.current.delete(attemptId);
    setUploads(current => current.filter(entry => entry.attemptId !== attemptId));
  }, []);
  const dismissBookUpload = useCallback((id: string) => {
    for (const [attemptId, bookId] of uploadBookIds.current) if (bookId === id) dismissUpload(attemptId);
  }, [dismissUpload]);
  useEffect(() => {
    setUploads(current => {
      const recovered = current.filter(upload => !(upload.phase === 'error' && (upload.errorConfirmation ?? confirmation) < confirmation
        && books.some(book => book.id === upload.bookId && (book.processing_status == null || book.processing_status === 'ready'))));
      return recovered.length === current.length ? current : recovered;
    });
  }, [books, confirmation]);
  const pendingPollStarted = useRef<number | null>(null);
  const [pendingPollEpoch, setPendingPollEpoch] = useState(0);
  const [pendingPollExpired, setPendingPollExpired] = useState(false);
  const hasUntrackedProcessing = books.some(book => (book.processing_status === 'pending' || book.processing_status === 'processing')
    && !uploads.some(upload => upload.bookId === book.id && (upload.phase === 'uploading' || upload.phase === 'processing')));
  useEffect(() => {
    if (!hasUntrackedProcessing) { pendingPollStarted.current = null; setPendingPollExpired(false); return; }
    if (offline || error?.kind === 'auth') return;
    // Reload has no local job ID. Refresh only the index, never resubmit processing.
    pendingPollStarted.current ??= Date.now();
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (stopped) return;
      if (Date.now() - pendingPollStarted.current! >= 5 * 60 * 1000) { setPendingPollExpired(true); return; }
      await refresh();
      if (!stopped) timer = setTimeout(poll, 2000);
    };
    timer = setTimeout(poll, 2000);
    return () => { stopped = true; clearTimeout(timer); };
  }, [hasUntrackedProcessing, offline, error?.kind, pendingPollEpoch, refresh]);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeletingBook, setIsDeletingBook] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'visible' | 'hidden' | 'all'>('visible');
  const SORT_STORAGE_KEY = 'globoox:library_sort';
  const [sortOrder, setSortOrder] = useState<'title_asc' | 'title_desc' | 'recently_added' | 'recently_opened'>(() => {
    if (typeof window === 'undefined') return 'recently_opened';
    try {
      const saved = localStorage.getItem(SORT_STORAGE_KEY);
      return saved === 'title_asc' || saved === 'title_desc' || saved === 'recently_added' ? saved : 'recently_opened';
    } catch { return 'recently_opened'; }
  });
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [sortDrawerOpen, setSortDrawerOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(BOOKS_BATCH_SIZE);
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

  // After OAuth redirect back with ?upload=1, auto-open upload modal
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('upload') === '1') {
      setIsUploadOpen(true);
      params.delete('upload');
      window.history.replaceState(window.history.state, '', `/my-books${params.size ? `?${params}` : ''}`);
    }
  }, [authLoading, isAuthenticated]);

  const handleUploadClick = () => {
    if (offline) return;
    if (isAuthenticated) {
      setIsUploadOpen(true);
    } else {
      window.location.href = `/auth?next=${encodeURIComponent(withShareContext('/my-books', getShareToken()))}`;
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
      dismissBookUpload(targetId);
      await removeBook(targetId);
    } catch {
      // useCatalog already restores the removed book and exposes the error to the page
    } finally {
      setIsDeletingBook(false);
    }
  }, [deleteTarget, removeBook, dismissBookUpload]);

  // Recency is the server's array order. Position display has no authority to
  // reorder it, and does not make per-book network requests.
  const getBookProgress = useCallback((book: CatalogItem) => {
    const candidate = progress[book.id];
    const owner = candidate?.serverProgressScope ?? candidate?.localLastReadScope;
    const local = owner === scopeKey ? candidate : undefined;
    const summary = book.reading;
    const block = summary?.total_blocks ? summary.block_position : local?.blockPosition;
    const total = summary?.total_blocks || local?.totalBlocks;
    return total && total > 0 && block != null ? Math.min(100, Math.max(0, Math.round(block / total * 100))) : 0;
  }, [progress, scopeKey]);

  const filteredBooks = useMemo(() => {
    const filtered = books.filter((book) => statusFilter === 'all' ||
      (statusFilter === 'hidden' ? book.status === 'hidden' : book.status !== 'hidden'));
    if (sortOrder === 'recently_opened') return filtered;
    return filtered.sort((a, b) => {
      if (sortOrder === 'title_asc') return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
      if (sortOrder === 'title_desc') return b.title.localeCompare(a.title) || a.id.localeCompare(b.id);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || a.id.localeCompare(b.id);
    });
  }, [books, statusFilter, sortOrder]);

  const shownUploads = error?.kind === 'auth' ? [] : uploads.filter(entry => {
    const book = books.find(book => book.id === entry.bookId);
    if (book && (entry.phase === 'complete' || (entry.phase === 'error' && (book.processing_status == null || book.processing_status === 'ready')))) return false;
    return statusFilter === 'all' || (statusFilter === 'hidden' ? book?.status === 'hidden' : book?.status !== 'hidden');
  });
  const temporaryIds = new Set(shownUploads.map(entry => entry.bookId).filter(Boolean));
  const isProcessing = (book: CatalogItem) => book.processing_status === 'pending' || book.processing_status === 'processing';
  const orderedBooks = [...filteredBooks.filter(book => !temporaryIds.has(book.id) && isProcessing(book)),
    ...filteredBooks.filter(book => !temporaryIds.has(book.id) && !isProcessing(book))];
  const visibleBooks = orderedBooks.slice(0, visibleCount);
  const cardEntries = [
    ...shownUploads.map(upload => ({ key: upload.attemptId, upload, book: books.find(book => book.id === upload.bookId) ?? upload.book })),
    ...visibleBooks.map(book => {
      const upload = uploads.find(entry => entry.bookId === book.id);
      return { key: upload?.attemptId ?? book.id, upload, book };
    }),
  ];
  useCatalogCoverQueue([...shownUploads.flatMap(entry => books.find(book => book.id === entry.bookId) ?? entry.book ?? []), ...orderedBooks], context, offline);
  const hasMoreBooks = visibleCount < orderedBooks.length;
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
        action={authLoading || offline ? undefined : {
          label: isAuthenticated ? 'Upload book' : 'Sign In',
          onClick: handleUploadClick,
          className: isAuthenticated ? '' : 'bg-primary text-primary-foreground hover:bg-primary/90 px-4 h-8 rounded-full text-[13px]',
        }}
      />

      <div className="container max-w-2xl mx-auto px-4 sm:px-6 pt-[calc(2rem+env(safe-area-inset-top)+72px)] pb-4 space-y-6 overflow-x-clip">
        {pendingPollExpired && <div role="status" className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>Some books are still processing. Refresh to check again.</p>
          <Button variant="outline" size="sm" onClick={() => { pendingPollStarted.current = null; setPendingPollExpired(false); setPendingPollEpoch(value => value + 1); void refresh(); }}>Refresh status</Button>
        </div>}
        {(error || offline) && (
          <div role="status" aria-live="polite" className="flex items-center justify-between gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-bg)] p-3 text-sm">
            <p>
              {refreshing ? (
                <>Checking the library.{books.length > 0 && ' Saved books remain available.'}</>
              ) : (
                <>
                  {error?.message ?? 'The library connection is unavailable'}
                  {offline && <>{!/[.!?]$/.test(error?.message ?? '') && '.'}{books.length > 0 && ' Showing saved books.'} Changes and uploads are unavailable.</>}
                </>
              )}
            </p>
            <Button size="sm" variant="outline" onClick={() => void refresh()} disabled={refreshing}>
              {refreshing ? 'Retrying…' : 'Try again'}
            </Button>
          </div>
        )}

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
                    onClick={() => { setSortOrder(value); try { localStorage.setItem(SORT_STORAGE_KEY, value); } catch { /* preference is optional */ } setSortDropdownOpen(false); }}
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
          {(shownUploads.length > 0 || loading || filteredBooks.length > 0) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              {cardEntries.map(({ key, upload, book: source }) => {
                const book = source && upload?.phase === 'error' && source.processing_status != null && source.processing_status !== 'ready'
                  ? { ...source, processing_status: 'error' as const } : source;
                return <div key={key} data-upload-attempt={upload?.attemptId}>
                  {book ? <CatalogBookCard book={book} context={context} offline={offline}
                    progress={getBookProgress(book)}
                    onHide={offline || book.processing_status === 'error' ? undefined : id => { dismissBookUpload(id); void (book.status === 'hidden' ? unhideBook(id) : hideBook(id)).catch(() => {}); }}
                    onDelete={offline ? undefined : handleRequestDelete}
                    hideLabel={book.status === 'hidden' ? 'Restore' : 'Archive'}
                    uploadError={upload?.error}
                    onRetryUpload={offline ? undefined : () => setIsUploadOpen(true)}
                    onOpen={() => trackBookOpened({ book_id: book.id, title: book.title, source: 'library' })}
                  /> : upload && <UploadBookPlaceholder upload={upload} refreshing={refreshing} onDismiss={() => dismissUpload(upload.attemptId)} onRetry={() => setIsUploadOpen(true)} onRefresh={() => void refresh()} />}
                </div>;
              })}
              {loading && [1, 2, 3, 4, 5, 6].map(i => <div key={`initial-${i}`} className="aspect-[2/3] rounded-md bg-muted animate-pulse" />)}
            </div>
          )}
          {!loading && !shownUploads.length && !filteredBooks.length && (
            <p className="text-sm text-[var(--app-text-muted)]">{error ? "No saved books are available for this library." : "No books yet."}</p>
          )}
          {!loading && loadingBatchCount > 0 && (
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-6">
              {Array.from({ length: loadingBatchCount }, (_, index) => <div key={`batch-skeleton-${index}`} className="aspect-[2/3] rounded-md bg-muted animate-pulse" />)}
            </div>
          )}
          {!loading && hasMoreBooks && <div ref={loadMoreSentinelRef} className="h-1" aria-hidden="true" />}
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
                  onClick={() => { window.location.href = `/auth?next=${encodeURIComponent(withShareContext('/my-books', getShareToken()))}`; }}
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
              onClick={() => { setSortOrder(value); try { localStorage.setItem(SORT_STORAGE_KEY, value); } catch { /* preference is optional */ } setSortDrawerOpen(false); }}
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
        onUploadEvent={handleUploadEvent}
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
