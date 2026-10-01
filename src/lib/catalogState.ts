import { abortable } from './catalogApi'
import { CatalogError, isCatalogItem, validateCatalogManifest, type CatalogContext, type CatalogItem, type CatalogManifest } from './catalogTypes'
import type { CatalogCacheEntry } from './catalogCache'
import { beginCatalogValidation, confirmCatalog, hasFreshCatalogConfirmation, hasFreshCatalogReceipt, invalidateCatalogConfirmation } from './catalogFreshness'

// One bounded budget for identity, reading acknowledgements and the manifest.
export const CATALOG_REFRESH_TIMEOUT_MS = 5_000

export interface CatalogView {
  books: CatalogItem[]
  loading: boolean
  refreshing: boolean
  offline: boolean
  error: CatalogError | null
  context: CatalogContext | null
  revision: string | null
  confirmation: number
}

export interface CatalogDependencies {
  hint: () => CatalogContext | null
  resolve: (signal: AbortSignal) => Promise<CatalogContext>
  cache: (context: CatalogContext) => Promise<CatalogCacheEntry | null>
  cached: (scope: string) => CatalogCacheEntry | null
  persist: (manifest: CatalogManifest) => Promise<void>
  flush: (context: CatalogContext, signal: AbortSignal) => Promise<string>
  fetch: (context: CatalogContext, signal: AbortSignal, minVersion: string) => Promise<CatalogManifest>
  pendingRecency?: (scope: string) => Record<string, string>
  update: (id: string, status: 'hidden' | 'active') => Promise<unknown>
  delete: (id: string) => Promise<unknown>
  create: (data: { title: string; author?: string; cover_url?: string; source_language?: string }) => Promise<CatalogItem>
}

function sameItems(a: CatalogItem[], b: CatalogItem[]) {
  return a === b || (a.length === b.length && a.every((item, i) => JSON.stringify(item) === JSON.stringify(b[i])))
}
function serverRecency(a: CatalogItem, b: CatalogItem) {
  const recent = (Date.parse(b.last_read_at ?? '') || -Infinity) - (Date.parse(a.last_read_at ?? '') || -Infinity)
  return (Number.isNaN(recent) ? 0 : recent) || Date.parse(b.created_at) - Date.parse(a.created_at) || a.id.localeCompare(b.id)
}
const pendingWrites = new Map<string, Set<Promise<unknown>>>()
function trackWrite<T>(scope: string, promise: Promise<T>): Promise<T> {
  const writes = pendingWrites.get(scope) ?? new Set<Promise<unknown>>()
  writes.add(promise)
  pendingWrites.set(scope, writes)
  const finish = () => {
    writes.delete(promise)
    if (!writes.size && pendingWrites.get(scope) === writes) pendingWrites.delete(scope)
  }
  void promise.then(finish, finish)
  return promise
}
async function settlePriorWrites(scope: string, signal: AbortSignal) {
  // SPA return can create a new hook while the previous screen's legacy mutation is still running.
  while (pendingWrites.get(scope)?.size) {
    await abortable(Promise.allSettled([...pendingWrites.get(scope)!]), signal)
  }
}

/** Owns one identity lifetime. Async work never publishes after its generation expires. */
export class CatalogController {
  private view: CatalogView = { books: [], loading: true, refreshing: false, offline: false, error: null, context: null, revision: null, confirmation: 0 }
  private listeners = new Set<(view: CatalogView) => void>()
  private active = true
  private generation = 0
  private request: AbortController | null = null
  private timer: ReturnType<typeof setTimeout> | undefined
  private fallback: CatalogCacheEntry | null = null
  private fallbackScope: string | null = null
  private manifest: CatalogManifest | null = null
  private hasData = false
  private mutations = new Map<string, symbol>()
  private pendingMutations = 0
  private refreshAfterMutation = false
  private uploadsBeforeIndex: Array<{ book: CatalogItem; previousBookId?: string }> = []

  constructor(private dependencies: CatalogDependencies, private timeoutMs = CATALOG_REFRESH_TIMEOUT_MS) {}
  get snapshot() { return this.view }
  subscribe(listener: (view: CatalogView) => void) {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
  private publish(patch: Partial<CatalogView>) {
    if (!this.active) return
    const books = patch.books && !sameItems(this.view.books, patch.books) ? patch.books : this.view.books
    this.view = { ...this.view, ...patch, books }
    for (const listener of this.listeners) listener(this.view)
  }
  private cancel() {
    this.generation += 1
    clearTimeout(this.timer)
    this.request?.abort()
    this.request = null
  }
  dispose() { this.active = false; this.cancel(); this.listeners.clear() }
  activate() { this.active = true }
  prefetchCache() {
    const context = this.dependencies.hint()
    if (this.active && context) this.prepareCache(context)
  }

  private prepareCache(context: CatalogContext) {
    if (this.fallbackScope !== context.scopeKey) {
      this.fallbackScope = context.scopeKey
      this.fallback = this.dependencies.cached(context.scopeKey)
    }
    void this.dependencies.cache(context).then(entry => {
      if (this.active && this.fallbackScope === context.scopeKey && entry
        && (!this.fallback || entry.savedAt >= this.fallback.savedAt)) this.fallback = entry
    }).catch(() => { /* unavailable storage does not replace the server path */ })
  }

  async refresh(force = false): Promise<void> {
    if (!this.active) return
    if (this.pendingMutations) { this.refreshAfterMutation = true; return }
    this.cancel()
    const generation = this.generation
    const controller = new AbortController()
    this.request = controller
    const current = () => this.active && this.generation === generation && this.request === controller
    this.publish({ loading: !this.hasData, refreshing: this.hasData, error: null })
    this.timer = setTimeout(() => controller.abort(new CatalogError('timeout', 'The library took too long to respond')), this.timeoutMs)
    let context = this.dependencies.hint()
    if (context) {
      if (this.view.context && this.view.context.scopeKey !== context.scopeKey) {
        this.hasData = false
        this.manifest = null
        this.publish({ books: [], context: null, revision: null, offline: false, loading: true, refreshing: false })
      }
      this.prepareCache(context)
    }
    try {
      let minVersion = '0'
      let fromCache = false
      const flushPriorActivity = async (resolved: CatalogContext) => {
        await settlePriorWrites(resolved.scopeKey, controller.signal)
        try { return await this.dependencies.flush(resolved, controller.signal) }
        catch (error) {
          if (controller.signal.aborted || error instanceof CatalogError) throw error
          throw new CatalogError('activity', error instanceof Error ? error.message : 'Reading activity could not be confirmed')
        }
      }
      const fetchConfirmed = async (resolved: CatalogContext) => {
        if (!current() || controller.signal.aborted) throw controller.signal.reason
        const validation = beginCatalogValidation(resolved.scopeKey)
        const data = await this.dependencies.fetch(resolved, controller.signal, minVersion)
        const checked = validateCatalogManifest(data, resolved.scopeKey, minVersion)
        if (current() && !controller.signal.aborted) confirmCatalog(checked, validation)
        return checked
      }
      const reusable = (candidate: CatalogManifest, resolved: CatalogContext) => {
        try {
          validateCatalogManifest(candidate, resolved.scopeKey, minVersion)
          return hasFreshCatalogConfirmation(candidate)
        } catch { return false }
      }
      let manifest = await abortable((async () => {
        const resolved = await this.dependencies.resolve(controller.signal)
        if (!current() || controller.signal.aborted) throw controller.signal.reason
        context = resolved
        if (this.view.context && this.view.context.scopeKey !== resolved.scopeKey) {
          this.hasData = false
          this.manifest = null
          this.publish({ books: [], context: null, revision: null, offline: false, loading: true, refreshing: false })
        }
        this.prepareCache(resolved)
        minVersion = await flushPriorActivity(resolved)
        if (!current() || controller.signal.aborted) throw controller.signal.reason
        if (!force && hasFreshCatalogReceipt(resolved.scopeKey, minVersion)) {
          const memory = this.dependencies.cached(resolved.scopeKey)
          const cached = memory ?? await abortable(this.dependencies.cache(resolved).catch(() => null), controller.signal)
          if (cached?.origin === 'server' && reusable(cached.manifest, resolved)) {
            fromCache = true
            return cached.manifest
          }
          // Reading/mutations can begin while the eligible disk record is loading.
          if (!memory) minVersion = await flushPriorActivity(resolved)
        }
        return fetchConfirmed(resolved)
      })(), controller.signal)
      if (!current() || controller.signal.aborted || !context) return
      // An await boundary above can cross expiry or another tab's invalidation.
      // The last receipt check and publication must be in the same synchronous turn.
      if (fromCache && !reusable(manifest, context)) {
        minVersion = await abortable(flushPriorActivity(context), controller.signal)
        manifest = await abortable(fetchConfirmed(context), controller.signal)
        if (!current() || controller.signal.aborted) return
      }
      this.manifest = manifest
      this.hasData = true
      this.fallback = { manifest, savedAt: Date.now(), origin: 'server' }
      this.fallbackScope = context.scopeKey
      this.publish({ books: manifest.items, context, revision: manifest.revision, loading: false, refreshing: false, offline: false, error: null,
        confirmation: this.view.confirmation + 1 })
      void this.dependencies.persist(manifest).catch(() => {})
      const uploads = this.uploadsBeforeIndex.splice(0)
      for (const upload of uploads) this.acceptUploadedBook(upload.book, upload.previousBookId)
    } catch (error) {
      if (!current()) return
      context ??= this.dependencies.hint()
      const failure = error instanceof CatalogError ? error : new CatalogError('network', 'Unable to contact the library server')
      const mayFallback = failure.kind === 'network' || failure.kind === 'timeout' || failure.kind === 'activity'
      if (mayFallback) {
        const cached = context && this.fallbackScope === context.scopeKey
          ? this.dependencies.cached(context.scopeKey) ?? this.fallback : null
        if (!this.hasData && cached && context) {
          let pending: Record<string, string> = {}
          try { pending = this.dependencies.pendingRecency?.(context.scopeKey) ?? {} }
          catch { /* Preserve the known cached order when pending records cannot be safely interpreted. */ }
          const books = [...cached.manifest.items].sort((a, b) => {
            const aTime = Date.parse(pending[a.id] ?? a.last_read_at ?? '')
            const bTime = Date.parse(pending[b.id] ?? b.last_read_at ?? '')
            return (Number.isFinite(bTime) ? bTime : -Infinity) - (Number.isFinite(aTime) ? aTime : -Infinity) || 0
          })
          this.manifest = { ...cached.manifest, items: books }
          this.hasData = true
          this.publish({ books, context, revision: cached.manifest.revision })
        }
        this.publish({ offline: true, error: failure, loading: false, refreshing: false })
      } else {
        // A rejected identity must not leave previously rendered private data onscreen.
        if (failure.kind === 'auth') {
          const rejectedScope = context?.scopeKey ?? this.view.context?.scopeKey
          if (rejectedScope) invalidateCatalogConfirmation(rejectedScope)
          this.hasData = false
          this.manifest = null
        }
        this.publish({ error: failure, loading: false, refreshing: false, offline: false,
          ...(failure.kind === 'auth' ? { books: [], context: null, revision: null } : {}) })
      }
    } finally {
      if (current()) {
        clearTimeout(this.timer)
        this.request = null
        // Expire even a failed attempt so a non-abortable late result has no authority.
        this.generation += 1
      }
    }
  }

  private publishItems(books: CatalogItem[]) {
    this.publish({ books })
  }
  private confirmItems(transform: (items: CatalogItem[]) => CatalogItem[]) {
    if (!this.active || !this.manifest) return
    // Apply only this acknowledged mutation to the confirmed snapshot, never another book's pending edit.
    this.manifest = { ...this.manifest, revision: `local-ack-${crypto.randomUUID()}`, items: transform(this.manifest.items) }
    this.fallback = { manifest: this.manifest, savedAt: Date.now(), origin: 'server' }
    void this.dependencies.persist(this.manifest).catch(() => {})
  }
  private beginMutation(id: string) {
    if (!this.active || !this.view.context?.userId || this.view.offline || !this.manifest) {
      throw new CatalogError('mutation', 'Connect to your library before changing books')
    }
    if (this.mutations.has(id)) throw new CatalogError('mutation', 'Wait for the previous change to this book')
    invalidateCatalogConfirmation(this.view.context.scopeKey)
    this.cancel()
    const token = Symbol(id)
    this.mutations.set(id, token)
    this.pendingMutations += 1
    this.publish({ loading: false, refreshing: false, error: null })
    return token
  }
  /** Accept only server-owned metadata. It cannot renew the complete-index cooldown. */
  acceptUploadedBook(book: CatalogItem, previousBookId?: string) {
    if (!this.active || !isCatalogItem(book) || this.mutations.has(book.id) || (previousBookId && this.mutations.has(previousBookId))) return
    if (!this.manifest) {
      if (this.dependencies.hint()?.userId) this.uploadsBeforeIndex.push({ book, previousBookId })
      return
    }
    if (!this.view.context?.userId) return
    const existing = this.view.books.find(item => item.id === book.id)
    // Deduplicating another upload may return a book that was already readable.
    // Its provisional job snapshot must never downgrade the existing saved book.
    const accepted = existing && (existing.processing_status == null || existing.processing_status === 'ready')
      && book.processing_status !== 'ready' ? existing : book
    invalidateCatalogConfirmation(this.view.context.scopeKey)
    const merge = (items: CatalogItem[]) => [...items.filter(item => item.id !== book.id
      && !(item.id === previousBookId && item.processing_status != null && item.processing_status !== 'ready')), accepted].sort(serverRecency)
    this.publishItems(merge(this.view.books))
    this.confirmItems(merge)
  }
  /** In-flight upload invalidates other shelf lifetimes and supersedes an older index request. */
  beginExternalMutation(): () => void {
    const context = this.view.context ?? this.dependencies.hint()
    if (!context) throw new CatalogError('auth', 'Wait for your session before uploading')
    invalidateCatalogConfirmation(context.scopeKey)
    if (this.hasData) this.cancel()
    this.publish({ loading: !this.hasData, refreshing: false })
    this.pendingMutations += 1
    let finish!: () => void
    const pending = new Promise<void>(resolve => { finish = resolve })
    void trackWrite(context.scopeKey, pending)
    let finished = false
    return () => {
      if (finished) return
      finished = true
      invalidateCatalogConfirmation(context.scopeKey)
      this.pendingMutations -= 1
      finish()
      if (!this.pendingMutations && this.refreshAfterMutation && this.active) {
        this.refreshAfterMutation = false
        void this.refresh(true)
      }
    }
  }
  private finishMutation(id: string, token: symbol, success: boolean) {
    this.pendingMutations -= 1
    if (this.mutations.get(id) === token) this.mutations.delete(id)
    this.refreshAfterMutation ||= success
    if (!this.pendingMutations && this.refreshAfterMutation && this.active) {
      this.refreshAfterMutation = false
      void this.refresh()
    }
  }
  async mutate(id: string, action: 'hidden' | 'active' | 'delete'): Promise<void> {
    const oldIndex = this.view.books.findIndex(book => book.id === id)
    const old = this.view.books[oldIndex]
    const token = this.beginMutation(id)
    const mutationScope = this.view.context!.scopeKey
    const mayPublish = () => this.active && this.mutations.get(id) === token && this.view.context?.scopeKey === mutationScope
    this.publishItems(action === 'delete' ? this.view.books.filter(book => book.id !== id)
      : this.view.books.map(book => book.id === id ? { ...book, status: action } : book))
    let success = false
    try {
      if (action === 'delete') await trackWrite(mutationScope, this.dependencies.delete(id))
      else await trackWrite(mutationScope, this.dependencies.update(id, action))
      // Another in-flight mutation may already have revoked this view's access.
      // Its late success cannot acknowledge/persist data or trigger a refresh.
      if (!mayPublish()) return
      this.confirmItems(items => action === 'delete' ? items.filter(book => book.id !== id)
        : items.map(book => book.id === id ? { ...book, status: action } : book))
      success = true
    } catch (error) {
      if (mayPublish()) {
        const books = this.view.books.filter(book => book.id !== id)
        if (old) books.splice(Math.min(oldIndex, books.length), 0, old)
        this.publishItems(books)
        const status = error && typeof error === 'object' && 'status' in error ? error.status : undefined
        if (status === 401 || status === 403) {
          invalidateCatalogConfirmation(mutationScope)
          this.hasData = false
          this.manifest = null
          this.refreshAfterMutation = false
          this.publish({ books: [], context: null, revision: null, offline: false,
            error: new CatalogError('auth', 'Library access could not be confirmed', status) })
        } else {
          this.publish({ error: new CatalogError('mutation', action === 'delete' ? 'The book could not be deleted'
            : action === 'hidden' ? 'The book could not be archived' : 'The book could not be restored') })
        }
      }
      throw error
    } finally { this.finishMutation(id, token, success) }
  }
  async addBook(data: Parameters<CatalogDependencies['create']>[0]): Promise<CatalogItem> {
    const id = `create:${crypto.randomUUID()}`
    const token = this.beginMutation(id)
    let success = false
    try {
      const book = await trackWrite(this.view.context!.scopeKey, this.dependencies.create(data))
      if (this.active) this.publishItems([book, ...this.view.books.filter(item => item.id !== book.id)])
      this.confirmItems(items => [book, ...items.filter(item => item.id !== book.id)])
      success = true
      return book
    } catch (error) {
      if (this.active) this.publish({ error: new CatalogError('mutation', 'The book could not be created') })
      throw error
    } finally { this.finishMutation(id, token, success) }
  }
}
