# Reader Layout Architecture

## Runtime model
- Reader supports `single` and `spread` page layout modes.
- In spread mode, active anchor page is the left page.
- Pages are computed from normalized blocks and rendered as current page (single) or left+right pair (spread).

## Measurement model
- Pagination is computed against a hidden measurement probe (`widthProbe` + hidden measure container).
- Probe width is driven by real layout constraints and stabilized (`raw -> resolved width`).
- Computed pages are produced by `computePages(...)` in `src/lib/paginatorUtils.ts`.

## Key components
- `src/components/Reader/ReaderView.tsx`
  - orchestrates viewport measurement, cache restore, pagination compute, and rendering.
- `src/lib/paginatorUtils.ts`
  - block normalization, fit checks, splitting rules, keep rules, and page assembly.
- `src/components/Reader/ContentBlockRenderer.tsx`
  - visible block rendering with reader typography.

## Spread geometry (current)
- Spread enabled from `SPREAD_MIN_VIEWPORT_PX`.
- Per-column max width: `560px`.
- Gap between columns: `120px`.
- Side paddings: `40px`.
