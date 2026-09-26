import type { UploadBookEvent } from '@/components/UploadBookModal'

export interface BookshelfUpload extends UploadBookEvent { resolved?: boolean }

/** Page-local entries. A completed duplicate replaces its earlier pin, never the book twice. */
export function applyUploadEvent(entries: BookshelfUpload[], event: UploadBookEvent): BookshelfUpload[] {
  if (event.phase === 'uploading') return [event, ...entries.filter(entry => entry.attemptId !== event.attemptId)]
  if (!entries.some(entry => entry.attemptId === event.attemptId)) return entries
  return entries.filter(entry => !event.bookId || entry.attemptId === event.attemptId || entry.bookId !== event.bookId)
    .map(entry => entry.attemptId === event.attemptId ? { ...entry, ...event } : entry)
}
