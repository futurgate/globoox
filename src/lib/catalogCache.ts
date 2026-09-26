import { getCachedBooksList, getCachedLibraryViewSnapshot } from './contentCache'
import { catalogItemToApiBook, validateCatalogManifest, type CatalogContext, type CatalogItem, type CatalogManifest } from './catalogTypes'

const DB_NAME = 'globoox-catalog-v2'
const DB_VERSION = 1
type StoreName = 'manifests' | 'covers' | 'migration'
export interface CatalogCacheEntry { manifest: CatalogManifest; savedAt: number; origin: 'server' | 'legacy'; legacyScopeKey?: string }
const memory = new Map<string, CatalogCacheEntry>()
const coverMemory = new Map<string, Blob>()
let coverMemoryBytes = 0
function rememberCover(key: string, blob: Blob) {
  coverMemoryBytes -= coverMemory.get(key)?.size ?? 0
  coverMemory.set(key, blob)
  coverMemoryBytes += blob.size
  while (coverMemory.size > 48 || coverMemoryBytes > 24 * 1024 * 1024) {
    const oldest = coverMemory.keys().next().value!
    coverMemoryBytes -= coverMemory.get(oldest)!.size
    coverMemory.delete(oldest)
  }
}
const migrationInFlight = new Map<string, Promise<CatalogCacheEntry | null>>()
const writes = new Map<string, Promise<void>>()

/** Storage denial/blocked upgrades must never hold a catalog attempt indefinitely. */
async function storage<T>(storeName: StoreName, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  if (typeof indexedDB === 'undefined') return undefined
  return new Promise(resolve => {
    let settled = false
    let db: IDBDatabase | undefined
    const finish = (value?: T) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      db?.close()
      resolve(value)
    }
    const timer = setTimeout(() => finish(), 300)
    try {
      const opening = indexedDB.open(DB_NAME, DB_VERSION)
      opening.onupgradeneeded = () => {
        for (const name of ['manifests', 'covers', 'migration']) {
          if (!opening.result.objectStoreNames.contains(name)) opening.result.createObjectStore(name)
        }
      }
      opening.onerror = () => finish()
      opening.onblocked = () => finish()
      opening.onsuccess = () => {
        db = opening.result
        if (settled) { db.close(); return }
        try {
          const transaction = db.transaction(storeName, mode)
          const request = operation(transaction.objectStore(storeName))
          let value: T | undefined
          request.onsuccess = () => { value = request.result }
          request.onerror = () => finish()
          transaction.oncomplete = () => finish(value)
          transaction.onabort = () => finish()
          transaction.onerror = () => finish()
        } catch { finish() }
      }
    } catch { finish() }
  })
}

function validEntry(value: unknown, scopeKey: string): CatalogCacheEntry | null {
  if (!value || typeof value !== 'object') return null
  const entry = value as CatalogCacheEntry
  if (!Number.isFinite(entry.savedAt) || !['server', 'legacy'].includes(entry.origin)) return null
  try { validateCatalogManifest(entry.manifest, scopeKey); return entry } catch { return null }
}

export function getCatalogManifestSync(scopeKey: string): CatalogCacheEntry | null {
  return memory.get(scopeKey) ?? null
}

export async function getCatalogManifest(scopeKey: string): Promise<CatalogCacheEntry | null> {
  const cached = memory.get(scopeKey)
  if (cached) return cached
  const entry = validEntry(await storage('manifests', 'readonly', store => store.get(scopeKey)), scopeKey)
  // A late disk read cannot replace a newer accepted manifest/mutation.
  if (memory.has(scopeKey)) return memory.get(scopeKey)!
  if (entry) memory.set(scopeKey, entry)
  return entry
}

export async function putCatalogManifest(manifest: CatalogManifest, origin: CatalogCacheEntry['origin'] = 'server', legacyScopeKey?: string): Promise<void> {
  validateCatalogManifest(manifest, manifest.scope_key)
  const entry: CatalogCacheEntry = { manifest, savedAt: Date.now(), origin, ...(origin === 'legacy' && legacyScopeKey ? { legacyScopeKey } : {}) }
  memory.set(manifest.scope_key, entry)
  const previous = writes.get(manifest.scope_key) ?? Promise.resolve()
  const write = previous.then(async () => {
    if (memory.get(manifest.scope_key) !== entry) return
    await storage('manifests', 'readwrite', store => store.put(entry, manifest.scope_key))
  })
  writes.set(manifest.scope_key, write)
  await write.finally(() => { if (writes.get(manifest.scope_key) === write) writes.delete(manifest.scope_key) })
}

const coverKey = (scopeKey: string, bookId: string, version: string) => JSON.stringify([scopeKey, bookId, version])
export async function getCatalogCover(scopeKey: string, bookId: string, version: string): Promise<Blob | null> {
  const key = coverKey(scopeKey, bookId, version)
  const cached = coverMemory.get(key)
  if (cached) return cached
  let blob = await storage('covers', 'readonly', store => store.get(key))
  if (!(blob instanceof Blob) || !blob.type.startsWith('image/')) {
    // Legacy originals stay where they are. Decode/copy only an actually requested cover.
    const entry = await getCatalogManifest(scopeKey)
    if (entry?.origin !== 'legacy' || !entry.legacyScopeKey
      || entry.manifest.items.find(item => item.id === bookId)?.cover?.version !== version) return null
    const old = await getCachedBooksList(entry.legacyScopeKey, 'all')
    if (old?.scope !== entry.legacyScopeKey) return null
    if (legacyCoverVersion(old.fetchedAt, bookId) !== version) return null
    const cover = legacyCover(old.books.find(book => book.id === bookId)?.cover_url)
    if (!cover) return null
    blob = cover
    void putCatalogCover(scopeKey, bookId, version, cover)
  }
  rememberCover(key, blob)
  return blob
}

export async function putCatalogCover(scopeKey: string, bookId: string, version: string, blob: Blob): Promise<void> {
  if (!blob.type.startsWith('image/') || blob.size > 8 * 1024 * 1024) return
  const key = coverKey(scopeKey, bookId, version)
  rememberCover(key, blob)
  await storage('covers', 'readwrite', store => store.put(blob, key))
}

export function getCatalogBookSync(scopeKey: string, bookId: string): CatalogItem | null {
  return memory.get(scopeKey)?.manifest.items.find(item => item.id === bookId) ?? null
}
export async function getCatalogBook(scopeKey: string, bookId: string): Promise<CatalogItem | null> {
  return (await getCatalogManifest(scopeKey))?.manifest.items.find(item => item.id === bookId) ?? null
}
export async function getCachedCatalogBook(scopeKey: string, bookId: string) {
  const book = await getCatalogBook(scopeKey, bookId)
  return book ? catalogItemToApiBook(book) : null
}

function legacyCoverVersion(fetchedAt: number, bookId: string): string {
  return `legacy-${Number.isFinite(fetchedAt) ? fetchedAt : 0}-${bookId}`
}

function legacyCover(value: unknown): Blob | null {
  if (typeof value !== 'string' || value.length > 12 * 1024 * 1024) return null
  const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=\r\n]+)$/.exec(value)
  if (!match) return null
  try {
    const decoded = atob(match[2])
    const bytes = Uint8Array.from(decoded, char => char.charCodeAt(0))
    return new Blob([bytes], { type: match[1] })
  } catch { return null }
}

/** One-time conversion reads only an exact owned list, never the contaminated guest book_meta store. */
export async function loadCatalogCache(context: CatalogContext, legacyScopeKey?: string): Promise<CatalogCacheEntry | null> {
  const current = await getCatalogManifest(context.scopeKey)
  if (current) return current
  const inFlight = migrationInFlight.get(context.scopeKey)
  if (inFlight) return inFlight
  const expectedLegacy = context.userId ?? (context.shareToken ? `share:${context.shareToken}` : 'guest')
  // Old authenticated keys did not encode share context; their membership cannot be established.
  if (!legacyScopeKey || legacyScopeKey !== expectedLegacy || (context.userId && context.shareToken)) return null
  const migration = (async () => {
    // A marker is informational: quota failures/eviction can leave it behind
    // without a valid manifest. The exact scoped legacy list may recover that miss.
    const old = await getCachedBooksList(legacyScopeKey, 'all')
    if (!old || old.scope !== legacyScopeKey || old.status !== 'all' || !Array.isArray(old.books)) return null
    const snapshot = await getCachedLibraryViewSnapshot(legacyScopeKey, 'recently_opened')
    const rank = new Map(snapshot?.order.map((id, index) => [id, index]) ?? [])
    const items = old.books.map(book => {
      // A cheap offline-only locator: never hash/decode every original during initial migration.
      const version = typeof book.cover_url === 'string' && /^data:image\/(?:png|jpeg|webp|gif);base64,/.test(book.cover_url)
        ? legacyCoverVersion(old.fetchedAt, book.id) : null
      return {
        id: book.id, title: book.title, author: book.author, created_at: book.created_at,
        status: book.status, is_own: book.is_own === true, original_language: book.original_language,
        available_languages: book.available_languages, selected_language: book.selected_language ?? null,
        last_read_at: snapshot?.effectiveLastReadByBookId[book.id] ?? null,
        metadata_version: `legacy-${book.id}`, reading: null,
        cover: version ? { url: `/api/v2/books/${encodeURIComponent(book.id)}/cover?version=${encodeURIComponent(version)}`, version, width: null, height: null } : null,
      } satisfies CatalogItem
    }).sort((a, b) => (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER))
    const manifest: CatalogManifest = {
      contract_version: 2, scope_key: context.scopeKey, revision: 'legacy-offline',
      server_time: new Date(Number.isFinite(old.fetchedAt) ? old.fetchedAt : 0).toISOString(),
      complete: true, order: 'recently_read', activity_version: '0', items,
    }
    try { validateCatalogManifest(manifest, context.scopeKey) } catch { return null }
    // A server response may have arrived during legacy IDB reads.
    if (memory.has(context.scopeKey)) return memory.get(context.scopeKey)!
    void putCatalogManifest(manifest, 'legacy', legacyScopeKey)
    void storage('migration', 'readwrite', store => store.put(true, context.scopeKey))
    return memory.get(context.scopeKey) ?? null
  })().catch(() => null).finally(() => migrationInFlight.delete(context.scopeKey))
  migrationInFlight.set(context.scopeKey, migration)
  return migration
}
