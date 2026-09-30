'use client'

import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react'
import { ContentBlock, fetchContent } from '@/lib/api'
import { getCachedChapterContent, isCacheFresh, setCachedChapterContent } from '@/lib/contentCache'

type ChapterSnapshot = {
  bookId?: string
  chapterId: string | null
  lang?: string
  blocks: ContentBlock[]
  loading: boolean
  error: string | null
  hasServerSnapshot: boolean
}

export function useChapterContent(chapterId: string | null, lang?: string, bookId?: string) {
  // Keep content and its owner together. An effect runs after render, so merely
  // clearing state in the chapter-change effect would still expose one ready
  // render containing the previous chapter's blocks.
  const [snapshot, setSnapshot] = useState<ChapterSnapshot>({
    chapterId: null, blocks: [], loading: false, error: null, hasServerSnapshot: false,
  })
  const setBlocks = useCallback((next: SetStateAction<ContentBlock[]>) => {
    setSnapshot(previous => ({ ...previous, blocks: typeof next === 'function' ? next(previous.blocks) : next }))
  }, [])
  const snapshotRef = useRef(snapshot)
  snapshotRef.current = snapshot
  
  // AbortController to cancel stale requests
  const abortControllerRef = useRef<AbortController | null>(null)

  const loadContent = useCallback(async (forceRefresh = false) => {
    if (!chapterId) return false

    // Abort any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    const controller = new AbortController()
    abortControllerRef.current = controller

    const cached = forceRefresh ? null : await getCachedChapterContent(chapterId, lang)
    if (controller.signal.aborted) return false

    // Use completed prefetch results through the cache, but never wait for
    // unfinished prefetch: its batch may not even contain this chapter.
    // A cold foreground request can overlap prefetch so reading can proceed.

    const current = snapshotRef.current
    const retainedBlocks = forceRefresh && current.bookId === bookId && current.chapterId === chapterId
      && current.lang === lang && current.hasServerSnapshot ? current.blocks : null
    const hadCached = !!cached || retainedBlocks !== null
    // Cached content stays readable while a same-scope background request runs.
    setSnapshot({ bookId, chapterId, lang, blocks: cached?.blocks ?? retainedBlocks ?? [],
      loading: !hadCached, error: null, hasServerSnapshot: hadCached })

    if (cached && isCacheFresh(cached)) {
      return true
    }

    try {
      const data = await fetchContent(chapterId, lang, controller.signal)
      if (controller.signal.aborted) return false
      setSnapshot({ bookId, chapterId, lang, blocks: data,
        loading: false, error: null, hasServerSnapshot: true })
      await setCachedChapterContent(chapterId, lang, data)
      return true
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return false
      if (controller.signal.aborted) return false
      // If we managed to show cached content, prefer keeping it without surfacing an error.
      if (hadCached) {
        return false
      }
      setSnapshot(previous => ({ ...previous, loading: false,
        error: err instanceof Error ? err.message : 'Failed to load content' }))
      return false
    }
  }, [bookId, chapterId, lang])

  useEffect(() => {
    void loadContent()
    return () => { abortControllerRef.current?.abort() }
  }, [loadContent])

  // A manual recovery must bypass even a fresh IDB entry: its block IDs may
  // belong to an older server snapshot. Other chapters and caches are untouched.
  const refreshContent = useCallback(() => loadContent(true), [loadContent])

  const isStale = snapshot.bookId !== bookId || snapshot.chapterId !== chapterId || snapshot.lang !== lang

  return {
    blocks: snapshot.blocks, setBlocks, refreshContent,
    blocksBookId: snapshot.bookId, blocksChapterId: snapshot.chapterId, blocksLang: snapshot.lang,
    loading: chapterId !== null && (isStale || snapshot.loading),
    error: isStale ? null : snapshot.error,
    isStale,
    hasServerSnapshot: !isStale && snapshot.hasServerSnapshot,
  }
}
