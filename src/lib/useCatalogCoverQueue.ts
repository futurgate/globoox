'use client'
import { useLayoutEffect, useMemo } from 'react'
import { requestCatalogCover } from './catalogCoverQueue'
import type { CatalogContext, CatalogItem } from './catalogTypes'

/** Register the whole shelf before card effects. Scrolling never changes the queue. */
export function useCatalogCoverQueue(books: CatalogItem[], context: CatalogContext | null, offline: boolean) {
  const serialized = JSON.stringify({ books: books.filter(book => book.cover).map(book => ({ id: book.id, cover: book.cover })), context, offline })
  const input = useMemo(() => JSON.parse(serialized) as { books: CatalogItem[]; context: CatalogContext | null; offline: boolean }, [serialized])
  useLayoutEffect(() => {
    if (!input.context) return
    const controller = new AbortController()
    for (const book of input.books) void requestCatalogCover(book, input.context, input.offline, controller.signal).catch(() => {})
    return () => controller.abort()
  }, [input])
}
