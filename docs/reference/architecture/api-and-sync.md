---
type: reference
status: current
owner: engineering
last_verified: 2026-09-27
implementation:
  - src/lib/api.ts
  - src/lib/useBooks.ts
  - src/app/(app)/api/_proxy.ts
  - src/lib/hooks/useSyncCheck.ts
  - src/lib/contentCache.ts
  - src/lib/catalogState.ts
  - src/lib/catalogCache.ts
  - src/lib/catalogFreshness.ts
  - src/lib/supabase/middleware.ts
---

# API and Sync Architecture

## Scope

This document is the frontend source of truth for:

- the browser-to-backend request boundary;
- API surfaces consumed by Library and Reader;
- reading-position persistence;
- scoped cross-device invalidation;
- frontend cache responsibilities.

The backend OpenAPI contract remains authoritative for backend payloads. A historical change note for the block-batch endpoint is preserved in the [archive](../../archive/2026-04/api/chapters-batch-change-note.md).

## Request boundary

```text
Browser
  -> relative /api/*
  -> Next.js route handler
  -> src/app/(app)/api/_proxy.ts
  -> configured backend API
```

Browser code never calls the backend origin directly. `src/lib/api.ts` uses an empty base URL in the browser, so requests stay on local `/api/*` routes.

On the server, direct backend calls may use `API_URL` or the public fallback `NEXT_PUBLIC_API_URL`.

The shared proxy:

1. reads the Supabase session from cookies;
2. attaches `Authorization: Bearer <access-token>` when present;
3. forwards method, query, JSON, or multipart body;
4. passes NDJSON/SSE and binary responses without buffering;
5. adds `x-data-source` and `x-authenticated` diagnostics to JSON and streaming responses;
6. returns `502` when the backend is unreachable and `503` when no backend URL is configured.

Route handlers live under `src/app/(app)/api/**/route.ts`. Session refresh is handled separately by `src/proxy.ts` and `src/lib/supabase/middleware.ts`; API routes are excluded from that matcher because `_proxy.ts` reads the session itself.

The exact public `/my-books` shell (including its trailing slash) uses `getSession()` only to renew an expiring session. Its returned identity is never trusted for authorization or private server rendering. The cookie adapter updates both the downstream request and the response; changed cookies carry `Cache-Control: private, no-store`. Other matched pages retain `getUser()`. Bookshelf v2 requests use `_catalogProxy.ts` with an explicit expected scope; the backend verifies the bearer independently on every request.

See [ADR-0001](../../decisions/ADR-0001-api-proxy-boundary.md).

## Core API surface

Library and Reader currently consume:

- `GET /api/v2/library` (complete ordered bookshelf manifest)
- `POST /api/v2/reading-activity` (acknowledged recency events)
- `GET /api/v2/books/{id}/cover?version=...` (authorized thumbnail)
- `GET /api/books`
- `POST /api/books`
- `GET|PATCH|DELETE /api/books/{id}` through route handlers
- `GET /api/books/{id}/chapters`
- `GET /api/chapters/{id}/content?lang=XX`
- `GET /api/chapters?block_id=<uuid>&batch_size=<n>&lang=XX`
- `POST /api/chapters/{id}/translate`
- `POST /api/chapters/{id}/blocks/text`
- `POST /api/books/{id}/reader-metadata/translate`
- `GET|PUT /api/books/{id}/reading-position`
- `GET /api/sync/status`

`fetchBook(id)` intentionally fetches the book list and selects the requested ID because some backend deployments do not support the item endpoint consistently. The frontend item route remains available for operations that do support it.

Supported frontend language codes are `EN`, `FR`, `ES`, `DE`, and `RU`.

## Bookshelf loading

Implementation: `src/lib/useBooks.ts`, `catalogState.ts`, `catalogFreshness.ts`, `catalogCache.ts` and `readingActivity.ts`.

The server supplies complete membership and order for the exact guest/account/share scope. The controller settles preceding mutations and flushes reading activity before requesting an index at or above the acknowledged activity version. It starts with a skeleton; a successful index supplies titles and fixed card positions. Scope/generation checks discard obsolete completions.

A complete server manifest, including an empty library, may be reused for 10 seconds after the **start of its successful validation request**. Cache rendering never extends that receipt. Reading or membership mutations invalidate it. Receipt epoch, scope, revision, activity version, completeness and age are rechecked before publication; cover availability is independent of manifest completeness.

When no eligible receipt exists, disk reads cannot postpone the index GET. Cache preparation runs alongside the server path. Identical local reads are coalesced, and each catalog storage/legacy wait is bounded to 300 ms; underlying shared legacy reads can still finish later. A late local result cannot replace accepted server state. The storage format and Reader cache remain unchanged.

Network failure, an activity failure or the existing 2.5-second attempt deadline can show only the same scope's offline cache, with an explanation and Retry. Authentication/permission errors clear visible private data and invalidate that scope's confirmation receipt, so reopening within 10 seconds must contact the server again. They never become guest/offline success. A network timeout neither renews nor revokes a prior receipt; its original expiry still applies. Retry keeps existing cards while refreshing. The deadline is a failure boundary, not a latency target.

Covers fill the accepted slots from cache, then a FIFO queue downloads all missing covers with at most four concurrent requests, independently of scrolling. Upload immediately adds a local placeholder at the top and fills the same card when ready. Closing the page can interrupt upload; no durable server upload job is implied.

The legacy books API remains available for other consumers and existing write operations; bookshelf loading does not fall back to its heavyweight list. See the [active implementation and verification record](../../rfcs/active/catalog-speed-2026-09-25/README.md) for deployed versus locally verified versions.

## Chapters and block batches

Each `ApiChapter` includes:

```ts
first_block_id: string | null
```

`GET /api/chapters?block_id=...&batch_size=...&lang=...` returns blocks in reading order and may cross chapter boundaries. Every batch block carries `chapter_id`.

Current frontend behavior:

- `fetchBlockBatch` requires an explicit `batchSize`;
- the Reader first-open warmup requests 60 blocks;
- only complete chapters from that response are written as complete chapter snapshots;
- partial leading or trailing chapters are not cached as complete;
- rolling content prefetch covers the next two chapters.

The batch endpoint surfaces existing translated or pending state but does not itself start new LLM translation. Missing blocks still use the per-chapter translation endpoint.

## Reading-position contract

The logical position contains:

- `book_id`;
- `chapter_id`;
- `block_id`;
- `block_position`;
- optional `sentence_index`;
- optional `lang`;
- `updated_at`.

`PUT /api/books/{bookId}/reading-position` accepts the chapter plus optional block, sentence, language, and `updated_at_client`. The server can return `persisted: false, reason: "stale_client"` when its position is newer.

Reader restore is local-first:

1. restore the persisted Zustand anchor when available;
2. hydrate the cached server position from IndexedDB when needed;
3. conditionally revalidate from the server;
4. apply server state only when it is the fresher authoritative position.

Writes update local state and IndexedDB immediately, then persist to the server. Pending writes are flushed for page lifecycle and SPA-unmount paths. The block anchor, not a numeric page, is the durable identity; see [ADR-0002](../../decisions/ADR-0002-logical-reader-anchor.md).

## Scoped sync status

`useSyncCheck` calls `GET /api/sync/status` on mount and when a tab becomes visible, with a minimum 30-second interval. It compares server timestamps with persisted local scope timestamps.

Current actions:

| Scope | Action when server is newer |
|---|---|
| `library` | Clear books caches and chapter content caches |
| `progress` | Clear memory and IndexedDB reading-position caches |
| `settings` | Persist the new timestamp; no settings fetch/apply path exists yet |

The check invalidates stale replicas; it does not implement delta pull, tombstones, an offline outbox, or full bidirectional sync. Those remain future work. See [ADR-0006](../../decisions/ADR-0006-scoped-sync-revalidation.md).

## Cache matrix

| Data | Memory | IndexedDB | Freshness |
|---|---|---|---|
| Bookshelf manifest | scoped catalog cache | separate `globoox-catalog-v2` / `manifests` | Complete server confirmation for 10 seconds; mutations invalidate; otherwise server-first |
| Bookshelf thumbnails | bounded Blob cache | separate `globoox-catalog-v2` / `covers` | Exact scope, book and cover version; FIFO prefetch |
| Legacy books list | legacy API/cache helpers | `books_list` | Other consumers and exact-scope offline migration only |
| Book metadata | `api.ts` map | `book_meta` | Updated with list/detail results |
| Generic GET dedupe | `api.ts` | None | 2 seconds; books requests excluded |
| Chapters | `api.ts` | Book metadata/cache helpers | 10 minutes in memory |
| Reading position | `api.ts` | `reading_positions` | 30 seconds in memory |
| Chapter structure/text | assembled in runtime | `chapter_skeleton` + `block_text` | 10 minutes, reduced to 3 seconds while pending |
| Pagination layout | module cache | `chapter_layout` | Algorithm-versioned |
| Reader metadata translation | runtime/cache helper | `reader_metadata_bundles` | Existence/reconciliation based |

Reader/legacy IndexedDB database: `globoox-cache`, current schema version `9`. Bookshelf uses `globoox-catalog-v2`, version `1`; this optimization changes neither version.

`chapter_content` is a legacy store name; current chapter writes use the skeleton plus per-language block-text model.

## Known limits

- Local loopback Auth/SQL tests do not establish production latency, OAuth behavior or cloud proxy/cookie behavior; dev acceptance remains separate.
- Settings sync has no documented server settings source.
- Progress has no bulk read endpoint in this frontend contract.
- Current sync invalidation is coarse; it is not a versioned per-entity replica protocol.
