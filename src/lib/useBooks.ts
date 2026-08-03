'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiBook, fetchBooks, fetchBooksStreaming, createBook, updateBook, deleteBook as apiDeleteBook } from './api'
import { clearCachedBookMeta, clearCachedBookMetaEntry, clearCachedBooksList, getCachedBooksList, setCachedBookMeta, setCachedBooksList } from './contentCache'

// Stale-While-Revalidate cache — module-level so it survives component remounts (route navigation)
const STALE_TIME_MS = 5 * 60 * 1000 // 5 minutes — background refresh only if older

interface CachedBooks {
  data: ApiBook[]
  fetchedAt: number
}

const booksCache = new Map<string, CachedBooks>()

/** Expose a way for useSyncCheck to force-invalidate the cache from outside the hook */
export function invalidateBooksCache() {
  booksCache.clear()
  // Also drop persisted cache so a post-sync reload doesn't resurrect stale data.
  void clearCachedBooksList()
  void clearCachedBookMeta()
}

export function useBooks(options?: { scopeKey?: string; stabilizeOnMount?: boolean }) {
  const scopeKey = options?.scopeKey ?? 'guest'
  const stabilizeOnMount = options?.stabilizeOnMount ?? false
  const cacheKey = `${scopeKey}::all`
  const isAuthenticatedScope = scopeKey !== 'guest'
  const listStatus = isAuthenticatedScope ? 'all' : 'active'

  // Initialise from cache immediately — no skeleton on repeated visits
  const cached = booksCache.get(cacheKey)
  const [books, setBooks] = useState<ApiBook[]>(cached?.data ?? [])
  // loading=true only when there is absolutely no cached data yet (very first visit)
  const [loading, setLoading] = useState(!cached)
  const [stabilizing, setStabilizing] = useState(Boolean(cached && stabilizeOnMount))
  const [error, setError] = useState<string | null>(null)
  const revalidating = useRef<string | null>(null)
  const hasSuccessfulBooksFetch = useRef(Boolean(cached))
  const authRetryDone = useRef(false)
  const activeCacheKeyRef = useRef(cacheKey)
  const initialStabilizationDoneRef = useRef(false)

  const commitBooks = useCallback((nextBooks: ApiBook[], fetchedAt = Date.now()) => {
    if (activeCacheKeyRef.current !== cacheKey) return
    booksCache.set(cacheKey, { data: nextBooks, fetchedAt })
    setBooks(nextBooks)
    void setCachedBooksList(scopeKey, 'all', nextBooks)
    nextBooks.forEach((b) => void setCachedBookMeta(scopeKey, b))
  }, [cacheKey, scopeKey])

  useEffect(() => {
    activeCacheKeyRef.current = cacheKey
    revalidating.current = null
    authRetryDone.current = false
    hasSuccessfulBooksFetch.current = Boolean(booksCache.get(cacheKey))
    initialStabilizationDoneRef.current = false
    setStabilizing(Boolean(booksCache.get(cacheKey) && stabilizeOnMount))
  }, [cacheKey, stabilizeOnMount])

  // Hydrate from persisted IndexedDB cache (fast reloads)
  useEffect(() => {
    let cancelled = false
    if (booksCache.get(cacheKey)) return

    void getCachedBooksList(scopeKey, 'all').then((entry) => {
      if (cancelled) return
      if (!entry?.books?.length) return
      booksCache.set(cacheKey, { data: entry.books, fetchedAt: entry.fetchedAt })
      setBooks(entry.books)
      setLoading(false)
      hasSuccessfulBooksFetch.current = true
      // Persist per-book metadata too, so /reader/[id] can render instantly on reload.
      entry.books.forEach((b) => void setCachedBookMeta(scopeKey, b))
    })

    return () => {
      cancelled = true
    }
  }, [cacheKey, scopeKey])

  /**
   * refresh(force=false) — stale-while-revalidate:
   *   - Always shows existing cached data immediately (no skeletons)
   *   - Fetches in background when cache is older than STALE_TIME_MS
   *   - force=true: always re-fetches (e.g. after mutating the list)
   */
  const refresh = useCallback(async (force = false) => {
    const entry = booksCache.get(cacheKey)
    const now = Date.now()
    const isFresh = entry && now - entry.fetchedAt < STALE_TIME_MS

    // Show cached data instantly — never block the user with a spinner
    if (entry) {
      setBooks(entry.data)
      setLoading(false)
    }

    // Keep skeleton until first successful /api/books call.
    if (!hasSuccessfulBooksFetch.current) {
      setLoading(true)
    }

    // Nothing to do if cache is fresh and not forced
    if (!force && isFresh) return

    // Prevent concurrent fetches
    if (revalidating.current === cacheKey) return
    revalidating.current = cacheKey

    // Clear stale entry when forced so we don't risk showing it again on next mount
    if (force) booksCache.delete(cacheKey)

    setError(null)
    // Don't set loading=true here — we already have data to show

    // First-paint fast path: no cache yet → stream so the head batch renders before
    // the full list is even queried server-side. Skip for revalidations (we already
    // have data to show, and the JSON path is simpler/cheaper there).
    const isFirstPaint = !entry && !hasSuccessfulBooksFetch.current
    let streamSucceeded = false
    let streamedData: ApiBook[] | null = null
    if (isFirstPaint) {
      try {
        const streamed: ApiBook[] = []
        await fetchBooksStreaming(listStatus, (batch, isFirst) => {
          if (activeCacheKeyRef.current !== cacheKey) return
          streamed.push(...batch)
          setBooks([...streamed])
          if (isFirst) setLoading(false)
        })
        streamSucceeded = true
        streamedData = streamed
        // For guest scope we can commit immediately. Auth scope still does the
        // session-race retry below — keep that behavior intact.
        if (!isAuthenticatedScope) {
          commitBooks(streamed)
          hasSuccessfulBooksFetch.current = true
          return
        }
      } catch (err: unknown) {
        // Fall through to JSON fetch on stream failure.
        console.warn('[useBooks] stream failed, falling back to JSON', err)
      }
    }

    try {
      // Auth + stream succeeded: skip the immediate JSON fetch; use streamed data
      // as the "first" payload and proceed straight to the stabilization retry.
      const data = streamSucceeded && streamedData
        ? streamedData
        : await fetchBooks(listStatus)
      const needsAuthStabilization = isAuthenticatedScope && !authRetryDone.current
      if (!needsAuthStabilization) {
        commitBooks(data)
        hasSuccessfulBooksFetch.current = true
      } else {
        // First authenticated fetch can still race before proxy session is fully ready.
        // Show data immediately, then do one short retry and only persist the retry result as fresh.
        if (activeCacheKeyRef.current === cacheKey) {
          setBooks(data)
        }
        authRetryDone.current = true

        try {
          await new Promise((resolve) => setTimeout(resolve, 1200))
          const retryData = await fetchBooks(listStatus)
          commitBooks(retryData)
          hasSuccessfulBooksFetch.current = true
        } catch {
          // Fallback: keep current data but mark it near-stale so a follow-up refresh retries quickly.
          commitBooks(data, Date.now() - STALE_TIME_MS + 1)
          hasSuccessfulBooksFetch.current = true
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load books'
      setError(message)
      hasSuccessfulBooksFetch.current = true
    } finally {
      if (revalidating.current === cacheKey) revalidating.current = null
      // Only clear the initial loading spinner (first ever load)
      setLoading(false)
    }
  }, [cacheKey, commitBooks, isAuthenticatedScope, listStatus])

  // On mount: show cache immediately, revalidate if stale
  useEffect(() => {
    const hasCache = Boolean(booksCache.get(cacheKey))
    if (stabilizeOnMount && hasCache && !initialStabilizationDoneRef.current) {
      initialStabilizationDoneRef.current = true
      setStabilizing(true)
      void refresh(true).finally(() => {
        if (activeCacheKeyRef.current === cacheKey) setStabilizing(false)
      })
      return
    }

    void refresh()
  }, [cacheKey, refresh, stabilizeOnMount])

  // On tab focus: silent background revalidation (no skeleton)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refresh()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [refresh])

  const addBook = useCallback(async (data: { title: string; author?: string; cover_url?: string; source_language?: string }) => {
    const created = await createBook(data)
    setBooks((prev) => [created, ...prev])
    booksCache.delete(cacheKey)
    void setCachedBookMeta(scopeKey, created)
    return created
  }, [cacheKey, scopeKey])

  const hideBook = useCallback(async (id: string) => {
    const previousBooks = booksCache.get(cacheKey)?.data ?? books
    const nextBooks = previousBooks.map((b) => (b.id === id ? { ...b, status: 'hidden' } : b))

    setError(null)
    setBooks(nextBooks)
    booksCache.set(cacheKey, { data: nextBooks, fetchedAt: Date.now() })
    void setCachedBooksList(scopeKey, 'all', nextBooks)
    const updated = nextBooks.find((book) => book.id === id)
    if (updated) void setCachedBookMeta(scopeKey, updated)

    try {
      await updateBook(id, { status: 'hidden' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to archive book'
      setBooks(previousBooks)
      booksCache.set(cacheKey, { data: previousBooks, fetchedAt: Date.now() })
      void setCachedBooksList(scopeKey, 'all', previousBooks)
      const restored = previousBooks.find((book) => book.id === id)
      if (restored) void setCachedBookMeta(scopeKey, restored)
      setError(message)
      throw err
    }
  }, [books, cacheKey, scopeKey])

  const unhideBook = useCallback(async (id: string) => {
    const previousBooks = booksCache.get(cacheKey)?.data ?? books
    const nextBooks = previousBooks.map((b) => (b.id === id ? { ...b, status: 'active' } : b))

    setError(null)
    setBooks(nextBooks)
    booksCache.set(cacheKey, { data: nextBooks, fetchedAt: Date.now() })
    void setCachedBooksList(scopeKey, 'all', nextBooks)
    const updated = nextBooks.find((book) => book.id === id)
    if (updated) void setCachedBookMeta(scopeKey, updated)

    try {
      await updateBook(id, { status: 'active' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to restore book'
      setBooks(previousBooks)
      booksCache.set(cacheKey, { data: previousBooks, fetchedAt: Date.now() })
      void setCachedBooksList(scopeKey, 'all', previousBooks)
      const restored = previousBooks.find((book) => book.id === id)
      if (restored) void setCachedBookMeta(scopeKey, restored)
      setError(message)
      throw err
    }
  }, [books, cacheKey, scopeKey])

  const removeBook = useCallback(async (id: string) => {
    const previousBooks = booksCache.get(cacheKey)?.data ?? books
    const nextBooks = previousBooks.filter((b) => b.id !== id)

    setError(null)
    setBooks(nextBooks)
    booksCache.set(cacheKey, { data: nextBooks, fetchedAt: Date.now() })
    void setCachedBooksList(scopeKey, 'all', nextBooks)
    void clearCachedBookMetaEntry(scopeKey, id)

    try {
      await apiDeleteBook(id)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete book'
      setBooks(previousBooks)
      booksCache.set(cacheKey, { data: previousBooks, fetchedAt: Date.now() })
      void setCachedBooksList(scopeKey, 'all', previousBooks)
      const restored = previousBooks.find((book) => book.id === id)
      if (restored) {
        void setCachedBookMeta(scopeKey, restored)
      }
      setError(message)
      throw err
    }
  }, [books, cacheKey, scopeKey])

  return { books, loading, stabilizing, error, refresh, addBook, hideBook, unhideBook, removeBook }
}
