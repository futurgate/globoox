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
| [Billing, entitlements, and translation access](active/billing-entitlements-and-translation-access.md) | Proposed; backend billing/quota skeleton exists but the target contract is not aligned | Align demo-only access, stable quota identity, and observable checkout activation |
| [Reader recovery](active/reader-recovery-2026-10-01/README.md) | In progress | Failed translations, bounded retry and concurrent position restore |
| [Reader adaptive typography](active/reader-adaptive-typography.md) | Not started | Language profiles and whether font auto-fit may override user settings |
| [Translation orchestration](active/translation-orchestration.md) | Not started | Adaptive chunks and staged commits vs previous no-adaptive constraint |
| [Unified translation state machine](active/unified-translation-state-machine.md) | Proposed | Entity contract and migration away from copied readiness flags |
| [Offline-first and versioned sync](active/offline-first-sync.md) | Proposed | Delta/tombstone/outbox contracts and realistic online-only boundaries |

## Completed checkpoint

- [Bookshelf v2 release](active/catalog-speed-2026-09-25/README.md): dev and production shipped; remaining Reader work moved to the active recovery plan.

## Superseded

| RFC | Replacement | Recorded reason |
|---|---|---|
| [My Books server snapshot](active/my-books-server-snapshot.md) | Released bookshelf v2 | Earlier startup proposal replaced by manifest + scoped cache + separate covers |
| [`translate-range` anchor stabilization](superseded/translation-anchor-stabilization.md) | Translation v2 snapshot/reconcile/push model | Not documented; author input required |

## Resolving an RFC

1. Record the outcome and actual reason in the RFC.
2. Create or link an ADR for an architectural choice.
3. Update the current reference when behavior ships.
4. Move the RFC to `accepted`, `rejected`, `superseded`, or mark it `implemented`.

Use [the RFC template](../templates/rfc.md).
