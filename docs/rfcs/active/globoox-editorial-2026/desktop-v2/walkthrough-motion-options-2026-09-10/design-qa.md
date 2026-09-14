---
type: reference
status: historical
owner: design-engineering
last_verified: 2026-09-10
---

# Motion and visual QA — 2026-09-10

**Final result: passed for the implemented comparison.** Both alternatives remain experimental, awaiting the user's preference.

## Browser evidence

The Browser plugin failed before connecting because its trusted worker still imported the deleted previous plugin version. Resetting it did not repair the connection. A separate available Chrome DevTools connection successfully opened the actual local Next.js app and was used for all evidence in this round. This is fresh browser verification, not reuse of the previous blocked or timed-fade QA.

Actual viewport states visually reviewed:

| Viewport | Evidence |
| --- | --- |
| 1440×1000 | 11 positions per mode, including all stable screens and both transition midpoints |
| 900×900 | Mid-transition and final stack/fade |
| 801×800 | Mid-transition and final stack/fade, immediately above mobile breakpoint |
| 1050×700 | Mid-transition and final stack/fade |
| 1440×600 | Mid-transition and final stack/fade, smallest tested desktop height |
| 390×844 | All three unchanged mobile square episodes |
| 800×900 | Boundary geometry: normal flow, three420px squares, no compare controls, no overflow |

See `browser-final-geometry.json`, `final-*-sequence.png`, individual `final-*.png` captures, and `mobile-review.png`. There are38 current desktop captures (22 large desktop +16 other viewport states), plus3 mobile captures.

Visual findings: copy/media composition remains consistent; controls clear the header; both retired card edges clear the controls; no clipped screenshot content appears outside its frame. Initial retired status-bar fragments were corrected by fading their contents to paper. At600px viewport height the complete phone image is compact, consistent with fitting the whole stage in the viewport; no controls or section copy are clipped. Desktop section typography and mobile crops are unchanged.

One initial1440×600 Stack automation click happened before the resized stage was in view and did not switch mode. Mode was inspected, the stage brought into view, and both affected Stack captures/geometry rows were replaced with verified Stack states. The gallery was rebuilt from corrected captures. This was a capture failure, not accepted evidence.

## Actual scroll motion

For each mode, the browser sampled121 increasing and121 decreasing scroll positions (242 per mode), reading computed image opacity, surface opacity and transforms. Results:

- At most one screenshot has nonzero visible content in either mode.
- Opacity at matching forward/reverse positions is identical (maximum measured difference0).
- Mid-transition opacity and transforms remained exactly unchanged over40 extra animation frames with no scroll.
- Computed CSS transition durations are0s for every image/card.
- Mode change at scrollY1903 kept scrollY1903 and cleared pointer focus.
- Raw traces: `browser-fade-probe.json`, `browser-stack-probe.json`.
- Source mapping independently tested over30,001 progress values per mode:12 invariant groups pass; see `motion-mapping-checks.md` and JSON.

## Controls and navigation

- Pointer step click performs smooth travel (20 distinct sampled positions in the observed tail), then reaches Step1; no stuck focus.
- Keyboard Home selected/focused Step1 and ArrowDown selected/focused Step2 with visible keyboard focus; smooth travel sampled. Focus uses preventScroll.
- Rapid Step3 then Step1 clicks verified in both modes: final selected Step1, image opacity1/0/0, focusBODY.
- Menu navigation from Step2 to Languages:100 sampled travel frames retained one unchanged walkthrough image state while paused. On arrival pause cleared and Languages aligned at120px below the sticky header.
- Mobile390:342×342 frames, correct bottom/top/top object positions, all images decoded, opacity1, no horizontal overflow.
- Mobile800:420×420 frames and comparison group hidden.
- Chrome console error query returned no errors in the reviewed local tab.

## Static checks

Scoped ESLint and `git diff --check` pass. Full `npx tsc --noEmit --pretty false` was run and remains blocked only by existing `.next/types/routes.d 2.ts` duplicate declarations and prop errors in `landing-backup` / `landing-backup-2`. These unrelated files were not modified.

No app/original landing/global CSS change, no marketing-copy edit, no commit, push or deploy.
