---
type: index
status: current
owner: engineering
last_verified: 2026-09-01
---

# Architecture Decision Records

Accepted ADRs describe why the current architecture exists. They are append-only: a later decision supersedes an earlier ADR instead of rewriting its history.

| ADR | Status | Decision |
|---|---|---|
| [ADR-0001](ADR-0001-api-proxy-boundary.md) | accepted | Browser requests use local authenticated API proxy routes |
| [ADR-0002](ADR-0002-logical-reader-anchor.md) | accepted | Reader progress is a logical content anchor; pages are derived |
| [ADR-0003](ADR-0003-translation-v2-transitional-model.md) | accepted | Translation truth is per block/language with snapshot, reconcile, and push paths |
| [ADR-0004](ADR-0004-interface-domains-and-overlays.md) | accepted | App, Reader, and Marketing are separate UI domains with canonical overlay primitives |
| [ADR-0005](ADR-0005-posthog-analytics.md) | accepted | PostHog is the active product analytics provider |
| [ADR-0006](ADR-0006-scoped-sync-revalidation.md) | accepted | Sync v1 uses local-first caches and scoped server revalidation |

Use [the ADR template](../templates/adr.md) for new decisions.
