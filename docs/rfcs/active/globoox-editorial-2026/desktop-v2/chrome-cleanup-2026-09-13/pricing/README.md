---
type: reference
status: active
owner: product-design
last_verified: 2026-09-13
---

# Pricing upper sprig — counterclockwise corner placement

**Latest authority:** the user requests rotating the existing upper-right pricing sprig exactly 30° counterclockwise and adjusting its placement to follow the card corner. This explicitly supersedes the previous upper-right position/style lock. The illustration itself and the current lower-left botanical remain unchanged.

Only the `.sprig` declarations in `src/components/landing-editorial/PricingSection.module.css` changed. The complete previous stylesheet is preserved in [before.css.txt](before.css.txt).

| Viewport | Unchanged image box | Top | Right | Rotation |
| --- | --- | --- | --- | --- |
| >1100px | 110 × 150px | −80px | −32px, unchanged | −30°, center origin |
| 801–1100px | 110 × 150px | −80px | −32px, previously −20px | −30°, center origin |
| ≤800px | 76 × 105px | −55px | −21px, previously −14px | −30°, center origin |

The desktop position already placed the rotated stem at the rounded corner. Moving the narrower layouts outward preserves this relationship: leaves sit above the top border and the stem continues beside the right edge, with open space around the plan content. The original leaf scale is preserved in each existing breakpoint.

No pixels were regenerated, transformed on disk or edited. Upper-right `public/redesign/pricing/sprig.png` remains SHA256 `1c854142f02c20b4da734bb5cc90793bed476cc479125183193dbfd6bc0d317d`. Lower-left `public/redesign/pricing/free-sprig-v3-b.png` remains SHA256 `cedab9dd40a13215f3ab967aea9ed212c04094ccee7d201f94deb4bbb2ba0fc2`.

[Seven-width visual QA](design-qa.md) is complete. This is pricing-decoration verification only; the parent round separately verifies Header, Footer and removal of other botanicals. Existing typography, canonical text, pricing controls, relative block order, original landing/app and isolated editorial route remain intact. Existing project visuals stay secondary. Earlier design artifacts are preserved; no commit or deployment was performed by this subtask.
