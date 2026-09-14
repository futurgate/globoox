---
type: archive
status: archived
owner: design-engineering
last_verified: 2026-09-07
---

# Hero typography — ImageGen studies, 7 September 2026

**Exploration complete; no option selected or implemented.** User requested ImageGen after challenging the previous hero recommendation and identifying weak typography. These are controlled typesetting studies using the current page, not a new visual direction. Live landing code was not changed in this round. No commit, push or deploy performed in this round.

The earlier HTML specimen in `../hero-type-2026-09-07/` remains an unreviewed, superseded workflow artifact. Earlier project visuals are secondary references. Canonical copy, original app icon, real product media, block order and isolated route remain mandatory.

## Inputs and generation

Each independent built-in ImageGen call received exactly these directly inspected inputs:

1. [Current actual hero capture](../hero-exploration-2026-09-07/current.png), 1440 × 1100, as the edit target.
2. `public/images/device-posters/mac.webp`, the actual two-column French reader, as product grounding.

No fictional reader reference was attached. All three calls requested the same 1440 × 1100 canvas, canonical full headline words in order, current navigation/CTA/device controls, current botanical framing and thin demo contour. Only headline typography and resulting vertical space were intended to vary. Direction 3 explicitly removes the optional added eyebrow; original marketing text stays intact.

Exact full prompts are saved alongside the images. Files are unchanged copies from `~/.codex/generated_images/01a07109-a720-7981-ada1-2f1ba712a484/`. No CLI fallback, raster post-processing or code compositing was used.

## Authoritative display order

Each image was shown once in the main conversation, in this order. These numbers supersede the earlier hero exploration's numbers for a subsequent selection.

| Display | Image | Exact prompt | Original output filename |
| --- | --- | --- | --- |
| 1 | [Open three lines](open-three-lines.png) | [Prompt](open-three-lines-prompt.txt) | exec-7b900f71-4000-421b-b127-3159467209d1.png |
| 2 | [Compact two lines](compact-two-lines.png) | [Prompt](compact-two-lines-prompt.txt) | exec-e2f0cac3-7839-444e-bdb9-fe4386dcde1d.png |
| 3 | [Sentence hierarchy](sentence-hierarchy.png) | [Prompt](sentence-hierarchy-prompt.txt) | exec-ff85b8d5-cf9e-49dc-a3e0-886d43363f43.png |

[Comparison gallery](index.html) includes the current hero for direct comparison.

## Visual review

1. Upright, single-color setting removes the unrelated italic tail and gives the three lines a calmer rhythm. However, the long sentence remains one large uniform block and the demo starts at roughly the same vertical position. Useful corrective baseline, not a demonstrated large improvement.
2. Two lines free vertical space and raise the demo, but the generated letters are visibly too tightly packed despite the looser tracking instruction. The extra gap between CTA and device row also drifts from the source. Do not reproduce this literal typesetting.
3. Separating the product-category introduction from the capability makes the hierarchy more meaningful without deleting words. The output's large lines are heavier and larger than requested, and the introductory line ending in “that” needs careful connection to the continuation. Strongest hierarchy hypothesis, not yet a polished final result. It does not substantially raise the demo.

All three preserve the full headline's words and their order. The prompt and raster use the ordinary hyphen in “e-books”; any future implementation must use canonical `getLandingMessages('en')` text including its nonbreaking hyphen. Generated headline geometry does not prove exact real-font metrics.

ImageGen re-renders the original app screenshot and icon, drifts in spacing/weight, and retains the source's development indicator. These generated pixels must never replace the actual video, actual app icon or live text. The third image retains the source capture's open language menu; the first two use the poster's closed menu. This is an incidental frame difference, not a proposed product change. Product source aspect ratio remains 1280:820 in any future code.

Next step: user feedback or selection, then targeted refinement if needed. No typography solution is claimed as approved or finished.

## Follow-up discussion — typography and illustration direction

User asks root's choice and compares hero illustration style with Languages, tentatively preferring Languages. This is a discussion, not implementation approval.

Root recommends developing displayed option 3's sentence hierarchy, with lighter/smaller main lines and the introductory phrase connected more closely to its continuation. Option 1 remains the calmer uniform-setting baseline; option 2's compressed generated type is unsuitable as a literal target.

Use Languages as the proposed illustration-system reference: sparse organic lines, a few muted olive leaves, restrained texture and substantial empty space. Both existing treatments already share a botanical family; the main mismatch is hero density, scale and aged rendering. Hero's dense full-height ferns and seed heads compete with the product and create a faded, busy lower edge. Languages integrates illustration with the actual available/future-language content more successfully.

Proposed next hero study: preserve the real demo and original words; place a modest asymmetric branch near one lower outside corner of the demo, with an optional much smaller counter-accent. Leave heading, CTA, device controls and product pixels clear. Regenerate simpler shapes rather than merely reducing opacity. Keep the full tree as the Languages-specific composition; other sections share its drawing treatment without repeating the tree or adding decoration everywhere. No new image or code change is implied by this recommendation.
