---
type: reference
status: active
owner: design-engineering
last_verified: 2026-09-13
---

# Static How it Works during menu navigation

The user rejected faster travel through the still-pinned walkthrough and approved temporarily presenting it as one ordinary section. This implementation supersedes the three-times-speed route preserved in the adjacent `*.before.txt` snapshots. Original marketing copy, product media, Stack transitions and mobile chapters remain unchanged. No deployment was performed.

## Current behavior

Above 800px, a menu transition temporarily removes the 220svh runway and makes the walkthrough panel relative rather than sticky. Its screenshot state stays frozen. One continuous smoothstep path then traverses the compact page, with no accelerated segment and no visual pinning. How it Works menu visits prepare Step 1 before arrival.

Collapse and restoration compensate the page position before paint. Above the section, the coordinate stays unchanged; below it, the removed runway is subtracted/restored. Within the original runway, the panel's visible top provides the stable reference. On restoration the hook measures fresh geometry, so it does not depend on an old viewport height.

Cancellation exactly at the sticky inset can recover the previous frozen progress. Away from that line, preserving the panel position corresponds to the first or last Stack state. The hook reconciles that state synchronously with restoring layout; it does not leave a stale screenshot for another paint. Wheel, touchstart, pointerdown, scrolling keys, resize, history changes and backgrounding stop navigation. New menu activations cancel their predecessors. Unmount removes temporary presentation and anchoring settings without scrolling another route.

Scroll anchoring is suppressed during the compact transaction, then the original inline value and priority are restored. Mobile navigation keeps the existing chapter layout and does not create a compact desktop state.

## Tall-screen refinement

The first implementation kept only the original panel height. At a 1200px-tall viewport, that could expose the following Quality heading before returning to the How it Works start, then move it away on expansion. Those captures are historical in [initial-no-tail](initial-no-tail/).

Both normal and compact modes now reserve a small blank tail on tall screens:

```css
footprint = max(panel-height, 100svh - header-height - 184px)
normal section height = footprint + 220svh
compact section height = footprint
layout bottom padding = footprint - panel-height
```

The 184px comprises the existing 24px sticky offset plus 160px of lower breathing room. Border-box padding leaves the original grid content height intact. This adds no tail at 1440×1000 and 160px at 1440×1200. It changes only tall-screen section spacing: the manual runway is still exactly 220svh, with the same Stack thresholds and visible content placement. Mobile padding is explicitly zero.

The [live geometry comparison](evidence/panel-measures.json) confirms that changing the footprint from 760px to 920px leaves the tab group top/height at 227.47px/438px and the product deck top/size at 42px/299×648px. The manual runway remains 2640px in both cases. Before tall-screen How it Works restoration, the following Quality heading is at 1286.44px, safely below the 1200px viewport.

## Verification

Six focused Vitest cases passed, including hundreds of exact panel-position checks for collapse/restoration, both directions, immediate cancellation in a middle step, refreshed geometry and subpixel pin-line handling. Scoped ESLint and diff checks passed.

Fresh anonymous Chrome QA captured nine complete routes and cancellations at 1440×1000 and 1440×1200. See [velocity summary](evidence/velocity-summary.json) and [full per-frame records](evidence/all-results.json). Every compact frame moved the panel exactly opposite the page scroll: zero stationary compact frames, zero direction reversals, and zero disagreement between panel motion and scroll motion. Collapse preserved the panel top within 0.047px. Completion differences were the final 1–4px of ordinary travel, with no extra restoration movement. No page errors occurred.

Additional [lifecycle and manual checks](evidence/lifecycle-manual.json) passed:

- Quality → Pricing repeated activation finishes at Pricing, with no residual compact state.
- PageDown cancellation and desktop resizing restore normal geometry and anchoring.
- Resizing during travel to 390px cleans up the desktop state; mobile layout has zero tail padding.
- Mobile Quality navigation arrives at its 108px inset.
- Manual progress 0 → 0.5 → 1 → 0.5 → 0 selects Steps 1 → 2 → 3 → 2 → 1.
- Completed keyboard navigation focuses the destination section without another scroll.

Wheel and Escape cancellation are included in the per-frame captures. Background/unmount cleanup was reviewed in code, not simulated as a real operating-system background/unmount browser test. Native touch interruption was not separately exercised in this round.

Final screenshots visually reviewed include [normal How it Works arrival](evidence/below-to-how.png), [tall How it Works arrival](evidence/tall-below-to-how.png), and [tall cancellation inside the section](evidence/tall-inside-cancel.png). Final page-wide illustration and integration acceptance belongs to the parent round's QA record.

## Reproduction and history

The five adjacent `*.before.txt` files preserve the rejected navigation hook, How it Works component/CSS, compressed-route helper and old tests before editing. They are historical restoration artifacts, not current design authority.

The two `*.cjs.txt` files archive the ad hoc browser checks. They use the repository's Playwright dependency, a fresh anonymous installed Chrome instance, and an explicitly supplied output directory. Run from the repository root and keep temporary captures outside the repository during development to avoid hot reloads. This fallback was used after the available browser runtime failed to import its versioned service; the scripts do not replace the session's browser-selection requirements.
