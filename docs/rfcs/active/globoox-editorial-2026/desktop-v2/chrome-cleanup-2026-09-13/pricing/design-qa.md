---
type: reference
status: active
owner: product-design
last_verified: 2026-09-13
---

# Pricing sprig rotation — visual verification

All seven final screenshots below were individually opened and visually reviewed after the responsive offsets and the parent's compact-header correction were saved. They include full viewport margins, so exterior botanical pixels are visible. The cookie notice was dismissed through its Necessary only button. Captures use a tall viewport to show the complete pricing block; they are composition checks, not scroll-behavior evidence.

| Width | Evidence | Finding |
| --- | --- | --- |
| 1440 | [Full-width capture](evidence/pricing-1440-final.png) | Complete upper silhouette. Leaves spread above the frame, the stem passes tangentially beside its corner, and no illustration touches the Editorial title or subtitle. Balanced with the unchanged lower-left drawing. |
| 1100 | [Full-width capture](evidence/pricing-1100-final.png) | Narrower page margins retain the whole silhouette. The revised right offset keeps the stem beside the corner rather than moving it into the card. No content or viewport collision. |
| 901 | [Full-width capture](evidence/pricing-901-final.png) | Same corner relationship at the collapsed-header width. Natural leaf tips and lower stem remain visible with exterior clearance. |
| 801 | [Full-width capture](evidence/pricing-801-final.png) | Last three-column width retains the full plant and clear separation from the title and plan content. No clipping at the right viewport edge. |
| 800 | [Full-width capture](evidence/pricing-800-final.png) | First single-column width uses the existing smaller asset size. Its stem meets the Free upper-right corner and its leaves stay above the border. Lower sprig remains at the Free/Premium boundary. |
| 390 | [Full-width capture](evidence/pricing-390-final.png) | Complete upper silhouette fits in the narrow margin; its natural gesture follows the corner without touching the Free title or the introductory copy. |
| 320 | [Full-width capture](evidence/pricing-320-final.png) | Smallest checked viewport retains both complete silhouettes, clear text separation and no horizontal overflow. The upper leaf remains below the longer introductory paragraph. |

No checkerboard, rectangular background, halo or visual crop was observed in these seven captures. Root independently reviewed 1440, 801, 390 and 320px and accepted the tangential placement.

## Measured invariants

[Browser measurements](evidence/measurements.json) confirm no document horizontal overflow at all seven widths. The upper image computes to `matrix(0.866025, -0.5, 0.5, 0.866025, 0, 0)` throughout: exactly the requested −30° rotation. Width, height and top match the previous breakpoint sizes; only the intended responsive right offsets changed.

A source comparison with [before.css.txt](before.css.txt), removing only `.sprig` declaration blocks, is byte-identical. All `.freeSprig` blocks are also byte-identical. Both source PNG hashes match the values recorded in the [decision record](README.md). No component or copy changes were made by this subtask. Scoped whitespace/diff validation passed; no runtime tests were added for this decorative CSS adjustment.

## Browser route

The prescribed in-app browser runtime was attempted first, but failed while importing a missing older `browser-service.mjs` from the plugin's trusted worker. The authorized fallback used Playwright with a fresh anonymous Chrome context against the existing local `/landing-editorial` preview. It did not connect to a personal browser profile or signed-in session.
