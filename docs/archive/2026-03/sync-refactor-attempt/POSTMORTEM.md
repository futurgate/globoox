---
type: postmortem
status: incomplete
owner: engineering
date: 2026-03-13
last_verified: 2026-09-01
---

# Postmortem: March sync refactor attempt

## Executive status

The original directory was named `failed_sync_refactoring_13_march`, but its three documents describe a current-state snapshot and proposed target architecture. They do not record the implementation diff, failure symptom, impact, rollback, or root cause.

This postmortem is intentionally incomplete. Missing facts require input from the people who performed the attempt.

## Intended outcome

The documents proposed a more complete local replica protocol with:

- account and per-scope freshness versions;
- incremental `since` pulls;
- tombstones;
- conditional content reads;
- an offline outbox with idempotency;
- deterministic conflict policies;
- observable convergence across devices.

## Confirmed surrounding state

- Per-block content caching and local-first Reader behavior already existed in some form.
- The historical pagination status document is older than the implemented DOM pagination baseline and cannot describe current Reader behavior.
- The current frontend retains `/sync/status` plus scoped cache invalidation.
- Current code does not implement general delta pulls, tombstones, or an offline outbox.

## What happened

Unknown. The source documents do not state which proposed changes were implemented or how the attempt failed.

## Root cause

Unknown. It would be incorrect to attribute the outcome to IndexedDB, outbox ordering, conflicts, backend contracts, or pagination without additional evidence.

## Rollback or final disposition

The current surviving model is local-first cache reuse plus scoped server revalidation, documented in [ADR-0006](../../../decisions/ADR-0006-scoped-sync-revalidation.md).

The broader design remains future work in the [offline-first and versioned sync RFC](../../../rfcs/active/offline-first-sync.md).

Whether there was an explicit rollback, a partial implementation, or an abandoned design phase is unknown.

## Required author input

1. What code and backend contracts changed on or before March 13?
2. What user-visible or operational failure occurred?
3. Was the change reverted? If so, which commit or deployment?
4. Which assumptions proved false?
5. Which parts were retained?
6. What guardrail should prevent recurrence?

## Documentation lesson

A directory name is not a postmortem. Future failed or reverted architecture work must record outcome, evidence, confirmed cause, rollback, and follow-up before it is archived.

## Source material

- [Bidirectional sync architecture](bidirectional-sync-architecture.md)
- [Content caching plan](content-caching-plan.md)
- [Reader pagination status and plan](reader-pagination-status-and-plan.md)
