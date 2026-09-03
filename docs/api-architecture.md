# API Architecture and Sync

Last updated: 2026-03-20

## Scope

This document is the current source of truth for:

- frontend API integration through Next.js `/api/*` routes
- reader position persistence (`reading-position`)
- cross-device sync invalidation (`/api/sync/status`)
- local cache layers used by Reader and Library

## High-level Flow

1. Browser calls Next.js `/api/*` routes.
2. App Router API routes proxy to backend (`API_URL` / `NEXT_PUBLIC_API_URL`) and attach auth.
3. Frontend keeps local-first caches for UX:
- Zustand persisted store (`globoox-preview-storage`)
- IndexedDB content/cache database (`globoox-cache`)
- short-lived in-memory caches in `src/lib/api.ts`

For Reader position, server remains the authoritative multi-device source, but local state is used for instant restore.

## Library Load Contract (Auth Race Guard)

Main implementation: `src/lib/useBooks.ts`, `src/lib/api.ts`, `src/app/(app)/auth/page.tsx`.

Current behavior for `/my-books`:

1. UI keeps loading state (skeleton) until the first successful `GET /api/books?status=all`.
2. For authenticated scope, if the first successful response is empty, frontend performs one delayed retry (~1.2s) to absorb post-login auth/session races.
3. API layer logs a throttled warning when `/api/books*` responds with `x-authenticated: false` in browser context.
4. After successful sign-in, auth page performs full navigation (`window.location.assign(nextUrl)`) to avoid stale client-only navigation state.

This is a mitigation layer; backend proxy/session consistency is still the source of truth.

## Known Limitations

- Current frontend guards (skeleton + one retry + diagnostics) reduce symptom frequency but do not eliminate root causes in server/proxy session propagation.
- If backend proxy resolves a request as guest (`x-authenticated: false`) right after login, Library can still transiently show empty state.
- The final fix is backend/session-path deterministic auth resolution for `/api/books*`, not additional frontend retries.

## API Surface (current)

Core endpoints used by Reader/Library:

- `GET /api/books`
- `GET /api/books/{id}`
- `GET /api/books/{id}/chapters`
- `GET /api/chapters/{id}/content?lang=XX`
- `GET /api/books/{id}/reading-position`
- `PUT /api/books/{id}/reading-position`
- `GET /api/sync/status`

## Reading Position Contract

### GET `/api/books/{bookId}/reading-position`

Returns current persisted reader position:

- `book_id`
- `chapter_id`
- `block_id`
- `block_position`
- `sentence_index` (optional)
- `lang`
- `updated_at`

### PUT `/api/books/{bookId}/reading-position`

Body:

- `chapter_id` (required)
- `block_id` (optional)
- `block_position` (optional)
- `sentence_index` (optional)
- `lang` (optional)
- `updated_at_client` (optional, used for stale-write protection)

Response:

- `persisted: true` with resolved server position and `updated_at`, or
- `persisted: false` with `reason: "stale_client"` when server position is newer.

Conflict policy: last-write-wins with stale client rejection by timestamp.

## Reader Restore and Save Strategy

Main implementation: `src/components/Reader/ReaderView.tsx`.

### Restore (open Reader)

Local-first startup:

1. Restore local anchor from Zustand (`readingAnchors[bookId]`) when available.
2. Hydrate cached server position from IndexedDB (`reading_positions`) if needed.
3. Conditionally fetch server `GET /reading-position` for revalidation.

Server anchor is applied when:

- local anchor is missing, or
- `syncVersions.progress` scope changed, or
- revalidate TTL expired, or
- server `updated_at` is newer than local anchor timestamp.

This prevents stale local anchor from overriding fresher server progress.

### Save (while reading)

Anchor writes are throttled (~1s) and persisted through:

- local Zustand (`setAnchor`)
- IndexedDB cached reading position
- server `PUT /reading-position`

To avoid losing the latest in-chapter position, pending writes are flushed on:

- `beforeunload`
- `pagehide`
- `visibilitychange` when hidden
- React unmount (SPA route transitions)

This covers cases where `beforeunload` does not fire (client-side navigation).

### Chapter transitions

On chapter switch:

1. current chapter anchor is saved before switching
2. destination chapter entry anchor is persisted once destination page is ready

This avoids "switch chapter then exit immediately" regressions.

## Cross-device Sync Status

Sync check hook: `src/lib/hooks/useSyncCheck.ts`.

Endpoint:

- `GET /api/sync/status` returns `account_version` and per-scope timestamps:
  - `library`
  - `progress`
  - `settings`

Frontend behavior:

- on mount and when tab becomes visible, compare server scope timestamps with local `syncVersions`
- if `library` is newer:
  - invalidate books cache
  - invalidate chapter content cache
- if `progress` is newer:
  - invalidate in-memory reading-position cache
  - clear IndexedDB cached reading positions

This does not directly force UI jumps; it invalidates stale caches so next reads fetch fresh data.

## Cache Layers

### In-memory (`src/lib/api.ts`)

- short TTL for GET dedupe/cache
- separate reading-position TTL cache (`positionCache`)
- `saveReadingPosition` invalidates position cache before PUT and refreshes cache on successful response

### IndexedDB (`src/lib/contentCache.ts`)

Database: `globoox-cache`

Stores used by sync/reader:

- `reading_positions`
- `books_list`
- `book_meta`
- `chapter_content`/layout-related stores

### Zustand persisted store (`src/lib/store.ts`)

Persisted keys include:

- `readingAnchors`
- `progress`
- `syncVersions`
- reader settings and per-book language
