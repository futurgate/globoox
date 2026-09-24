'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ContentBlock, fetchBlockTexts, TranslatedBlockResult, translateBlocksStreaming } from '@/lib/api'
import { carryBlockEmphasis } from '@/lib/inlineMarks'
import { trackTranslationBatch, trackTranslationSessionSummary, trackBookTranslationStarted } from '@/lib/posthog'
import { setCachedTranslatedBlockText } from '@/lib/contentCache'
import { hasTargetLangText } from '@/lib/translationState'

interface UseViewportTranslationOptions {
  bookId: string
  chapterId: string | null
  lang: string
  blocks: ContentBlock[]
  sourceLanguage: string | null
  canTranslate: boolean
  onBlocksTranslated: (translated: ContentBlock[]) => void
}

const DEBOUNCE_MS = 0 // No debounce - translate immediately
const DEBOUNCE_MS_IMMEDIATE = 0 // No debounce for high-priority blocks
const ROOT_MARGIN = '50% 0px'
const MAX_BATCH_SIZE = 10 // Smaller batches to reduce duplicate requests and improve responsiveness
const RECOVERY_POLL_MS = 1500
const RECOVERY_BATCH_SIZE = 50
const RECOVERY_RETRY_COOLDOWN_MS = 30000
const RECOVERY_MAX_RETRIES = 3
const RECONCILE_COALESCE_MS = 120
const RECENT_BLOCK_TEXT_TTL_MS = 2000

// Block types that don't need translation
const SKIP_TYPES = new Set(['image', 'hr'])

function createSessionId(): string {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/** Merge a translatedText string into the appropriate field(s) of a ContentBlock. */
function applyTranslation(block: ContentBlock, translatedText: string): ContentBlock | null {
  if (block.type === 'paragraph' || block.type === 'quote' || block.type === 'heading') {
    // Offset marks index the original text; they don't map onto the translation.
    // Carry only block-level emphasis (mirrors the backend), else drop.
    const marks = carryBlockEmphasis(block.text, block.marks, translatedText)
    return { ...block, text: translatedText, marks, targetLangReady: true, isTranslated: true, is_pending: false }
  }
  if (block.type === 'list') {
    return { ...block, items: translatedText.split('\n').filter(Boolean), targetLangReady: true, isTranslated: true, is_pending: false }
  }
  // image / hr — no text translation
  return null
}

function buildRecoveredTranslatedBlock(
  payload: Awaited<ReturnType<typeof fetchBlockTexts>>['ok'][number],
  fallbackType: ContentBlock['type'],
): ContentBlock {
  if (payload.type === 'list') {
    return {
      id: payload.blockId,
      position: 0,
      type: 'list',
      ordered: false,
      items: payload.items,
      targetLangReady: true,
      isTranslated: true,
      is_pending: false,
    }
  }

  const type = fallbackType === 'heading' || fallbackType === 'quote' ? fallbackType : 'paragraph'
  if (type === 'heading') {
    return {
      id: payload.blockId,
      position: 0,
      type,
      level: 1,
      text: payload.text,
      targetLangReady: true,
      isTranslated: true,
      is_pending: false,
    }
  }

  return {
    id: payload.blockId,
    position: 0,
    type,
    text: payload.text,
    targetLangReady: true,
    isTranslated: true,
    is_pending: false,
  }
}

function buildRecoveredStreamBlock(
  blockId: string,
  fallbackType: ContentBlock['type'],
  translatedText: string,
): ContentBlock | null {
  if (fallbackType === 'list') {
    return {
      id: blockId,
      position: 0,
      type: 'list',
      ordered: false,
      items: translatedText.split('\n').filter(Boolean),
      targetLangReady: true,
      isTranslated: true,
      is_pending: false,
    }
  }

  if (fallbackType === 'heading') {
    return {
      id: blockId,
      position: 0,
      type: 'heading',
      level: 1,
      text: translatedText,
      targetLangReady: true,
      isTranslated: true,
      is_pending: false,
    }
  }

  if (fallbackType === 'paragraph' || fallbackType === 'quote') {
    return {
      id: blockId,
      position: 0,
      type: fallbackType,
      text: translatedText,
      targetLangReady: true,
      isTranslated: true,
      is_pending: false,
    }
  }

  return null
}

export function useViewportTranslation({
  bookId,
  chapterId,
  lang,
  blocks,
  sourceLanguage,
  canTranslate,
  onBlocksTranslated,
}: UseViewportTranslationOptions) {
  const isMountedRef = useRef(true)
  const bookIdRef = useRef(bookId)
  bookIdRef.current = bookId
  const sourceLanguageRef = useRef(sourceLanguage)
  sourceLanguageRef.current = sourceLanguage
  const [isTranslatingAny, setIsTranslatingAny] = useState(false)
  // Expose pending block IDs as state for blur effect
  const [pendingBlockIds, setPendingBlockIds] = useState<Set<string>>(new Set())

  // Tracking sets (use refs to avoid re-renders)
  const translatedIds = useRef(new Set<string>())
  const pendingIds = useRef(new Set<string>())
  const inflightIds = useRef(new Set<string>())
  const isInflight = useRef(false)
  const isInflightHighPriority = useRef(false) // Track if current batch is high-priority

  // Queue for next batch while one is in-flight
  const queuedIds = useRef(new Set<string>())
  
  // High-priority queue for current page blocks (takes precedence)
  const highPriorityPendingIds = useRef(new Set<string>())
  const highPriorityQueuedIds = useRef(new Set<string>())

  // Recovery queue: after abort the server may still complete work; poll status and
  // persist finished translations to IndexedDB so work isn't wasted.
  // Key: `${chapterId}::${LANG}` -> blockId -> blockType
  const recoveryRef = useRef(new Map<string, Map<string, string>>())
  const recoveryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recoveryRetryAtRef = useRef(new Map<string, number>())
  const recoveryRetryCountRef = useRef(new Map<string, number>())
  const recoveryRetryInFlightRef = useRef(new Set<string>())
  const reconcileQueueRef = useRef(new Map<string, Set<string>>())
  const reconcileTimerRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const recentBlockTextFetchRef = useRef(new Map<string, number>())

  // Helper to sync pendingBlockIds state with current queues
  const updatePendingBlockIds = useCallback(() => {
    const allPending = new Set<string>([
      ...pendingIds.current,
      ...inflightIds.current,
      ...queuedIds.current,
      ...highPriorityPendingIds.current,
      ...highPriorityQueuedIds.current,
    ])
    if (isMountedRef.current) setPendingBlockIds(allPending)
  }, [])

  // Mark blocks as translated and remove them from every pending/queued/inflight set.
  // Call from any path that has just delivered a translation to the UI (streaming
  // callback, reconcile, recovery, retry) — without this, blocks stay in the pending
  // sets and the "Translating..." loader keeps rendering even though the text is ready.
  const markBlocksAsTranslated = useCallback((ids: string[]) => {
    if (ids.length === 0) return
    for (const id of ids) {
      translatedIds.current.add(id)
      inflightIds.current.delete(id)
      pendingIds.current.delete(id)
      queuedIds.current.delete(id)
      highPriorityPendingIds.current.delete(id)
      highPriorityQueuedIds.current.delete(id)
    }
    updatePendingBlockIds()
  }, [updatePendingBlockIds])

  const getRecentFetchKey = useCallback((requestChapterId: string, requestLang: string, blockId: string) => {
    return `${requestChapterId}::${requestLang.toUpperCase()}::${blockId}`
  }, [])

  const getRecoveryRetryKey = useCallback((requestChapterId: string, requestLang: string, blockId: string) => {
    return `${requestChapterId}::${requestLang.toUpperCase()}::${blockId}`
  }, [])

  const wasRecentlyChecked = useCallback((requestChapterId: string, requestLang: string, blockId: string) => {
    const key = getRecentFetchKey(requestChapterId, requestLang, blockId)
    const timestamp = recentBlockTextFetchRef.current.get(key)
    return timestamp !== undefined && Date.now() - timestamp < RECENT_BLOCK_TEXT_TTL_MS
  }, [getRecentFetchKey])

  const markRecentlyChecked = useCallback((requestChapterId: string, requestLang: string, ids: string[]) => {
    const now = Date.now()
    for (const blockId of ids) {
      recentBlockTextFetchRef.current.set(getRecentFetchKey(requestChapterId, requestLang, blockId), now)
    }
  }, [getRecentFetchKey])

  const pruneRecentChecked = useCallback(() => {
    const threshold = Date.now() - RECENT_BLOCK_TEXT_TTL_MS
    for (const [key, timestamp] of recentBlockTextFetchRef.current) {
      if (timestamp < threshold) {
        recentBlockTextFetchRef.current.delete(key)
      }
    }
  }, [])

  const wasRecoveryRetriedRecently = useCallback((requestChapterId: string, requestLang: string, blockId: string) => {
    const key = getRecoveryRetryKey(requestChapterId, requestLang, blockId)
    const timestamp = recoveryRetryAtRef.current.get(key)
    return timestamp !== undefined && Date.now() - timestamp < RECOVERY_RETRY_COOLDOWN_MS
  }, [getRecoveryRetryKey])

  const markRecoveryRetried = useCallback((requestChapterId: string, requestLang: string, ids: string[]) => {
    const now = Date.now()
    for (const blockId of ids) {
      const key = getRecoveryRetryKey(requestChapterId, requestLang, blockId)
      recoveryRetryAtRef.current.set(key, now)
      recoveryRetryCountRef.current.set(key, (recoveryRetryCountRef.current.get(key) ?? 0) + 1)
    }
  }, [getRecoveryRetryKey])

  const clearRecoveryRetryState = useCallback((requestChapterId: string, requestLang: string, ids: string[]) => {
    for (const blockId of ids) {
      const key = getRecoveryRetryKey(requestChapterId, requestLang, blockId)
      recoveryRetryAtRef.current.delete(key)
      recoveryRetryCountRef.current.delete(key)
    }
  }, [getRecoveryRetryKey])

  const hasExceededRecoveryRetries = useCallback((requestChapterId: string, requestLang: string, blockId: string) => {
    const key = getRecoveryRetryKey(requestChapterId, requestLang, blockId)
    return (recoveryRetryCountRef.current.get(key) ?? 0) >= RECOVERY_MAX_RETRIES
  }, [getRecoveryRetryKey])

  const pruneRecoveryRetryState = useCallback(() => {
    const threshold = Date.now() - RECOVERY_RETRY_COOLDOWN_MS
    for (const [key, timestamp] of recoveryRetryAtRef.current) {
      if (timestamp < threshold) {
        recoveryRetryAtRef.current.delete(key)
      }
    }
  }, [])

  // ── Translation session tracking ─────────────────────────────────────────
  // Session = same book + language. Spans multiple chapters and flushes.
  // Ends after SESSION_INACTIVITY_MS of no LLM activity, or on book/lang change.
  const SESSION_INACTIVITY_MS = 30 * 60 * 1000
  const sessionIdRef = useRef<string>(createSessionId())
  const sessionStartRef = useRef<number>(Date.now())
  const sessionLlmCallsRef = useRef(0)
  const sessionRequestCountRef = useRef(0)
  const sessionTokensInRef = useRef(0)
  const sessionTokensOutRef = useRef(0)
  const sessionCostRef = useRef(0)
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flushSession = useCallback(() => {
    if (sessionLlmCallsRef.current === 0) return
    const durationSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000)
    trackTranslationSessionSummary({
      session_id: sessionIdRef.current,
      book_id: bookIdRef.current,
      language: langRef.current,
      source_language: sourceLanguageRef.current,
      llm_calls: sessionLlmCallsRef.current,
      tokens_in: sessionTokensInRef.current,
      tokens_out: sessionTokensOutRef.current,
      estimated_cost: sessionCostRef.current,
      duration_seconds: durationSeconds,
      request_count: sessionRequestCountRef.current,
    })
  }, [])

  const resetSession = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = null
    }
    sessionIdRef.current = createSessionId()
    sessionStartRef.current = Date.now()
    sessionLlmCallsRef.current = 0
    sessionRequestCountRef.current = 0
    sessionTokensInRef.current = 0
    sessionTokensOutRef.current = 0
    sessionCostRef.current = 0
  }, [])

  // Flush + reset session when book or language changes (not on chapter change)
  useEffect(() => {
    return () => {
      flushSession()
      resetSession()
    }
  }, [bookId, lang, flushSession, resetSession])

  // Debounce timer
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // AbortController for the current in-flight translate request
  const abortControllerRef = useRef<AbortController | null>(null)

  // Refs for latest values (avoid stale closures)
  const chapterIdRef = useRef(chapterId)
  const langRef = useRef(lang)
  const blocksRef = useRef(blocks)
  const onBlocksTranslatedRef = useRef(onBlocksTranslated)
  const canTranslateRef = useRef(canTranslate)

  chapterIdRef.current = chapterId
  langRef.current = lang
  blocksRef.current = blocks
  onBlocksTranslatedRef.current = onBlocksTranslated
  canTranslateRef.current = canTranslate

  // Element refs map: blockId -> DOM element
  const elementRefs = useRef(new Map<string, HTMLElement>())

  // Observer ref
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Reset all tracking when lang or chapterId change.
  // IMPORTANT: do NOT depend on `blocks` here — `blocks` is `displayBlocks` which
  // gets a new reference on every single translation callback. Depending on it would
  // cause a reset→abort→re-enqueue cascade producing dozens of canceled API calls.
  // Pre-translated blocks are already handled by enqueueBlock() via hasTargetLangText().
  useEffect(() => {
    // Abort any in-flight request for the old context
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // Clear all tracking sets
    translatedIds.current.clear()
    pendingIds.current.clear()
    inflightIds.current.clear()
    queuedIds.current.clear()
    highPriorityPendingIds.current.clear()
    highPriorityQueuedIds.current.clear()
    isInflight.current = false
    isInflightHighPriority.current = false
    if (isMountedRef.current) {
      setIsTranslatingAny(false)
      setPendingBlockIds(new Set())
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
      debounceTimer.current = null
    }

    for (const timer of reconcileTimerRef.current.values()) {
      clearTimeout(timer)
    }
    reconcileTimerRef.current.clear()
    reconcileQueueRef.current.clear()
    recentBlockTextFetchRef.current.clear()
    pruneRecoveryRetryState()
  }, [lang, chapterId, pruneRecoveryRetryState])

  // Check if translation is needed (not source language)
  const isSourceLang = sourceLanguage
    ? sourceLanguage.toUpperCase() === lang.toUpperCase()
    : false

  // Flush pending IDs: send a streaming translation request
  // isHighPriority: if true, these are current-page blocks that need immediate translation
  const flushPending = useCallback(async (isHighPriority = false) => {
    if (!canTranslateRef.current) return
    const requestChapterId = chapterIdRef.current
    if (!requestChapterId) return
    
    // If ANY batch is in-flight and we have high-priority blocks, abort it
    // User has navigated to a new page - old translation is no longer immediately visible
    if (isInflight.current && isHighPriority) {
      console.log(JSON.stringify({ event: 'abort_inflight', reason: 'new_high_priority_request', wasHighPriority: isInflightHighPriority.current }))

      // Add old in-flight IDs to recovery: server may still finish them after disconnect.
      const requestLang = langRef.current
      if (requestLang && inflightIds.current.size > 0) {
        const key = `${requestChapterId}::${requestLang.toUpperCase()}`
        const map = recoveryRef.current.get(key) ?? new Map<string, string>()
        for (const id of inflightIds.current) {
          const block = blocksRef.current.find((b) => b.id === id)
          if (block?.type) map.set(id, block.type)
        }
        recoveryRef.current.set(key, map)
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      // Move in-flight IDs back to low-priority pending (they're for old pages)
      inflightIds.current.forEach((id) => pendingIds.current.add(id))
      inflightIds.current.clear()
      isInflight.current = false
      isInflightHighPriority.current = false
      
      // Move queued high-priority IDs to pending so they're processed NOW
      highPriorityQueuedIds.current.forEach((id) => highPriorityPendingIds.current.add(id))
      highPriorityQueuedIds.current.clear()
    }
    
    if (isInflight.current) return

    // Prioritize high-priority blocks over regular pending blocks
    const highPriorityPending = Array.from(highPriorityPendingIds.current)
    const regularPending = Array.from(pendingIds.current)
    
    // Combine with high-priority first
    const allPending = [...highPriorityPending, ...regularPending.filter(id => !highPriorityPendingIds.current.has(id))]
    if (allPending.length === 0) return

    // Take at most MAX_BATCH_SIZE, leave the rest pending
    const ids = allPending.slice(0, MAX_BATCH_SIZE)
    const overflow = allPending.slice(MAX_BATCH_SIZE)

    // Clear both queues and redistribute overflow
    highPriorityPendingIds.current.clear()
    pendingIds.current.clear()
    
    // Put overflow back - maintain priority
    const highPriorityOverflow = overflow.filter(id => highPriorityPending.includes(id))
    const regularOverflow = overflow.filter(id => !highPriorityPending.includes(id))
    highPriorityOverflow.forEach((id) => highPriorityPendingIds.current.add(id))
    regularOverflow.forEach((id) => pendingIds.current.add(id))
    
    ids.forEach((id) => inflightIds.current.add(id))
    isInflight.current = true
    isInflightHighPriority.current = highPriorityPending.length > 0
    if (isMountedRef.current) setIsTranslatingAny(true)
    updatePendingBlockIds()

    const controller = new AbortController()
    abortControllerRef.current = controller
    const requestLang = langRef.current
    const requestBlocksById = new Map(
      blocksRef.current.map((b) => [b.id, b] as const)
    )

    // Pass the first block id as anchor for future server-side prioritisation
    const anchorBlockId = ids[0] ?? null

    const flushStart = performance.now()
    let hits = 0, misses = 0, errors = 0
    let bookTranslationFiredThisFlush = false
    console.log(JSON.stringify({ event: 'flush_start', chapterId: requestChapterId, lang: requestLang, batchSize: ids.length, overflowSize: overflow.length }))

    try {
      await translateBlocksStreaming(
        requestChapterId,
        requestLang,
        ids,
        anchorBlockId,
        'down',
        (result: TranslatedBlockResult) => {
          // Each block resolves here as soon as the server emits it — one-by-one.
          // Clear from every queue, not just inflight — the same id may have been
          // re-queued (e.g. after a high-priority abort moved it back to pending).
          markBlocksAsTranslated([result.blockId])

          if (result.status === 'ok') {
            if (result.cache === 'hit') hits += 1
            else misses += 1
            // Fire book_translation_started once per book+lang (localStorage-deduped)
            if (!bookTranslationFiredThisFlush) {
              const lsKey = `ph_bts_${bookIdRef.current}_${requestLang}`
              if (typeof localStorage !== 'undefined' && !localStorage.getItem(lsKey)) {
                localStorage.setItem(lsKey, '1')
                bookTranslationFiredThisFlush = true
                trackBookTranslationStarted({
                  book_id: bookIdRef.current,
                  source_language: sourceLanguageRef.current,
                  target_language: requestLang,
                })
              }
            }
          } else {
            errors++
          }

          console.log(JSON.stringify({ event: 'block_received', blockId: result.blockId, cache: result.cache, status: result.status }))

          if (result.status === 'ok' && result.translatedText) {
            const original = requestBlocksById.get(result.blockId)
            if (original) {
              const translated = applyTranslation(original, result.translatedText)
              if (translated) {
                const sameRequestContext =
                  chapterIdRef.current === requestChapterId &&
                  langRef.current === requestLang
                if (isMountedRef.current && sameRequestContext) {
                  onBlocksTranslatedRef.current([translated])
                }
                void setCachedTranslatedBlockText(requestChapterId, requestLang, translated)
              }
            }
          }
        },
        controller.signal,
        (doneEvent) => {
          console.log(JSON.stringify(doneEvent))
          // Accumulate session-level LLM usage (session spans multiple chapters/flushes)
          if (doneEvent.llmCalls > 0) {
            sessionLlmCallsRef.current += doneEvent.llmCalls
            sessionRequestCountRef.current += 1
            sessionTokensInRef.current += doneEvent.tokensIn ?? 0
            sessionTokensOutRef.current += doneEvent.tokensOut ?? 0
            sessionCostRef.current += doneEvent.estimatedCost ?? 0
            // Reset 30-min inactivity timer
            if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
            inactivityTimerRef.current = setTimeout(() => {
              flushSession()
              resetSession()
            }, SESSION_INACTIVITY_MS)
          }
        },
      )
      abortControllerRef.current = null
    } catch (err) {
      abortControllerRef.current = null
      // On failure remove from inflight so blocks can be retried
      ids.forEach((id) => inflightIds.current.delete(id))
      if (!(err instanceof Error && err.name === 'AbortError')) {
        console.warn('[useViewportTranslation] Translation failed:', err)
      }
    } finally {
      isInflight.current = false
      isInflightHighPriority.current = false

      const durationMs = Math.round(performance.now() - flushStart)
      console.log(JSON.stringify({ event: 'flush_done', chapterId: requestChapterId, lang: requestLang, batchSize: ids.length, hits, misses, errors, durationMs }))
      if (hits + misses > 0) {
        trackTranslationBatch({
          book_id: bookIdRef.current,
          chapter_id: requestChapterId ?? '',
          language: requestLang,
          block_count: ids.length,
          cache_hits: hits,
          cache_misses: misses,
          duration_ms: durationMs,
        })
      }

      // Move queued IDs to pending (maintain priority)
      if (highPriorityQueuedIds.current.size > 0) {
        highPriorityQueuedIds.current.forEach((id) => highPriorityPendingIds.current.add(id))
        highPriorityQueuedIds.current.clear()
      }
      if (queuedIds.current.size > 0) {
        queuedIds.current.forEach((id) => pendingIds.current.add(id))
        queuedIds.current.clear()
      }

      // Flush next batch if there are remaining pending IDs (overflow or queued)
      // Prioritize high-priority blocks
      const hasHighPriority = highPriorityPendingIds.current.size > 0
      if (hasHighPriority || pendingIds.current.size > 0) {
        flushPending(hasHighPriority)
      } else {
        if (isMountedRef.current) setIsTranslatingAny(false)
      }
    }
  }, [markBlocksAsTranslated, updatePendingBlockIds, flushSession, resetSession, SESSION_INACTIVITY_MS])

  // Schedule a debounced flush
  const scheduleFlush = useCallback((isHighPriority = false) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    const debounceMs = isHighPriority ? DEBOUNCE_MS_IMMEDIATE : DEBOUNCE_MS
    if (debounceMs === 0) {
      // Immediate flush - pass correct priority flag
      debounceTimer.current = null
      flushPending(isHighPriority)
    } else {
      debounceTimer.current = setTimeout(() => {
        debounceTimer.current = null
        flushPending(isHighPriority)
      }, debounceMs)
    }
  }, [flushPending])

  const retryRecoveryMissing = useCallback(async (
    recoveryChapterId: string,
    recoveryLang: string,
    idToType: Map<string, string>,
    ids: string[],
  ) => {
    if (!recoveryChapterId || !recoveryLang || ids.length === 0) return

    pruneRecoveryRetryState()
    const queueKey = `${recoveryChapterId}::${recoveryLang.toUpperCase()}`
    if (recoveryRetryInFlightRef.current.has(queueKey)) return

    const retryIds = ids
      .filter((blockId) => idToType.has(blockId))
      .filter((blockId) => !wasRecoveryRetriedRecently(recoveryChapterId, recoveryLang, blockId))
      .slice(0, MAX_BATCH_SIZE)
    if (retryIds.length === 0) return

    recoveryRetryInFlightRef.current.add(queueKey)
    markRecoveryRetried(recoveryChapterId, recoveryLang, retryIds)

    try {
      const requestBlocksById = new Map(
        blocksRef.current.map((block) => [block.id, block] as const)
      )

      await translateBlocksStreaming(
        recoveryChapterId,
        recoveryLang,
        retryIds,
        retryIds[0] ?? null,
        'down',
        (result: TranslatedBlockResult) => {
          if (result.status !== 'ok' || !result.translatedText) return

          const fallbackType = idToType.get(result.blockId) as ContentBlock['type'] | undefined
          if (!fallbackType) return

          const original = requestBlocksById.get(result.blockId)
          const translated = original
            ? applyTranslation(original, result.translatedText)
            : buildRecoveredStreamBlock(result.blockId, fallbackType, result.translatedText)
          if (!translated) return

          idToType.delete(result.blockId)
          clearRecoveryRetryState(recoveryChapterId, recoveryLang, [result.blockId])
          void setCachedTranslatedBlockText(recoveryChapterId, recoveryLang, translated)

          const sameRequestContext =
            chapterIdRef.current === recoveryChapterId &&
            langRef.current === recoveryLang
          if (sameRequestContext && isMountedRef.current) {
            onBlocksTranslatedRef.current([translated])
            markBlocksAsTranslated([result.blockId])
          }
        },
      )
    } catch {
      // best-effort background retry
    } finally {
      recoveryRetryInFlightRef.current.delete(queueKey)
    }
  }, [clearRecoveryRetryState, markBlocksAsTranslated, markRecoveryRetried, pruneRecoveryRetryState, wasRecoveryRetriedRecently])

  const reconcileBlocks = useCallback(async (ids: string[]) => {
    if (!canTranslateRef.current) return
    const requestChapterId = chapterIdRef.current
    const requestLang = langRef.current
    if (!requestChapterId || !requestLang || ids.length === 0) return

    pruneRecentChecked()
    const uniqueIds = Array.from(new Set(ids)).filter((blockId) => {
      const block = blocksRef.current.find((b) => b.id === blockId)
      if (!block) return false
      if (SKIP_TYPES.has(block.type)) return false
      return !hasTargetLangText(block)
    })
    const idsToQueue = uniqueIds.filter((blockId) => !wasRecentlyChecked(requestChapterId, requestLang, blockId))
    if (idsToQueue.length === 0) return

    const queueKey = `${requestChapterId}::${requestLang.toUpperCase()}`
    const queuedIds = reconcileQueueRef.current.get(queueKey) ?? new Set<string>()
    idsToQueue.forEach((blockId) => queuedIds.add(blockId))
    reconcileQueueRef.current.set(queueKey, queuedIds)

    if (reconcileTimerRef.current.has(queueKey)) return

    const timer = setTimeout(async () => {
      reconcileTimerRef.current.delete(queueKey)
      const pendingQueue = reconcileQueueRef.current.get(queueKey)
      if (!pendingQueue || pendingQueue.size === 0) {
        reconcileQueueRef.current.delete(queueKey)
        return
      }

      const batchIds = Array.from(pendingQueue).filter((blockId) => {
        const block = blocksRef.current.find((candidate) => candidate.id === blockId)
        if (!block) return false
        if (SKIP_TYPES.has(block.type)) return false
        if (hasTargetLangText(block)) return false
        return !wasRecentlyChecked(requestChapterId, requestLang, blockId)
      })
      reconcileQueueRef.current.delete(queueKey)
      if (batchIds.length === 0) return

      markRecentlyChecked(requestChapterId, requestLang, batchIds)

      try {
        const res = await fetchBlockTexts(requestChapterId, requestLang, batchIds)
        const translated: ContentBlock[] = []
        const blocksById = new Map(blocksRef.current.map((block) => [block.id, block] as const))

        for (const payload of res.ok) {
          const original = blocksById.get(payload.blockId)
          if (!original) continue
          const merged =
            payload.type === 'list'
              ? applyTranslation(original, payload.items.join('\n'))
              : applyTranslation(original, payload.text)
          if (!merged) continue
          translated.push(merged)
          void setCachedTranslatedBlockText(requestChapterId, requestLang, merged)
        }

        const sameRequestContext =
          chapterIdRef.current === requestChapterId &&
          langRef.current === requestLang
        if (sameRequestContext && translated.length > 0 && isMountedRef.current) {
          onBlocksTranslatedRef.current(translated)
          markBlocksAsTranslated(translated.map((block) => block.id))
        }
      } catch {
        // best-effort reconcile
      }
    }, RECONCILE_COALESCE_MS)

    reconcileTimerRef.current.set(queueKey, timer)
  }, [markBlocksAsTranslated, markRecentlyChecked, pruneRecentChecked, wasRecentlyChecked])

  // Enqueue a single block for translation.
  // triggerFlush: when false, caller is responsible for calling scheduleFlush after
  // batching multiple blocks. This avoids an abort cascade where each block in a
  // loop aborts the in-flight batch started by the previous block.
  const enqueueBlock = useCallback(
    (blockId: string, isHighPriority = false, triggerFlush = true): boolean => {
      if (!canTranslateRef.current) return false
      // Skip if already handled
      if (
        translatedIds.current.has(blockId) ||
        inflightIds.current.has(blockId)
      ) {
        return false
      }

      // Skip if block is already translated (from content endpoint or IndexedDB cache)
      const block = blocksRef.current.find((b) => b.id === blockId)
      if (block && hasTargetLangText(block)) {
        translatedIds.current.add(blockId)
        // User is viewing a translated block — fire book_translation_started if not yet recorded
        const currentLang = langRef.current
        const lsKey = `ph_bts_${bookIdRef.current}_${currentLang}`
        if (typeof localStorage !== 'undefined' && !localStorage.getItem(lsKey)) {
          localStorage.setItem(lsKey, '1')
          trackBookTranslationStarted({
            book_id: bookIdRef.current,
            source_language: sourceLanguageRef.current,
            target_language: currentLang,
          })
        }
        return false
      }

      // Skip if already in any queue (but allow upgrade to high priority)
      const inHighPending = highPriorityPendingIds.current.has(blockId)
      const inHighQueued = highPriorityQueuedIds.current.has(blockId)
      const inPending = pendingIds.current.has(blockId) || inHighPending
      const inQueued = queuedIds.current.has(blockId) || inHighQueued

      if (isHighPriority) {
        // Already in high-priority queue — no-op
        if (inHighPending || inHighQueued) return false
        // Upgrade: remove from low-priority queues if present
        pendingIds.current.delete(blockId)
        queuedIds.current.delete(blockId)
      } else if (inPending || inQueued) {
        // Already queued, skip
        return false
      }

      if (isInflight.current) {
        // Queue for next batch
        if (isHighPriority) {
          highPriorityQueuedIds.current.add(blockId)
        } else {
          queuedIds.current.add(blockId)
        }
      } else {
        if (isHighPriority) {
          highPriorityPendingIds.current.add(blockId)
        } else {
          pendingIds.current.add(blockId)
        }
      }

      if (triggerFlush) scheduleFlush(isHighPriority)
      updatePendingBlockIds()
      return true
    },
    [scheduleFlush, updatePendingBlockIds]
  )

  // Set up IntersectionObserver
  useEffect(() => {
    if (isSourceLang || !chapterId || !canTranslate) {
      // No translation needed — clean up observer
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
      return
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        let enqueued = false
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            const blockId = el.dataset.blockId
            const blockType = el.dataset.blockType
            if (blockId && !SKIP_TYPES.has(blockType || '')) {
              if (enqueueBlock(blockId, false, false)) enqueued = true
            }
          }
        }
        if (enqueued) scheduleFlush(false)
      },
      { rootMargin: ROOT_MARGIN }
    )

    // Observe all currently registered elements
    elementRefs.current.forEach((el) => {
      observerRef.current!.observe(el)
    })

    return () => {
      observerRef.current?.disconnect()
      observerRef.current = null
    }
  }, [isSourceLang, chapterId, lang, enqueueBlock, scheduleFlush, canTranslate])

  // Ref callback for each block element
  const getRefCallback = useCallback(
    (blockId: string, blockType: string) => (el: HTMLElement | null) => {
      if (el) {
        el.dataset.blockId = blockId
        el.dataset.blockType = blockType
        elementRefs.current.set(blockId, el)
        if (observerRef.current) {
          observerRef.current.observe(el)
        }
      } else {
        const existing = elementRefs.current.get(blockId)
        if (existing && observerRef.current) {
          observerRef.current.unobserve(existing)
        }
        elementRefs.current.delete(blockId)
      }
    },
    []
  )

  // Abort all in-flight and queued prefetch requests.
  // Called by navigateTo on any non-manual_scroll jump.
  const abortAll = useCallback(() => {
    // Best-effort: add everything currently queued to recovery.
    const requestChapterId = chapterIdRef.current
    const requestLang = langRef.current
    if (requestChapterId && requestLang) {
      const key = `${requestChapterId}::${requestLang.toUpperCase()}`
      const map = recoveryRef.current.get(key) ?? new Map<string, string>()
      const all = new Set<string>([
        ...pendingIds.current,
        ...queuedIds.current,
        ...highPriorityPendingIds.current,
        ...highPriorityQueuedIds.current,
        ...inflightIds.current,
      ])
      if (all.size > 0) {
        for (const id of all) {
          const block = blocksRef.current.find((b) => b.id === id)
          if (block?.type) map.set(id, block.type)
        }
        recoveryRef.current.set(key, map)
      }
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    pendingIds.current.clear()
    queuedIds.current.clear()
    highPriorityPendingIds.current.clear()
    highPriorityQueuedIds.current.clear()
    inflightIds.current.clear()
    isInflight.current = false
    isInflightHighPriority.current = false
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
      debounceTimer.current = null
    }
    if (isMountedRef.current) {
      setIsTranslatingAny(false)
      setPendingBlockIds(new Set())
    }
  }, [])

  // Background recovery loop: pull finished translations and persist to IDB.
  useEffect(() => {
    if (recoveryTimerRef.current) return

    recoveryTimerRef.current = setInterval(async () => {
      if (!canTranslateRef.current) return
      if (recoveryRef.current.size === 0) return

      for (const [key, idToType] of recoveryRef.current) {
        if (idToType.size === 0) {
          recoveryRef.current.delete(key)
          continue
        }

        const [recoveryChapterId, recoveryLangRaw] = key.split('::')
        const recoveryLang = recoveryLangRaw || ''
        if (!recoveryChapterId || !recoveryLang) {
          recoveryRef.current.delete(key)
          continue
        }

        pruneRecentChecked()
        const ids = Array.from(idToType.keys())
          .filter((blockId) => !wasRecentlyChecked(recoveryChapterId, recoveryLang, blockId))
          .slice(0, RECOVERY_BATCH_SIZE)
        if (ids.length === 0) continue
        markRecentlyChecked(recoveryChapterId, recoveryLang, ids)

        try {
          const res = await fetchBlockTexts(recoveryChapterId, recoveryLang, ids)
          const sameContext =
            chapterIdRef.current === recoveryChapterId &&
            langRef.current.toUpperCase() === recoveryLang.toUpperCase()
          const blocksById = sameContext
            ? new Map(blocksRef.current.map((block) => [block.id, block] as const))
            : null
          const uiUpdates: ContentBlock[] = []
          for (const payload of res.ok) {
            const type = idToType.get(payload.blockId)
            if (!type) continue
            const translatedBlock = buildRecoveredTranslatedBlock(payload, type as ContentBlock['type'])
            void setCachedTranslatedBlockText(recoveryChapterId, recoveryLang, translatedBlock)
            // If the user is still on this chapter+lang, push the translation
            // through to the UI so the loader stops rendering. Without this,
            // the recovery loop would only persist to IDB while the on-screen
            // block stays stuck behind the "Translating..." overlay.
            if (blocksById) {
              const original = blocksById.get(payload.blockId)
              const merged = original
                ? applyTranslation(
                    original,
                    payload.type === 'list' ? payload.items.join('\n') : payload.text,
                  )
                : null
              if (merged) uiUpdates.push(merged)
            }
            idToType.delete(payload.blockId)
            clearRecoveryRetryState(recoveryChapterId, recoveryLang, [payload.blockId])
          }
          if (uiUpdates.length > 0 && isMountedRef.current) {
            onBlocksTranslatedRef.current(uiUpdates)
            markBlocksAsTranslated(uiUpdates.map((block) => block.id))
          }
          for (const blockId of res.missing) {
            if (hasExceededRecoveryRetries(recoveryChapterId, recoveryLang, blockId)) {
              idToType.delete(blockId)
              clearRecoveryRetryState(recoveryChapterId, recoveryLang, [blockId])
            }
          }
          if (res.missing.length > 0) {
            void retryRecoveryMissing(recoveryChapterId, recoveryLang, idToType, res.missing)
          }
          if (idToType.size === 0) recoveryRef.current.delete(key)
        } catch {
          // ignore and retry later
        }
      }
    }, RECOVERY_POLL_MS)

    return () => {
      if (recoveryTimerRef.current) clearInterval(recoveryTimerRef.current)
      recoveryTimerRef.current = null
    }
  }, [clearRecoveryRetryState, hasExceededRecoveryRetries, markBlocksAsTranslated, markRecentlyChecked, pruneRecentChecked, retryRecoveryMissing, wasRecentlyChecked])

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    const reconcileTimers = reconcileTimerRef.current
    const reconcileQueues = reconcileQueueRef.current
    return () => {
      isMountedRef.current = false
      flushSession()
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
      if (recoveryTimerRef.current) {
        clearInterval(recoveryTimerRef.current)
        recoveryTimerRef.current = null
      }
      for (const timer of reconcileTimers.values()) {
        clearTimeout(timer)
      }
      reconcileTimers.clear()
      reconcileQueues.clear()
      // Intentionally keep in-flight request alive across reader unmount,
      // so translated blocks can still be persisted to IndexedDB.
      observerRef.current?.disconnect()
    }
  }, [flushSession])

  // Enqueue a set of block IDs for prefetch translation (e.g. next page) - LOW PRIORITY
  // All blocks are added to the queue first, then a single flush is triggered.
  const enqueueBlocks = useCallback((ids: string[]) => {
    let newCount = 0
    for (const id of ids) {
      if (enqueueBlock(id, false, false)) newCount++
    }
    // Single flush after all blocks are queued
    if (newCount > 0) {
      scheduleFlush(false)
    }
    if (ids.length > 0) {
      console.log(JSON.stringify({ event: 'enqueue_blocks', chapterId: chapterIdRef.current, lang: langRef.current, requested: ids.length, newlyEnqueued: newCount, alreadyHandled: ids.length - newCount, priority: 'low' }))
    }
  }, [enqueueBlock, scheduleFlush])

  // Enqueue a set of block IDs for IMMEDIATE translation (current page) - HIGH PRIORITY
  // All blocks are added to the queue first, then a single flush is triggered.
  // This avoids the abort cascade where each block aborts the batch started by the previous one.
  const enqueueBlocksImmediate = useCallback((ids: string[]) => {
    let newCount = 0
    for (const id of ids) {
      if (enqueueBlock(id, true, false)) newCount++
    }
    // Single flush after all blocks are queued — at most one abort of a prior in-flight batch
    if (newCount > 0) {
      scheduleFlush(true)
    }
    if (ids.length > 0) {
      console.log(JSON.stringify({ event: 'enqueue_blocks_immediate', chapterId: chapterIdRef.current, lang: langRef.current, requested: ids.length, newlyEnqueued: newCount, alreadyHandled: ids.length - newCount, priority: 'high' }))
    }
  }, [enqueueBlock, scheduleFlush])

  return { getRefCallback, isTranslatingAny, abortAll, enqueueBlocks, enqueueBlocksImmediate, pendingBlockIds, reconcileBlocks }
}
