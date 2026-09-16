'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiBook, fetchBooks, fetchBooksStreaming, createBook, updateBook, deleteBook as apiDeleteBook } from './api'
import { clearCachedBookMeta, clearCachedBookMetaEntry, clearCachedBooksList, getCachedBooksList, setCachedBookMeta, setCachedBooksList } from './contentCache'
import { BooksRequestGuard, sameBooks } from './useBooksState'

const STALE_TIME_MS = 5 * 60 * 1000
const EMPTY_BOOKS: ApiBook[] = []

interface CachedBooks {
  data: ApiBook[]
  fetchedAt: number
}

interface BooksView {
  sessionId: symbol
  books: ApiBook[]
  loading: boolean
  stabilizing: boolean
  error: string | null
}

const booksCache = new Map<string, CachedBooks>()

/** Invalidates future reads; this deliberately does not trigger a fetch in mounted hooks. */
export function invalidateBooksCache() {
  booksCache.clear()
  void clearCachedBooksList()
  void clearCachedBookMeta()
}

interface UseBooksOptions {
  scopeKey?: string
  stabilizeOnMount?: boolean
  enabled?: boolean
  isAuthenticated?: boolean
}

export function useBooks(options?: UseBooksOptions) {
  const scopeKey = options?.scopeKey ?? 'guest'
  const stabilizeOnMount = options?.stabilizeOnMount ?? false
  const enabled = options?.enabled ?? true
  const isAuthenticatedScope = options?.isAuthenticated ?? (scopeKey !== 'guest' && !scopeKey.startsWith('share:'))
  const listStatus = isAuthenticatedScope ? 'all' : 'active'
  const cacheKey = `${scopeKey}::all`

  // Async work retains this exact session, so A → B → A cannot admit old A responses.
  const session = useMemo(() => {
    const cached = enabled ? booksCache.get(cacheKey) : undefined
    const view: BooksView = {
      sessionId: Symbol(cacheKey),
      books: cached?.data ?? EMPTY_BOOKS,
      loading: !cached,
      stabilizing: Boolean(enabled && cached && stabilizeOnMount),
      error: null,
    }
    return {
      guard: new BooksRequestGuard(),
      isAuthenticatedScope,
      view,
      hasData: Boolean(cached),
      authRetryDone: false,
      pendingMutations: 0,
      latestMutation: new Map<string, symbol>(),
      refreshAfterMutation: false,
    }
  }, [cacheKey, enabled, isAuthenticatedScope, stabilizeOnMount])
  const [view, setView] = useState<BooksView>(session.view)

  const publish = useCallback((patch: Partial<Omit<BooksView, 'sessionId'>>) => {
    if (!session.guard.active) return
    const books = patch.books && !sameBooks(session.view.books, patch.books) ? patch.books : session.view.books
    session.view = { ...session.view, ...patch, books }
    setView(session.view)
  }, [session])

  const persistBooks = useCallback((nextBooks: ApiBook[], fetchedAt = Date.now()) => {
    if (!session.guard.active) return
    session.guard.markPublished()
    publish({ books: nextBooks, loading: false })
    session.hasData = true
    const stableBooks = session.view.books
    booksCache.set(cacheKey, { data: stableBooks, fetchedAt })
    void setCachedBooksList(scopeKey, 'all', stableBooks)
    stableBooks.forEach((book) => void setCachedBookMeta(scopeKey, book))
  }, [cacheKey, publish, scopeKey, session])

  useEffect(() => {
    session.guard.activate()
    publish(session.view)
    return () => session.guard.dispose()
  }, [publish, session])

  useEffect(() => {
    if (!enabled) return
    if (booksCache.has(cacheKey)) return
    let cancelled = false
    const hydrationVersion = session.guard.hydrationVersion()
    void getCachedBooksList(scopeKey, 'all').then((entry) => {
      // Network's first batch or a local mutation wins over a late disk read.
      if (cancelled || !session.guard.canHydrate(hydrationVersion) || !entry) return
      const newerMemory = booksCache.get(cacheKey)
      const data = newerMemory?.data ?? entry.books
      booksCache.set(cacheKey, newerMemory ?? { data, fetchedAt: entry.fetchedAt })
      session.hasData = true
      publish({ books: data, loading: false })
      data.forEach((book) => void setCachedBookMeta(scopeKey, book))
    })
    return () => { cancelled = true }
  }, [cacheKey, enabled, publish, scopeKey, session])

  const refresh = useCallback(async (force = false) => {
    if (!enabled || !session.guard.active) return
    if (session.pendingMutations) {
      session.refreshAfterMutation = true
      return
    }
    if (session.guard.inFlight && !force) return

    const entry = booksCache.get(cacheKey)
    if (entry) {
      session.hasData = true
      publish({ books: entry.data, loading: false })
    }
    if (!force && entry && Date.now() - entry.fetchedAt < STALE_TIME_MS) return

    const request = session.guard.beginRequest()
    const isCurrent = () => session.guard.isCurrent(request)
    // Retain usable data on failed revalidation, but do not treat it as fresh.
    if (force && entry) booksCache.set(cacheKey, { ...entry, fetchedAt: 0 })
    publish({ error: null, loading: !session.hasData })

    try {
      let data: ApiBook[] | null = null
      if (!entry && !session.hasData) {
        try {
          const streamed: ApiBook[] = []
          await fetchBooksStreaming(listStatus, (batch) => {
            if (!isCurrent()) return
            streamed.push(...batch)
            session.guard.markPublished()
            session.hasData = true
            // Preserve the first streamed batch: no debounce, disk read or auth retry delay.
            // A complete disk snapshot may have arrived while the stream was starting.
            // Keep its tail visible until the complete network list can replace it.
            if (!booksCache.has(cacheKey)) publish({ books: [...streamed], loading: false })
          }, request.controller.signal)
          if (!isCurrent()) return
          data = streamed
        } catch (err: unknown) {
          if (!isCurrent()) return
          console.warn('[useBooks] stream failed, falling back to JSON', err)
        }
      }

      if (!data) data = await fetchBooks(listStatus)
      if (!isCurrent()) return
      session.guard.markPublished()
      session.hasData = true
      publish({ books: data, loading: false })

      if (session.isAuthenticatedScope && !session.authRetryDone) {
        // Keep the existing proxy-session stabilization retry until auth is fixed end to end.
        try {
          await new Promise((resolve) => setTimeout(resolve, 1200))
          if (!isCurrent()) return
          const retryData = await fetchBooks(listStatus)
          if (!isCurrent()) return
          session.authRetryDone = true
          persistBooks(retryData)
        } catch {
          if (!isCurrent()) return
          session.authRetryDone = true
          persistBooks(data, Date.now() - STALE_TIME_MS + 1)
        }
      } else {
        persistBooks(data)
      }
    } catch (err: unknown) {
      if (!isCurrent()) return
      publish({ error: err instanceof Error ? err.message : 'Failed to load books' })
    } finally {
      if (isCurrent()) {
        publish({ loading: false, stabilizing: false })
        session.guard.finishRequest(request)
      }
    }
  }, [cacheKey, enabled, listStatus, persistBooks, publish, session])

  useEffect(() => {
    void refresh(Boolean(stabilizeOnMount && booksCache.has(cacheKey)))
  }, [cacheKey, refresh, stabilizeOnMount])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [refresh])

  const beginMutation = useCallback((id: string) => {
    if (!enabled || !session.guard.active) throw new Error('Library is not ready for changes')
    const token = Symbol(id)
    if (session.latestMutation.has(id)) session.refreshAfterMutation = true
    session.latestMutation.set(id, token)
    session.pendingMutations += 1
    session.refreshAfterMutation = session.guard.invalidateRequest() || session.refreshAfterMutation
    session.guard.markPublished()
    publish({ loading: false, stabilizing: false, error: null })
    return token
  }, [enabled, publish, session])

  const finishMutation = useCallback((id: string, token: symbol) => {
    session.pendingMutations -= 1
    if (session.latestMutation.get(id) === token) session.latestMutation.delete(id)
    if (!session.guard.active) {
      // Never promote a now-inactive scope's optimistic state to a fresh cache.
      booksCache.delete(cacheKey)
      return
    }
    if (!session.pendingMutations && session.refreshAfterMutation) {
      session.refreshAfterMutation = false
      void refresh(true)
    }
  }, [cacheKey, refresh, session])

  const addBook = useCallback(async (data: { title: string; author?: string; cover_url?: string; source_language?: string }) => {
    const id = `create:${Date.now()}`
    const token = beginMutation(id)
    try {
      const created = await createBook(data)
      if (session.guard.active) {
        persistBooks([created, ...session.view.books.filter((book) => book.id !== created.id)], 0)
      }
      return created
    } finally {
      finishMutation(id, token)
    }
  }, [beginMutation, finishMutation, persistBooks, session])

  const mutateBook = useCallback(async (id: string, action: 'hidden' | 'active' | 'delete') => {
    const previousIndex = session.view.books.findIndex((book) => book.id === id)
    const previousBook = session.view.books[previousIndex]
    const token = beginMutation(id)
    const nextBooks = action === 'delete'
      ? session.view.books.filter((book) => book.id !== id)
      : session.view.books.map((book) => book.id === id ? { ...book, status: action } : book)
    persistBooks(nextBooks)
    if (action === 'delete') void clearCachedBookMetaEntry(scopeKey, id)

    try {
      if (action === 'delete') await apiDeleteBook(id)
      else await updateBook(id, { status: action })
    } catch (err: unknown) {
      if (session.guard.active && session.latestMutation.get(id) === token) {
        // Roll back only this book, preserving concurrent changes to other books.
        const restored = session.view.books.filter((book) => book.id !== id)
        if (previousBook) restored.splice(Math.min(previousIndex, restored.length), 0, previousBook)
        persistBooks(restored)
        const fallback = action === 'delete' ? 'Failed to delete book' : action === 'hidden' ? 'Failed to archive book' : 'Failed to restore book'
        publish({ error: err instanceof Error ? err.message : fallback })
      }
      throw err
    } finally {
      finishMutation(id, token)
    }
  }, [beginMutation, finishMutation, persistBooks, publish, scopeKey, session])

  const hideBook = useCallback((id: string) => mutateBook(id, 'hidden'), [mutateBook])
  const unhideBook = useCallback((id: string) => mutateBook(id, 'active'), [mutateBook])
  const removeBook = useCallback((id: string) => mutateBook(id, 'delete'), [mutateBook])

  // A scope change must never render the previous account's books before effects run.
  const currentView = view.sessionId === session.view.sessionId ? view : session.view
  const { books, loading, stabilizing, error } = currentView
  return { books, loading, stabilizing, error, refresh, addBook, hideBook, unhideBook, removeBook }
}
