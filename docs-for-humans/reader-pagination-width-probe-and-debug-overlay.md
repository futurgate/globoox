# Reader Pagination: Width Probe and Debug Overlay

> Current canonical docs moved to: `docs/reader-layout/` (architecture, rules, typography/hyphenation, cache/versioning, debugging).

## Why this exists
- Pagination must be computed using the real column width.
- Measuring width from the visible page shell caused unstable behavior:
  - resize jitter loops near spread thresholds,
  - cold-start deadlock after reload (skeleton stayed forever in some states).

## Current approach
- Reader uses a hidden, always-mounted `widthProbe` element in `ReaderView`.
- `ResizeObserver` measures probe width (`rawColumnWidthPx`), then stabilizes it into `resolvedColumnWidthPx` with:
  - debounce (`REPAGINATE_DEBOUNCE_MS` path uses separate compute debounce),
  - hysteresis (`LAYOUT_SIGNIFICANT_DELTA_PX`).
- Pagination keys and `computePages(...)` use `resolvedColumnWidthPx`.
- UI follows stale-while-repaginate: old visible page remains until new pages are ready.

## Spread layout constraints (current)
- Spread enabled from `SPREAD_MIN_VIEWPORT_PX`.
- Gap between columns: `SPREAD_GAP_PX = 120`.
- Side paddings: `SPREAD_SIDE_PADDING_PX = 40`.
- Max width per spread column: `SPREAD_MAX_COLUMN_PX = 560`.

## Debug overlay
- Overlay code is kept in `ReaderView`, but hidden by default:
  - `SHOW_READER_DEBUG_OVERLAY = false`.
- To enable in development:
  1. Open `src/components/Reader/ReaderView.tsx`.
  2. Set `SHOW_READER_DEBUG_OVERLAY = true`.

## Expected debug signals
- Healthy startup:
  - `raw > 0`, `resolved > 0`,
  - `shellRef=1`,
  - `gateBlocked=0` after loading settles.
- Deadlock symptom:
  - `raw=0`, `resolved=0`, `gateBlocked=1`, `visible=0` while content is otherwise loaded.
