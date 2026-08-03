import posthog from 'posthog-js'

// ─── Generic API tracking ─────────────────────────────────────────────────────

// Strip UUIDs and numeric ids so dashboards aggregate per-route instead of per-entity.
// Mirrors server/middleware/api-timing.ts:normalizeRoute — keep in sync.
function normalizeRoute(path: string): string {
  const withoutQuery = path.split('?')[0] ?? path
  return withoutQuery
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d{4,}/g, '/:id')
}

export function trackApiRequest(
  endpoint: string,
  method: string,
  durationMs: number,
  success: boolean,
  statusCode?: number,
  extra?: Record<string, unknown>,
) {
  const route = normalizeRoute(endpoint)
  posthog.capture('api_request', {
    endpoint,
    route,
    method,
    duration_ms: durationMs,
    success,
    status_code: statusCode,
    status_class: statusCode ? `${Math.floor(statusCode / 100)}xx` : undefined,
    ...extra,
  })
}

// ─── Reader performance ───────────────────────────────────────────────────────

// Time from opening a book to the first page being visible and fully readable.
// mode='original' when the active language matches the book's source language
// (no translation pending); mode='translation' otherwise — in which case the
// event fires only after translations for the visible blocks have landed.
export function trackReaderBookOpenReady(props: {
  book_id: string
  chapter_id: string
  language: string
  mode: 'original' | 'translation'
  duration_ms: number
  visible_blocks: number
  had_cached_content: boolean
}) {
  posthog.capture('reader_book_open_ready', props)
}

// Time from a chapter navigation action (toc/link/slider/next/prev) to the new
// page being fully loaded. Split by mode like reader_book_open_ready.
export function trackReaderChapterNavReady(props: {
  book_id: string
  from_chapter_id: string | null
  to_chapter_id: string
  language: string
  mode: 'original' | 'translation'
  source: 'toc' | 'link' | 'slider' | 'next' | 'prev' | 'search' | 'restore_anchor' | 'other'
  duration_ms: number
  visible_blocks: number
}) {
  posthog.capture('reader_chapter_nav_ready', props)
}

// Streaming translation summary — fired once per translate request on the client.
// Complements the server-side translate_done with a client-perceived latency.
export function trackTranslateStreamClient(props: {
  chapter_id: string
  language: string
  blocks_requested: number
  blocks_received: number
  cache_hits: number
  cache_misses: number
  duration_ms: number
  first_block_ms: number | null
  success: boolean
  error?: string
}) {
  posthog.capture('translate_stream_client', props)
}

// ─── User Identity ─────────────────────────────────────────────────────────────

export function identifyUser(userId: string, email?: string) {
  posthog.identify(userId, email ? { email } : undefined)
}

export function resetUser() {
  posthog.reset()
}

// PostHog automatically captures UTM parameters — no manual capture needed.
// Kept as a no-op so call sites don't need changes.
export function captureFirstVisitUtm() {}

// ─── User Acquisition & Auth ──────────────────────────────────────────────────

export function trackUserSignedUp(method: 'email' | 'google', utmParams?: Record<string, string>) {
  posthog.capture('user_signed_up', { method, ...utmParams })
}

export function trackUserLoggedIn(method: 'email' | 'google') {
  posthog.capture('user_logged_in', { method })
}

// ─── Book Lifecycle ────────────────────────────────────────────────────────────

export function trackBookUploadStarted(props: { file_size_kb: number }) {
  posthog.capture('book_upload_started', props)
}

export function trackBookUploaded(props: {
  title: string
  author: string
  language: string
  chapter_count: number
  file_size_kb: number
}) {
  posthog.capture('book_uploaded', props)
}

export function trackBookUploadFailed(props: { error: string; file_size_kb: number }) {
  posthog.capture('book_upload_failed', props)
}

export function trackBookOpened(props: {
  book_id: string
  title: string
  source: 'library' | 'store'
}) {
  posthog.capture('book_opened', props)
}

// ─── Reading Session ───────────────────────────────────────────────────────────

export function trackReadingSessionStarted(props: {
  book_id: string
  chapter_index: number
  language: string
}) {
  posthog.capture('reading_session_started', props)
}

export function trackReadingSessionEnded(props: {
  book_id: string
  duration_seconds: number
  pages_read: number
  chapters_navigated: number
}) {
  posthog.capture('reading_session_ended', props)
}

export function trackChapterCompleted(props: {
  book_id: string
  chapter_index: number
  total_chapters: number
}) {
  posthog.capture('chapter_completed', props)
}

export function trackBookFinished(props: { book_id: string; total_chapters: number }) {
  posthog.capture('book_finished', props)
}

// ─── Translation ───────────────────────────────────────────────────────────────

export function trackTranslationBatch(props: {
  book_id: string
  chapter_id: string
  language: string
  block_count: number
  cache_hits: number
  cache_misses: number
  duration_ms: number
}) {
  posthog.capture('translation_batch_sent', props)
}

export function trackLanguageSwitched(props: {
  book_id: string
  from_language: string
  to_language: string
}) {
  posthog.capture('language_switched', props)
}

export function trackTranslationSessionSummary(props: {
  session_id: string
  book_id: string
  language: string
  source_language: string | null
  llm_calls: number
  tokens_in: number
  tokens_out: number
  estimated_cost: number
  duration_seconds: number
  request_count: number
}) {
  posthog.capture('translation_session_summary', props)
}

// Fired once per user per book per target language (localStorage-deduped).
// Used for "avg translated books per user" metric.
export function trackBookTranslationStarted(props: {
  book_id: string
  source_language: string | null
  target_language: string
}) {
  posthog.capture('book_translation_started', props)
}

// ─── Reader Settings ───────────────────────────────────────────────────────────

export function trackFontSizeChanged(props: {
  font_size: number
  previous_font_size: number
}) {
  posthog.capture('font_size_changed', props)
}

// ─── Subscription / Upgrade ────────────────────────────────────────────────────

// Fired when the user clicks an "Upgrade to Premium" CTA. `source` distinguishes the
// limit-reached dialog from the Settings card. Mock CTA until real checkout ships.
export function trackUpgradeClicked(props: {
  source: 'limit_dialog' | 'settings'
}) {
  posthog.capture('premium_upgrade_clicked', props)
}
