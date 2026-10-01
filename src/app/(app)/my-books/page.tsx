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
import { applyUploadEvent, uploadedCatalogItem, type BookshelfUpload } from '@/lib/bookshelfUploads';
import { useCatalogCoverQueue } from '@/lib/useCatalogCoverQueue';
import { useAppStore } from '@/lib/store';
import { useCatalog } from '@/lib/useCatalog';
import { catalogContextHint } from '@/lib/catalogApi';
import type { CatalogItem } from '@/lib/catalogTypes';
import { useAuth } from '@/lib/hooks/useAuth';
import GoogleOneTap from '@/components/GoogleOneTap';
import PageHeader from '@/components/ui/PageHeader';
import { trackBookOpened } from '@/lib/posthog';
import { BookJobError, getGuestScopeKey, getShareToken, waitForBookJob } from '@/lib/api';
import { dismissNotification, notify, setNotificationScope, setNotificationsSuppressed, type NotificationScope } from '@/lib/notifications';
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
  const [resumeUpload, setResumeUpload] = useState<UploadBookEvent | null>(null);
  const [checkingUploads, setCheckingUploads] = useState<string[]>([]);
  const notifications = useRef<NotificationScope | null>(null);
  const notificationScopes = useRef(new Map<string, NotificationScope | null>());
  const priorMembership = useRef(new Map<string, Set<string>>());
  const statusChecks = useRef(new Map<string, AbortController>());
  const recoverUploadRef = useRef<(upload: UploadBookEvent) => void>(() => {});
  const uploadDialogOpen = useRef(isUploadOpen);
  uploadDialogOpen.current = isUploadOpen;
  const currentBooks = useRef(books);
  currentBooks.current = books;
  const notificationScopeKey = authLoading && !isAuthenticated ? null : catalogContextHint(auth.user?.id ?? null).scopeKey;
  useEffect(() => {
    notifications.current = setNotificationScope(notificationScopeKey);
    return () => { setNotificationScope(null); notifications.current = null; };
  }, [notificationScopeKey]);
  useEffect(() => {
    setNotificationsSuppressed(isUploadOpen, 'book-upload');
    return () => setNotificationsSuppressed(false, 'book-upload');
  }, [isUploadOpen]);
  const signIn = useCallback(() => {
    window.location.href = `/auth?next=${encodeURIComponent(withShareContext('/my-books', getShareToken()))}`;
  }, []);
  const refreshLibrary = useCallback(async () => {
    const before = latestConfirmation.current;
    const scope = notifications.current;
    const view = await refresh();
    if (!mounted.current) return view;
    if (view && view.confirmation > before && scope === notifications.current && !view.error && !view.offline && !view.refreshing) {
      notify({ scope: notifications.current, operationId: 'library-refresh', event: `confirmed-${view.confirmation}`,
        title: 'Bookshelf updated', kind: 'success' });
    }
    return view;
  }, [refresh]);
  const uploadReleases = useRef(new Map<string, () => void>());
  const uploadBookIds = useRef(new Map<string, string>());
  const uploadAttempts = useRef(new Set<string>());
  const latestConfirmation = useRef(confirmation);
  latestConfirmation.current = confirmation;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const releases = uploadReleases.current;
    const checks = statusChecks.current;
    return () => { mounted.current = false; for (const finish of releases.values()) finish(); releases.clear(); for (const check of checks.values()) check.abort(); checks.clear(); };
  }, []);
  const handleUploadEvent = useCallback((event: UploadBookEvent) => {
    if (!mounted.current) return;
    if (event.phase === 'uploading') {
      uploadAttempts.current.add(event.attemptId);
      notificationScopes.current.set(event.attemptId, notifications.current);
      priorMembership.current.set(event.attemptId, new Set(currentBooks.current.map(book => book.id)));
      uploadReleases.current.set(event.attemptId, beginExternalMutation());
    } else if (!uploadAttempts.current.has(event.attemptId)) return;
    if (event.book) acceptUploadedBook(event.book, uploadBookIds.current.get(event.attemptId));
    if (event.bookId) uploadBookIds.current.set(event.attemptId, event.bookId);
    const terminal = event.phase === 'complete' || event.phase === 'error' || event.phase === 'status_unknown';
    if (terminal) {
      uploadReleases.current.get(event.attemptId)?.();
      uploadReleases.current.delete(event.attemptId);
      // Unknown attempts remain eligible for an explicit check of the same job.
      if (event.phase !== 'status_unknown') uploadAttempts.current.delete(event.attemptId);
    }
    const errorConfirmation = latestConfirmation.current;
    setUploads(current => applyUploadEvent(current, event).map(entry => entry.attemptId === event.attemptId && terminal
      ? { ...entry, errorConfirmation } : entry));
    if (terminal) {
      const scope = notificationScopes.current.get(event.attemptId) ?? null;
      const recover = () => recoverUploadRef.current(event);
      if (!uploadDialogOpen.current) {
        if (event.phase === 'complete') {
          const duplicate = Boolean(event.bookId && priorMembership.current.get(event.attemptId)?.has(event.bookId));
          notify({ scope, operationId: event.attemptId, event: event.issue ?? 'ready',
            kind: event.orderConfirmed === false ? 'warning' : 'success',
            title: event.orderConfirmed === false ? 'Book ready. Unable to update the bookshelf.' : duplicate ? 'Book already in your library' : 'Book ready',
            description: duplicate ? 'Your reading progress is preserved.' : undefined,
            action: event.orderConfirmed === false ? { label: 'Refresh', onClick: () => { void refreshLibrary(); } }
              : event.bookId ? { label: 'Open', onClick: () => { window.location.href = withShareContext(`/reader/${event.bookId}`, getShareToken()); } } : { label: 'Refresh', onClick: () => { void refreshLibrary(); } },
          });
        } else {
          notify({ scope, operationId: event.attemptId, event: event.issue ?? 'processing_failed',
            kind: event.phase === 'error' ? 'error' : 'warning',
            title: event.phase === 'error' ? event.issue === 'upload_rejected' ? 'Upload was rejected' : 'Unable to process this book'
              : event.issue === 'auth_required' ? 'Sign in to check your upload' : 'Unable to confirm book readiness',
            action: { label: event.phase === 'error' ? 'Upload again' : event.issue === 'auth_required' ? 'Sign in' : event.jobId && event.issue !== 'job_not_found' ? 'Check status' : 'Refresh', onClick: recover },
          });
        }
      }
      // Do not silently erase an unknown status. A later accepted index may resolve it.
      void refresh();
    }
  }, [acceptUploadedBook, beginExternalMutation, refresh, refreshLibrary]);
  const recoverUpload = useCallback(async (upload: UploadBookEvent) => {
    if (upload.issue === 'auth_required') { signIn(); return; }
    if (upload.phase === 'error') { setResumeUpload(null); setIsUploadOpen(true); return; }
    if (upload.phase === 'complete' || upload.issue === 'forbidden') { await refreshLibrary(); return; }
    if (!upload.jobId || upload.issue === 'job_not_found') {
      setResumeUpload(upload);
      setIsUploadOpen(true);
      return;
    }
    if (statusChecks.current.has(upload.attemptId)) return;
    const controller = new AbortController();
    statusChecks.current.set(upload.attemptId, controller);
    setCheckingUploads(current => [...current, upload.attemptId]);
    handleUploadEvent({ ...upload, phase: 'processing', issue: undefined, error: undefined });
    try {
      const result = await waitForBookJob(upload.jobId, controller.signal, undefined, snapshot => {
        const book = uploadedCatalogItem(snapshot, false);
        if (book) handleUploadEvent({ ...upload, phase: 'processing', bookId: book.id, book, issue: undefined, error: undefined });
      });
      const book = uploadedCatalogItem(result.book ?? (upload.book?.id === result.bookId ? upload.book : undefined), true);
      handleUploadEvent({ ...upload, phase: 'complete', bookId: result.bookId, book,
        orderConfirmed: result.orderConfirmed, issue: result.orderConfirmed ? undefined : 'order_unconfirmed', error: undefined });
    } catch (caught) {
      if (controller.signal.aborted) return;
      const error = caught instanceof BookJobError ? caught : null;
      const book = uploadedCatalogItem(error?.book, false);
      handleUploadEvent({ ...upload, ...(book ? { book, bookId: book.id } : {}), phase: error?.kind === 'processing_failed' ? 'error' : 'status_unknown',
        issue: error?.kind === 'processing_failed' ? undefined : error?.kind ?? 'status_unknown',
        error: caught instanceof Error ? caught.message : 'Unable to check readiness.' });
    } finally {
      statusChecks.current.delete(upload.attemptId);
      if (mounted.current) setCheckingUploads(current => current.filter(id => id !== upload.attemptId));
    }
  }, [handleUploadEvent, refreshLibrary, signIn]);
  recoverUploadRef.current = upload => { void recoverUpload(upload); };
  const dismissUpload = useCallback((attemptId: string) => {
    uploadAttempts.current.delete(attemptId);
    statusChecks.current.get(attemptId)?.abort();
    statusChecks.current.delete(attemptId);
    dismissNotification(notificationScopes.current.get(attemptId) ?? null, attemptId);
    uploadReleases.current.get(attemptId)?.();
    uploadReleases.current.delete(attemptId);
    setUploads(current => current.filter(entry => entry.attemptId !== attemptId));
  }, []);
  const dismissBookUpload = useCallback((id: string) => {
    for (const [attemptId, bookId] of uploadBookIds.current) if (bookId === id) dismissUpload(attemptId);
  }, [dismissUpload]);
  useEffect(() => {
    setUploads(current => {
      const recovered = current.filter(upload => !((upload.phase === 'error' || upload.phase === 'status_unknown' || upload.issue === 'order_unconfirmed') && (upload.errorConfirmation ?? confirmation) < confirmation
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
    if (offline || error?.kind === 'auth' || pendingPollExpired) return;
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
  }, [hasUntrackedProcessing, offline, error?.kind, pendingPollEpoch, pendingPollExpired, refresh]);
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
      setResumeUpload(null);
      setIsUploadOpen(true);
    } else {
      window.location.href = `/auth?next=${encodeURIComponent(withShareContext('/my-books', getShareToken()))}`;
    }
  };

  const handleRequestDelete = useCallback((bookId: string) => {
    const book = books.find((entry) => entry.id === bookId);
    if (!book) return;
    setDeleteTarget({ id: book.id, title: book.metadata_ready === false ? 'Untitled book' : book.title.trim() || 'Untitled book' });
  }, [books]);

  const handleCancelDelete = useCallback(() => {
    if (isDeletingBook) return;
    setDeleteTarget(null);
  }, [isDeletingBook]);

  type ShelfAction = 'delete' | 'hidden' | 'active';
  type MutationFailure = { id: string; action: ShelfAction; title: string; status?: number; operationId?: string };
  const [mutationFailures, setMutationFailures] = useState<MutationFailure[]>([]);
  const [retryingMutation, setRetryingMutation] = useState<string | null>(null);
  const retryMutationRef = useRef<(failure: MutationFailure) => void>(() => {});
  const changeBook = useCallback(async (target: MutationFailure) => {
    const scope = notifications.current;
    const operationId = target.operationId ?? `book-change:${crypto.randomUUID()}`;
    dismissBookUpload(target.id);
    try {
      await (target.action === 'delete' ? removeBook(target.id) : target.action === 'hidden' ? hideBook(target.id) : unhideBook(target.id));
      if (mounted.current) setMutationFailures(current => current.filter(failure => failure.id !== target.id));
      dismissNotification(scope, operationId);
    } catch (caught) {
      if (!mounted.current) return;
      const status = caught && typeof caught === 'object' && 'status' in caught && typeof caught.status === 'number' ? caught.status : undefined;
      const failure = { ...target, status, operationId };
      setMutationFailures(current => [...current.filter(entry => entry.id !== target.id), failure]);
      const verb = target.action === 'delete' ? 'delete' : target.action === 'hidden' ? 'archive' : 'restore';
      notify({ scope, operationId, event: `failed-${target.action}`, kind: 'error',
        title: status === 401 ? 'Sign in to change your bookshelf' : status === 403 ? 'You do not have access to change this book' : `Unable to ${verb} this book`,
        action: { label: status === 401 ? 'Sign in' : 'Retry', onClick: () => retryMutationRef.current(failure) } });
    }
  }, [dismissBookUpload, removeBook, hideBook, unhideBook]);
  const retryMutation = useCallback(async (failure: MutationFailure) => {
    if (failure.status === 401) { signIn(); return; }
    if (retryingMutation) return;
    setRetryingMutation(failure.id);
    try {
      // A lost write response may already have changed the server. Reconcile first.
      const view = await refresh();
      if (!mounted.current || !view || view.error || view.offline || view.refreshing) return;
      const book = view.books.find(entry => entry.id === failure.id);
      const alreadyApplied = failure.action === 'delete' ? !book : book?.status === failure.action;
      if (alreadyApplied || !book) {
        setMutationFailures(current => current.filter(entry => entry.id !== failure.id));
        if (failure.operationId) dismissNotification(notifications.current, failure.operationId);
        return;
      }
      await changeBook(failure);
    } finally { if (mounted.current) setRetryingMutation(null); }
  }, [changeBook, refresh, retryingMutation, signIn]);
  retryMutationRef.current = failure => { void retryMutation(failure); };
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeletingBook(true);
    const target = deleteTarget;
    setDeleteTarget(null);
    try { await changeBook({ ...target, action: 'delete' }); }
    finally { if (mounted.current) setIsDeletingBook(false); }
  }, [deleteTarget, changeBook]);

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
    if (book && (entry.phase === 'complete' || ((entry.phase === 'error' || entry.phase === 'status_unknown') && (book.processing_status == null || book.processing_status === 'ready')))) return false;
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
        {((error && error.kind !== 'mutation') || offline) && (
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
            <Button size="sm" variant="outline" onClick={() => error?.kind === 'auth' && error.status !== 403 ? signIn() : void refreshLibrary()} disabled={refreshing}>
              {refreshing ? 'Retrying…' : error?.kind === 'auth' && error.status !== 403 ? 'Sign in' : 'Try again'}
            </Button>
          </div>
        )}

        {error?.kind !== 'auth' && mutationFailures.map(failure => <div key={failure.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--app-border)] p-3 text-sm">
          <p>Unable to {failure.action === 'delete' ? 'delete' : failure.action === 'hidden' ? 'archive' : 'restore'} “{failure.title}”.</p>
          <Button size="sm" variant="outline" disabled={retryingMutation !== null} onClick={() => void retryMutation(failure)}>{retryingMutation === failure.id ? 'Checking…' : 'Retry'}</Button>
        </div>)}

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
                    onHide={offline || book.processing_status === 'error' ? undefined : id => { void changeBook({ id, title: book.title || 'Untitled book', action: book.status === 'hidden' ? 'active' : 'hidden' }); }}
                    onDelete={offline ? undefined : handleRequestDelete}
                    hideLabel={book.status === 'hidden' ? 'Restore' : 'Archive'}
                    uploadError={upload?.error}
                    uploadIssue={upload?.issue ?? (pendingPollExpired && isProcessing(book) ? 'status_unknown' : undefined)}
                    checkingStatus={checkingUploads.includes(upload?.attemptId ?? '') || refreshing}
                    onCheckStatus={upload ? () => void recoverUpload(upload) : () => { pendingPollStarted.current = null; setPendingPollExpired(false); setPendingPollEpoch(value => value + 1); void refreshLibrary(); }}
                    onRetryUpload={offline ? undefined : () => { setResumeUpload(null); setIsUploadOpen(true); }}
                    onOpen={() => trackBookOpened({ book_id: book.id, title: book.title, source: 'library' })}
                  /> : upload && <UploadBookPlaceholder upload={upload} refreshing={refreshing || checkingUploads.includes(upload.attemptId)} onDismiss={() => dismissUpload(upload.attemptId)} onRetry={offline ? undefined : () => { setResumeUpload(null); setIsUploadOpen(true); }} onCheckStatus={() => void recoverUpload(upload)} onRefresh={() => void refreshLibrary()} />}
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
        disabled={offline || error?.kind === 'auth'}
        resumeUpload={resumeUpload}
        onRefreshLibrary={refreshLibrary}
        onSignIn={signIn}
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
