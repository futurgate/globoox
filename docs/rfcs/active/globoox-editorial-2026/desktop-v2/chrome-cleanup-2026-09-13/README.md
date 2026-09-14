---
type: reference
status: current
owner: design-engineering
last_verified: 2026-09-13
---

# Header/footer refinement and botanical simplification

User rejects the Quality and closing CTA plant placements. Remove their runtime rendering, preserve all assets and exact source composition snapshots. Enlarge header/footer type; lower wordmark, reduce icon, space Open App. Upper-right pricing artwork now rotates−30° and may move; prior placement lock is superseded, asset pixels stay unchanged. Lower-left pricing and hero/Languages artwork remain. No deployment.

**Implemented and visually reviewed at `/landing-editorial`.** Existing project styling remains secondary; canonical copy, type families and motion are preserved. Earlier praise of the Quality/CTA botanical placements is superseded by the user's rejection.

## Changes

- Quality and closing CTA no longer render botanical illustrations. Quality returns exactly to the component and CSS before the previous botanical transfer, including calibrated Russian/English typography. CTA bottom padding is reduced to96px desktop/80px phone, removing the space reserved for artwork. Its app icon and original words remain.
- Header menu is16px instead of14px; compact desktop is15px instead of13px. Expanded navigation is18px instead of16px. Locale text is16px. Open App is15px, with48px separation from the selector on wide desktop and36px on compact desktop.
- Header app icon is28px instead of34px. The existing32px wordmark is optically lowered3px; its family and lettering are unchanged.
- Footer copyright and Back to top are16px instead of12px. Back to top uses a vertical18px ArrowUp, with a10px text/icon gap. The original informational paragraph remains14px. The bottom row's top gap is32px instead of43px.
- Existing upper-right pricing sprig is rotated exactly−30° around its center. Its position is adjusted by breakpoint to keep the stem tangent to the corner. PNG pixels, size and the lower-left sprig remain unchanged. [Placement details and review](pricing/README.md).

## Header layout decisions

The first pass wrapped menu labels at1101px and901px. The final layout uses compact header spacing from1200px and a collapsed navigation menu at1000px. Visible desktop items are single-line and do not shrink. The existing96px/84px header heights still switch at900px; hero/device/walkthrough breakpoints remain unchanged.

The opened menu sits12px below the header divider. Its previous overlap made the divider cross the panel near its top edge; final captures verify a single clean panel border and space below the header. This is purely menu positioning and does not change section scroll offsets.

## Preserved artwork

All removed art stays in its original asset folders, with exact component/style snapshots and previous composition screenshots linked in the [reuse archive](retired-artwork.md). No images were deleted or regenerated in this round. Source hashes also protect both pricing PNGs and the unrelated dirty billing RFC.

## Visual and interaction verification

Header and footer were reviewed at1440,1280,1101,1100,1050,1024,901,900,390 and320px. Boundary captures add1201/1200 and1001/1000. The first pass is retained under `first-pass/`; final screenshots are under `evidence/`.

- [Full hero/header](evidence/hero-1440-final.png), [desktop header](evidence/header-1440-final.png), [1001px desktop boundary](evidence/header-1001-boundary.png) and [320px opened menu](evidence/menu-320-final.png).
- [Desktop closing/footer composition](evidence/closing-1440-final.png), [phone](evidence/closing-390-final.png) and [320px footer](evidence/footer-320-final.png).
- [Clean Quality desktop](evidence/quality-1440-final.png) and [clean phone CTA](evidence/start-390-final.png).

No horizontal document overflow, wrapped desktop menu items or clipped expanded-menu links were found in final checks. At1000/901px the expanded menu starts at108px; at900/390/320 it starts at96px, always12px below the corresponding header. Navigation to Quality still lands at120px or108px as appropriate. Back to top from desktop and phone returns smoothly to scrollY0 and `#hero`, with no residual compact walkthrough state. [Recorded interaction values](evidence/final-interactions.json).

Independent visual review agreed on header optical balance, Open App separation and the removal of botanical whitespace. Root kept the mission paragraph's quieter14px setting because the user specifically enlarged the two bottom-row labels.

Pricing was visually checked at1440,1100,901,801,800,390 and320px; the full silhouettes fit, and artwork does not intersect pricing copy/actions. Root also inspected desktop,801px,390px and320px final captures.

Scoped ESLint and TypeScript from the landing entry point passed. Six preservation hashes match; Quality component/CSS exactly match the prior pre-botanical snapshots. No new unit tests were added for these presentation-only changes. Navigation behavior was exercised in the browser, with no page errors. No commit, push or deployment.

Repository documentation validation also passes:114 governed files, with no missing metadata or broken local links. `git diff --check` passes.
