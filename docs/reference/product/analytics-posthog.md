---
type: reference
status: current
owner: product-analytics
last_verified: 2026-09-01
implementation:
  - src/instrumentation-client.ts
  - src/lib/posthog.ts
  - src/components/PostHogProvider.tsx
  - src/components/UtmCapture.tsx
  - src/components/landing/CookieBanner.tsx
---

# PostHog Analytics

PostHog is the active product analytics provider. The older Amplitude dashboard proposal is preserved as an [archived prototype](../../archive/2026-04/analytics/amplitude-dashboard-prototype.md); the original provider-selection rationale was not recorded, so [ADR-0005](../../decisions/ADR-0005-posthog-analytics.md) marks that gap explicitly.

## Initialization and identity

- Browser SDK initialization: `src/instrumentation-client.ts`.
- Event helpers: `src/lib/posthog.ts`.
- Auth identity/reset and signup detection: `src/components/PostHogProvider.tsx`.
- First-touch UTM capture for signup payloads: `src/components/UtmCapture.tsx`.

`PostHogProvider` is mounted in the application layout. It identifies authenticated users and resets identity on logout. A newly created session triggers `user_signed_up` with session-storage deduplication; this is different from the Google login-initiation event.

## Consent boundary

On marketing pages, `before_send` drops events until a fresh accepted consent value exists. Landing consent expires after 24 hours and is managed by `CookieBanner`.

The application area does not use the landing consent gate. Production application pages also initialize Microsoft Clarity separately; Sentry remains the error/performance integration rather than a product-event provider.

## Current event taxonomy

### Acquisition and account

| Event | Important properties | Current source |
|---|---|---|
| `user_signed_up` | `method`, first-touch UTM values | `PostHogProvider.tsx` |
| `user_logged_in` | `method` | auth page; Google fires on OAuth initiation |
| `premium_upgrade_clicked` | `source: limit_dialog | settings` | upgrade CTAs |

### Books

| Event | Important properties |
|---|---|
| `book_upload_started` | `file_size_kb` |
| `book_uploaded` | title, author, language, chapter count, file size |
| `book_upload_failed` | error, file size |
| `book_opened` | book ID, title, source |

`book_opened` currently fires from `src/app/(app)/my-books/page.tsx` with `source=library`. A Store source is allowed by the helper type but has no current call site.

### Reading

| Event | Purpose |
|---|---|
| `reading_session_started` | Session start by book/chapter/language |
| `reading_session_ended` | Duration, pages read, chapters navigated |
| `chapter_completed` | Chapter completion |
| `book_finished` | Book completion |
| `reader_book_open_ready` | Time from open to first fully readable page |
| `reader_chapter_nav_ready` | Time from navigation action to readable destination |
| `font_size_changed` | Reader setting adoption |

Reader readiness events distinguish `original` from `translation` mode so translation latency is not mixed with original-language rendering.

### Translation

| Event | Purpose |
|---|---|
| `language_switched` | Source and target language |
| `translation_batch_sent` | Block count, cache hits/misses, duration |
| `translate_stream_client` | Client-perceived stream latency and completeness |
| `translation_session_summary` | Calls, tokens, estimated cost, request count |
| `book_translation_started` | Once per user/book/target-language, locally deduplicated |

### API performance

`api_request` records endpoint, normalized route, method, duration, success, status code, and status class. Route normalization removes UUIDs and long numeric IDs so dashboards aggregate by contract rather than entity.

Keep its normalization behavior aligned with the server timing middleware when either changes.

## Recommended dashboards

Maintain four focused dashboards rather than duplicating the taxonomy inside multiple provider-specific setup guides:

1. Product health: active readers, retention, book opens, chapter/book completion.
2. Reader performance: book-open readiness, chapter-navigation readiness, session duration.
3. Translation: first-block latency, stream success, cache ratio, translated books, token/cost summary.
4. Reliability and acquisition: API latency/errors, upload failures, signup funnel, first-touch channel.

Property types for durations, counts, file sizes, tokens, and estimated cost must remain numeric.
