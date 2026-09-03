import { trackApiRequest, trackTranslateStreamClient } from './posthog'
import { setCachedBookMeta } from './contentCache'

// In browser we must call local Next.js API routes (/api/*), so auth can be injected by proxy.
// Direct backend calls are allowed only during server-side execution.
// Browser: '' (empty) → calls /api/* routes which proxy to backend
// Server: API_URL or NEXT_PUBLIC_API_URL → direct backend calls (for SSR/SSG)
const API_URL = typeof window === 'undefined' ? (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || '') : ''

export interface ApiBook {
  id: string
  title: string
  author: string | null
  cover_url: string | null
  original_language: string | null
  available_languages: string[]
  selected_language?: string | null
  status: string
  created_at: string
  is_own?: boolean
}

// Simple in-memory cache for book metadata to avoid spinners during in-app navigation.
const bookByIdCache = new Map<string, ApiBook>()

export function getCachedBookById(id: string): ApiBook | undefined {
  return bookByIdCache.get(id)
}

export interface ApiChapter {
  id: string
  book_id: string
  index: number
  title: string
  translations?: Record<string, string>
  depth: number
  parent_id: string | null
  first_block_id: string | null
  created_at: string
}

interface BaseBlock {
  id: string
  position: number
  parentId?: string
  partIndex?: number
  isFirstPart?: boolean
  isLastPart?: boolean
  targetLangReady?: boolean
  isTranslated?: boolean // True if block already has translation for requested language
  is_pending?: boolean // True if translation is pending on the server
}

export interface ParagraphBlock extends BaseBlock {
  type: 'paragraph'
  text: string
}

export interface HeadingBlock extends BaseBlock {
  type: 'heading'
  level: 1 | 2 | 3 | 4 | 5 | 6
  text: string
}

export interface QuoteBlock extends BaseBlock {
  type: 'quote'
  text: string
}

export interface ListBlock extends BaseBlock {
  type: 'list'
  ordered: boolean
  items: string[]
}

export interface ImageBlock extends BaseBlock {
  type: 'image'
  src: string
  alt: string
  caption?: string
}

export interface HrBlock extends BaseBlock {
  type: 'hr'
}

export type ContentBlock =
  | ParagraphBlock
  | HeadingBlock
  | QuoteBlock
  | ListBlock
  | ImageBlock
  | HrBlock

export interface TranslateRequest {
  lang: string
  blockIds: string[]
  anchorBlockId?: string | null
  direction?: 'up' | 'down'
}

export interface TranslatedBlockResult {
  blockId: string
  status: 'ok' | 'error'
  cache: 'hit' | 'miss'
  translatedText: string
}

export interface TranslateDoneEvent {
  event: 'translate_done'
  chapterId: string
  lang: string
  hits: number
  misses: number
  errors: number
  llmCalls: number
  totalDurationMs: number
  tokensIn: number
  tokensOut: number
  retries: number
  fallbacks: number
  totalTokens: number
  totalBlocks: number
  cacheHitRate: number
  errorRate: number
  estimatedCost: number
}

function normalizeContentBlock(block: ContentBlock): ContentBlock {
  if (block.type === 'image' || block.type === 'hr') {
    return {
      ...block,
      targetLangReady: true,
      isTranslated: true,
      is_pending: false,
    }
  }

  const targetLangReady = block.targetLangReady ?? (block.isTranslated === true)
  return {
    ...block,
    targetLangReady,
    isTranslated: targetLangReady,
    is_pending: !targetLangReady,
  }
}

export type TranslateStreamMessage = TranslatedBlockResult | TranslateDoneEvent

export type BlockTextPayload =
  | { blockId: string; type: 'paragraph' | 'quote' | 'heading'; text: string }
  | { blockId: string; type: 'list'; items: string[] }

export interface FetchBlockTextsResponse {
  chapterId: string
  lang: string
  ok: BlockTextPayload[]
  missing: string[]
  pending?: string[]
}

export interface ReadingPosition {
  book_id: string
  chapter_id: string | null
  block_id: string | null
  block_position: number | null
  sentence_index?: number | null
  total_blocks?: number | null
  lang: string | null
  updated_at: string | null
}

export interface SaveReadingPositionRequest {
  chapter_id: string
  block_id?: string | null
  block_position?: number | null
  sentence_index?: number | null
  lang?: string | null
  updated_at_client?: string
}

export interface SaveReadingPositionResponse {
  success: boolean
  persisted: boolean
  reason?: 'stale_client'
  book_id?: string
  chapter_id?: string
  block_id?: string | null
  block_position?: number | null
  content_version?: number
  total_blocks?: number
  updated_at?: string
}

export interface BookReadingProgress {
  book_id: string
  chapter_id: string | null
  block_id: string | null
  block_position: number | null
  total_blocks: number
  content_version: number
  updated_at: string | null
}

const GET_CACHE_TTL_MS = 2000
const inflightGetRequests = new Map<string, Promise<unknown>>()
const recentGetResponses = new Map<string, { expiresAt: number; value: unknown }>()
const inflightChromeTranslationRequests = new Map<string, Promise<unknown>>()
let browserTokenCache: { token: string | null; expiresAt: number } | null = null
const ACCESS_TOKEN_STORAGE_KEY = 'globoox:access_token'
const SHARE_TOKEN_STORAGE_KEY = 'globoox:share_token'
let lastBooksAuthWarnAt = 0

/**
 * Curated share link support: an unregistered visitor arrives via /s/<token>,
 * we persist the token, and every /api/books request carries `?share=<token>` so
 * the backend returns ONLY that link's curated books (never the public catalog).
 */
export function getShareToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(SHARE_TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setShareToken(token: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SHARE_TOKEN_STORAGE_KEY, token)
  } catch {
    // Ignore storage failures (private mode / quota).
  }
}

export function clearShareToken(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(SHARE_TOKEN_STORAGE_KEY)
  } catch {
    // Ignore storage failures.
  }
}

/**
 * Cache scope key for unauthenticated users. In share mode it is namespaced by
 * token so a curated library never bleeds into (or out of) the normal guest cache.
 */
export function getGuestScopeKey(): string {
  const token = getShareToken()
  return token ? `share:${token}` : 'guest'
}

/** Append `?share=<token>` to /api/books requests when a share token is active. */
function withShareToken(path: string): string {
  if (!path.startsWith('/api/books')) return path
  const token = getShareToken()
  if (!token) return path
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}share=${encodeURIComponent(token)}`
}

// Reading position cache with TTL (30 seconds)
const POSITION_CACHE_TTL_MS = 30000
const positionCache = new Map<string, { data: ReadingPosition; expiresAt: number }>()

/** Clears the entire reading-position cache (used by useSyncCheck on cross-device sync) */
export function positionCacheInvalidateAll() {
  positionCache.clear()
}


function buildGetCacheKey(path: string, options?: RequestInit): string | null {
  const method = (options?.method ?? 'GET').toUpperCase()
  if (method !== 'GET') return null
  // Books payload is auth-sensitive and can race immediately after login.
  // Skip short-lived response cache to avoid guest/auth mixing in UI state.
  if (path.startsWith('/api/books')) return null
  const body = typeof options?.body === 'string' ? options.body : ''
  return `${path}::${body}`
}

function findAccessTokenDeep(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') {
    try {
      return findAccessTokenDeep(JSON.parse(value))
    } catch {
      return null
    }
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const token = findAccessTokenDeep(item)
      if (token) return token
    }
    return null
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const direct = obj.access_token
    if (typeof direct === 'string' && direct.length > 0) return direct
    for (const nested of Object.values(obj)) {
      const token = findAccessTokenDeep(nested)
      if (token) return token
    }
  }
  return null
}

async function getBrowserAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  const now = Date.now()
  if (browserTokenCache && browserTokenCache.expiresAt > now) return browserTokenCache.token

  let token: string | null = null
  try {
    token = window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
    if (token) {
      browserTokenCache = { token, expiresAt: now + 3000 }
      return token
    }

    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    token = session?.access_token ?? null

    // Fallback for environments where session storage shape differs.
    if (!token) {
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i)
        if (!key || !key.includes('auth-token')) continue
        const raw = window.localStorage.getItem(key)
        if (!raw) continue
        token = findAccessTokenDeep(raw)
        if (token) break
      }
    }
  } catch {
    token = null
  }

  browserTokenCache = { token, expiresAt: now + 3000 }
  return token
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const key = buildGetCacheKey(path, options)
  if (key) {
    const cached = recentGetResponses.get(key)
    if (cached && cached.expiresAt > Date.now()) return cached.value as T
    recentGetResponses.delete(key)

    const inflight = inflightGetRequests.get(key)
    if (inflight) return inflight as Promise<T>
  }

  const fetchPromise = (async () => {
    const hasBody = typeof options?.body === 'string' && options.body.length > 0
    const baseHeaders = hasBody
      ? { 'Content-Type': 'application/json', ...(options?.headers || {}) }
      : { ...(options?.headers || {}) }

    const headers = new Headers(baseHeaders as HeadersInit)
    if (!headers.has('Authorization')) {
      const token = await getBrowserAccessToken()
      if (token) headers.set('Authorization', `Bearer ${token}`)
    }

    const method = (options?.method ?? 'GET').toUpperCase()
    const startTime = performance.now()
    let statusCode: number | undefined

    try {
      const res = await fetch(`${API_URL}${withShareToken(path)}`, {
        ...options,
        headers,
      })
      statusCode = res.status

      if (typeof window !== 'undefined' && path.startsWith('/api/books')) {
        const authHeader = res.headers.get('x-authenticated')
        if (authHeader === 'false') {
          const now = Date.now()
          if (now - lastBooksAuthWarnAt > 10000) {
            lastBooksAuthWarnAt = now
            console.warn('[api] /api/books responded as unauthenticated', { path, status: res.status })
          }
        }
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || `Request failed: ${res.status}`)
      }

      const data = await res.json()
      if (key) {
        recentGetResponses.set(key, {
          expiresAt: Date.now() + GET_CACHE_TTL_MS,
          value: data,
        })
      }

      const durationMs = performance.now() - startTime
      trackApiRequest(path, method, durationMs, true, statusCode)

      return data as T
    } catch (error) {
      const durationMs = performance.now() - startTime
      trackApiRequest(path, method, durationMs, false, statusCode)
      throw error
    }
  })()

  if (!key) return fetchPromise

  inflightGetRequests.set(key, fetchPromise as Promise<unknown>)
  try {
    return await fetchPromise
  } finally {
    inflightGetRequests.delete(key)
  }
}

export function fetchBooks(status?: string): Promise<ApiBook[]> {
  const params = status ? `?status=${encodeURIComponent(status)}` : ''
  return request<ApiBook[]>(`/api/books${params}`).then((books) => {
    for (const b of books) {
      bookByIdCache.set(b.id, b)
      // Best-effort: persist for fast reloads. Authenticated flows overwrite scoped caches when userId is known.
      void setCachedBookMeta('guest', b)
    }
    return books
  })
}

/**
 * Streamed variant of fetchBooks. Calls onBatch as each batch arrives over NDJSON,
 * resolving with the full accumulated list once the stream ends.
 *
 * Use this on first paint (no cache) so the head batch can render before the tail
 * is even fetched server-side.
 */
export async function fetchBooksStreaming(
  status: string | undefined,
  onBatch: (books: ApiBook[], isFirst: boolean) => void,
  signal?: AbortSignal
): Promise<ApiBook[]> {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  params.set('stream', '1')
  const shareToken = getShareToken()
  if (shareToken) params.set('share', shareToken)
  const path = `/api/books?${params.toString()}`

  const startTime = performance.now()
  let statusCode: number | undefined
  let isFirst = true
  const accumulated: ApiBook[] = []

  const headers = new Headers({ Accept: 'application/x-ndjson' })
  const token = await getBrowserAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  try {
    const res = await fetch(`${API_URL}${path}`, { method: 'GET', headers, signal })
    statusCode = res.status

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(
        (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
          ? body.message
          : `Request failed: ${res.status}`)
      )
    }

    const contentType = res.headers.get('content-type') ?? ''
    // Backend may fall back to plain JSON if streaming is unsupported.
    if (!contentType.includes('ndjson')) {
      const data = (await res.json()) as ApiBook[]
      for (const b of data) {
        bookByIdCache.set(b.id, b)
        void setCachedBookMeta('guest', b)
      }
      onBatch(data, true)
      trackApiRequest(path, 'GET', performance.now() - startTime, true, statusCode)
      return data
    }

    if (!res.body) throw new Error('No response body')
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    const processLine = (raw: string) => {
      const trimmed = raw.trim()
      if (!trimmed) return
      let msg: { type?: string; items?: ApiBook[]; message?: string } | null = null
      try {
        msg = JSON.parse(trimmed)
      } catch {
        return
      }
      if (!msg || typeof msg !== 'object') return
      if (msg.type === 'books' && Array.isArray(msg.items)) {
        for (const b of msg.items) {
          bookByIdCache.set(b.id, b)
          void setCachedBookMeta('guest', b)
        }
        accumulated.push(...msg.items)
        onBatch(msg.items, isFirst)
        isFirst = false
      } else if (msg.type === 'error') {
        throw new Error(msg.message || 'stream error')
      }
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) processLine(line)
    }
    if (buffer.trim()) processLine(buffer)

    trackApiRequest(path, 'GET', performance.now() - startTime, true, statusCode)
    return accumulated
  } catch (err) {
    trackApiRequest(path, 'GET', performance.now() - startTime, false, statusCode)
    throw err
  }
}

export function fetchBook(id: string): Promise<ApiBook> {
  // Some backend deployments expose only GET /api/books (without /api/books/:id).
  // Resolve book from list to avoid noisy 404 in reader startup.
  return request<ApiBook[]>('/api/books').then((allBooks) => {
    const book = allBooks.find((item) => item.id === id)
    if (!book) throw new Error('Book not found')
    bookByIdCache.set(book.id, book)
    void setCachedBookMeta('guest', book)
    return book
  })
}

export function createBook(data: { title: string; author?: string; cover_url?: string; source_language?: string }): Promise<ApiBook> {
  return request<ApiBook>('/api/books', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateBook(id: string, data: { status?: string; title?: string; author?: string }): Promise<ApiBook> {
  return request<ApiBook>(`/api/books/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteBook(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/books/${id}`, {
    method: 'DELETE',
  })
}

export function fetchChapters(bookId: string): Promise<ApiChapter[]> {
  return request<ApiChapter[]>(`/api/books/${bookId}/chapters`)
}

export function translateChapterTitles(
  bookId: string,
  lang: string,
): Promise<{ results: { id: string; title: string }[] }> {
  const normalizedLang = lang.toUpperCase()
  const key = `chapter_titles::${bookId}::${normalizedLang}`
  const inflight = inflightChromeTranslationRequests.get(key)
  if (inflight) return inflight as Promise<{ results: { id: string; title: string }[] }>

  const promise = request<{ results: { id: string; title: string }[] }>(
    `/api/books/${bookId}/chapters/translate-titles`,
    { method: 'POST', body: JSON.stringify({ lang: normalizedLang }) },
  ).finally(() => {
    inflightChromeTranslationRequests.delete(key)
  })

  inflightChromeTranslationRequests.set(key, promise)
  return promise
}

export function translateBookMetadata(
  bookId: string,
  lang: string,
): Promise<{ title: string; author: string | null }> {
  const normalizedLang = lang.toUpperCase()
  const key = `book_meta::${bookId}::${normalizedLang}`
  const inflight = inflightChromeTranslationRequests.get(key)
  if (inflight) return inflight as Promise<{ title: string; author: string | null }>

  const promise = request<{ title: string; author: string | null }>(
    `/api/books/${bookId}/translate-meta`,
    { method: 'POST', body: JSON.stringify({ lang: normalizedLang }) },
  ).finally(() => {
    inflightChromeTranslationRequests.delete(key)
  })

  inflightChromeTranslationRequests.set(key, promise)
  return promise
}

export function translateReaderMetadata(
  bookId: string,
  lang: string,
): Promise<{ title: string; author: string | null; chapterTitles: { id: string; title: string }[] }> {
  const normalizedLang = lang.toUpperCase()
  const key = `reader_metadata::${bookId}::${normalizedLang}`
  const inflight = inflightChromeTranslationRequests.get(key)
  if (inflight) {
    return inflight as Promise<{ title: string; author: string | null; chapterTitles: { id: string; title: string }[] }>
  }

  const promise = request<{ title: string; author: string | null; chapterTitles: { id: string; title: string }[] }>(
    `/api/books/${bookId}/reader-metadata/translate`,
    { method: 'POST', body: JSON.stringify({ lang: normalizedLang }) },
  ).finally(() => {
    inflightChromeTranslationRequests.delete(key)
  })

  inflightChromeTranslationRequests.set(key, promise)
  return promise
}

export function fetchContent(chapterId: string, lang?: string, signal?: AbortSignal): Promise<ContentBlock[]> {
  const params = lang ? `?lang=${encodeURIComponent(lang.toUpperCase())}` : ''
  return request<ContentBlock[]>(`/api/chapters/${chapterId}/content${params}`, { signal }).then((blocks) =>
    blocks.map(normalizeContentBlock),
  )
}

export type BatchContentBlock = ContentBlock & { chapter_id: string }

export async function fetchBlockBatch(
  blockId: string,
  batchSize: number,
  lang?: string | null,
  signal?: AbortSignal,
): Promise<BatchContentBlock[]> {
  const params = new URLSearchParams({ block_id: blockId, batch_size: String(batchSize) })
  if (lang) params.set('lang', lang.toUpperCase())
  const blocks = await request<BatchContentBlock[]>(`/api/chapters?${params}`, { signal })
  return blocks.map((b) => ({ ...normalizeContentBlock(b), chapter_id: b.chapter_id }))
}

export function translateBlocks(
  chapterId: string,
  lang: string,
  blockIds: string[],
  signal?: AbortSignal,
): Promise<ContentBlock[]> {
  return request<ContentBlock[]>(`/api/chapters/${chapterId}/translate`, {
    method: 'POST',
    body: JSON.stringify({ lang: lang.toUpperCase(), blockIds }),
    signal,
  })
}

/**
 * Stream block translations one-by-one as they resolve on the server.
 * Calls onBlock for each block result as it arrives (NDJSON stream).
 * Calls onDone when translation is complete with summary metrics.
 * Falls back to parsing a plain JSON array if the server does not stream.
 */
export async function translateBlocksStreaming(
  chapterId: string,
  lang: string,
  blockIds: string[],
  anchorBlockId: string | null,
  direction: 'up' | 'down',
  onBlock: (result: TranslatedBlockResult) => void,
  signal?: AbortSignal,
  onDone?: (event: TranslateDoneEvent) => void,
): Promise<void> {
  const startTime = performance.now()
  const path = `/api/chapters/${chapterId}/translate`
  let firstBlockMs: number | null = null
  let blocksReceived = 0
  let cacheHits = 0
  let cacheMisses = 0
  let statusCode: number | undefined

  const emitClientSummary = (success: boolean, error?: string) => {
    const durationMs = performance.now() - startTime
    trackApiRequest(path, 'POST', durationMs, success, statusCode, { stream: true })
    trackTranslateStreamClient({
      chapter_id: chapterId,
      language: lang.toUpperCase(),
      blocks_requested: blockIds.length,
      blocks_received: blocksReceived,
      cache_hits: cacheHits,
      cache_misses: cacheMisses,
      duration_ms: durationMs,
      first_block_ms: firstBlockMs,
      success,
      error,
    })
  }

  const wrappedOnBlock = (result: TranslatedBlockResult) => {
    if (firstBlockMs === null) firstBlockMs = performance.now() - startTime
    blocksReceived += 1
    if (result.cache === 'hit') cacheHits += 1
    else if (result.cache === 'miss') cacheMisses += 1
    onBlock(result)
  }

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang: lang.toUpperCase(), blockIds, anchorBlockId, direction }),
      signal,
    })
    statusCode = res.status

    if (!res.ok) {
      const errBody = await res.json().catch((): unknown => ({}))
      const message =
        typeof errBody === 'object' &&
        errBody !== null &&
        'message' in errBody &&
        typeof errBody.message === 'string'
          ? errBody.message
          : `Request failed: ${res.status}`
      throw new Error(message)
    }

    if (!res.body) throw new Error('No response body')

    const contentType = res.headers.get('content-type') ?? ''

    if (contentType.includes('ndjson')) {
      // Parse NDJSON line-by-line as data arrives
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? '' // keep incomplete last line
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) continue
            try {
              const message = JSON.parse(trimmed) as TranslateStreamMessage
              if ('event' in message && message.event === 'translate_done') {
                // This is the final summary event
                if (onDone) onDone(message)
              } else {
                // This is a block translation result
                wrappedOnBlock(message as TranslatedBlockResult)
              }
            } catch {
              // skip malformed lines
            }
          }
        }
        // Handle any remaining buffered content
        if (buffer.trim()) {
          try {
            const message = JSON.parse(buffer.trim()) as TranslateStreamMessage
            if ('event' in message && message.event === 'translate_done') {
              if (onDone) onDone(message)
            } else {
              wrappedOnBlock(message as TranslatedBlockResult)
            }
          } catch { /* ignore */ }
        }
      } finally {
        reader.releaseLock()
      }
    } else {
      // Fallback: plain JSON array (older server version)
      const data = await res.json() as ContentBlock[]
      for (const block of data) {
        let translatedText = ''
        if ('text' in block && typeof block.text === 'string') translatedText = block.text
        else if ('items' in block && Array.isArray(block.items)) translatedText = block.items.join('\n')
        wrappedOnBlock({ blockId: block.id, status: 'ok', cache: 'miss', translatedText })
      }
    }

    emitClientSummary(true)
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError'
    // Aborts are normal (user navigated away) — skip tracking to avoid skew.
    if (!isAbort) {
      emitClientSummary(false, error instanceof Error ? error.message : String(error))
    }
    throw error
  }
}

export function fetchBlockTexts(chapterId: string, lang: string, blockIds: string[]): Promise<FetchBlockTextsResponse> {
  return request<FetchBlockTextsResponse>(`/api/chapters/${chapterId}/blocks/text`, {
    method: 'POST',
    body: JSON.stringify({ lang: lang.toUpperCase(), blockIds }),
  })
}

export function updateBookLanguage(bookId: string, lang: string): Promise<ApiBook> {
  return request<ApiBook>(`/api/books/${bookId}/language`, {
    method: 'PATCH',
    body: JSON.stringify({ selected_language: lang.toUpperCase() }),
  })
}

export function fetchReadingPosition(bookId: string, signal?: AbortSignal): Promise<ReadingPosition> {
  // Check cache first
  const cached = positionCache.get(bookId)
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.data)
  }

  return request<ReadingPosition>(`/api/books/${bookId}/reading-position`, { signal })
    .then((data) => {
      positionCache.set(bookId, {
        data,
        expiresAt: Date.now() + POSITION_CACHE_TTL_MS,
      })
      return data
    })
}

export function saveReadingPosition(
  bookId: string,
  data: SaveReadingPositionRequest
): Promise<SaveReadingPositionResponse> {
  // Invalidate position cache so next fetchReadingPosition gets fresh data
  positionCache.delete(bookId)
  return request<SaveReadingPositionResponse>(`/api/books/${bookId}/reading-position`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }).then((response) => {
    // Update cache with the returned position so the next GET is already fresh
    if (response.persisted && response.chapter_id) {
      positionCache.set(bookId, {
        data: {
          book_id: bookId,
          chapter_id: response.chapter_id,
          block_id: response.block_id ?? null,
          block_position: response.block_position ?? null,
          lang: data.lang ?? null,
          updated_at: response.updated_at ?? null,
        },
        expiresAt: Date.now() + POSITION_CACHE_TTL_MS,
      })
    }
    // stale_client: server rejected our write because it has a newer position.
    // Cache is already invalidated (deleted before the PUT). The next
    // fetchReadingPosition will do a real GET and get the authoritative position.
    return response
  })
}

export interface SyncStatusResponse {
  account_version: string | null
  scopes: {
    library: string | null
    progress: string | null
    settings: string | null
  }
}

export function fetchSyncStatus(): Promise<SyncStatusResponse> {
  return request<SyncStatusResponse>('/api/sync/status')
}

export type UploadBookResponse =
  | { jobId: string; bookId: string }
  | (ApiBook & { chapter_count?: number })
  | { id: string; chapter_count?: number }

export interface SignedUrlResponse {
  signedUrl: string
  token: string
  path: string
}

export interface ProcessBookResponse {
  id: string
  chapter_count?: number
}

/** Get a signed URL for direct upload to Supabase Storage */
export function getSignedUploadUrl(bucket: string, path: string): Promise<SignedUrlResponse> {
  return request<SignedUrlResponse>('/api/storage/signed-url', {
    method: 'POST',
    body: JSON.stringify({ bucket, path }),
  })
}

/** Upload file directly to Supabase Storage using signed URL */
export async function uploadToStorage(signedUrl: string, file: File, contentType: string): Promise<void> {
  const startTime = performance.now()
  let statusCode: number | undefined
  try {
    const res = await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
    })
    statusCode = res.status
    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Storage upload failed: ${errorText}`)
    }
    trackApiRequest('/storage/upload', 'PUT', performance.now() - startTime, true, statusCode, {
      file_size_kb: Math.round(file.size / 1024),
    })
  } catch (error) {
    trackApiRequest('/storage/upload', 'PUT', performance.now() - startTime, false, statusCode, {
      file_size_kb: Math.round(file.size / 1024),
    })
    throw error
  }
}

/** Process an already-uploaded EPUB file */
export function processBook(filePath: string, fileName: string, fileSize: number): Promise<ProcessBookResponse> {
  return request<ProcessBookResponse>('/api/books/process', {
    method: 'POST',
    body: JSON.stringify({ file_path: filePath, file_name: fileName, file_size: fileSize }),
  })
}

/** @deprecated Use getSignedUploadUrl + uploadToStorage + processBook instead */
export function uploadBook(formData: FormData): Promise<UploadBookResponse> {
  return request<UploadBookResponse>('/api/books/upload', {
    method: 'POST',
    body: formData,
  })
}

export type JobState = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'

export interface JobStatus {
  state: JobState
  progress: number
  result?: { bookId: string; title: string; author: string | null; chapterCount: number }
  failReason?: string
}

export function getJobStatus(jobId: string): Promise<JobStatus> {
  return request<JobStatus>(`/api/jobs/${jobId}`)
}

export interface TranslationLimitResponse {
  allowed: boolean
  count: number
  /** Per-period book cap; null when unlimited (alpha / Pro). */
  limit?: number | null
  /** ISO timestamp the current rolling period ends. */
  periodEndsAt?: string | null
}

export function checkTranslationLimit(excludeBookId: string): Promise<TranslationLimitResponse> {
  return request<TranslationLimitResponse>(
    `/api/translation-limit?exclude_book_id=${encodeURIComponent(excludeBookId)}`
  )
}

/**
 * Current rolling-period usage for the signed-in user (no book excluded):
 * `{ count, limit, periodEndsAt }`. Used by Settings to show "X of N · resets …".
 */
export function getTranslationUsage(): Promise<TranslationLimitResponse> {
  return request<TranslationLimitResponse>('/api/translation-limit')
}

export function joinWaitlist(email: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/api/waitlist', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function joinAlpha(token: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/api/alpha/join', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

// ── Pro subscription (LemonSqueezy) ──────────────────────────────────────────

export interface SubscriptionResponse {
  tier: 'premium' | 'pro' | null
  status: string | null
  renewsAt: string | null
  endsAt: string | null
  /** True only for an active unlimited Pro plan (Premium is paid but capped). */
  isPro: boolean
  /** Per-period book cap for the current plan; null when unlimited. */
  limit?: number | null
  /** Length of the rolling period in days. */
  periodDays?: number
}

export function getSubscription(): Promise<SubscriptionResponse> {
  return request<SubscriptionResponse>('/api/subscription')
}

/** Start a Pro checkout; returns the LemonSqueezy hosted checkout URL to redirect to. */
export function createCheckout(redirectUrl?: string): Promise<{ url: string }> {
  return request<{ url: string }>('/api/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ redirectUrl }),
  })
}

/** Get the LemonSqueezy Customer Portal URL (cancel / update card / invoices). */
export function getBillingPortal(): Promise<{ url: string }> {
  return request<{ url: string }>('/api/billing/portal')
}

/**
 * Reconcile the subscription with LemonSqueezy right after checkout, closing the
 * gap between the redirect back and the (async) webhook. Returns the fresh snapshot.
 */
export function reconcileSubscription(): Promise<SubscriptionResponse> {
  return request<SubscriptionResponse>('/api/billing/reconcile', { method: 'POST' })
}

// ── Admin: translation model-comparison playground ───────────────────────────

export interface PlaygroundJudgeVerdict {
  adequacy: number
  fluency: number
  style: number
  overall: number
  summary: string
  errors: Array<{
    category: string
    severity: 'minor' | 'major' | 'critical'
    span?: string
    explanation?: string
    suggestion?: string
  }>
}

export interface PlaygroundResult {
  model: string
  actualModel?: string
  ok: boolean
  translatedText?: string
  latencyMs?: number
  costUsd?: number
  tokensIn?: number
  tokensOut?: number
  verdict?: PlaygroundJudgeVerdict | null
  mqmPenalty?: number | null
  judgeCostUsd?: number | null
  judgeError?: string | null
  error?: string
}

export interface PlaygroundResponse {
  targetLanguage: string
  sourceLanguage: string | null
  judged: boolean
  judgeModel: string | null
  referenceUsed: boolean
  results: PlaygroundResult[]
}

export interface PlaygroundRequest {
  sourceText: string
  targetLanguage: string
  sourceLanguage?: string
  models: string[]
  judge?: boolean
  judgeModel?: string
  reference?: string
}

export function runTranslationPlayground(payload: PlaygroundRequest): Promise<PlaygroundResponse> {
  return request<PlaygroundResponse>('/api/admin/translation-playground', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export interface PlaygroundModels {
  /** Text-generation Gemini ids the active provider exposes, newest-first. */
  models: string[]
  provider: 'vertex' | 'aistudio'
  location: string | null
  fetchedAt: number
  /** true when live discovery failed and a static list was returned. */
  fallback?: boolean
}

/** List the models available to compare in the playground (provider-discovered). */
export function fetchPlaygroundModels(): Promise<PlaygroundModels> {
  return request<PlaygroundModels>('/api/admin/models')
}
