'use client'
import BookCard from './BookCard'
import type { BookshelfUpload } from '@/lib/bookshelfUploads'

export default function UploadBookPlaceholder({ upload, onDismiss, onRefresh, onRetry, refreshing = false }: {
  upload: BookshelfUpload; onDismiss: () => void; onRefresh: () => void; onRetry?: () => void; refreshing?: boolean;
}) {
  const failed = upload.phase === 'error'
  const complete = upload.phase === 'complete'
  return <article className="min-w-0" aria-label="Book upload">
    <BookCard id={`upload-${upload.attemptId}`} title="" author="" metadataLoading
      processingStatus={failed ? 'error' : upload.phase === 'uploading' ? 'pending' : 'processing'}
      uploadError={upload.error} onRetryUpload={onRetry} />
    {failed && <button className="mt-2 text-xs underline" onClick={onDismiss}>Dismiss</button>}
    {complete && <><p role="status" className="mt-1 text-xs text-muted-foreground">
      {refreshing ? 'Loading book details…' : 'Uploaded. Refresh to show details.'}
    </p><button className="mt-2 text-xs underline" onClick={onRefresh}>Refresh bookshelf</button></>}
  </article>
}
