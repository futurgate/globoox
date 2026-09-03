---
type: adr
status: accepted
owner: reader
date: 2026-03-07
last_verified: 2026-09-01
implementation:
  - src/lib/hooks/useViewportTranslation.ts
  - src/lib/hooks/useChapterContent.ts
  - src/lib/contentCache.ts
---

# ADR-0003: Translation v2 uses per-block language truth with transitional UI shapes

## Context

The older mixed `ContentBlock` model could present original/fallback text as if target-language text were ready. Aborted streams and navigation also made readiness depend on whether one client remained connected long enough to observe completion.

Large `/content?lang=X` snapshots provide useful structure and fallback, but they are too broad and can be mixed snapshots; they are not a safe frequent ready-state query.

## Decision

- Target readiness is the existence of text for `(blockId, activeLang)`.
- `/content` supplies a non-empty snapshot and fallback.
- `/blocks/text` reconciles server truth for selected IDs.
- `/translate` pushes/streams translation work.
- IndexedDB separates language-agnostic skeleton/fallback from per-language target text.
- UI may continue to consume a transitional `ContentBlock` shape, but readiness flags are derived from target-text existence.
- Reader title, author, and TOC translations use one logical metadata bundle and shared pending surface.

## Alternatives considered

### Rewrite every `ContentBlock` consumer immediately

Deferred because it would require rewriting the paginator and Reader UI in one patch. The transitional assembly model delivered the invariant sooner with lower Reader regression risk.

### Remove `translate-status` immediately

Deferred for compatibility with possible older calls and manual tools. Server logic was aligned with the new reconcile helper while the frontend moved to `/blocks/text`.

### Rewrite `/content?lang=X` into a pure target-language snapshot immediately

Deferred because the critical readiness bug could be removed through strict frontend interpretation without a large server snapshot refactor.

## Consequences

- The core invariant is explicit and recoverable after disconnects.
- Compatibility fields remain technical debt and must not become new truth.
- A backend process loss still lacks a durable completion guarantee.
- Future entity-state-machine work should remove copied readiness from derived layout fragments.

## Sources

- [Current translation reference](../reference/architecture/translation.md)
- [Final implementation and deviations](../archive/2026-03/translation-v2/translation-v2-final-implementation-and-deviations.md)
