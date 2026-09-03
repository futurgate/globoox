---
type: index
status: current
owner: engineering
last_verified: 2026-09-01
---

# RFC Index

RFCs describe proposed behavior and never override current reference documentation.

## Active

| RFC | Implementation | Main unresolved decision |
|---|---|---|
| [My Books server snapshot](active/my-books-server-snapshot.md) | Partially implemented client optimizations; unified server snapshot absent | Backend endpoint vs Next server composition; restore benchmark evidence |
| [Reader adaptive typography](active/reader-adaptive-typography.md) | Not started | Language profiles and whether font auto-fit may override user settings |
| [Translation orchestration](active/translation-orchestration.md) | Not started | Adaptive chunks and staged commits vs previous no-adaptive constraint |
| [Unified translation state machine](active/unified-translation-state-machine.md) | Proposed | Entity contract and migration away from copied readiness flags |
| [Offline-first and versioned sync](active/offline-first-sync.md) | Proposed | Delta/tombstone/outbox contracts and realistic online-only boundaries |

## Superseded

| RFC | Replacement | Recorded reason |
|---|---|---|
| [`translate-range` anchor stabilization](superseded/translation-anchor-stabilization.md) | Translation v2 snapshot/reconcile/push model | Not documented; author input required |

## Resolving an RFC

1. Record the outcome and actual reason in the RFC.
2. Create or link an ADR for an architectural choice.
3. Update the current reference when behavior ships.
4. Move the RFC to `accepted`, `rejected`, `superseded`, or mark it `implemented`.

Use [the RFC template](../templates/rfc.md).
