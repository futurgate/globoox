'use client'

import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { createBook, deleteBook, getShareToken, updateBook } from './api'
import { catalogContextHint, fetchCatalogManifest, resolveCatalogContext } from './catalogApi'
import { getCatalogManifestSync, loadCatalogCache, putCatalogManifest } from './catalogCache'
import { CatalogController } from './catalogState'
import { flushReadingActivity, getPendingReadingRecency } from './readingActivity'
import { CatalogError, type CatalogItem } from './catalogTypes'

export interface UseCatalogOptions {
  userId?: string | null
  identityReady?: boolean
  legacyScopeKey: string
  timeoutMs?: number
}
interface OwnedCatalog {
  controller: CatalogController
  owner: string | null | undefined
  share: string | null
  timeout: number
  updateOptions: (expectedUserId: string | null | undefined, legacyScopeKey: string) => void
}

function createOwnedCatalog(expectedUserId: string | null | undefined, legacyScopeKey: string, share: string | null, timeout: number): OwnedCatalog {
  // This closure belongs only to this controller. Old callbacks never read another account's options.
  let expectation = { expectedUserId, legacyScopeKey }
  const controller = new CatalogController({
    hint: () => expectation.expectedUserId !== undefined ? catalogContextHint(expectation.expectedUserId) : null,
    resolve: async signal => {
      const context = await resolveCatalogContext(signal, expectation.expectedUserId)
      // Auth can become known while getSession is pending, without resetting its original deadline.
      const expected = expectation.expectedUserId
      if (expected !== undefined && context.userId !== expected) {
        throw new CatalogError('auth', 'Session changed; sign in again')
      }
      return context
    },
    cached: getCatalogManifestSync,
    cache: context => loadCatalogCache(context, expectation.legacyScopeKey),
    persist: putCatalogManifest,
    flush: flushReadingActivity,
    fetch: fetchCatalogManifest,
    pendingRecency: getPendingReadingRecency,
    update: (id, status) => updateBook(id, { status }),
    delete: deleteBook,
    create: async data => {
      const book = await createBook(data)
      return {
        id: book.id, title: book.title, author: book.author, created_at: book.created_at,
        status: book.status, is_own: book.is_own ?? true, original_language: book.original_language,
        available_languages: book.available_languages, selected_language: book.selected_language ?? null,
        last_read_at: null, metadata_version: `created-${book.id}`, reading: null, cover: null,
      } satisfies CatalogItem
    },
  }, timeout)
  return { controller, owner: expectedUserId, share, timeout,
    updateOptions: (user, legacy) => { expectation = { expectedUserId: user, legacyScopeKey: legacy } } }
}

export function useCatalog(options: UseCatalogOptions) {
  const { userId, identityReady = true, legacyScopeKey, timeoutMs = 2500 } = options
  const expectedUserId = identityReady ? userId : undefined
  const shareToken = getShareToken()
  const [owned, setOwned] = useState(() => createOwnedCatalog(expectedUserId, legacyScopeKey, shareToken, timeoutMs))
  const resolved = owned.controller.snapshot.context
  const changedIdentity = expectedUserId !== undefined
    && ((owned.owner !== undefined && owned.owner !== expectedUserId) || (resolved && resolved.userId !== expectedUserId))
  let current = owned
  if (changedIdentity || owned.share !== shareToken || owned.timeout !== timeoutMs) {
    current = createOwnedCatalog(expectedUserId, legacyScopeKey, shareToken, timeoutMs)
    setOwned(current)
  } else if (owned.owner === undefined && expectedUserId !== undefined) {
    // External profile hydration confirms identity without restarting the original request/deadline.
    current = { ...owned, owner: expectedUserId }
    setOwned(current)
  }
  const { controller, updateOptions } = current
  const [rendered, setRendered] = useState({ controller, view: controller.snapshot })
  useEffect(() => {
    controller.activate()
    const unsubscribe = controller.subscribe(view => setRendered({ controller, view }))
    void controller.refresh()
    const visible = () => {
      // Offline recovery is explicit Retry; do not silently reorder a fallback view.
      if (document.visibilityState === 'visible' && !controller.snapshot.offline) void controller.refresh()
    }
    document.addEventListener('visibilitychange', visible)
    return () => { unsubscribe(); controller.dispose(); document.removeEventListener('visibilitychange', visible) }
  }, [controller])
  useLayoutEffect(() => {
    updateOptions(expectedUserId, legacyScopeKey)
    controller.prefetchCache()
  }, [controller, updateOptions, expectedUserId, legacyScopeKey])
  const view = rendered.controller === controller ? rendered.view : controller.snapshot
  const refresh = useCallback(() => controller.refresh(true), [controller])
  const beginExternalMutation = useCallback(() => controller.beginExternalMutation(), [controller])
  const hideBook = useCallback((id: string) => controller.mutate(id, 'hidden'), [controller])
  const unhideBook = useCallback((id: string) => controller.mutate(id, 'active'), [controller])
  const removeBook = useCallback((id: string) => controller.mutate(id, 'delete'), [controller])
  const addBook = useCallback((data: Parameters<CatalogController['addBook']>[0]) => controller.addBook(data), [controller])
  return { ...view, scopeKey: view.context?.scopeKey ?? null, refresh, beginExternalMutation, hideBook, unhideBook, removeBook, addBook }
}
