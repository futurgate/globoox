'use client'
import BookCard from './BookCard'
import type { BookshelfUpload } from '@/lib/bookshelfUploads'

export default function UploadBookPlaceholder({ upload, onDismiss, onRetry, onCheckStatus, refreshing = false }: {
  upload: BookshelfUpload; onDismiss: () => void; onRefresh: () => void; onRetry?: () => void; onCheckStatus?: () => void; refreshing?: boolean;
}) {
  const failed = upload.phase === 'error'
  const unknown = upload.phase === 'status_unknown'
  const complete = upload.phase === 'complete'
  return <article className="min-w-0" aria-label="Book upload">
    <BookCard id={`upload-${upload.attemptId}`} title="" author="" metadataLoading
      processingStatus={failed ? 'error' : upload.phase === 'uploading' ? 'pending' : 'processing'}
      processingLabel={complete ? 'Loading details…' : undefined}
      uploadError={upload.error} uploadIssue={upload.issue ?? (unknown ? 'status_unknown' : undefined)}
      onRetryUpload={onRetry} onCheckStatus={onCheckStatus} checkingStatus={refreshing} />
    {failed && <button className="min-h-11 text-xs underline" onClick={onDismiss}>Dismiss</button>}
  </article>
}
