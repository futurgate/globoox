---
type: index
status: current
owner: engineering
last_verified: 2026-09-01
---

# Documentation Archive

Archived files preserve evidence, abandoned directions, implementation notes, and superseded snapshots. They are not current specifications. Use [the main documentation index](../README.md) to find current behavior.

Old code paths and links inside archived snapshots may be stale. Where an outcome is unknown, this index says so instead of classifying the document as rejected.

## March 2026

| Material | Historical disposition | Current replacement |
|---|---|---|
| [Translation v2 bundle](2026-03/translation-v2/) | Implemented with documented deviations; retained as primary historical evidence | [ADR-0003](../decisions/ADR-0003-translation-v2-transitional-model.md), [translation reference](../reference/architecture/translation.md) |
| [Refactoring inventory](2026-03/refactoring-inventory/) | Audit/checklist bundle; individual cleanup completion varies | Current code and active RFCs |
| [Sync refactor attempt](2026-03/sync-refactor-attempt/) | Outcome labelled failed in the original folder, but root cause was never recorded | [Incomplete postmortem](2026-03/sync-refactor-attempt/POSTMORTEM.md), [ADR-0006](../decisions/ADR-0006-scoped-sync-revalidation.md) |
| [Old API architecture](2026-03/api/api-architecture-outdated.md) | Superseded | [API and sync](../reference/architecture/api-and-sync.md) |
| [Reading-position plan](2026-03/plans/reading-position-plan.md) | Historical implementation plan; not every checklist item proves completion | [ADR-0002](../decisions/ADR-0002-logical-reader-anchor.md) |
| [Sync-status draft](2026-03/plans/sync-status-draft.md) | Partial current mechanism plus unresolved full-sync questions | [ADR-0006](../decisions/ADR-0006-scoped-sync-revalidation.md) |
| [iOS overlay plan](2026-03/plans/ios-overlay-components-plan.md) | Decision extracted; completion must be judged from current UI code | [ADR-0004](../decisions/ADR-0004-interface-domains-and-overlays.md) |
| [Error/fallback plan](2026-03/plans/error-and-fallback-plan.md) | Archived delivery plan; completion status unknown | Current code/runbooks |
| [Reader width-probe note](2026-03/reader/width-probe-and-debug-overlay.md) | Superseded by current Reader docs | [Reader architecture](../reference/reader/architecture.md), [debugging](../runbooks/reader-layout-debugging.md) |
| [Landing architecture and concepts](2026-03/landing/) | Historical design/route snapshots; no evidence that every concept was rejected | [Marketing subsystem](../reference/product/marketing.md) |
| [Fast start](2026-03/product/faststart.md) | Early MVP/product note | [Root README](../../README.md) |
| [Quick reference](2026-03/product/quick-reference.md) | Superseded contributor entry point | [Local development](../runbooks/local-development.md) |

The Supabase signup investigation remains unresolved. Its confirmed and unknown findings are summarized in the [incomplete incident report](2026-03/refactoring-inventory/SIGNUP-INCIDENT.md).

## April 2026

| Material | Historical disposition | Current replacement |
|---|---|---|
| [Chapters batch change note](2026-04/api/chapters-batch-change-note.md) | Backend change already consumed by the frontend | [API and sync](../reference/architecture/api-and-sync.md) |
| [Amplitude dashboard prototype](2026-04/analytics/amplitude-dashboard-prototype.md) | Provider prototype; original reason for not adopting it is undocumented | [ADR-0005](../decisions/ADR-0005-posthog-analytics.md), [PostHog reference](../reference/product/analytics-posthog.md) |

## Archive rules

1. Do not silently rewrite archived plans to match current code.
2. Add a postmortem, ADR, or current-reference link when later context becomes known.
3. Do not infer `rejected` merely from archive placement.
4. Preserve original evidence whenever possible; record missing evidence explicitly.
