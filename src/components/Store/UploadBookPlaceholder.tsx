'use client'
import { Loader2, CircleAlert, CheckCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { BookshelfUpload } from '@/lib/bookshelfUploads'

export default function UploadBookPlaceholder({ upload, onDismiss, onRefresh, refreshing = false }: {
  upload: BookshelfUpload; onDismiss: () => void; onRefresh: () => void; refreshing?: boolean;
}) {
  const failed = upload.phase === 'error'
  const complete = upload.phase === 'complete'
  const label = failed ? 'Upload failed' : complete ? refreshing ? 'Loading book details…' : 'Uploaded. Refresh to show details.'
    : upload.phase === 'processing' ? 'Processing book…' : 'Uploading book…'
  return <article className="min-w-0" aria-label={`Uploading ${upload.fileName}`}>
    <div className="relative mb-2 aspect-[2/3] overflow-hidden rounded-[3px] bg-muted">
      {!failed && <Skeleton className="absolute inset-0 h-full w-full" />}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-3 text-center">
        {failed ? <CircleAlert className="size-7 text-destructive" aria-hidden="true" />
          : complete && !refreshing ? <CheckCircle className="size-7 text-muted-foreground" aria-hidden="true" />
          : <Loader2 className="size-7 animate-spin text-muted-foreground" aria-hidden="true" />}
        <p role="status" className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
    <p className="line-clamp-2 break-words text-sm font-medium">{upload.fileName}</p>
    {failed && <><p className="mt-1 break-words text-xs text-destructive">{upload.error || 'Please upload the file again.'}</p>
      <button className="mt-2 text-xs underline" onClick={onDismiss}>Dismiss</button></>}
    {complete && <button className="mt-2 text-xs underline" onClick={onRefresh}>Refresh bookshelf</button>}
  </article>
}
