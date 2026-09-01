---
type: reference
status: current
owner: reader
last_verified: 2026-09-01
implementation:
  - src/components/Reader/ContentBlockRenderer.tsx
  - src/lib/paginatorUtils.ts
  - src/lib/themes.ts
  - src/app/globals.css
---

# Reader Typography and Hyphenation

## Heading scale

Heading size is relative to the Reader font size:

- `h1`: `1.6em`;
- `h2`: `1.35em`;
- `h3` through `h6`: `1.18em`;
- `h5` and `h6`: italic.

Weights come from the active Reader theme definition rather than one global fixed weight.

The same scale must be used by visible rendering and the measurement surface. A typography mismatch produces incorrect page breaks.

## Body line height

Base line height adapts from approximately `1.75` at `14px` to `1.5` at `32px`, then applies the user line-height scale.

## Margins

- Remove top margin when a heading is first on a page.
- Remove top margin for a heading immediately following another heading.

## Hyphenation

- Manual intra-word page-split hyphen insertion is disabled.
- Browser hyphenation uses `hyphens: auto` with Reader CSS constraints.
- Source normalization removes known legacy wrapped-hyphen artifacts where possible.
