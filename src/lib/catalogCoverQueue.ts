import { abortable, catalogRequestUrl } from './catalogApi'
import { getCatalogCover, putCatalogCover } from './catalogCache'
import type { CatalogContext, CatalogItem } from './catalogTypes'

type Subscriber = { resolve: (blob: Blob | null) => void; reject: (error: unknown) => void; cleanup: () => void }
type Job = { key: string; book: CatalogItem; context: CatalogContext; offline: boolean; controller: AbortController; subscribers: Set<Subscriber>; started: boolean }
const jobs = new Map<string, Job>()
const waiting: Job[] = []
let active = 0
export const catalogCoverKey = (book: CatalogItem, context: CatalogContext) =>
  JSON.stringify([context.scopeKey, book.id, book.cover?.version])

async function load(job: Job): Promise<Blob | null> {
  const { book, context, offline, controller } = job
  if (!book.cover) return null
  const { version, url } = book.cover
  const signal = controller.signal
  const cacheRead = getCatalogCover(context.scopeKey, book.id, version).catch(() => null)
  let headStart: ReturnType<typeof setTimeout> | undefined
  const storageTimer = offline ? setTimeout(() => controller.abort(new Error('Cover cache timed out')), 8000) : undefined
  const cached = await abortable(offline ? cacheRead : Promise.race([
    cacheRead, new Promise<null>(resolve => { headStart = setTimeout(() => resolve(null), 150) }),
  ]), signal).finally(() => { clearTimeout(headStart); clearTimeout(storageTimer) })
  if (cached || offline) return cached
  // The request deadline never includes time spent waiting in FIFO.
  const timer = setTimeout(() => controller.abort(new Error('Cover request timed out')), 8000)
  try {
    const network = (async () => {
      const response = await fetch(catalogRequestUrl(url, context), { headers: context.headers, signal, cache: 'no-store' })
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error('Cover unavailable')
      if (Number(response.headers.get('content-length')) > 256 * 1024) throw new Error('Cover exceeds size budget')
      const blob = await response.blob()
      if (!blob.size || blob.size > 256 * 1024) throw new Error('Invalid cover size')
      return blob
    })()
    const blob = await abortable(Promise.race([
      network, cacheRead.then(blob => blob ?? new Promise<Blob>(() => {})),
    ]), signal)
    void putCatalogCover(context.scopeKey, book.id, version, blob).catch(() => {})
    return blob
  } finally {
    clearTimeout(timer)
    controller.abort() // Cancel a network request if the late disk result won.
  }
}
function finish(job: Job, blob: Blob | null, error?: unknown) {
  if (jobs.get(job.key) === job) jobs.delete(job.key)
  for (const subscriber of job.subscribers) {
    subscriber.cleanup()
    if (error) subscriber.reject(error)
    else subscriber.resolve(blob)
  }
  job.subscribers.clear()
}
function pump() {
  while (active < 4 && waiting.length) {
    const job = waiting.shift()!
    if (!job.subscribers.size || job.controller.signal.aborted) continue
    job.started = true
    active += 1
    void load(job).then(blob => finish(job, blob), error => finish(job, null, error)).finally(() => {
      if (jobs.get(job.key) === job) jobs.delete(job.key)
      active -= 1
      pump()
    })
  }
}
/** Shared FIFO. Completed promises/blobs are not retained by the scheduler. */
export function requestCatalogCover(book: CatalogItem, context: CatalogContext, offline: boolean, signal: AbortSignal): Promise<Blob | null> {
  if (!book.cover) return Promise.resolve(null)
  if (signal.aborted) return Promise.reject(signal.reason)
  const key = `${catalogCoverKey(book, context)}:${offline}`
  let job = jobs.get(key)
  if (!job) {
    job = { key, book, context, offline, controller: new AbortController(), subscribers: new Set(), started: false }
    jobs.set(key, job)
    waiting.push(job)
  }
  const owned = job
  const promise = new Promise<Blob | null>((resolve, reject) => {
    const cancelled = () => {
      owned.subscribers.delete(subscriber)
      subscriber.cleanup()
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
      if (!owned.subscribers.size) {
        owned.controller.abort()
        if (jobs.get(key) === owned) jobs.delete(key)
        if (!owned.started) {
          const index = waiting.indexOf(owned)
          if (index >= 0) waiting.splice(index, 1)
        }
      }
    }
    const subscriber: Subscriber = { resolve, reject, cleanup: () => signal.removeEventListener('abort', cancelled) }
    owned.subscribers.add(subscriber)
    signal.addEventListener('abort', cancelled, { once: true })
  })
  pump()
  return promise
}
