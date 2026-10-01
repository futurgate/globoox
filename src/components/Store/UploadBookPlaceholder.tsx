'use client'
import BookCard from './BookCard'
import type { BookshelfUpload } from '@/lib/bookshelfUploads'

export default function UploadBookPlaceholder({ upload, onDismiss, onRefresh, onRetry, onCheckStatus, refreshing = false }: {
  upload: BookshelfUpload; onDismiss: () => void; onRefresh: () => void; onRetry?: () => void; onCheckStatus?: () => void; refreshing?: boolean;
}) {
  const failed = upload.phase === 'error'
  const unknown = upload.phase === 'status_unknown'
  const complete = upload.phase === 'complete'
  return <article className="min-w-0" aria-label="Book upload">
    <BookCard id={`upload-${upload.attemptId}`} title="" author="" metadataLoading
      processingStatus={failed ? 'error' : upload.phase === 'uploading' ? 'pending' : 'processing'}
      uploadError={upload.error} uploadIssue={upload.issue ?? (unknown ? 'status_unknown' : undefined)}
      onRetryUpload={onRetry} onCheckStatus={onCheckStatus} checkingStatus={refreshing} />
    {failed && <button className="min-h-11 text-xs underline" onClick={onDismiss}>Dismiss</button>}
    {complete && <><p className="mt-1 text-xs text-[var(--app-text-muted)]">
      {refreshing ? 'Loading book details…' : 'Book ready. Refresh to show details.'}
    </p><button className="min-h-11 text-xs underline" disabled={refreshing} onClick={onRefresh}>Refresh bookshelf</button></>}
  </article>
}
