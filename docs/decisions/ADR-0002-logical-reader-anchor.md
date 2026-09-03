---
type: adr
status: accepted
owner: reader
date: 2026-03-07
last_verified: 2026-09-01
implementation:
  - src/components/Reader/ReaderView.tsx
  - src/lib/paginatorUtils.ts
---

# ADR-0002: Persist logical content anchors and derive pages

## Context

Numeric pages change when language, font, viewport, safe-area, content readiness, or pagination rules change. Progressive translation can repaginate content after an initial restore, so a saved page number cannot identify the same reading position reliably.

Earlier visible-rescue and visible-DOM splitting approaches also produced clipping, drift, and tiny fragments because the measurement and rendered surfaces diverged.

## Decision

- Persist chapter plus block/fragment anchor as the durable reading position.
- Treat page arrays and numeric page indices as derived layout state.
- Paginate with a hidden DOM measurement surface whose geometry and typography match the visible page root.
- Keep memory and IndexedDB layout caches as replaceable derived caches.

## Alternatives considered

### Persist absolute page numbers

Rejected because the same logical text has different page numbers across languages, settings, and devices.

### Restore once, then allow later translation commits to move layout freely

Rejected because asynchronous target text can shift the user after restore.

### Split or rescue content in the visible page tree

Rejected after it caused measurement mismatch, clipping, and unstable fragments. The hidden measurement surface became the baseline.

## Consequences

- Cross-device progress can converge on content identity even when pagination differs.
- Repagination must preserve the logical anchor.
- Cache entries must include all layout inputs and remain safe to discard.
- Exact visual page restoration is not promised after language or geometry changes.

## Sources

- [Current Reader reference](../reference/reader/README.md)
- [Historical DOM-first plan](../archive/2026-03/translation-v2/dom-first-pagination-plan-mar-7.md)
- [Historical reading-position plan](../archive/2026-03/plans/reading-position-plan.md)
