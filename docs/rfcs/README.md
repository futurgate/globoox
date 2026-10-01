---
type: index
status: current
owner: engineering
last_verified: 2026-10-01
---

# RFC Index

RFCs describe proposed behavior and never override current reference documentation.

## Active

| RFC | Implementation | Main unresolved decision |
|---|---|---|
| [Bookshelf upload: feedback and recovery](active/bookshelf-upload-2026-10-01/README.md) | Implemented locally; dev acceptance pending | Verify deployment and live upload recovery; memory capacity remains unproven |
| [Billing, entitlements, and translation access](active/billing-entitlements-and-translation-access.md) | Proposed; backend billing/quota skeleton exists but the target contract is not aligned | Align demo-only access, stable quota identity, and observable checkout activation |
| [Reader adaptive typography](active/reader-adaptive-typography.md) | Not started | Language profiles and whether font auto-fit may override user settings |
| [Translation orchestration](active/translation-orchestration.md) | Not started | Adaptive chunks and staged commits vs previous no-adaptive constraint |
| [Unified translation state machine](active/unified-translation-state-machine.md) | Proposed | Entity contract and migration away from copied readiness flags |
| [Offline-first and versioned sync](active/offline-first-sync.md) | Proposed | Delta/tombstone/outbox contracts and realistic online-only boundaries |

## Completed checkpoint

- [Bookshelf upload dev release](../archive/2026-10-01-bookshelf-upload/README.md): initial upload story accepted on dev; shared backend/DB released, production frontend unchanged. Follow-up UX work is tracked separately above.

- [Reader recovery](active/reader-recovery-2026-10-01/README.md): translation recovery and position guards shipped; exact release, tests, limits and rollback recorded.

- [Bookshelf v2 release](active/catalog-speed-2026-09-25/README.md): dev and production shipped; subsequent Reader fixes also shipped; upload story has a completed dev checkpoint and an active feedback/recovery plan.

## Superseded

| RFC | Replacement | Recorded reason |
|---|---|---|
| [Library loading stability](active/library-loading-stability-2026-09-16/README.md) | Released bookshelf v2 | September streaming implementation replaced; evidence retained |
| [My Books server snapshot](active/my-books-server-snapshot.md) | Released bookshelf v2 | Earlier startup proposal replaced by manifest + scoped cache + separate covers |
| [`translate-range` anchor stabilization](superseded/translation-anchor-stabilization.md) | Translation v2 snapshot/reconcile/push model | Not documented; author input required |

## Resolving an RFC

1. Record the outcome and actual reason in the RFC.
2. Create or link an ADR for an architectural choice.
3. Update the current reference when behavior ships.
4. Move the RFC to `accepted`, `rejected`, `superseded`, or mark it `implemented`.

Use [the RFC template](../templates/rfc.md).
