---
type: postmortem
status: complete
owner: design-engineering
last_verified: 2026-09-07
---

# Selected hero implementation QA — 7 September 2026

**final result: passed** for the requested 1440px desktop hero and the interactions below. No open P0, P1 or P2 findings in this revision. Root inspected the generated assets, browser implementation and source comparison; an independent visual review and independent code review found no blocking issues.

## Source, scope and normalization

The user explicitly selected [the ginkgo mock](selected-reference.png), added the meadow-grass subject from another mock, and requested implementation with sticky navigation, initial media-query device selection, unchanged font families, and preserved italic/sage emphasis. These amendments are the visual authority; the generated mock's all-Roman text and re-rendered app pixels are not implementation requirements.

Source raster: 1435×1096. Browser final: 1440×1100 CSS and screenshot pixels, DPR 1. [The comparison page](comparison.html) fits both images into equal-width columns; [its browser screenshot](comparison-final.png) was reviewed alongside the full-resolution [final hero](desktop-final.png). The final capture shows the opening French reader state of the actual video. Product pixels naturally differ from the generated source, and later animation frames change.

Only isolated hero/header/media selection and their new asset/style rules changed in this round. Original landing and product remain untouched; current section order and canonical copy remain intact. Existing project visuals stay secondary references. Earlier exploration and implementation evidence is preserved as history.

## Five fidelity surfaces

| Surface | Review and result |
| --- | --- |
| Composition | Centered text, compact action, tabs above a large complete product screen. Ginkgo sits low at left; the taller grass is asymmetric at right. Plants remain outside the text and interactive screen. Pass. |
| Typography | Existing Newsreader and DM Sans retained. Canonical title is live HTML with a smaller introduction and two larger lines. Existing sage italic ending retained. Exact concatenated title matches canonical text, including the nonbreaking hyphen in e‑books. Pass. |
| Geometry and spacing | Header 96px; CTA y326.35; tabs y407.35; recording y463.35. Source CTA is approximately y326 and screen y465. Centered real-ratio video intentionally corrects the generated source's slight offset and aspect-ratio drift. Pass. |
| Color and surfaces | Original ivory/pine/sage palette; 1px warm contour, restrained shadow and quiet underlined active tab. Near-white botanical raster backgrounds disappear through multiply against the hero's opaque paper layer. No visible rectangular matte/checkerboard in final evidence. Pass. |
| Assets and detail | Original app icon, original video and posters, exact media ratios. Two generated PNG botanicals visually match Languages' sparse drawing manner while using different subjects. Decorative wrappers are hidden from assistive technology and pointer-inert. Pass. |

## Final desktop dimensions

Measured at 1440×1100 after fonts, icon and images loaded. Subpixel values are rounded here.

| Element | x | y | Width | Height |
| --- | ---: | ---: | ---: | ---: |
| Sticky header | 0 | 0 | 1440 | 96 |
| Header inner | 80 | 0 | 1280 | 96 |
| Heading | 220 | 144 | 1000 | 167.35 |
| Upload action | 601.16 | 326.35 | 237.69 | 54 |
| Controls row | 240 | 407.35 | 960 | 44 |
| Recording frame | 240 | 463.35 | 960 | 615.72 |
| Video content | 241 | 464.35 | 958 | 613.72 |
| Ginkgo wrapper | -14 | 599.07 | 260 | 480 |
| Grass wrapper | 1144 | 379.07 | 350 | 700 |

Introduction: 32px / 38.4px. Main title: 56px / 60.48px, tracking −0.8px, weight 400. Emphasis: same size, italic, `rgb(113,129,104)`. Ginkgo image fits within the wrapper at 240×480px; its visible artwork is approximately 203×452px. Grass artwork is approximately 216×654px within its 350×700px canvas. Blank raster margins are accounted for in placement.

## Findings corrected during review

1. Initial blending showed white asset rectangles. Moved the blend context to an isolated hero with an opaque paper background and removed isolation from the transparent product stage. Final browser capture has clean integration.
2. Initial grass was too small relative to the supplied crop. Increased the desktop wrapper to 350×700px and adjusted its right-edge placement. The visible top stays below the headline/action area.
3. Initial 58px headline pushed the action and recording below the source anchors. Refined the main title to 56px while preserving the existing family, italic and color; final CTA/screen start positions align closely with the selected source.
4. An immediate-reload screenshot caught fallback fonts/unloaded assets. It is explicitly marked historical; final evidence was captured after actual fonts and assets appeared.

Optional P3 observation: the tall right grass carries more vertical emphasis than the left ginkgo. This is an intentional asymmetric reading of the user's added grass crop, with no overlap or product obstruction; no further change is required for handoff.

## Interaction and engineering checks

- SSR video markup has no `src`, avoiding a desktop recording fetch before the initial viewport resolves. One video element is rendered.
- Initial media-query choice passes at 390 and 600px (Phone), 601, 834 and 1100px (Tablet), and 1101px (Desktop). [Recorded results](device-checks.json). The 1101px check explicitly waited for a hydrated video source before recording its corrected result.
- Resizing from 1101 to 834px without reload preserves the initial Desktop selection. Manually selecting Phone and resizing to 1440px preserves Phone. Home selects and focuses Desktop; manual Tablet loads the correct source and preserves its 768:1170 ratio.
- Muted autoplay advances time without a playback gesture (observed 1.7s to 11.964s); scrolling to Languages pauses the recording. Existing hidden-document pausing and native fallback controls remain in code.
- Desktop Languages navigation: header top 0, height 96px; destination section top 120.02px. [Evidence](sticky-languages.png).
- Phone at 390px: initial Phone source; no horizontal overflow. Mobile menu opens at x20, width350px; choosing How it works closes it. Header top0, height84px; destination top108.09px. [Initial phone](phone-initial.png) · [sticky phone](sticky-phone.png).
- Tablet at 834px: initial Tablet source, no horizontal overflow. [Evidence](tablet-initial.png). Basic small-viewport checks support device/header behavior; comprehensive responsive art direction remains deferred by the user.
- Scoped ESLint on the changed TSX files passes. Scoped TypeScript program for the isolated route/components, using repository compiler options, reports zero diagnostics. `git diff --check` passes. Repository documentation validation passes.
- Browser logs contain repeated local PostHog initialization errors because no token is configured. No hero component/runtime exception was observed. Analytics configuration was not modified for this visual revision.
- A repository-wide production build and full test suite were not rerun for this scoped hero revision. Older build/test records are historical; this report does not claim a new production build pass.

## Asset provenance and remaining limits

Both PNGs are 887×1774 RGB, **without alpha**. Attempts requesting alpha returned painted checkerboards and were rejected. The final built-in ImageGen outputs use near-white backgrounds and are copied unchanged; CSS multiply is verified on this light hero surface. They must be regenerated or processed with an appropriate asset tool before reuse as true transparent cutouts on an unrelated dark surface. [Ginkgo prompts/provenance](ginkgo-asset.md) · [Grass prompts/provenance](grass-asset.md).

Current local preview is `/landing-editorial`. No deployment or push was performed. Prior artifacts and unrelated billing RFC edits are preserved.
