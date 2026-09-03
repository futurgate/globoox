# Bidirectional Sync Architecture (Future Plan)

## Goal

Move from the current "server-authoritative + client cache" model to a robust bidirectional sync model:

- Fast local-first UX from IndexedDB.
- Deterministic freshness checks against server versions.
- Incremental sync (only changed data).
- Reliable upload of local changes (outbox + retries).
- Explicit conflict handling.

---

## Current State (What We Have)

### Works well now

- Reader and library use client caching (memory + IndexedDB).
- Translation is server-driven (`/api/chapters/:id/content`, `/translate`).
- Reading progress is saved to server.
- `sync/status` exists and invalidates caches when scopes change.

### Gaps vs full bidirectional sync

- No per-entity version protocol for all resources.
- No incremental "since/version" pull for content entities.
- No general outbox for local writes (except reading progress flow).
- No formal conflict policy across all entities.
- No per-entity tombstones/deletion sync contract.

---

## Target Sync Model

Use a **server-authoritative, versioned bidirectional sync** model:

1. Client reads from local DB first.
2. Client checks remote versions cheaply.
3. Client pulls only changed entities.
4. Client applies remote deltas transactionally.
5. Client uploads local pending changes from an outbox.
6. Server replies with ack + authoritative versions.

---

## Entities and Versioning

Define versions per sync domain:

1. `library` (books list, metadata, status/hide/delete)
2. `chapters` (table of contents, chapter metadata)
3. `content` (chapter blocks by language)
4. `progress` (reading anchor, block position)
5. `settings` (user settings if server-backed)

### Required version fields

For each entity record:

- `id`
- `updated_at` (ISO timestamp)
- `version` (monotonic per entity or globally ordered)
- `deleted_at` (nullable tombstone for removals)

For language-dependent content:

- key must include `(chapter_id, lang)`
- stable content hash or ETag per `(chapter_id, lang)`

---

## Client Storage Layout (IndexedDB)

Recommended stores:

1. `books`
2. `chapters`
3. `content_skeleton`
4. `content_text` (key: `block_id + lang`)
5. `progress`
6. `sync_meta` (last synced versions/timestamps per scope)
7. `outbox` (pending local writes)

### Outbox record shape

```json
{
  "id": "uuid",
  "scope": "progress|settings|library",
  "entity_id": "book_id_or_other",
  "operation": "upsert|delete",
  "payload": {},
  "client_ts": "2026-03-05T12:34:56.000Z",
  "attempts": 0,
  "status": "pending|failed|acked"
}
```

---

## API Contract (Target)

## 1) Cheap freshness check

`GET /api/sync/status`

Response should include versions per scope:

```json
{
  "account_version": "2026-03-05T12:00:00.000Z",
  "scopes": {
    "library": "2026-03-05T11:58:00.000Z",
    "chapters": "2026-03-05T11:58:10.000Z",
    "content": "2026-03-05T11:59:50.000Z",
    "progress": "2026-03-05T11:57:20.000Z",
    "settings": "2026-03-05T11:40:00.000Z"
  }
}
```

## 2) Incremental pull per scope

Examples:

- `GET /api/books?since=<cursor>`
- `GET /api/books/:id/chapters?since=<cursor>`
- `GET /api/chapters/:id/content?lang=EN&since=<cursor>`
- `GET /api/reading-positions?since=<cursor>`

Server must return:

- changed records only
- tombstones for deleted records
- next cursor/version checkpoint

## 3) Conditional full reads

For large content payloads:

- `ETag` + `If-None-Match` on `GET /api/chapters/:id/content?lang=XX`
- `304 Not Modified` when unchanged
- translation readiness metadata (`is_pending` per block and/or `x-translation-status`)

## 4) Write endpoints with idempotency

For outbox replay safety:

- accept `Idempotency-Key`
- return authoritative server version and updated record

---

## Sync Algorithm (Client)

## On app start / resume

1. Read all render-critical data from IndexedDB immediately.
2. Call `sync/status`.
3. For each scope where remote version > local version:
   - pull delta with `since`.
   - apply delta transactionally to IndexedDB.
   - update local sync checkpoint.

## Background write upload

1. Read pending outbox in FIFO order.
2. Send write with idempotency key.
3. On success:
   - mark outbox item as acked.
   - apply server authoritative response locally.
4. On failure:
   - increment attempts.
   - exponential backoff with jitter.

---

## Conflict Policy

Define per scope:

1. `progress`: server last-write-wins by `updated_at`, reject stale writes with explicit reason.
2. `settings`: server last-write-wins unless field-level merge is required.
3. `library`: server authoritative for ownership/status/deletion.
4. `content/translation`: server authoritative; client never writes final translated text directly.

Every rejected write must return machine-readable reason (e.g. `stale_client`).

---

## Observability and Debugging

Log structured sync events:

1. `sync_status_checked` (local versions, remote versions)
2. `sync_scope_pull_started|finished` (scope, changed count, duration)
3. `sync_outbox_send|acked|failed` (scope, attempts, error)
4. `sync_conflict` (scope, entity, reason)
5. `sync_tombstone_applied` (scope, entity)

Metrics:

- time-to-fresh
- delta payload size
- outbox retry rate
- conflict rate
- cache hit ratio (IDB vs network)

---

## Rollout Plan

1. **Phase 1**: Add version fields and ETag contracts, keep current behavior.
2. **Phase 2**: Add incremental pull endpoints (`since`) for `library/progress`.
3. **Phase 3**: Add outbox + idempotent writes for `progress/settings`.
4. **Phase 4**: Add incremental content sync and tombstones.
5. **Phase 5**: Remove broad invalidation paths, rely on scoped delta sync.

Each phase should be behind feature flags and monitored.

---

## Definition of Done (Full Bidirectional Sync)

System is considered done when:

1. Reload/offline-start opens from IDB without blocking loaders for known entities.
2. Client pulls only changed data (no broad refetch for unchanged scopes).
3. Local writes survive reload/offline and are replayed reliably.
4. Conflicts are deterministic and observable.
5. Cross-device updates converge without manual refresh or cache clearing.
