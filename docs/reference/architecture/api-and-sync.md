---
type: reference
status: current
owner: engineering
last_verified: 2026-09-01
implementation:
  - src/lib/api.ts
  - src/lib/useBooks.ts
  - src/app/(app)/api/_proxy.ts
  - src/lib/hooks/useSyncCheck.ts
  - src/lib/contentCache.ts
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

See [ADR-0001](../../decisions/ADR-0001-api-proxy-boundary.md).

## Core API surface

Library and Reader currently consume:

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

## Library loading

Implementation: `src/lib/useBooks.ts`.

Scopes differ by authentication state:

- guest: `GET /api/books?status=active`;
- authenticated: `GET /api/books?status=all`.

On a cold load without cached books, the hook first requests the streaming books response so the first batch can render early. For an authenticated scope, the initial result is followed by one controlled JSON retry after approximately 1.2 seconds. This retry currently runs on every first authenticated load, not only when the first response is empty.

Memory and IndexedDB values are rendered immediately when present. Revalidation is background work and does not replace existing cards with a skeleton.

This is a mitigation for session propagation races, not a definitive authentication fix. Use `x-authenticated` when diagnosing an unexpected guest response.

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
| Books | `useBooks` SWR cache | `books_list` | 5 minutes before background refresh |
| Book metadata | `api.ts` map | `book_meta` | Updated with list/detail results |
| Generic GET dedupe | `api.ts` | None | 2 seconds; books requests excluded |
| Chapters | `api.ts` | Book metadata/cache helpers | 10 minutes in memory |
| Reading position | `api.ts` | `reading_positions` | 30 seconds in memory |
| Chapter structure/text | assembled in runtime | `chapter_skeleton` + `block_text` | 10 minutes, reduced to 3 seconds while pending |
| Pagination layout | module cache | `chapter_layout` | Algorithm-versioned |
| Reader metadata translation | runtime/cache helper | `reader_metadata_bundles` | Existence/reconciliation based |

IndexedDB database: `globoox-cache`, current schema version `9`.

`chapter_content` is a legacy store name; current chapter writes use the skeleton plus per-language block-text model.

## Known limits

- Session stabilization still includes a one-time retry.
- Settings sync has no documented server settings source.
- Progress has no bulk read endpoint in this frontend contract.
- Current sync invalidation is coarse; it is not a versioned per-entity replica protocol.
