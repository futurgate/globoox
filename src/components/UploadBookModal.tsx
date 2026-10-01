'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, Loader2, FileText } from 'lucide-react';
import { IOSAction, IOSActionStack } from '@/components/ui/ios-action-group';
import IOSFlowDialog from '@/components/ui/ios-flow-dialog';
import IOSDialogFooter from '@/components/ui/ios-dialog-footer';
import { ApiRequestError, BookJobError, getSignedUploadUrl, uploadToStorage, processBook, waitForBookJob, type BookJobResult, type UploadIssue } from '@/lib/api';
import { trackBookUploadStarted, trackBookUploaded, trackBookUploadFailed } from '@/lib/posthog';
import * as Sentry from '@sentry/nextjs';
import type { CatalogItem } from '@/lib/catalogTypes';
import { uploadedCatalogItem } from '@/lib/bookshelfUploads';

export interface UploadBookEvent {
  attemptId: string; fileName: string; phase: 'uploading' | 'processing' | 'complete' | 'error' | 'status_unknown'; bookId?: string; error?: string;
  book?: CatalogItem;
  jobId?: string;
  issue?: UploadIssue;
  orderConfirmed?: boolean;
  retryBookId?: string;
  replacesAttemptId?: string;
  checkNumber?: number;
}

export type UploadRetryTarget = { bookId?: string; attemptId?: string };

interface UploadBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded?: (bookId: string) => void;
  onUploadEvent?: (event: UploadBookEvent) => void;
  disabled?: boolean;
  /** Opening a previous attempt never resubmits its file or starts polling by itself. */
  resumeUpload?: UploadBookEvent | null;
  retryUpload?: UploadRetryTarget | null;
  onRefreshLibrary?: () => void | Promise<unknown>;
  onSignIn?: () => void;
}

const SUPPORT_EMAIL = 'support@globoox.co'

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

function createUploadFileName(originalName: string): string {
  const slug = originalName
    .replace(/\.epub$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  const uniqueSuffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
  return `${slug}-${uniqueSuffix}.epub`
}

function getUploadHelp(validation: boolean, failed: boolean) {
  if (validation) return {
    title: 'This file does not look like a valid EPUB.',
    tips: ['Make sure the file ends in .epub.', 'If it opens in another reading app, export it again as EPUB and retry.'],
  }
  if (!failed) return null
  return {
    title: 'The server could not process this book.',
    tips: ['Try opening the file in another EPUB reader to confirm it works.', 'If possible, re-export it as EPUB 2 or EPUB 3 and upload it again.', `If this keeps happening, contact ${SUPPORT_EMAIL}.`],
  }
}

export default function UploadBookModal({ isOpen, onClose, onUploaded, onUploadEvent, disabled = false, resumeUpload, retryUpload, onRefreshLibrary, onSignIn }: UploadBookModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDropActive, setIsDropActive] = useState(false);
  const [operation, setOperation] = useState<UploadBookEvent | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [reconciled, setReconciled] = useState(false);
  const [reconciledRetry, setReconciledRetry] = useState<UploadRetryTarget | null | undefined>(undefined);
  const [libraryHasUpload, setLibraryHasUpload] = useState(false);
  const activeAttempts = useRef(new Set<string>());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogEpoch = useRef(0);
  const mounted = useRef(true);
  const activeUploads = useRef(new Set<AbortController>());
  useEffect(() => {
    mounted.current = true;
    const controllers = activeUploads.current;
    return () => { mounted.current = false; for (const controller of controllers) controller.abort(); };
  }, []);
  useEffect(() => { if (!isOpen) dialogEpoch.current += 1; }, [isOpen]);
  const resumeAttemptId = resumeUpload?.attemptId;
  const resumeRef = useRef(resumeUpload);
  resumeRef.current = resumeUpload;
  useEffect(() => {
    if (!isOpen || !resumeAttemptId) return;
    dialogEpoch.current += 1;
    setOperation(resumeRef.current ?? null);
    setError(null);
    setFile(null);
    setUploading(false);
    setReconciled(false);
    setReconciledRetry(undefined);
    setLibraryHasUpload(false);
  }, [isOpen, resumeAttemptId]);
  const uploadHelp = getUploadHelp(!!error && !operation, operation?.phase === 'error' && !operation.issue)

  const sectionClassName = 'rounded-[20px] bg-[var(--bg-grouped)] p-5'

  const isLikelyEpub = async (selectedFile: File): Promise<boolean> => {
    const normalizedName = selectedFile.name.trim().toLowerCase();
    if (normalizedName.endsWith('.epub')) return true;

    const mime = (selectedFile.type || '').toLowerCase();
    if (mime === 'application/epub+zip') return true;

    try {
      const head = await selectedFile.slice(0, 1024).arrayBuffer();
      const bytes = new Uint8Array(head);
      const isZip = bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
      if (!isZip) return false;
      const text = new TextDecoder('latin1').decode(bytes).toLowerCase();
      if (text.includes('mimetypeapplication/epub+zip')) return true;
      console.warn('[upload] EPUB header not found in first 1KB, treating as ZIP fallback');
      return true;
    } catch {
      return false;
    }
  };

  const handleSelectedFile = async (selectedFile: File | null) => {
    if (!selectedFile || disabled) return false;
    const valid = await isLikelyEpub(selectedFile);
    if (!valid) {
      setError('Please select an EPUB file');
      return false;
    }
    setFile(selectedFile);
    setError(null);
    return true;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null;
    const isAccepted = await handleSelectedFile(selectedFile);
    if (!isAccepted) e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading && !disabled) setIsDropActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDropActive(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropActive(false);
    if (uploading || disabled) return;
    const droppedFile = e.dataTransfer.files?.[0] ?? null;
    const isAccepted = await handleSelectedFile(droppedFile);
    if (!isAccepted && fileInputRef.current) fileInputRef.current.value = '';
  };

  const runAttempt = async (initial: UploadBookEvent, selected?: File) => {
    if (activeAttempts.current.has(initial.attemptId)) return;
    if (selected && disabled) return;
    activeAttempts.current.add(initial.attemptId);
    const epoch = dialogEpoch.current;
    const controller = new AbortController();
    activeUploads.current.add(controller);
    const alive = () => mounted.current && !controller.signal.aborted;
    const currentDialog = () => alive() && dialogEpoch.current === epoch;
    let latest: UploadBookEvent = initial;
    const publish = (phase: UploadBookEvent['phase'], extra: Partial<UploadBookEvent> = {}) => {
      if (!alive()) return;
      latest = { ...latest, phase, error: undefined, issue: undefined, ...extra };
      onUploadEvent?.(latest);
      if (currentDialog()) setOperation(latest);
    };
    const progress = (text: string) => { if (currentDialog()) setMessage(text); };
    const fileSizeKb = selected ? Math.round(selected.size / 1024) : 0;
    const complete = (result: BookJobResult) => {
      const snapshot = result.book?.id === result.bookId ? result.book : latest.book?.id === result.bookId ? latest.book : undefined;
      const book = uploadedCatalogItem(snapshot, true);
      publish('complete', { bookId: result.bookId, book, orderConfirmed: result.orderConfirmed,
        issue: result.orderConfirmed ? undefined : 'order_unconfirmed',
        error: result.orderConfirmed ? undefined : 'Unable to update the bookshelf.' });
      if (!alive()) return;
      Sentry.addBreadcrumb({ category: 'upload', message: 'upload.success', data: { bookId: result.bookId }, level: 'info' });
      trackBookUploaded({ title: selected?.name ?? initial.fileName, author: 'Unknown', language: 'unknown', chapter_count: result.chapterCount, file_size_kb: fileSizeKb });
      onUploaded?.(result.bookId);
      if (currentDialog()) {
        setUploading(false);
        handleClose();
      }
    };
    setUploading(true);
    setError(null);
    setReconciled(false);
    try {
      if (selected) {
        publish('uploading');
        progress('Preparing upload…');
        trackBookUploadStarted({ file_size_kb: fileSizeKb });
        Sentry.addBreadcrumb({ category: 'upload', message: 'upload.started', data: { fileSize: selected.size }, level: 'info' });
        const fileName = createUploadFileName(selected.name);
        const { signedUrl } = await getSignedUploadUrl('books', fileName, controller.signal);
        controller.signal.throwIfAborted();
        progress('Uploading book…');
        await uploadToStorage(signedUrl, selected, 'application/epub+zip', controller.signal);
        controller.signal.throwIfAborted();
        publish('processing');
        progress('Processing book…');
        const response = await processBook(fileName, selected.name, selected.size, controller.signal, initial.retryBookId);
        controller.signal.throwIfAborted();
        if ('jobId' in response && response.jobId) {
          publish('processing', { jobId: response.jobId, bookId: response.bookId });
        } else if ('id' in response && response.id) {
          complete({ bookId: response.id, chapterCount: response.chapter_count ?? 0, book: response.book ?? undefined, orderConfirmed: response.order_confirmed !== false });
          return;
        } else {
          throw new Error('The upload response could not be confirmed.');
        }
      } else {
        publish('processing');
        progress('Checking book status…');
      }
      if (!latest.jobId) throw new Error('This upload has no status reference.');
      const result = await waitForBookJob(latest.jobId, controller.signal,
        pct => progress(`Processing book… ${pct}%`), snapshot => {
          const book = uploadedCatalogItem(snapshot, false);
          if (book) publish('processing', { bookId: book.id, book });
        });
      controller.signal.throwIfAborted();
      complete(result);
    } catch (err: unknown) {
      if (!alive()) return;
      const status = err instanceof ApiRequestError ? err.status : undefined;
      const kind = err instanceof BookJobError ? err.kind : status === 401 ? 'auth_required' : status === 403 ? 'forbidden'
        : status === 404 || status === 409 ? 'job_not_found'
        : status && [400, 413, 415, 422].includes(status) ? 'upload_rejected' : latest.jobId ? 'status_unknown' : 'upload_unconfirmed';
      if (err instanceof BookJobError && err.book) {
        const book = uploadedCatalogItem(err.book, false);
        if (book) latest = { ...latest, bookId: book.id, book };
      }
      if (latest.book?.processing_status === 'ready' && kind !== 'auth_required' && kind !== 'forbidden') {
        complete({ bookId: latest.book.id, chapterCount: 0, book: latest.book, orderConfirmed: false });
        return;
      }
      const confirmedFailure = kind === 'processing_failed' || kind === 'upload_rejected';
      const message = kind === 'processing_failed' ? getErrorMessage(err, 'The server could not process this book.')
        : kind === 'upload_rejected' ? 'The server rejected this upload. Check the file and try again.'
        : kind === 'auth_required' ? 'Sign in to check this upload.'
        : kind === 'forbidden' ? 'You do not have access to check this upload.'
        : kind === 'job_not_found' || kind === 'upload_unconfirmed' ? 'This upload could not be confirmed. Refresh your library before uploading again.'
        : getErrorMessage(err, 'Could not check whether the book is ready.');
      publish(confirmedFailure ? 'error' : 'status_unknown', { error: message, issue: kind === 'processing_failed' ? undefined : kind });
      if (confirmedFailure) {
        Sentry.captureException(err, { contexts: { upload: { fileSizeKb, jobId: latest.jobId } } });
        trackBookUploadFailed({ error: message, file_size_kb: fileSizeKb });
      }
      if (currentDialog()) setUploading(false);
    } finally {
      activeUploads.current.delete(controller);
      activeAttempts.current.delete(initial.attemptId);
    }
  };

  const handleUpload = () => {
    if (!file || uploading || disabled) return;
    const retry = operation?.phase === 'error'
      ? { bookId: operation.bookId, attemptId: operation.attemptId }
      : reconciledRetry !== undefined ? reconciledRetry : retryUpload;
    void runAttempt({ attemptId: crypto.randomUUID(), fileName: file.name, phase: 'uploading',
      bookId: retry?.bookId, retryBookId: retry?.bookId, replacesAttemptId: retry?.attemptId }, file);
  };
  const checkStatus = () => {
    if (!operation?.jobId || uploading || operation.issue === 'job_not_found' || operation.issue === 'forbidden' || operation.issue === 'auth_required') return;
    void runAttempt({ ...operation, checkNumber: (operation.checkNumber ?? 0) + 1 });
  };
  const refreshLibrary = async () => {
    if (refreshing || !onRefreshLibrary) return;
    const epoch = dialogEpoch.current;
    setRefreshing(true);
    try {
      const response = await onRefreshLibrary();
      if (!mounted.current || dialogEpoch.current !== epoch) return;
      const view = response && typeof response === 'object' ? response as { books?: CatalogItem[]; error?: unknown; offline?: boolean; refreshing?: boolean } : null;
      const confirmed = Boolean(view && Array.isArray(view.books) && !view.error && !view.offline && !view.refreshing);
      setReconciled(confirmed);
      if (confirmed) {
        const id = operation?.bookId ?? operation?.retryBookId ?? retryUpload?.bookId;
        const book = view!.books!.find(entry => entry.id === id);
        setLibraryHasUpload(Boolean(book && book.processing_status !== 'error'));
        setReconciledRetry({ bookId: book?.processing_status === 'error' ? book.id : undefined, attemptId: operation?.attemptId });
      }
    } catch { /* The shelf retains its persistent connection message. */ }
    finally {
      if (mounted.current && dialogEpoch.current === epoch) setRefreshing(false);
    }
  };
  const chooseAgain = () => {
    setOperation(null);
    setError(null);
    setReconciled(false);
    setLibraryHasUpload(false);
  };

  const handleClose = () => {
    dialogEpoch.current += 1;
    setFile(null);
    setUploading(false);
    setMessage('');
    setError(null);
    setIsDropActive(false);
    setOperation(null);
    setRefreshing(false);
    setReconciled(false);
    setReconciledRetry(undefined);
    setLibraryHasUpload(false);
    onClose();
  };

  return (
    <IOSFlowDialog
      open={isOpen}
      onOpenChange={(nextOpen) => !nextOpen && handleClose()}
      className="sm:max-w-md sm:pb-6"
      title="Upload Book"
      description="Add an EPUB from your device and we&apos;ll prepare it for reading and translation."
    >
      <div className="space-y-4">
        {disabled && <p role="status" className="text-sm text-muted-foreground">Uploads are unavailable while the library is offline. Refresh your library to reconnect.</p>}
        {!uploading && operation && (operation.phase === 'status_unknown' || operation.phase === 'complete') ? (
          <div className={`${sectionClassName} space-y-4`}>
            <p role="status" className="text-sm">{libraryHasUpload ? 'This book is already in your library.' : operation.error ?? 'The book is ready.'}</p>
            {!libraryHasUpload && (operation.issue === 'job_not_found' || operation.issue === 'upload_unconfirmed') && <p className="text-sm text-muted-foreground">The earlier upload may still appear in your library. Check there before choosing to upload the file again.</p>}
            <IOSActionStack>
              {libraryHasUpload && <IOSAction onClick={handleClose} emphasized>Back to library</IOSAction>}
              {operation.phase === 'status_unknown' && operation.jobId && !['job_not_found', 'auth_required', 'forbidden'].includes(operation.issue ?? '') && <IOSAction onClick={checkStatus} emphasized>Check status</IOSAction>}
              {operation.issue === 'auth_required' && onSignIn && <IOSAction onClick={onSignIn} emphasized>Sign in</IOSAction>}
              {onRefreshLibrary && <IOSAction onClick={() => void refreshLibrary()} disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh library'}</IOSAction>}
              {!libraryHasUpload && (operation.issue === 'job_not_found' || operation.issue === 'upload_unconfirmed') && <IOSAction onClick={chooseAgain} disabled={disabled || !reconciled}>Upload again</IOSAction>}
            </IOSActionStack>
          </div>
        ) : !uploading ? (
          <>
            <div
              onClick={() => !disabled && fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`${sectionClassName} cursor-pointer border border-[var(--app-border)] py-7 text-center transition-all duration-150 hover:bg-[var(--fill-tertiary)] ${isDropActive ? 'bg-[var(--fill-tertiary)] border-transparent scale-[1.01]' : ''}`}
            >
              {file ? (
                <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              ) : (
                <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              )}
              <p className="text-[15px] font-medium text-foreground">
                {file ? file.name : 'Choose an EPUB file'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                EPUB only. DRM-protected books usually cannot be imported.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              disabled={disabled}
              accept=".epub"
              onChange={handleFileSelect}
              className="hidden"
            />

            {(error || operation?.error) && (
              <div className={`${sectionClassName} space-y-3 text-left`}>
                <p className="text-sm font-medium text-destructive">{error ?? operation?.error}</p>
                {uploadHelp && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">{uploadHelp.title}</p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {uploadHelp.tips.map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <IOSDialogFooter>
              <IOSActionStack>
                <IOSAction onClick={handleUpload} disabled={!file || disabled} emphasized>
                  Upload
                </IOSAction>
              </IOSActionStack>
            </IOSDialogFooter>
          </>
        ) : (
          <div className={`${sectionClassName} py-8 text-center`}>
            <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground" role="status">{message}</p>
          </div>
        )}
      </div>
    </IOSFlowDialog>
  );
}
