'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CatalogContext, CatalogItem } from './catalogTypes'
import { catalogCoverKey, requestCatalogCover } from './catalogCoverQueue'
import { getCatalogCover } from './catalogCache'

export function useCatalogCover(book: CatalogItem, context: CatalogContext | null, offline: boolean) {
  const serialized = JSON.stringify(context)
  const requestContext = useMemo(() => JSON.parse(serialized) as CatalogContext | null, [serialized])
  const key = context ? catalogCoverKey(book, context) : ''
  const [state, setState] = useState({ key: '', url: '', loading: false })
  const resource = useRef<{ key: string; url: string } | null>(null)
  const source = book.cover?.url
  const version = book.cover?.version
  useEffect(() => () => {
    if (resource.current?.key === key) {
      URL.revokeObjectURL(resource.current.url)
      resource.current = null
    }
  }, [key])
  useEffect(() => {
    if (!source || !version || !requestContext || resource.current?.key === key) return
    const controller = new AbortController()
    const item = { id: book.id, cover: { url: source, version, width: null, height: null } } as CatalogItem
    // Display local data without waiting behind background network work.
    const cached = getCatalogCover(requestContext.scopeKey, book.id, version).catch(() => null)
    void Promise.race([
      requestCatalogCover(item, requestContext, offline, controller.signal),
      cached.then(blob => blob ?? new Promise<Blob>(() => {})),
    ]).then(blob => {
      if (!blob || controller.signal.aborted || resource.current?.key === key) return
      const url = URL.createObjectURL(blob)
      resource.current = { key, url }
      setState({ key, url, loading: false })
      controller.abort() // Release only this subscriber; shelf prefetch keeps its own ownership.
    }).catch(() => {}).finally(() => {
      if (!controller.signal.aborted) setState(current => current.key === key ? { ...current, loading: false } : { key, url: '', loading: false })
    })
    return () => controller.abort()
  }, [key, source, version, requestContext, offline, book.id])
  if (!source || !context) return { url: '', loading: false }
  return state.key === key ? state : { url: '', loading: true }
}
