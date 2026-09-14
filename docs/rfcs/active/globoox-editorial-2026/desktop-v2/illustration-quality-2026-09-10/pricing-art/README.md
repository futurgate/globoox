---
type: reference
status: active
owner: product-design
last_verified: 2026-09-10
---

# Pricing corner botanical — redraw round

The user strongly rejected the previous lower-left botanical. The older `public/redesign/pricing/free-sprig.png` and its aesthetic acceptance statements are superseded; preserve it only as history. Technical background checks from that round do not establish visual quality.

This round creates two independent compositions and refines the stronger horizontal candidate. All were generated with built-in ImageGen, inspected at source size and in a multiply preview on exact page paper. Root owns layout comparison and final selection; these asset reviews do not claim that a finished landing placement has passed.

## Candidates and critique

| Asset (repository relative) | Composition | Assessment |
| --- | --- | --- |
| `public/redesign/pricing/free-sprig-v2-a.png` | Open upward fork, five unequal leaves | A more coherent corner shape than the rejected isolated stalk. It can follow the card's left edge. The upper leaves and stems still feel relatively substantial; avoid shrinking it into a tiny hanging plant. |
| `public/redesign/pricing/free-sprig-v2-b.png` | Shallow rising sweep, four separated leaves | Better relationship to the bottom border and no long downward tail. Initial stem is somewhat heavy and leaf intervals slightly regular. Retained as history and an alternate. |
| `public/redesign/pricing/free-sprig-v2-b-refined.png` | Refined shallow sweep with thinner stem and smaller middle leaf | **Asset reviewer preference.** Finer line, calmer veins, shortened bare starting stem and uneven leaf sizes. More like a margin illustration than an isolated specimen. Best starting point for a composed lower-left border accent. |

The preference is relative to these candidates, not a claim that root or the user has approved the final placement. Keep the approved upper-right `sprig.png` unchanged. The new asset should meet the corner or border deliberately and stay clear of the Free CTA; moving the old tiny stalk farther out into whitespace would not solve the original problem.

## Inputs and exact prompts

- Approved pricing drawing reference: `public/redesign/pricing/sprig.png`.
- Approved drawing-family reference: `public/redesign/language-garden/tree.png`.
- Rejected in-page composition was inspected from `../../pricing-refinements-2026-09-10/pricing-1440-settled.png`.
- `free-sprig-v2-a-prompt.txt`: independent upward fork.
- `free-sprig-v2-b-prompt.txt`: independent shallow diagonal sweep.
- `free-sprig-v2-b-refined-prompt.txt`: edit of B, finer stem and calmer leaf detail.

Only existing approved drawing manners were used as positive references. The rejected old asset was not used as the generation target.

## Format / provenance

All three files are unchanged copies of built-in ImageGen results. They are **RGB PNGs with near-white backgrounds, no alpha**. Use CSS `mix-blend-mode: multiply` on the warm paper surface, as already established for hero assets. No code-based drawing edits, masking, recoloring or background removal were performed.

| Variant | Dimensions | File bytes | SHA-256 |
| --- | --- | --- | --- |
| A | 1088 × 1445 | 1,087,878 | `a9da0ce2ca877dfe572159cc0cbd23becabe83aaaec19aaa31974bf23aa5743c` |
| B | 1536 × 1024 | 1,154,866 | `22f7c706aaa206457d1900e67c59a49d9a87dab1472337c247b8138b8cd33b2b` |
| B refined | 1536 × 1024 | 1,051,977 | `d86a61e6543382915904f2515b65bce3d2bb850169a8af5e4cf0b712396860c7` |

`asset-metadata.json` records metadata and near-white pixel proportions. `candidates-multiply-preview.png` shows A, B and B refined from left to right on #f7f5ed. It is a QA composition only; production assets are untouched. No checkerboard or visible hard background edge appears at the reviewed display scale. A retains more internal texture; B refined most successfully reduces that anatomical emphasis.

Preserve source aspect ratios (`object-fit: contain` in differently shaped boxes). A is portrait; both B files are landscape 3:2, so they need a wider, shallower composition than the old portrait sprite. Suggested initial display scale is roughly 125 × 166 for A or 180 × 120 for B, subject to root's in-page visual review rather than a fixed requirement.

No source code, root documentation, commit or deployment was changed in this asset subtask.
