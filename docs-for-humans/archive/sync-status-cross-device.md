# Cross-device Sync Status (Global Snapshot) — Draft

## What problem this solves

We need a *fast, single request* to answer: “Is any of the user’s account data stale on this device?”

If nothing changed, frontend does **nothing** (no extra requests).
If something changed, frontend does a **targeted refresh** (or at minimum invalidates the right caches so the next screen render fetches fresh data).

This is the “Global State Snapshot” idea, implemented as per-scope timestamps.

---

## Backend API contract (current)

`GET /api/sync/status`

Response:
- `account_version: string | null`
  - `null` for guests/unauthenticated (no sync needed).
  - Spec note: “epoch timestamp when user exists but has no sync row yet” (frontend must treat this as “very old” → first full refresh).
- `scopes: { library, progress, settings }` where each is `string | null` date-time.

Frontend compares server timestamps to its persisted local timestamps.

---

## Frontend behavior (current code)

Implemented hook:
- `src/lib/hooks/useSyncCheck.ts:1`

What it does:
1. Calls `fetchSyncStatus()` on mount and on `visibilitychange` (when tab becomes visible).
2. If `account_version` is falsy → no-op (guest behavior).
3. If `scopes.library` is newer:
   - invalidates books cache (`invalidateBooksCache()`)
   - invalidates chapter content cache (`invalidateAllChapterContentCache()`)
4. If `scopes.progress` is newer:
   - invalidates reading-position cache (`positionCacheInvalidateAll()`)
5. Persists new per-scope timestamps in the app store so we don’t re-invalidate repeatedly.

Reader-specific progress policy (current):
- Reader is local-first for reading anchor restore.
- For authenticated users, `GET /api/books/:id/reading-position` is **conditional**, not always-on.
- Revalidation happens only when at least one condition is true:
  - no local anchor for this book,
  - `progress` scope changed,
  - per-book TTL expired (5 minutes).
- If local anchor exists and scope did not change, server fetch is background-only and does not block initial render.

Note on chapter content caching:
- Chapter content (`GET /api/chapters/:id/content?lang=XX`) is cached client-side in IndexedDB to reduce backend load.
- If backend translations/content can change independently (e.g. background translation finishing later), we need a server-side “version bump”
  that the client can observe via `/api/sync/status`, otherwise another device may keep serving stale cached content.
- Recommended: add a dedicated scope such as `content` or `translations`, or define that `scopes.library` (or `scopes.settings`) is bumped
  whenever the content for any chapter/language becomes newly available.

API client:
- `src/lib/api.ts:446` (`fetchSyncStatus()`)

Store fields:
- `src/lib/store.ts:1` (search `syncVersions`)

---

## What is *not* implemented / unclear (blockers for “full sync” doc)

1. **Settings scope**
   - We detect `scopes.settings`, but there is no documented “fetch my settings” endpoint in this repo.
   - We need a concrete source of truth: server-profile settings vs purely local Zustand preferences.

2. **Progress scope refresh strategy**
   - Today we only invalidate local cache. There is no bulk endpoint for “all my reading positions”.
   - Options:
     - add backend `GET /api/reading-positions` (bulk),
     - or accept N calls to `GET /api/books/{id}/reading-position` (needs limits/perf guidance).

3. **Incremental (“since”) semantics**
   - For “library” and “progress” we do not yet have `?since=` contracts in OpenAPI.
   - If “since” is introduced, it must define tombstones (deletions/hides) and conflict rules.

4. **Epoch timestamp meaning**
   - Spec says “epoch timestamp when user exists but has no sync row yet”.
   - We should confirm the exact value (`1970-01-01T00:00:00Z` vs epoch seconds, etc.) and when it happens.

---

## Recommended doc outcome now

We can publish this as **Draft**:
- lock in the `GET /api/sync/status` contract and the frontend invalidation strategy,
- explicitly list the open questions above as the remaining work needed for “seamless sync”.

Once settings + progress bulk/incremental semantics are agreed, we can promote this to a “Final” doc and add a scope→endpoint matrix.
