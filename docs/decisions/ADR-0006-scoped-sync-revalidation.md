---
type: adr
status: accepted
owner: engineering
date: 2026-03-20
last_verified: 2026-09-01
implementation:
  - src/lib/hooks/useSyncCheck.ts
  - src/lib/contentCache.ts
  - src/lib/store.ts
---

# ADR-0006: Sync v1 uses local-first replicas and scoped server revalidation

## Context

Reader and Library should render known data without blocking on the network, while server state remains authoritative across devices. A cheap account-level check can identify stale areas without refetching every entity on every resume.

## Decision

- Render known books, content, layout, and progress from local caches first.
- Call `/api/sync/status` on startup/resume within a minimum interval.
- Compare per-scope server timestamps with persisted local timestamps.
- Invalidate only the affected local cache families.
- Re-fetch authoritative data through the normal feature path after invalidation.

## Alternatives considered

### Always fetch everything before rendering

Rejected because it makes startup and resume dependent on network latency even when local data is usable.

### Treat local cache as an independent source of truth

Rejected because cross-device changes and server validation must converge on authoritative server data.

### Full delta pull, tombstones, outbox, and idempotent replay

Designed as future work but not implemented. The documents do not record a confirmed reason that the March sync-refactor attempt failed, so this ADR does not invent one. The incomplete postmortem preserves the gap.

## Consequences

- Startup can remain local-first.
- Current invalidation is coarser than a versioned replica protocol and can trigger broader refetches.
- Settings scope has no current fetch/apply action.
- Offline writes, tombstones, and delta synchronization remain RFC work.

## Sources

- [API and sync reference](../reference/architecture/api-and-sync.md)
- [Historical sync-status draft](../archive/2026-03/plans/sync-status-draft.md)
- [Incomplete sync attempt postmortem](../archive/2026-03/sync-refactor-attempt/POSTMORTEM.md)
