import { CatalogError, compareActivityVersions, isActivityVersion, type CatalogContext } from './catalogTypes'
import { invalidateCatalogConfirmation } from './catalogFreshness'

const PREFIX = 'globoox:reading-activity:v2:'
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const MAX_PENDING = 2048
const ACTIVITY_INTERVAL_MS = 30_000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface StoredEvent {
  version: 1
  scope_key: string
  event_id: string
  book_id: string
  occurred_at: string
  wall_ms: number
  monotonic_ms: number
  page_id: string
}

interface QueueEnvironment {
  storage: () => Storage | null
  wallNow: () => number
  monotonicNow: () => number
  randomId: () => string
  fetch: typeof fetch
}

export class ReadingActivityError extends Error {
  constructor(public readonly kind: 'clock' | 'storage' | 'response' | 'network', message: string) {
    super(message)
    this.name = 'ReadingActivityError'
  }
}

const abortError = () => new DOMException('Reading activity request was cancelled', 'AbortError')
const checkAbort = (signal: AbortSignal) => { if (signal.aborted) throw abortError() }
const scopePrefix = (scope: string) => `${PREFIX}${encodeURIComponent(scope)}:`

/** One storage record per event prevents two tabs from overwriting each other's pending reads.
 * Events retain their original ID and occurrence clock through every retry and reload. */
export function createReadingActivityQueue(environment: QueueEnvironment) {
  const pageId = environment.randomId()
  const memory = new Map<string, StoredEvent>()
  const versions = new Map<string, string>()
  const sessions = new Map<string, { position: string; recordedAt: number }>()
  const flights = new Map<string, { controller: AbortController; promise: Promise<string>; waiters: number }>()
  let storageError: Error | null = null

  function storage() {
    try { return environment.storage() } catch (error) {
      storageError = error instanceof Error ? error : new Error('Reading activity storage is unavailable')
      return null
    }
  }

  function pending(scope: string): StoredEvent[] {
    const all = new Map([...memory].filter(([, event]) => event.scope_key === scope))
    const store = storage()
    const prefix = `${scopePrefix(scope)}event:`
    if (store) {
      try {
        for (let i = 0; i < store.length; i++) {
          const key = store.key(i)
          if (!key?.startsWith(prefix)) continue
          const event = JSON.parse(store.getItem(key) ?? 'null') as StoredEvent | null
          if (!event || event.version !== 1 || event.scope_key !== scope || !UUID.test(event.event_id)
            || !UUID.test(event.book_id) || !Number.isFinite(Date.parse(event.occurred_at))
            || !Number.isFinite(event.wall_ms) || !Number.isFinite(event.monotonic_ms)
            || typeof event.page_id !== 'string' || key !== `${prefix}${event.event_id}`) {
            throw new ReadingActivityError('storage', 'A pending reading event is damaged; it has been preserved')
          }
          all.set(event.event_id, event)
        }
      } catch (error) {
        if (error instanceof ReadingActivityError || error instanceof SyntaxError) {
          throw new ReadingActivityError('storage', 'A pending reading event is damaged; it has been preserved')
        }
        storageError = error instanceof Error ? error : new Error('Reading activity storage is unavailable')
      }
    }
    return [...all.values()].sort((a, b) => a.wall_ms - b.wall_ms || a.event_id.localeCompare(b.event_id))
  }

  function readVersion(scope: string) {
    let version = versions.get(scope) ?? '0'
    try {
      const saved = storage()?.getItem(`${scopePrefix(scope)}ack`)
      if (isActivityVersion(saved) && compareActivityVersions(saved, version) > 0) version = saved
    } catch { /* The in-memory acknowledgement is still usable in this page. */ }
    versions.set(scope, version)
    return version
  }

  function saveVersion(scope: string, version: string) {
    const previous = readVersion(scope)
    const next = compareActivityVersions(version, previous) > 0 ? version : previous
    versions.set(scope, next)
    try { storage()?.setItem(`${scopePrefix(scope)}ack`, next) } catch (error) {
      storageError = error instanceof Error ? error : new Error('Reading activity storage is unavailable')
    }
  }

  function enqueue(context: CatalogContext, bookId: string) {
    if (!UUID.test(bookId)) throw new ReadingActivityError('response', 'Invalid reading book ID')
    invalidateCatalogConfirmation(context.scopeKey)
    if (pending(context.scopeKey).length >= MAX_PENDING) {
      throw new ReadingActivityError('storage', 'Reading activity storage is full; existing events have been preserved')
    }
    const now = environment.wallNow()
    const event: StoredEvent = {
      version: 1, scope_key: context.scopeKey, event_id: environment.randomId(), book_id: bookId,
      occurred_at: new Date(now).toISOString(), wall_ms: now,
      monotonic_ms: environment.monotonicNow(), page_id: pageId,
    }
    memory.set(event.event_id, event)
    let durable = false
    try {
      const store = storage()
      if (store) {
        store.setItem(`${scopePrefix(context.scopeKey)}event:${event.event_id}`, JSON.stringify(event))
        durable = true
      }
    } catch (error) {
      storageError = error instanceof Error ? error : new Error('Reading activity storage is unavailable')
    }
    return { eventId: event.event_id, durable }
  }

  function eventPayload(event: StoredEvent) {
    // A constant device clock offset cancels. A clock change after a reload is
    // distinguishable only when it produces an invalid age; never clamp it to "now".
    const elapsed = event.page_id === pageId
      ? environment.monotonicNow() - event.monotonic_ms
      : environment.wallNow() - event.wall_ms
    if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > MAX_AGE_MS) {
      throw new ReadingActivityError('clock', 'Pending reading activity is outside the 30-day clock window; it has been preserved')
    }
    return { event_id: event.event_id, book_id: event.book_id, occurred_at: event.occurred_at, age_ms: Math.floor(elapsed) }
  }

  async function performFlush(context: CatalogContext, signal: AbortSignal) {
    for (;;) {
      checkAbort(signal)
      const batch = pending(context.scopeKey).slice(0, 32)
      if (!batch.length) return readVersion(context.scopeKey)
      const query = context.shareToken ? `?share=${encodeURIComponent(context.shareToken)}` : ''
      const response = await environment.fetch(`/api/v2/reading-activity${query}`, {
        method: 'POST', credentials: 'include', cache: 'no-store', signal,
        headers: { ...context.headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch.map(eventPayload) }),
      })
      checkAbort(signal)
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new CatalogError('auth', 'Reading activity identity or access could not be confirmed', response.status)
        }
        if (response.status === 404 || response.status === 405) {
          throw new CatalogError('deployment', 'The server does not support reading activity yet', response.status)
        }
        if (response.status === 503) {
          const failure = await response.json().catch(() => null) as { code?: string; statusMessage?: string; data?: { code?: string } } | null
          const code = failure?.code ?? failure?.data?.code ?? failure?.statusMessage
          if (code === 'catalog_not_configured' || code === 'migration_required' || code === 'catalog_migration_required') {
            throw new CatalogError('deployment', 'The server catalog migration is not ready', response.status)
          }
        }
        if (response.status === 400 || response.status === 409) {
          throw new ReadingActivityError('response', 'The server rejected pending reading activity; it has been preserved')
        }
        throw new ReadingActivityError('network', `Reading activity was not acknowledged (${response.status})`)
      }
      const ack = await response.json().catch(() => {
        throw new ReadingActivityError('response', 'Reading activity acknowledgement is not valid JSON')
      }) as { scope_key?: unknown; activity_version?: unknown; acknowledged_event_ids?: unknown } | null
      checkAbort(signal)
      const requested = new Set(batch.map(event => event.event_id))
      if (!ack || typeof ack !== 'object') throw new ReadingActivityError('response', 'Reading activity acknowledgement is invalid')
      if (ack.scope_key !== context.scopeKey) throw new CatalogError('auth', 'Reading activity acknowledgement belongs to another identity')
      if (!isActivityVersion(ack.activity_version)
        || !Array.isArray(ack.acknowledged_event_ids) || !ack.acknowledged_event_ids.length
        || !ack.acknowledged_event_ids.every(id => typeof id === 'string' && requested.has(id))
        || new Set(ack.acknowledged_event_ids).size !== ack.acknowledged_event_ids.length) {
        throw new ReadingActivityError('response', 'Reading activity acknowledgement is invalid')
      }
      // Persist the causal barrier before deleting events. A crash before deletion
      // merely retries the same IDs; a late/duplicate acknowledgement never lowers it.
      saveVersion(context.scopeKey, ack.activity_version)
      for (const id of ack.acknowledged_event_ids as string[]) {
        try { storage()?.removeItem(`${scopePrefix(context.scopeKey)}event:${id}`) } catch (error) {
          storageError = error instanceof Error ? error : new Error('Reading activity storage is unavailable')
          // Stop a retry loop if a durable event cannot be removed. It remains safe to replay.
          throw new ReadingActivityError('storage', 'Acknowledged reading activity could not be removed from storage')
        }
        memory.delete(id)
      }
    }
  }

  function flush(context: CatalogContext, signal: AbortSignal): Promise<string> {
    if (signal.aborted) return Promise.reject(abortError())
    let flight = flights.get(context.scopeKey)
    if (!flight || flight.controller.signal.aborted) {
      const controller = new AbortController()
      const next = { controller, promise: Promise.resolve('0'), waiters: 0 }
      next.promise = Promise.resolve().then(() => performFlush(context, controller.signal)).finally(() => {
        if (flights.get(context.scopeKey) === next) flights.delete(context.scopeKey)
      })
      flight = next
      flights.set(context.scopeKey, flight)
    }
    const active = flight
    active.waiters++
    return new Promise((resolve, reject) => {
      let settled = false
      const finish = (error: unknown, version?: string) => {
        if (settled) return
        settled = true
        signal.removeEventListener('abort', onAbort)
        active.waiters--
        if (!active.waiters && !active.controller.signal.aborted) active.controller.abort()
        if (error) reject(error)
        else resolve(version ?? '0')
      }
      const onAbort = () => finish(abortError())
      signal.addEventListener('abort', onAbort, { once: true })
      active.promise.then(version => finish(null, version), error => finish(error))
    })
  }

  function recordVisible(context: CatalogContext, bookId: string, sessionId: string, position: string, ready: boolean) {
    if (!ready || !position) return null
    const key = `${context.scopeKey}:${bookId}:${sessionId}`
    const previous = sessions.get(key)
    const now = environment.monotonicNow()
    if (previous?.position === position) return null
    if (previous && now - previous.recordedAt < ACTIVITY_INTERVAL_MS) {
      previous.position = position
      return null
    }
    const result = enqueue(context, bookId)
    if (sessions.size >= 512) sessions.delete(sessions.keys().next().value!)
    sessions.set(key, { position, recordedAt: now })
    return result
  }

  return {
    enqueue, flush, recordVisible,
    endSession: (context: CatalogContext, bookId: string, sessionId: string) => sessions.delete(`${context.scopeKey}:${bookId}:${sessionId}`),
    getPendingRecency: (scope: string) => Object.fromEntries(pending(scope).map(event => [event.book_id, event.occurred_at])),
    getVersion: readVersion,
    getStorageError: () => storageError,
  }
}

let queue: ReturnType<typeof createReadingActivityQueue> | undefined
function browserQueue() {
  return queue ??= createReadingActivityQueue({
    storage: () => typeof window === 'undefined' ? null : window.localStorage,
    wallNow: () => Date.now(), monotonicNow: () => performance.now(),
    randomId: () => crypto.randomUUID(), fetch: (...args) => fetch(...args),
  })
}

export const flushReadingActivity = (context: CatalogContext, signal: AbortSignal) => browserQueue().flush(context, signal)
export const getPendingReadingRecency = (scopeKey: string) => browserQueue().getPendingRecency(scopeKey)
export const recordVisibleReadingActivity = (context: CatalogContext, bookId: string, sessionId: string, position: string, ready: boolean) =>
  browserQueue().recordVisible(context, bookId, sessionId, position, ready)

/** Best effort on the Reader; the catalog's bounded attempt explicitly awaits its own flush. */
export function flushReadingActivityInBackground(context: CatalogContext) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2500)
  return flushReadingActivity(context, controller.signal).catch(() => undefined).finally(() => clearTimeout(timeout))
}
