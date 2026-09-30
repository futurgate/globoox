'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ContentBlock, fetchBlockTexts, TranslatedBlockResult, translateBlocksStreaming } from '@/lib/api'
import { carryBlockEmphasis } from '@/lib/inlineMarks'
import { trackTranslationBatch, trackTranslationSessionSummary, trackBookTranslationStarted } from '@/lib/posthog'
import { setCachedTranslatedBlockText } from '@/lib/contentCache'
import { hasTargetLangText } from '@/lib/translationState'
import { runTranslationRequest } from '@/lib/translationRequest'

interface UseViewportTranslationOptions {
  bookId: string
  accountScopeKey?: string
  chapterId: string | null
  lang: string
  blocks: ContentBlock[]
  sourceBlocks?: ContentBlock[]
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
const RECOVERY_MAX_WAIT_MS = 120000
const STREAM_TIMEOUT_MS = 60000
const STATUS_TIMEOUT_MS = 10000
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

export function useViewportTranslation({
  bookId,
  accountScopeKey = 'guest',
  chapterId,
  lang,
  blocks,
  sourceBlocks,
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
  const [failedBlockIds, setFailedBlockIds] = useState<Set<string>>(new Set())
  const [refreshRequiredBlockIds, setRefreshRequiredBlockIds] = useState<Set<string>>(new Set())
  const sourceBlocksRef = useRef(sourceBlocks)
  sourceBlocksRef.current = sourceBlocks
  const currentBlock = useCallback((id: string) => {
    const accepted = sourceBlocksRef.current
    if (accepted && !accepted.some(block => block.id === id)) return undefined
    return blocksRef.current.find(block => block.id === id)
  }, [])
  const isAlreadyReady = useCallback((id: string) => {
    const accepted = sourceBlocksRef.current?.find(block => block.id === id)
    return !!(accepted && hasTargetLangText(accepted)) || !!(currentBlock(id) && hasTargetLangText(currentBlock(id)!))
  }, [currentBlock])
  const failedIds = useRef(new Map<string, { reason?: string; retryable?: boolean }>())
  // Change ownership during render, before effect cleanup: an old callback must
  // not become current again after A → B → A or an account switch.
  const contextKey = JSON.stringify([accountScopeKey, bookId, chapterId, lang.toUpperCase()])
  const contextRef = useRef({ key: contextKey, generation: 0 })
  if (contextRef.current.key !== contextKey) {
    contextRef.current = { key: contextKey, generation: contextRef.current.generation + 1 }
  }
  const isCurrentContext = useCallback((generation: number) => (
    isMountedRef.current && contextRef.current.generation === generation
  ), [])

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
  const recoveryStartedAtRef = useRef(new Map<string, number>())
  const recoveryPollInFlightRef = useRef(false)
  const statusControllersRef = useRef(new Set<AbortController>())
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
      ...Array.from(recoveryRef.current.values()).flatMap(ids => Array.from(ids.keys())),
    ])
    if (isMountedRef.current) setPendingBlockIds(allPending)
  }, [])

  const updateFailures = useCallback(() => {
    if (!isMountedRef.current) return
    setFailedBlockIds(new Set(failedIds.current.keys()))
    setRefreshRequiredBlockIds(new Set(Array.from(failedIds.current).filter(([, failure]) => failure.retryable === false).map(([id]) => id)))
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
      failedIds.current.delete(id)
      for (const recovery of recoveryRef.current.values()) recovery.delete(id)
    }
    updatePendingBlockIds()
    updateFailures()
  }, [updatePendingBlockIds, updateFailures])

  const recoverFailedBlocks = useCallback((ids: string[], failures = new Map<string, { reason?: string; retryable?: boolean }>()) => {
    const key = `${chapterIdRef.current}::${langRef.current.toUpperCase()}`
    const recovery = recoveryRef.current.get(key) ?? new Map<string, string>()
    for (const id of ids) {
      inflightIds.current.delete(id)
      pendingIds.current.delete(id)
      queuedIds.current.delete(id)
      highPriorityPendingIds.current.delete(id)
      highPriorityQueuedIds.current.delete(id)
      if (translatedIds.current.has(id)) continue
      const block = currentBlock(id)
      if (!block || SKIP_TYPES.has(block.type)) continue
      if (isAlreadyReady(id)) {
        markBlocksAsTranslated([id])
        continue
      }
      const failure = failures.get(id) ?? {}
      const retryKey = `${key}::${id}`
      if (!recoveryStartedAtRef.current.has(retryKey)) recoveryStartedAtRef.current.set(retryKey, Date.now())
      if (failure.retryable === false || (recoveryRetryCountRef.current.get(retryKey) ?? 0) >= RECOVERY_MAX_RETRIES) {
        recovery.delete(id)
        failedIds.current.set(id, failure)
      } else {
        recovery.set(id, block.type)
        // Initial failure and every failed attempt receive the same cooldown.
        recoveryRetryAtRef.current.set(retryKey, Date.now())
      }
    }
    if (recovery.size) recoveryRef.current.set(key, recovery)
    else recoveryRef.current.delete(key)
    updatePendingBlockIds()
    updateFailures()
  }, [currentBlock, isAlreadyReady, markBlocksAsTranslated, updateFailures, updatePendingBlockIds])

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
      recoveryStartedAtRef.current.delete(key)
    }
  }, [getRecoveryRetryKey])

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
    recoveryRef.current.clear()
    recoveryRetryAtRef.current.clear()
    recoveryRetryCountRef.current.clear()
    recoveryStartedAtRef.current.clear()
    for (const controller of statusControllersRef.current) controller.abort()
    statusControllersRef.current.clear()
    recoveryPollInFlightRef.current = false
    failedIds.current.clear()
    updateFailures()
  }, [contextKey, updateFailures])

  // A replacement snapshot can make failed work ready or retire its IDs. This
  // cleanup is independent of the stream owner and never restarts paid work.
  useEffect(() => {
    if (!sourceBlocks) return
    const accepted = new Map(sourceBlocks.map(block => [block.id, block]))
    const tracked = new Set([...failedIds.current.keys(), ...pendingIds.current, ...inflightIds.current,
      ...queuedIds.current, ...highPriorityPendingIds.current, ...highPriorityQueuedIds.current,
      ...Array.from(recoveryRef.current.values()).flatMap(ids => Array.from(ids.keys()))])
    const ready: string[] = []
    let removed = false
    for (const id of tracked) {
      const block = accepted.get(id)
      if (block && hasTargetLangText(block)) ready.push(id)
      if (block) continue
      removed = true
      failedIds.current.delete(id)
      pendingIds.current.delete(id)
      inflightIds.current.delete(id)
      queuedIds.current.delete(id)
      highPriorityPendingIds.current.delete(id)
      highPriorityQueuedIds.current.delete(id)
      for (const recovery of recoveryRef.current.values()) recovery.delete(id)
    }
    if (ready.length) markBlocksAsTranslated(ready)
    else if (removed) { updateFailures(); updatePendingBlockIds() }
  }, [sourceBlocks, markBlocksAsTranslated, updateFailures, updatePendingBlockIds])

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
      // First reconcile aborted work: the server may still finish it.
      recoverFailedBlocks(Array.from(inflightIds.current))
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
      .filter(id => !!currentBlock(id) && !isAlreadyReady(id))
    if (allPending.length === 0) {
      highPriorityPendingIds.current.clear()
      pendingIds.current.clear()
      updatePendingBlockIds()
      return
    }

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
    const generation = contextRef.current.generation
    const ownsRequest = () => isCurrentContext(generation) && abortControllerRef.current === controller
    const successfulIds = new Set<string>()
    const failures = new Map<string, { reason?: string; retryable?: boolean }>()
    // Pass the first block id as anchor for future server-side prioritisation
    const anchorBlockId = ids[0] ?? null

    const flushStart = performance.now()
    let hits = 0, misses = 0, errors = 0
    let bookTranslationFiredThisFlush = false
    console.log(JSON.stringify({ event: 'flush_start', chapterId: requestChapterId, lang: requestLang, batchSize: ids.length, overflowSize: overflow.length }))

    try {
      await runTranslationRequest(() => translateBlocksStreaming(
        requestChapterId,
        requestLang,
        ids,
        anchorBlockId,
        'down',
        (result: TranslatedBlockResult) => {
          if (!ownsRequest() || controller.signal.aborted || !ids.includes(result.blockId) || successfulIds.has(result.blockId)) return
          const original = currentBlock(result.blockId)
          if (!original) return
          if (isAlreadyReady(result.blockId)) {
            successfulIds.add(result.blockId)
            markBlocksAsTranslated([result.blockId])
            return
          }
          const translated = result.status === 'ok' && result.translatedText.trim() && original
            ? applyTranslation(original, result.translatedText) : null
          if (!translated) {
            failures.set(result.blockId, { reason: result.reason, retryable: result.retryable })
            errors++
            return
          }
          successfulIds.add(result.blockId)
          failures.delete(result.blockId)
          markBlocksAsTranslated([result.blockId])
          onBlocksTranslatedRef.current([translated])
          void setCachedTranslatedBlockText(requestChapterId, requestLang, translated)

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

        },
        controller.signal,
        (doneEvent) => {
          if (!ownsRequest() || controller.signal.aborted) return
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
      ), controller, STREAM_TIMEOUT_MS)
    } catch (err) {
      if (!ownsRequest()) return
      if (!(err instanceof Error && err.name === 'AbortError')) {
        console.warn('[useViewportTranslation] Translation failed:', err)
      }
    } finally {
      // A canceled old request must never clear a newer request's controller,
      // pending IDs or busy state (including when it finishes after navigation).
      if (!ownsRequest()) return
      abortControllerRef.current = null
      recoverFailedBlocks(ids.filter(id => !successfulIds.has(id)), failures)
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
  }, [currentBlock, isAlreadyReady, isCurrentContext, markBlocksAsTranslated, recoverFailedBlocks, updatePendingBlockIds, flushSession, resetSession, SESSION_INACTIVITY_MS])

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

  // A source snapshot can briefly gate enqueue while displayBlocks binds to it.
  // Keep the existing owner/stream, and resume queued work once binding is ready.
  useEffect(() => {
    if (canTranslate) scheduleFlush(false)
  }, [canTranslate, scheduleFlush])

  const retryRecoveryMissing = useCallback((
    recoveryChapterId: string,
    recoveryLang: string,
    idToType: Map<string, string>,
    ids: string[],
  ) => {
    if (!canTranslateRef.current || isInflight.current) return
    if (chapterIdRef.current !== recoveryChapterId || langRef.current.toUpperCase() !== recoveryLang.toUpperCase()) return
    const retryIds = ids.filter(id => idToType.has(id) && !failedIds.current.has(id) && !!currentBlock(id) && !isAlreadyReady(id))
      .filter(id => !wasRecoveryRetriedRecently(recoveryChapterId, recoveryLang, id))
      .slice(0, MAX_BATCH_SIZE)
    if (!retryIds.length) return
    markRecoveryRetried(recoveryChapterId, recoveryLang, retryIds)
    for (const id of retryIds) {
      idToType.delete(id)
      pendingIds.current.add(id)
    }
    // Share the foreground queue and controller; recovery must not start a
    // competing stream for the same block.
    scheduleFlush(false)
  }, [currentBlock, isAlreadyReady, markRecoveryRetried, scheduleFlush, wasRecoveryRetriedRecently])

  const readBlockTexts = useCallback(async (requestChapter: string, requestLang: string, ids: string[]) => {
    const controller = new AbortController()
    statusControllersRef.current.add(controller)
    try {
      return await runTranslationRequest(signal => fetchBlockTexts(requestChapter, requestLang, ids, signal), controller, STATUS_TIMEOUT_MS)
    } finally {
      statusControllersRef.current.delete(controller)
    }
  }, [])

  const reconcileBlocks = useCallback(async (ids: string[]) => {
    if (!canTranslateRef.current) return
    const requestChapterId = chapterIdRef.current
    const requestLang = langRef.current
    if (!requestChapterId || !requestLang || ids.length === 0) return

    const generation = contextRef.current.generation
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
      if (!isCurrentContext(generation)) return
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
        const res = await readBlockTexts(requestChapterId, requestLang, batchIds)
        if (!isCurrentContext(generation)) return
        const translated: ContentBlock[] = []
        const blocksById = new Map(blocksRef.current.map((block) => [block.id, block] as const))

        for (const payload of res.ok) {
          const original = blocksById.get(payload.blockId)
          if (!original || !currentBlock(payload.blockId) || isAlreadyReady(payload.blockId) || !batchIds.includes(payload.blockId)) continue
          if (!(payload.type === 'list' ? payload.items.join('\n') : payload.text).trim()) continue
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
  }, [currentBlock, isAlreadyReady, isCurrentContext, markBlocksAsTranslated, markRecentlyChecked, pruneRecentChecked, readBlockTexts, wasRecentlyChecked])

  // Enqueue a single block for translation.
  // triggerFlush: when false, caller is responsible for calling scheduleFlush after
  // batching multiple blocks. This avoids an abort cascade where each block in a
  // loop aborts the in-flight batch started by the previous block.
  const enqueueBlock = useCallback(
    (blockId: string, isHighPriority = false, triggerFlush = true): boolean => {
      if (!canTranslateRef.current || !isMountedRef.current) return false
      // This queue belongs to one chapter. Cross-chapter warmup has its own
      // request; never route IDs from a neighboring chapter through this one.
      const block = currentBlock(blockId)
      if (!block || SKIP_TYPES.has(block.type)) return false
      if (failedIds.current.has(blockId)) return false
      if (Array.from(recoveryRef.current.values()).some(ids => ids.has(blockId))) return false
      // Skip if already handled
      if (
        translatedIds.current.has(blockId) ||
        inflightIds.current.has(blockId)
      ) {
        return false
      }

      // Skip if block is already translated (from content endpoint or IndexedDB cache)
      if (isAlreadyReady(blockId)) {
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
    [currentBlock, isAlreadyReady, scheduleFlush, updatePendingBlockIds]
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
    // Only requests already sent can have server-side work to recover.
    recoverFailedBlocks(Array.from(inflightIds.current))

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
  }, [recoverFailedBlocks])

  // Reconcile failed/disconnected work before spending another model request.
  // One check at a time; exhausted blocks leave this loop until manual Retry.
  useEffect(() => {
    recoveryTimerRef.current = setInterval(async () => {
      if (!canTranslateRef.current || !isMountedRef.current || recoveryPollInFlightRef.current) return
      if (!recoveryRef.current.size) return
      const generation = contextRef.current.generation
      recoveryPollInFlightRef.current = true
      try {
        for (const [key, idToType] of recoveryRef.current) {
          if (!isCurrentContext(generation)) return
          if (!idToType.size) { recoveryRef.current.delete(key); continue }
          const [recoveryChapterId, recoveryLang] = key.split('::')
          for (const id of idToType.keys()) {
            if (!currentBlock(id) || isAlreadyReady(id)) {
              idToType.delete(id)
              continue
            }
            const started = recoveryStartedAtRef.current.get(`${key}::${id}`)
            if (started !== undefined && Date.now() - started >= RECOVERY_MAX_WAIT_MS) {
              idToType.delete(id)
              failedIds.current.set(id, { reason: 'recovery_timeout' })
            }
          }
          updateFailures()
          updatePendingBlockIds()
          const ids = Array.from(idToType.keys()).filter(id => !wasRecentlyChecked(recoveryChapterId, recoveryLang, id)).slice(0, RECOVERY_BATCH_SIZE)
          if (!ids.length) continue
          markRecentlyChecked(recoveryChapterId, recoveryLang, ids)
          let missing = ids
          try {
            const res = await readBlockTexts(recoveryChapterId, recoveryLang, ids)
            if (!isCurrentContext(generation)) return
            const updates: ContentBlock[] = []
            for (const payload of res.ok) {
              if (!ids.includes(payload.blockId)) continue
              const original = currentBlock(payload.blockId)
              if (isAlreadyReady(payload.blockId)) { idToType.delete(payload.blockId); continue }
              const text = payload.type === 'list' ? payload.items.join('\n') : payload.text
              if (!original || !text.trim()) continue
              const translated = applyTranslation(original, text)
              if (!translated) continue
              updates.push(translated)
              void setCachedTranslatedBlockText(recoveryChapterId, recoveryLang, translated)
              clearRecoveryRetryState(recoveryChapterId, recoveryLang, [payload.blockId])
            }
            if (updates.length) {
              onBlocksTranslatedRef.current(updates)
              markBlocksAsTranslated(updates.map(block => block.id))
            }
            missing = res.missing
          } catch {
            if (!isCurrentContext(generation)) return
            // A failed status read still uses the same retry cooldown and cap.
          }
          retryRecoveryMissing(recoveryChapterId, recoveryLang, idToType, missing)
          if (!idToType.size) recoveryRef.current.delete(key)
        }
      } finally {
        if (isCurrentContext(generation)) recoveryPollInFlightRef.current = false
      }
    }, RECOVERY_POLL_MS)
    return () => {
      if (recoveryTimerRef.current) clearInterval(recoveryTimerRef.current)
      recoveryTimerRef.current = null
    }
  }, [clearRecoveryRetryState, currentBlock, isAlreadyReady, isCurrentContext, markBlocksAsTranslated, markRecentlyChecked, readBlockTexts, retryRecoveryMissing, updateFailures, updatePendingBlockIds, wasRecentlyChecked])

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    const reconcileTimers = reconcileTimerRef.current
    const reconcileQueues = reconcileQueueRef.current
    const statusControllers = statusControllersRef.current
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
      contextRef.current.generation += 1
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
      for (const controller of statusControllers) controller.abort()
      statusControllers.clear()
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

  const resetFailedBlocks = useCallback((ids?: string[]) => {
    const retryIds = (ids ?? Array.from(failedIds.current.keys())).filter(id => failedIds.current.has(id))
    for (const id of retryIds) {
      failedIds.current.delete(id)
      clearRecoveryRetryState(chapterIdRef.current ?? '', langRef.current, [id])
    }
    updateFailures()
    return retryIds
  }, [clearRecoveryRetryState, updateFailures])

  const retryFailedBlocks = useCallback((ids?: string[]) => {
    const retryIds = resetFailedBlocks(ids)
    enqueueBlocksImmediate(retryIds)
  }, [enqueueBlocksImmediate, resetFailedBlocks])

  return { getRefCallback, isTranslatingAny, abortAll, enqueueBlocks, enqueueBlocksImmediate, pendingBlockIds, reconcileBlocks,
    failedBlockIds, refreshRequiredBlockIds, retryFailedBlocks, resetFailedBlocks }
}
