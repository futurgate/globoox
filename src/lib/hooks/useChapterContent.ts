'use client'

import { useEffect, useRef, useState } from 'react'
import { ContentBlock, fetchContent } from '@/lib/api'
import { getCachedChapterContent, isCacheFresh, setCachedChapterContent } from '@/lib/contentCache'

export function useChapterContent(chapterId: string | null, lang?: string) {
  const [blocks, setBlocks] = useState<ContentBlock[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasServerSnapshot, setHasServerSnapshot] = useState(false)
  // Track which lang the current blocks were fetched for
  const [blocksLang, setBlocksLang] = useState<string | undefined>(undefined)
  
  // AbortController to cancel stale requests
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!chapterId) return

    // Abort any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    const controller = new AbortController()
    abortControllerRef.current = controller

    void (async () => {
      const cached = await getCachedChapterContent(chapterId, lang)
      if (controller.signal.aborted) return

      // Use completed prefetch results through the cache, but never wait for
      // unfinished prefetch: its batch may not even contain this chapter.
      // A cold foreground request can overlap prefetch so reading can proceed.

      setError(null)

      const hadCached = !!cached
      setHasServerSnapshot(hadCached)
      if (cached) {
        setBlocks(cached.blocks)
        setBlocksLang(lang)
        // Cached content is enough to allow viewport translation to run immediately on reopen.
        // Server snapshot fetch remains best-effort and is skipped when cache is fresh.
        setHasServerSnapshot(true)
      }

      // Only show the loading spinner if we have nothing cached to show immediately.
      setLoading(!hadCached)

      if (cached && isCacheFresh(cached)) {
        setLoading(false)
        return
      }

      try {
        const data = await fetchContent(chapterId, lang, controller.signal)
        if (controller.signal.aborted) return
        setBlocks(data)
        setBlocksLang(lang)
        setHasServerSnapshot(true)
        setLoading(false)
        await setCachedChapterContent(chapterId, lang, data)
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
        if (controller.signal.aborted) return
        // If we managed to show cached content, prefer keeping it without surfacing an error.
        if (hadCached) {
          setLoading(false)
          return
        }
        setError(err instanceof Error ? err.message : 'Failed to load content')
        setLoading(false)
      }
    })()
    
    return () => {
      controller.abort()
    }
  }, [chapterId, lang])

  // Blocks are stale if they were fetched for a different language
  const isStale = blocksLang !== lang

  return { blocks, setBlocks, loading, error, isStale, blocksLang, hasServerSnapshot }
}
