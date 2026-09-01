---
type: runbook
status: current
owner: reader
last_verified: 2026-09-01
implementation:
  - src/components/Reader/ReaderView.tsx
  - src/lib/paginatorUtils.ts
---

# Reader Layout Debugging

## 1. Stabilize inputs

Use the same viewport, chapter, language, anchor, font size, line-height scale, theme, and layout mode.

## 2. Check cache identity

- Confirm the current `PAGINATION_ALGO_VERSION`.
- Reload after clearing `globoox-cache` only when testing invalidation.
- Verify that the cache key changes for the input that triggered the bug.

## 3. Compare geometry

- Compare raw and resolved probe width with the visible content box.
- Confirm the spread breakpoint, max column width, gap, and padding.
- Look for CSS that affects only the visible or only the measurement surface.

## 4. Inspect normalized boundaries

- Confirm block type and normalized order.
- Remember that lists become item-level blocks.
- Check whether the case enters a heading-run, keep-with-next, list-start, or paragraph-split path.

## 5. Use development diagnostics

The Reader debug overlay exists but is disabled by default:

```ts
SHOW_READER_DEBUG_OVERLAY = false
```

Temporarily enable it in `ReaderView.tsx` during local investigation. Healthy settled state has positive raw/resolved widths, a mounted shell reference, and an unblocked compute gate.

Heading tracing is development-only and available through `window.__PAGINATION_HEADING_TRACE__`.

## 6. Regression matrix

After a fix, check:

- single and spread layouts;
- narrow and wide viewports around `1408px`;
- language, font size, line height, and theme changes;
- chapter navigation and reload restore;
- cached and uncached startup;
- anchor/progress consistency;
- paragraphs, consecutive headings, lists, quotes, images, and horizontal rules.
