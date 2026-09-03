---
type: reference
status: current
owner: reader
last_verified: 2026-09-01
implementation:
  - src/components/Reader/ReaderView.tsx
  - src/lib/paginatorUtils.ts
  - src/components/Reader/ContentBlockRenderer.tsx
---

# Reader Layout Architecture

## Runtime model

- Reader supports `single` and `spread` page layout modes.
- In spread mode, the active anchor page is the left page.
- Pages are derived from normalized blocks and rendered as one page or a left/right pair.
- The logical content anchor survives repagination; the numeric page index does not identify durable progress.

## Measurement model

Pagination is computed against an always-mounted hidden measurement surface. Its raw width settles into a resolved column width before `computePages(...)` runs.

Current geometry controls:

- spread breakpoint: `1408px`;
- maximum column width: `560px`;
- gap between columns: `120px`;
- side padding: `40px`;
- width settle: approximately `140ms`;
- significant width delta: `2px`;
- resize repagination debounce: approximately `160ms`.

Visible rendering and measurement must share the same effective content-box geometry and typography. A mismatch invalidates pagination correctness even when both surfaces look plausible independently.

## Key implementation

- `ReaderView.tsx`: viewport measurement, cache restore, pagination orchestration, anchor restore, and visible rendering.
- `paginatorUtils.ts`: normalization, fit checks, splits, keep rules, and page assembly.
- `ContentBlockRenderer.tsx`: visible block rendering and Reader typography.

See [ADR-0002](../../decisions/ADR-0002-logical-reader-anchor.md) for the anchor/derived-page decision.
