---
type: reference
status: active
owner: product-design
last_verified: 2026-09-13
---

# Pricing lower-left botanical — tangential corner redraw

**Latest authority:** the user requests a new lower-left plant with the same leaf scale, stem weight and drawing density as the praised upper-right sprig. Its growth should follow the outside lower/left edges of the Free card, not point diagonally toward the card center. Earlier preferences for a very airy thin lower twig and `free-sprig-v2-b-refined.png` are superseded by this request. All earlier artwork remains preserved.

The upper-right illustration is locked: its source bytes, JSX and all CSS positioning/style rules remain unchanged. This task changes only the lower-left asset reference, responsive asset sizes and `.freeSprig` rules within the isolated pricing component.

## Generation and selection

Two independent built-in ImageGen candidates were created using the approved `public/redesign/pricing/sprig.png` as the drawing reference. Exact prompts are saved alongside this document.

| Candidate | Asset | Assessment |
| --- | --- | --- |
| A | `public/redesign/pricing/free-sprig-v3-a.png` | Three substantial leaves growing left along a nearly horizontal bowed stem. Its density belongs to the upper sprig, but the spread reads more as a loose botanical placed beside the card than a corner composition. Preserved as an alternate. |
| **B — selected and connected** | `public/redesign/pricing/free-sprig-v3-b.png` | Three substantial leaves along a soft hook: the lower stem runs left beside the bottom edge and foliage turns upward at the outside left. No upward/right arrow into the card. Its natural bend is more directly useful at this corner, so it was selected for implementation. |

The selected B file is an unchanged copy of the built-in ImageGen output: 1536 × 1024 RGB PNG, 1,316,208 bytes, **no alpha channel**. Its near-white background uses the existing CSS multiply treatment and brightness correction. No code-based drawing edits, masking or recoloring were performed. The existing upper-right image remains an alpha PNG.

Prompts: `free-sprig-v3-a-prompt.txt` and `free-sprig-v3-b-prompt.txt`. Full metadata and hashes are in `asset-metadata.json`. The QA-only image `a-b-approved-upper-paper-preview.png` shows A, B and the unchanged upper sprig from left to right on #f7f5ed. It was inspected at intended rendering scale: B's leaf mass and stem weight now form a much closer pair with the upper-right artwork than the thin previous V2.

## Implementation

`src/components/landing-editorial/PricingSection.tsx` now references `/redesign/pricing/free-sprig-v3-b.png` and declares 126px mobile /168px desktop responsive sizes. Its intrinsic 1536:1024 ratio remains intact.

`src/components/landing-editorial/PricingSection.module.css` changes only `.freeSprig` declarations:

| Viewport | Box | Left offset from Free card | Bottom offset |
| --- | --- | --- | --- |
| >1100px | 168 × 112px | −36px | −14px |
| 801–1100px | 168 × 112px | −30px | −14px |
| ≤800px | 126 × 84px | −18px | −10px |

The bend follows the Free lower-left corner while the upper leaf remains near its left edge. The shorter lower offset replaces the old hanging placement. The card's original padding, text, button, typography, shared frame, Premium behavior and all upper-right plant rules are intact.

Before snapshots are preserved as `before-PricingSection.tsx.txt` and `before-PricingSection.module.css.txt`. They are history and restoration material, not current authority.

## Verification

Automated invariant checks confirm:

- Upper-right asset SHA256 remains `1c854142f02c20b4da734bb5cc90793bed476cc479125183193dbfd6bc0d317d`.
- Every `.sprig` CSS block is byte-identical to its before snapshot.
- All CSS outside `.freeSprig` is byte-identical.
- Component changes are limited to the lower-left source and sizes attributes; upper-right JSX is unchanged.

Scoped ESLint for `PricingSection.tsx` and `git diff --check` passed. After integration, the asset reviewer inspected root's full-width `pricing-{width}-with-margins.png` captures at **1440, 1100, 901, 801, 800, 768, 390 and 320px**. Root will archive the corresponding files in the parent round's evidence directory. Earlier element-only captures cropped decoration outside the section rectangle and must not be used to infer CSS clipping.

| Reviewed widths | Finding |
| --- | --- |
| 1440 | Both complete silhouettes are visible with open margins. Lower leaf/stem weight belongs to the upper drawing; the stem follows the lower edge and the leaves turn up beside the outside left corner. No Free CTA or note collision. |
| 1100, 901, 801 | Both complete silhouettes remain inside the viewport. The leftmost lower leaf has modest but visible outer clearance; the upper lower-sprig leaf sits beside the CTA with a visible gap, without touching its outline or text. The inward-pointing V2 gesture is gone. |
| 800, 768 | At the single-column transition, the lower sprig follows the Free/Premium boundary and the outer left edge. Its full leaves and stem are intact; no premium text intrusion. Leaf weight remains coherent with the smaller upper sprig. |
| 390, 320 | Entire lower silhouette remains visible despite narrow page margins. The closest leaf stays outside the Free button's left edge with clear separation; no contact with text or clipping at the viewport. The lower stem meets the Free/Premium line instead of hanging in an unrelated empty area. |

No checkerboard, halo or rectangular background artifact was visible in any of these eight full-width captures. No further CSS correction was needed after this integrated pricing review. The upper-right appearance remains consistent with the before captures, supported by the byte-level source/style invariants above.

This completes the **pricing botanical** visual review only; it does not claim results for the other navigation, Quality or closing work in the parent round. No original landing/app code, shared styles, commit or deployment was changed by this subtask.
