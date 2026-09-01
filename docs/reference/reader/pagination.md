---
type: reference
status: current
owner: reader
last_verified: 2026-09-01
implementation:
  - src/lib/paginatorUtils.ts
---

# Pagination Rules

## Normalization

- Paragraphs can split into fragments across pages.
- Lists are normalized into item-level blocks; individual list items participate in pagination.
- Heading, quote, image, horizontal-rule, and normalized list-item blocks move as indivisible units.

## Heading rules

- A consecutive heading-run start begins on a new page.
- Consecutive headings are placed atomically when they fit.
- Special case `h1 -> h2`: `h1` receives a standalone page and a hard break follows it.
- A lone `h1` is centered on its dedicated page.

## Paragraph splitting

- Tiny paragraph fragments are avoided.
- Widow/orphan thresholds require at least two lines at the bottom of the current page and three lines at the top of the next page.
- A `6px` fit buffer protects against visible clipping caused by measurement rounding.

## Keep-with-next

A paragraph followed by `hr`, list, or quote is kept with the following block when possible.

There is no separate mandatory `heading + first paragraph` keep rule. Changing that behavior requires an explicit decision and regression review.

## List guard

A list should not start at the bottom of a page unless at least two normalized items can be placed.

See the [rules register](rules-register.md) for a compact current-state matrix.
