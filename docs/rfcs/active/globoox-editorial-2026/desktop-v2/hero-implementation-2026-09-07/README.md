---
type: rfc
status: implemented
owner: design-engineering
last_verified: 2026-09-07
---

# Selected hero implementation — 7 September 2026

**Status: implemented; visual and interaction QA passed on 2026-09-07.** Live local route: `/landing-editorial`. User selected the attached ginkgo-margin mock, requested a generated ginkgo asset plus meadow grass from the attached crop, and authorized implementation. This is now the current hero, superseding the earlier exploration-only notices. No deployment or push.

[Final desktop screenshot](desktop-final.png) · [Reference comparison](comparison-final.png) · [Full QA report](design-qa.md)

## Visual target and user amendments

- Main target: `~/Desktop/download-1.png`, identical to [ginkgo-margin](../hero-illustration-2026-09-07/ginkgo-margin.png). Preserve a workspace copy as selected-reference.png.
- Extra illustration: the right-hand grass from [meadow-line](../hero-illustration-2026-09-07/meadow-line.png), specifically confirmed with a user crop.
- Preserve the current Newsreader and DM Sans families, italic emphasis and sage accent in the original headline. These explicit amendments supersede the generated mock's all-Roman, single-color type.
- Header must remain sticky while scrolling, including usable anchor navigation below it.
- Initially select Desktop, Tablet or Phone using viewport media queries. Avoid loading the desktop recording before client resolution on a smaller viewport; preserve manual selection.
- Existing marketing copy, original logo, real recordings and full source aspect ratios remain authoritative. Header → hero → how-it-works → quality → languages → team → start → Footer remains unchanged.
- Only isolated components/styles/assets at `/landing-editorial`. Existing project visuals are secondary references. Preserve all previous docs and user edits. No deployment or push.

## Reference measurements

Reference: 1435 × 1096 raster, desktop target 1440 × 1100. Approximate reference anchors: header 96px, small intro at y148; main two-line headline y191–292; CTA y326–378; device labels y435, underline y455; screen y465–1071. Reference screen is slightly right of the page center and its ratio drifts from the real 1280:820 source. Implementation will use a centered 960px frame with its actual source ratio, a thin contour and restrained shadow. These source-truth corrections are intentional.

## Implemented result

- Original title is split into a 32px introductory line and two 56px main lines. Newsreader, DM Sans, italic emphasis and sage color are preserved. The optional added eyebrow is removed; canonical title text is unchanged.
- At 1440×1100, the sticky header is 96px high; the CTA starts at y326.35; the centered recording frame starts at y463.35 and measures 960×615.72px. Actual video retains its 1280:820 source ratio inside the 1px frame. See the QA report for all dimensions.
- Separate generated PNGs provide ginkgo at the lower left and meadow grass at the right. Both are 887×1774 RGB files with near-white backgrounds, **not transparent PNGs**. Two attempted alpha outputs per asset contained painted checkerboards and were rejected. The selected white-background outputs blend into the isolated ivory hero using CSS multiply. Original generated pixels are copied unchanged. [Ginkgo provenance and prompts](ginkgo-asset.md) · [Grass provenance and prompts](grass-asset.md).
- First client load chooses Phone at ≤600px, Tablet at 601–1100px, Desktop above 1100px. Server HTML does not attach a video source. The initial choice is cached; resizing does not override it or the user's subsequent manual tab selection.
- Muted autoplay, offscreen/background pausing, accessible manual tabs and real source media remain. Header anchors clear the sticky bar; mobile navigation closes after selection.
- Full section order, all other canonical copy, existing app icon, product and original landing remain intact. Existing project visuals remain secondary references.

## Evidence and verification

- [Desktop final](desktop-final.png), [sticky header at Languages](sticky-languages.png), [phone initial](phone-initial.png), [tablet initial](tablet-initial.png), [mobile sticky navigation](sticky-phone.png).
- [Comparison page](comparison.html), [captured normalized comparison](comparison-final.png), [device boundary measurements](device-checks.json).
- Initial device selection checked at 390, 600, 601, 834, 1100 and 1101px. Manual selection, resize persistence, keyboard Home, autoplay and offscreen pause passed. No horizontal overflow at these widths.
- Scoped ESLint and TypeScript pass. Browser console records the local PostHog missing-token configuration error; no hero component exception was observed. Full production build was not rerun for this scoped revision.

`desktop-first.png`, `desktop-second.png` and `desktop-revised.png` are development evidence only. The first had incorrect blending and grass scale; the second preceded final type sizing; the revised capture was taken before fonts/assets loaded. Only `desktop-final.png` establishes final visual state. Earlier hero mockups and all prior documentation are preserved.
