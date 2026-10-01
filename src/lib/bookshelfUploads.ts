import type { UploadBookEvent } from '@/components/UploadBookModal'
import { isCatalogItem, type CatalogItem } from './catalogTypes'

export type BookshelfUpload = UploadBookEvent & { errorConfirmation?: number }

/** The filename is transport metadata, never a substitute for parsed book metadata. */
export function uploadedCatalogItem(value: unknown, complete: boolean): CatalogItem | undefined {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as Record<string, unknown>
  if (raw.title !== null && typeof raw.title !== 'string') return undefined
  const metadataReady = raw.metadata_ready === true
  const title = metadataReady ? String(raw.title ?? '').trim() : ''
  const ready = complete || raw.processing_status === 'ready'
  const candidate = { ...raw, title: title || (ready ? 'Untitled book' : ''),
    author: metadataReady ? raw.author : null, cover: metadataReady ? raw.cover : null,
    processing_status: ready ? 'ready' : 'processing',
  }
  return isCatalogItem(candidate) ? candidate : undefined
}

/** Page-local operation identity survives parsed metadata and canonical duplicate resolution. */
export function applyUploadEvent(entries: BookshelfUpload[], event: UploadBookEvent): BookshelfUpload[] {
  if (event.phase === 'uploading') return [event, ...entries.filter(entry => entry.attemptId !== event.attemptId)]
  if (!entries.some(entry => entry.attemptId === event.attemptId)) return entries
  return entries.filter(entry => !event.bookId || entry.attemptId === event.attemptId || entry.bookId !== event.bookId)
    .map(entry => entry.attemptId === event.attemptId ? { ...entry, ...event, error: event.error, issue: event.issue } : entry)
}
