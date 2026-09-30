'use client'

import type { ContentBlock } from '@/lib/api'
import type { ApiBook, ReadingPosition } from '@/lib/api'
import type { ReadingAnchor } from '@/lib/store'

type CacheKey = string

const DB_NAME = 'globoox-cache'
const DB_VERSION = 9
const STORE_CHAPTER_CONTENT_V1 = 'chapter_content'
const STORE_CHAPTER_SKELETON = 'chapter_skeleton'
const STORE_BLOCK_TEXT = 'block_text'
const STORE_CHAPTER_LAYOUT = 'chapter_layout'
const STORE_BOOKS_LIST = 'books_list'
const STORE_BOOK_META = 'book_meta'
const STORE_READING_POSITIONS = 'reading_positions'
const STORE_TOC_TITLES = 'toc_titles'
const STORE_BOOK_TRANSLATIONS = 'book_translations'
const STORE_READER_METADATA_BUNDLES = 'reader_metadata_bundles'

const DEFAULT_TTL_MS = 10 * 60 * 1000 // 10 minutes
const PENDING_TTL_MS = 3 * 1000 // 3 seconds

function normalizeLang(lang?: string) {
  return (lang ?? '').toUpperCase()
}

function makeBlockKey(blockId: string, lang?: string): CacheKey {
  return `${blockId}::${normalizeLang(lang)}`
}

function makeLegacyChapterKey(chapterId: string, lang?: string): CacheKey {
  return `${chapterId}::${normalizeLang(lang)}`
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (event) => {
      const db = req.result
      const tx = req.transaction
      const oldVersion = event.oldVersion ?? 0

      // Legacy store (v1) — keep it for compatibility, but new code won't write to it.
      if (!db.objectStoreNames.contains(STORE_CHAPTER_CONTENT_V1)) {
        const store = db.createObjectStore(STORE_CHAPTER_CONTENT_V1, { keyPath: 'key' })
        store.createIndex('by_fetchedAt', 'fetchedAt')
      }

      if (!db.objectStoreNames.contains(STORE_CHAPTER_SKELETON)) {
        const store = db.createObjectStore(STORE_CHAPTER_SKELETON, { keyPath: 'chapterId' })
        store.createIndex('by_fetchedAt', 'fetchedAt')
      }

      if (!db.objectStoreNames.contains(STORE_BLOCK_TEXT)) {
        const store = db.createObjectStore(STORE_BLOCK_TEXT, { keyPath: 'key' })
        store.createIndex('by_chapter_lang', ['chapterId', 'lang'])
        store.createIndex('by_fetchedAt', 'fetchedAt')
      }

      if (!db.objectStoreNames.contains(STORE_CHAPTER_LAYOUT)) {
        const store = db.createObjectStore(STORE_CHAPTER_LAYOUT, { keyPath: 'key' })
        store.createIndex('by_book_chapter', ['bookId', 'chapterId'])
        store.createIndex('by_fetchedAt', 'fetchedAt')
      }

      // App-level persisted caches (v3)
      if (!db.objectStoreNames.contains(STORE_BOOKS_LIST)) {
        const store = db.createObjectStore(STORE_BOOKS_LIST, { keyPath: 'key' })
        store.createIndex('by_scope', 'scope')
        store.createIndex('by_fetchedAt', 'fetchedAt')
      }

      if (!db.objectStoreNames.contains(STORE_BOOK_META)) {
        const store = db.createObjectStore(STORE_BOOK_META, { keyPath: 'key' })
        store.createIndex('by_scope', 'scope')
        store.createIndex('by_bookId', 'bookId')
        store.createIndex('by_fetchedAt', 'fetchedAt')
      }

      if (!db.objectStoreNames.contains(STORE_READING_POSITIONS)) {
        const store = db.createObjectStore(STORE_READING_POSITIONS, { keyPath: 'key' })
        store.createIndex('by_scope', 'scope')
        store.createIndex('by_updatedAt', 'updatedAt')
      }

      if (!db.objectStoreNames.contains(STORE_TOC_TITLES)) {
        const store = db.createObjectStore(STORE_TOC_TITLES, { keyPath: 'key' })
        store.createIndex('by_scope_book_lang', ['scope', 'bookId', 'lang'])
        store.createIndex('by_fetchedAt', 'fetchedAt')
      }

      if (!db.objectStoreNames.contains(STORE_BOOK_TRANSLATIONS)) {
        const store = db.createObjectStore(STORE_BOOK_TRANSLATIONS, { keyPath: 'key' })
        store.createIndex('by_scope_book_lang', ['scope', 'bookId', 'lang'])
        store.createIndex('by_fetchedAt', 'fetchedAt')
      }

      if (!db.objectStoreNames.contains(STORE_READER_METADATA_BUNDLES)) {
        const store = db.createObjectStore(STORE_READER_METADATA_BUNDLES, { keyPath: 'key' })
        store.createIndex('by_scope_book_lang', ['scope', 'bookId', 'lang'])
        store.createIndex('by_fetchedAt', 'fetchedAt')
      }

      // v5: clear chapter translation caches once to remove mixed-language data
      // and old skeletons that did not preserve fallback content.
      if (oldVersion < 5 && tx) {
        if (db.objectStoreNames.contains(STORE_CHAPTER_CONTENT_V1)) {
          tx.objectStore(STORE_CHAPTER_CONTENT_V1).clear()
        }
        if (db.objectStoreNames.contains(STORE_CHAPTER_SKELETON)) {
          tx.objectStore(STORE_CHAPTER_SKELETON).clear()
        }
        if (db.objectStoreNames.contains(STORE_BLOCK_TEXT)) {
          tx.objectStore(STORE_BLOCK_TEXT).clear()
        }
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'))
  })
}

export async function clearEntireContentCache(): Promise<void> {
  if (typeof indexedDB === 'undefined') return

  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error ?? new Error('Failed to delete IndexedDB database'))
    req.onblocked = () => reject(new Error('IndexedDB delete blocked by open connections'))
  })
}

function withStore<T>(storeName: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode)
        const store = tx.objectStore(storeName)
        const req = fn(store)

        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'))

        tx.oncomplete = () => db.close()
        tx.onerror = () => {
          db.close()
          reject(tx.error ?? new Error('IndexedDB transaction failed'))
        }
        tx.onabort = () => {
          db.close()
          reject(tx.error ?? new Error('IndexedDB transaction aborted'))
        }
      }),
    (err) => Promise.reject(err),
  )
}

type SkeletonBlock =
  | { id: string; position: number; type: 'paragraph' | 'quote'; fallbackText: string }
  | { id: string; position: number; type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; fallbackText: string }
  | { id: string; position: number; type: 'list'; ordered: boolean; fallbackItems: string[] }
  | { id: string; position: number; type: 'image'; src: string; alt: string; caption?: string }
  | { id: string; position: number; type: 'hr' }

interface CachedChapterSkeleton {
  chapterId: string
  blocks: SkeletonBlock[]
  fetchedAt: number
}

interface CachedBlockText {
  key: CacheKey
  chapterId: string
  blockId: string
  lang: string
  text?: string
  items?: string[]
  fetchedAt: number
}

export interface CachedAssembledChapter {
  blocks: ContentBlock[]
  hasPending: boolean
  missingCount: number
  fetchedAt: number
}

// ─── App-level persisted caches (books, reading position, TOC) ────────────────

function makeScopedKey(scope: string, ...parts: string[]): CacheKey {
  return [scope, ...parts].join('::')
}

interface CachedBooksList {
  key: CacheKey
  scope: string
  status: string
  books: ApiBook[]
  fetchedAt: number
}

export interface CachedLibraryViewSnapshot {
  key: CacheKey
  scope: string
  view: 'recently_opened'
  order: string[]
  effectiveLastReadByBookId: Record<string, string | null>
  computedAt: number
  fetchedAt: number
}

const libraryViewSnapshotMemory = new Map<string, CachedLibraryViewSnapshot>()

interface CachedBookMeta {
  key: CacheKey
  scope: string
  bookId: string
  book: ApiBook
  fetchedAt: number
}

export interface CachedReadingPositionEntry {
  key: CacheKey
  scope: string
  bookId: string
  position: ReadingPosition
  updatedAt: string | null
  fetchedAt: number
  pendingAnchor?: ReadingAnchor
}

interface CachedTocTitles {
  key: CacheKey
  scope: string
  bookId: string
  lang: string
  titles: Record<string, string>
  fetchedAt: number
}

interface CachedBookTranslation {
  key: CacheKey
  scope: string
  bookId: string
  lang: string
  title: string
  author: string | null
  fetchedAt: number
}

interface CachedReaderMetadataBundle {
  key: CacheKey
  scope: string
  bookId: string
  lang: string
  title: string
  author: string | null
  chapterTitles: Record<string, string>
  fetchedAt: number
}

export interface CachedChapterLayoutEntry {
  key: CacheKey
  bookId: string
  chapterId: string
  layoutKey: string
  pages: string[][]
  finalBlocks: ContentBlock[]
  fragmentEntries: Array<[string, string]>
  currentPageIdx: number
  fetchedAt: number
}

const MAX_BOOKS_LIST_ENTRIES = 200
const MAX_BOOK_META_ENTRIES = 2000
const MAX_READING_POSITION_ENTRIES = 4000
const MAX_CHAPTER_LAYOUT_ENTRIES = 300
const DEBUG_CACHE_WRITES = process.env.NODE_ENV !== 'production'

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

function debugCacheWrite(store: string, key: string, changed: boolean, reason: string) {
  if (!DEBUG_CACHE_WRITES) return
  // eslint-disable-next-line no-console
  console.log(`[cache:${store}] ${changed ? 'write' : 'skip'} key=${key} reason=${reason}`)
}

async function pruneStoreByFetchedAt(
  storeName: string,
  maxEntries: number,
  filter?: (value: unknown) => boolean,
): Promise<void> {
  try {
    const entries: Array<{ key: IDBValidKey; value: unknown }> = []
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const index = store.indexNames.contains('by_fetchedAt')
        ? store.index('by_fetchedAt')
        : store.index('by_updatedAt')
      const req = index.openCursor()

      req.onsuccess = () => {
        const cursor = req.result as IDBCursorWithValue | null
        if (!cursor) return
        entries.push({ key: cursor.primaryKey, value: cursor.value })
        cursor.continue()
      }
      req.onerror = () => reject(req.error ?? new Error('IndexedDB cursor failed'))

      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error ?? new Error('IndexedDB transaction failed'))
      }
      tx.onabort = () => {
        db.close()
        reject(tx.error ?? new Error('IndexedDB transaction aborted'))
      }
    })

    if (entries.length <= maxEntries) {
      return
    }

    const filtered = filter ? entries.filter((entry) => filter(entry.value)) : entries
    if (filtered.length <= maxEntries) {
      return
    }
    const toDelete = filtered.length - maxEntries
    const keysToDelete = filtered.slice(0, toDelete).map((entry) => entry.key)

    const deleteDb = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = deleteDb.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      keysToDelete.forEach((key) => store.delete(key))
      tx.oncomplete = () => {
        deleteDb.close()
        resolve()
      }
      tx.onerror = () => {
        deleteDb.close()
        reject(tx.error ?? new Error('IndexedDB transaction failed'))
      }
      tx.onabort = () => {
        deleteDb.close()
        reject(tx.error ?? new Error('IndexedDB transaction aborted'))
      }
    })
  } catch {
    // best-effort cache pruning
  }
}

export async function getCachedBooksList(scope: string, status = 'active'): Promise<CachedBooksList | null> {
  try {
    const key = makeScopedKey(scope, status)
    const entry = await withStore<CachedBooksList | undefined>(STORE_BOOKS_LIST, 'readonly', (store) => store.get(key))
    return entry ?? null
  } catch {
    return null
  }
}

export async function setCachedBooksList(scope: string, status: string, books: ApiBook[]): Promise<void> {
  const key = makeScopedKey(scope, status)
  const entry: CachedBooksList = {
    key,
    scope,
    status,
    books,
    fetchedAt: Date.now(),
  }
  const existing = await getCachedBooksList(scope, status)
  const changed = !existing || safeStringify(existing.books) !== safeStringify(books)
  if (!changed) {
    debugCacheWrite(STORE_BOOKS_LIST, key, false, 'books_list_unchanged')
    return
  }
  await withStore(STORE_BOOKS_LIST, 'readwrite', (store) => store.put(entry))
  debugCacheWrite(STORE_BOOKS_LIST, key, true, 'books_list_changed')
  void pruneStoreByFetchedAt(STORE_BOOKS_LIST, MAX_BOOKS_LIST_ENTRIES)
}

export async function getCachedLibraryViewSnapshot(
  scope: string,
  view: 'recently_opened',
): Promise<CachedLibraryViewSnapshot | null> {
  try {
    const key = makeScopedKey(scope, '__library_view__', view)
    const memory = libraryViewSnapshotMemory.get(key)
    if (memory) return memory
    const entry = await withStore<CachedLibraryViewSnapshot | undefined>(STORE_BOOKS_LIST, 'readonly', (store) => store.get(key))
    if (entry) libraryViewSnapshotMemory.set(key, entry)
    return entry ?? null
  } catch {
    return null
  }
}

export function getCachedLibraryViewSnapshotSync(
  scope: string,
  view: 'recently_opened',
): CachedLibraryViewSnapshot | null {
  const key = makeScopedKey(scope, '__library_view__', view)
  return libraryViewSnapshotMemory.get(key) ?? null
}

export async function setCachedLibraryViewSnapshot(
  scope: string,
  view: 'recently_opened',
  payload: { order: string[]; effectiveLastReadByBookId: Record<string, string | null>; computedAt?: number },
): Promise<void> {
  const key = makeScopedKey(scope, '__library_view__', view)
  const existing = await getCachedLibraryViewSnapshot(scope, view)
  const changed = !existing
    || !safeStringify(existing.order) || safeStringify(existing.order) !== safeStringify(payload.order)
    || safeStringify(existing.effectiveLastReadByBookId) !== safeStringify(payload.effectiveLastReadByBookId)
  if (!changed) {
    debugCacheWrite(STORE_BOOKS_LIST, key, false, 'library_view_unchanged')
    return
  }
  const entry: CachedLibraryViewSnapshot = {
    key,
    scope,
    view,
    order: payload.order,
    effectiveLastReadByBookId: payload.effectiveLastReadByBookId,
    computedAt: payload.computedAt ?? Date.now(),
    fetchedAt: Date.now(),
  }
  libraryViewSnapshotMemory.set(entry.key, entry)
  await withStore(STORE_BOOKS_LIST, 'readwrite', (store) => store.put(entry))
  debugCacheWrite(STORE_BOOKS_LIST, key, true, 'library_view_changed')
  void pruneStoreByFetchedAt(
    STORE_BOOKS_LIST,
    MAX_BOOKS_LIST_ENTRIES,
    (value) => typeof value === 'object' && value !== null && 'scope' in (value as Record<string, unknown>) && (value as { scope?: string }).scope === scope,
  )
}

export async function clearCachedBooksList(scope?: string): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_BOOKS_LIST, 'readwrite')
      const store = tx.objectStore(STORE_BOOKS_LIST)
      const req = scope ? store.index('by_scope').openCursor(IDBKeyRange.only(scope)) : store.openCursor()
      req.onsuccess = () => {
        const cursor = req.result as IDBCursorWithValue | null
        if (!cursor) return
        cursor.delete()
        cursor.continue()
      }
      req.onerror = () => reject(req.error ?? new Error('IndexedDB cursor failed'))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
    })
    db.close()
  } catch {
    // ignore
  }
}

export async function getCachedBookMeta(scope: string, bookId: string): Promise<ApiBook | null> {
  try {
    const key = makeScopedKey(scope, bookId)
    const entry = await withStore<CachedBookMeta | undefined>(STORE_BOOK_META, 'readonly', (store) => store.get(key))
    return entry?.book ?? null
  } catch {
    return null
  }
}

export async function setCachedBookMeta(scope: string, book: ApiBook): Promise<void> {
  const key = makeScopedKey(scope, book.id)
  const existing = await getCachedBookMeta(scope, book.id)
  const changed = !existing || safeStringify(existing) !== safeStringify(book)
  if (!changed) {
    debugCacheWrite(STORE_BOOK_META, key, false, 'book_meta_unchanged')
    return
  }
  const entry: CachedBookMeta = {
    key,
    scope,
    bookId: book.id,
    book,
    fetchedAt: Date.now(),
  }
  await withStore(STORE_BOOK_META, 'readwrite', (store) => store.put(entry))
  debugCacheWrite(STORE_BOOK_META, key, true, 'book_meta_changed')
  void pruneStoreByFetchedAt(STORE_BOOK_META, MAX_BOOK_META_ENTRIES)
}

export async function clearCachedBookMeta(scope?: string): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_BOOK_META, 'readwrite')
      const store = tx.objectStore(STORE_BOOK_META)
      const req = scope ? store.index('by_scope').openCursor(IDBKeyRange.only(scope)) : store.openCursor()
      req.onsuccess = () => {
        const cursor = req.result as IDBCursorWithValue | null
        if (!cursor) return
        cursor.delete()
        cursor.continue()
      }
      req.onerror = () => reject(req.error ?? new Error('IndexedDB cursor failed'))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
    })
    db.close()
  } catch {
    // ignore
  }
}

export async function clearCachedBookMetaEntry(scope: string, bookId: string): Promise<void> {
  try {
    const key = makeScopedKey(scope, bookId)
    await withStore(STORE_BOOK_META, 'readwrite', (store) => store.delete(key))
  } catch {
    // ignore
  }
}

export async function getCachedReadingPosition(scope: string, bookId: string): Promise<CachedReadingPositionEntry | null> {
  try {
    const key = makeScopedKey(scope, bookId)
    const entry = await withStore<CachedReadingPositionEntry | undefined>(
      STORE_READING_POSITIONS,
      'readonly',
      (store) => store.get(key),
    )
    return entry ?? null
  } catch {
    return null
  }
}

export async function setCachedReadingPosition(scope: string, bookId: string, entry: Omit<CachedReadingPositionEntry, 'key' | 'scope' | 'bookId' | 'fetchedAt'>): Promise<void> {
  const key = makeScopedKey(scope, bookId)
  const existing = await getCachedReadingPosition(scope, bookId)
  const nextUpdatedAt = entry.updatedAt ?? entry.position.updated_at ?? null
  const changed = !existing
    || existing.updatedAt !== nextUpdatedAt
    || safeStringify(existing.position) !== safeStringify(entry.position)
  if (!changed) {
    debugCacheWrite(STORE_READING_POSITIONS, key, false, 'reading_position_unchanged')
    return
  }
  const full: CachedReadingPositionEntry = {
    key,
    scope,
    bookId,
    position: entry.position,
    updatedAt: entry.updatedAt ?? entry.position.updated_at ?? null,
    pendingAnchor: entry.pendingAnchor,
    fetchedAt: Date.now(),
  }
  await withStore(STORE_READING_POSITIONS, 'readwrite', (store) => store.put(full))
  debugCacheWrite(STORE_READING_POSITIONS, key, true, 'reading_position_changed')
  void pruneStoreByFetchedAt(STORE_READING_POSITIONS, MAX_READING_POSITION_ENTRIES)
}

export async function touchCachedLastRead(scope: string, bookId: string, iso: string): Promise<void> {
  try {
    const key = makeScopedKey(scope, bookId)
    await withStore<void>(STORE_READING_POSITIONS, 'readwrite', (store) => {
      const getReq = store.get(key)
      getReq.onsuccess = () => {
        const existing = getReq.result as CachedReadingPositionEntry | undefined
        if (existing) {
          existing.updatedAt = iso
          store.put(existing)
        } else {
          // No position saved yet — create a minimal stub so lastRead survives reload
          const stub: CachedReadingPositionEntry = {
            key,
            scope,
            bookId,
            position: { book_id: bookId, chapter_id: null, block_id: null, block_position: null, lang: null, updated_at: null },
            updatedAt: iso,
            fetchedAt: Date.now(),
          }
          store.put(stub)
        }
      }
      return getReq
    })
  } catch {
    // non-critical
  }
}

export async function clearCachedReadingPositions(scope?: string): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_READING_POSITIONS, 'readwrite')
      const store = tx.objectStore(STORE_READING_POSITIONS)
      const req = scope ? store.index('by_scope').openCursor(IDBKeyRange.only(scope)) : store.openCursor()
      req.onsuccess = () => {
        const cursor = req.result as IDBCursorWithValue | null
        if (!cursor) return
        cursor.delete()
        cursor.continue()
      }
      req.onerror = () => reject(req.error ?? new Error('IndexedDB cursor failed'))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
    })
    db.close()
  } catch {
    // ignore
  }
}

export async function getCachedTocTitles(scope: string, bookId: string, lang: string): Promise<Record<string, string> | null> {
  try {
    const normalizedLang = normalizeLang(lang)
    const key = makeScopedKey(scope, bookId, normalizedLang)
    const entry = await withStore<CachedTocTitles | undefined>(STORE_TOC_TITLES, 'readonly', (store) => store.get(key))
    return entry?.titles ?? null
  } catch {
    return null
  }
}

export async function setCachedTocTitles(scope: string, bookId: string, lang: string, titles: Record<string, string>): Promise<void> {
  const normalizedLang = normalizeLang(lang)
  const entry: CachedTocTitles = {
    key: makeScopedKey(scope, bookId, normalizedLang),
    scope,
    bookId,
    lang: normalizedLang,
    titles,
    fetchedAt: Date.now(),
  }
  await withStore(STORE_TOC_TITLES, 'readwrite', (store) => store.put(entry))
}

export async function getCachedBookTranslation(
  scope: string,
  bookId: string,
  lang: string,
): Promise<{ title: string; author: string | null } | null> {
  try {
    const normalizedLang = normalizeLang(lang)
    const key = makeScopedKey(scope, bookId, 'meta', normalizedLang)
    const entry = await withStore<CachedBookTranslation | undefined>(
      STORE_BOOK_TRANSLATIONS,
      'readonly',
      (store) => store.get(key),
    )
    if (!entry) return null
    return { title: entry.title, author: entry.author }
  } catch {
    return null
  }
}

export async function setCachedBookTranslation(
  scope: string,
  bookId: string,
  lang: string,
  data: { title: string; author: string | null },
): Promise<void> {
  const normalizedLang = normalizeLang(lang)
  const entry: CachedBookTranslation = {
    key: makeScopedKey(scope, bookId, 'meta', normalizedLang),
    scope,
    bookId,
    lang: normalizedLang,
    title: data.title,
    author: data.author,
    fetchedAt: Date.now(),
  }
  await withStore(STORE_BOOK_TRANSLATIONS, 'readwrite', (store) => store.put(entry))
}

export async function getCachedReaderMetadataBundle(
  scope: string,
  bookId: string,
  lang: string,
): Promise<{ title: string; author: string | null; chapterTitles: Record<string, string> } | null> {
  try {
    const normalizedLang = normalizeLang(lang)
    const key = makeScopedKey(scope, bookId, 'reader-metadata', normalizedLang)
    const entry = await withStore<CachedReaderMetadataBundle | undefined>(
      STORE_READER_METADATA_BUNDLES,
      'readonly',
      (store) => store.get(key),
    )
    if (!entry) return null
    return {
      title: entry.title,
      author: entry.author,
      chapterTitles: entry.chapterTitles,
    }
  } catch {
    return null
  }
}

export async function setCachedReaderMetadataBundle(
  scope: string,
  bookId: string,
  lang: string,
  data: { title: string; author: string | null; chapterTitles: Record<string, string> },
): Promise<void> {
  const normalizedLang = normalizeLang(lang)
  const entry: CachedReaderMetadataBundle = {
    key: makeScopedKey(scope, bookId, 'reader-metadata', normalizedLang),
    scope,
    bookId,
    lang: normalizedLang,
    title: data.title,
    author: data.author,
    chapterTitles: data.chapterTitles,
    fetchedAt: Date.now(),
  }
  await withStore(STORE_READER_METADATA_BUNDLES, 'readwrite', (store) => store.put(entry))
}

export async function getCachedChapterLayout(layoutKey: string): Promise<CachedChapterLayoutEntry | null> {
  try {
    const entry = await withStore<CachedChapterLayoutEntry | undefined>(
      STORE_CHAPTER_LAYOUT,
      'readonly',
      (store) => store.get(layoutKey),
    )
    return entry ?? null
  } catch {
    return null
  }
}

export async function setCachedChapterLayout(entry: Omit<CachedChapterLayoutEntry, 'fetchedAt'>): Promise<void> {
  const fullEntry: CachedChapterLayoutEntry = {
    ...entry,
    fetchedAt: Date.now(),
  }
  await withStore(STORE_CHAPTER_LAYOUT, 'readwrite', (store) => store.put(fullEntry))
  void pruneStoreByFetchedAt(STORE_CHAPTER_LAYOUT, MAX_CHAPTER_LAYOUT_ENTRIES)
}

export async function clearCachedChapterLayouts(bookId?: string, chapterId?: string): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_CHAPTER_LAYOUT, 'readwrite')
      const store = tx.objectStore(STORE_CHAPTER_LAYOUT)
      const req = (bookId || chapterId)
        ? store.index('by_book_chapter').openCursor()
        : store.openCursor()
      req.onsuccess = () => {
        const cursor = req.result as IDBCursorWithValue | null
        if (!cursor) return
        const value = cursor.value as CachedChapterLayoutEntry
        if (bookId && value.bookId !== bookId) {
          cursor.continue()
          return
        }
        if (chapterId && value.chapterId !== chapterId) {
          cursor.continue()
          return
        }
        cursor.delete()
        cursor.continue()
      }
      req.onerror = () => reject(req.error ?? new Error('IndexedDB cursor failed'))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
    })
    db.close()
  } catch {
    // ignore
  }
}

export async function clearCachedTocTitles(scope?: string): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_TOC_TITLES, 'readwrite')
      const store = tx.objectStore(STORE_TOC_TITLES)
      const req = scope ? store.index('by_scope_book_lang').openCursor() : store.openCursor()
      req.onsuccess = () => {
        const cursor = req.result as IDBCursorWithValue | null
        if (!cursor) return
        if (scope && cursor.value?.scope !== scope) {
          cursor.continue()
          return
        }
        cursor.delete()
        cursor.continue()
      }
      req.onerror = () => reject(req.error ?? new Error('IndexedDB cursor failed'))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
    })
    db.close()
  } catch {
    // ignore
  }
}

function assembleBlock(skel: SkeletonBlock, text: CachedBlockText | undefined): ContentBlock {
  const base = { id: skel.id, position: skel.position }

  if (skel.type === 'heading') {
    const hasText = typeof text?.text === 'string'
    return {
      ...base,
      type: 'heading',
      level: skel.level,
      text: text?.text ?? skel.fallbackText,
      targetLangReady: hasText,
      isTranslated: hasText,
      is_pending: !hasText,
    }
  }
  if (skel.type === 'paragraph') {
    const hasText = typeof text?.text === 'string'
    return {
      ...base,
      type: 'paragraph',
      text: text?.text ?? skel.fallbackText,
      targetLangReady: hasText,
      isTranslated: hasText,
      is_pending: !hasText,
    }
  }
  if (skel.type === 'quote') {
    const hasText = typeof text?.text === 'string'
    return {
      ...base,
      type: 'quote',
      text: text?.text ?? skel.fallbackText,
      targetLangReady: hasText,
      isTranslated: hasText,
      is_pending: !hasText,
    }
  }
  if (skel.type === 'list') {
    const hasItems = Array.isArray(text?.items) && text!.items!.length > 0
    return {
      ...base,
      type: 'list',
      ordered: skel.ordered,
      items: text?.items ?? skel.fallbackItems,
      targetLangReady: hasItems,
      isTranslated: hasItems,
      is_pending: !hasItems,
    }
  }
  if (skel.type === 'image') {
    return { ...base, type: 'image', src: skel.src, alt: skel.alt, caption: skel.caption, targetLangReady: true, isTranslated: true, is_pending: false }
  }
  return { ...base, type: 'hr', targetLangReady: true, isTranslated: true, is_pending: false }
}

function toSkeleton(blocks: ContentBlock[]): SkeletonBlock[] {
  return blocks.map((b) => {
    if (b.type === 'heading') return { id: b.id, position: b.position, type: 'heading', level: b.level, fallbackText: b.text ?? '' }
    if (b.type === 'paragraph') return { id: b.id, position: b.position, type: 'paragraph', fallbackText: b.text ?? '' }
    if (b.type === 'quote') return { id: b.id, position: b.position, type: 'quote', fallbackText: b.text ?? '' }
    if (b.type === 'list') return { id: b.id, position: b.position, type: 'list', ordered: b.ordered, fallbackItems: b.items ?? [] }
    if (b.type === 'image') return { id: b.id, position: b.position, type: 'image', src: b.src, alt: b.alt, caption: b.caption }
    return { id: b.id, position: b.position, type: 'hr' }
  })
}

function toBlockText(chapterId: string, lang: string, block: ContentBlock): CachedBlockText | null {
  if (block.type === 'paragraph' || block.type === 'quote' || block.type === 'heading') {
    return {
      key: makeBlockKey(block.id, lang),
      chapterId,
      blockId: block.id,
      lang: normalizeLang(lang),
      text: block.text ?? '',
      fetchedAt: Date.now(),
    }
  }
  if (block.type === 'list') {
    return {
      key: makeBlockKey(block.id, lang),
      chapterId,
      blockId: block.id,
      lang: normalizeLang(lang),
      items: block.items ?? [],
      fetchedAt: Date.now(),
    }
  }
  return null
}

export async function getCachedChapterContent(chapterId: string, lang?: string): Promise<CachedAssembledChapter | null> {
  try {
    const normalizedLang = normalizeLang(lang)
    let skeleton = await withStore<CachedChapterSkeleton | undefined>(
      STORE_CHAPTER_SKELETON,
      'readonly',
      (store) => store.get(chapterId),
    )

    // On-demand migration from legacy v1 store (chapter cached as full blocks array).
    if (!skeleton) {
      type LegacyEntry = { key: string; chapterId: string; lang: string; blocks: ContentBlock[]; fetchedAt: number }
      const legacyKey = makeLegacyChapterKey(chapterId, normalizedLang)
      const legacy = await withStore<LegacyEntry | undefined>(
        STORE_CHAPTER_CONTENT_V1,
        'readonly',
        (store) => store.get(legacyKey),
      )
      if (legacy?.blocks?.length) {
        await setCachedChapterContent(chapterId, normalizedLang, legacy.blocks)
        skeleton = await withStore<CachedChapterSkeleton | undefined>(
          STORE_CHAPTER_SKELETON,
          'readonly',
          (store) => store.get(chapterId),
        )
      }
    }

    if (!skeleton) return null

    const texts = await openDb().then(
      (db) =>
        new Promise<CachedBlockText[]>((resolve, reject) => {
          const tx = db.transaction(STORE_BLOCK_TEXT, 'readonly')
          const store = tx.objectStore(STORE_BLOCK_TEXT)
          const index = store.index('by_chapter_lang')
          const req = index.getAll(IDBKeyRange.only([chapterId, normalizedLang]))
          req.onsuccess = () => resolve(req.result as CachedBlockText[])
          req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'))
          tx.oncomplete = () => db.close()
          tx.onerror = () => {
            db.close()
            reject(tx.error ?? new Error('IndexedDB transaction failed'))
          }
        }),
    )

    const textMap = new Map(texts.map((t) => [t.blockId, t]))
    const assembled = skeleton.blocks
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((skel) => assembleBlock(skel, textMap.get(skel.id)))

    const missing = assembled.filter((b) => b.targetLangReady !== true).length
    return { blocks: assembled, hasPending: missing > 0, missingCount: missing, fetchedAt: skeleton.fetchedAt }
  } catch {
    return null
  }
}

export async function getCachedChapterBlockIds(chapterId: string): Promise<string[]> {
  try {
    const skeleton = await withStore<CachedChapterSkeleton | undefined>(
      STORE_CHAPTER_SKELETON,
      'readonly',
      (store) => store.get(chapterId),
    )
    if (!skeleton?.blocks?.length) return []
    return skeleton.blocks
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((block) => block.id)
  } catch {
    return []
  }
}

export async function setCachedChapterContent(
  chapterId: string,
  lang: string | undefined,
  blocks: ContentBlock[],
  options?: { fillMissing?: boolean },
): Promise<void> {
  try {
    const normalizedLang = normalizeLang(lang)

    const skeleton: CachedChapterSkeleton = {
      chapterId,
      blocks: toSkeleton(blocks),
      fetchedAt: Date.now(),
    }

    // Transaction over both stores
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_CHAPTER_SKELETON, STORE_BLOCK_TEXT], 'readwrite')
      const abortWrite = (error: unknown) => {
        tx.abort()
        db.close()
        reject(error)
      }
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error ?? new Error('IndexedDB transaction failed'))
      }
      tx.onabort = () => {
        db.close()
        reject(tx.error ?? new Error('IndexedDB transaction aborted'))
      }

      const write = (store: IDBObjectStore, key: IDBValidKey, value: unknown) => {
        if (!options?.fillMissing) {
          store.put(value)
          return
        }
        // Check and insert within this transaction: a late prefetch must not
        // replace foreground/translated content or renew its cache freshness.
        const existing = store.get(key)
        existing.onsuccess = () => {
          if (existing.result !== undefined) return
          try { store.put(value) } catch (error) { abortWrite(error) }
        }
      }

      try {
        write(tx.objectStore(STORE_CHAPTER_SKELETON), chapterId, skeleton)
        const textStore = tx.objectStore(STORE_BLOCK_TEXT)
        for (const block of blocks) {
          const entry = toBlockText(chapterId, normalizedLang, block)
          if (!entry) continue
          // Untranslated/pending blocks must never replace a ready translation.
          if (block.targetLangReady !== true) continue
          write(textStore, entry.key, entry)
        }
      } catch (error) {
        abortWrite(error)
      }
    })
  } catch {
    // best-effort cache
  }
}

export function isCacheFresh(entry: CachedAssembledChapter, ttlMs: number = DEFAULT_TTL_MS): boolean {
  const effectiveTtl = entry.hasPending ? Math.min(ttlMs, PENDING_TTL_MS) : ttlMs
  return Date.now() - entry.fetchedAt < effectiveTtl
}

// ─── In-flight batch prefetch registry ───────────────────────────────────────
// When ReaderView kicks off a first-open batch prefetch, it claims each
// chapter against a per-chapter promise that resolves the moment that
// chapter's cache write completes. Background prefetch/translation warmups use
// this to avoid duplicate work. Foreground useChapterContent reads completed
// cache but does not wait for unfinished prefetch.

const pendingBatchByChapter = new Map<string, Promise<void>>()

export function markChapterPending(chapterId: string, promise: Promise<void>): void {
  pendingBatchByChapter.set(chapterId, promise)
  const cleanup = () => {
    if (pendingBatchByChapter.get(chapterId) === promise) {
      pendingBatchByChapter.delete(chapterId)
    }
  }
  promise.then(cleanup, cleanup)
}

export function getPendingChapterBatch(chapterId: string): Promise<void> | null {
  return pendingBatchByChapter.get(chapterId) ?? null
}

export async function invalidateAllChapterContentCache(): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_CHAPTER_CONTENT_V1, STORE_CHAPTER_SKELETON, STORE_BLOCK_TEXT], 'readwrite')
      tx.objectStore(STORE_CHAPTER_CONTENT_V1).clear()
      tx.objectStore(STORE_CHAPTER_SKELETON).clear()
      tx.objectStore(STORE_BLOCK_TEXT).clear()
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error ?? new Error('IndexedDB transaction failed'))
      }
    })
  } catch {
    // best-effort
  }
}

export async function setCachedTranslatedBlockText(
  chapterId: string,
  lang: string,
  translatedBlock: ContentBlock,
): Promise<void> {
  try {
    const normalizedLang = normalizeLang(lang)
    const entry = toBlockText(chapterId, normalizedLang, translatedBlock)
    if (!entry) return
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_BLOCK_TEXT, STORE_CHAPTER_SKELETON], 'readwrite')
      tx.objectStore(STORE_BLOCK_TEXT).put(entry)
      const skelStore = tx.objectStore(STORE_CHAPTER_SKELETON)
      const getReq = skelStore.get(chapterId)
      getReq.onsuccess = () => {
        const skel = getReq.result as CachedChapterSkeleton | undefined
        if (skel) skelStore.put({ ...skel, fetchedAt: Date.now() })
      }
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error ?? new Error('IndexedDB transaction failed'))
      }
      tx.onabort = () => {
        db.close()
        reject(tx.error ?? new Error('IndexedDB transaction aborted'))
      }
    })
  } catch {
    // best-effort
  }
}
