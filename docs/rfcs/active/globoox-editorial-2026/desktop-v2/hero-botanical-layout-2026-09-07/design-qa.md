---
type: rfc
status: implemented
owner: design-engineering
last_verified: 2026-09-07
---

# Hero botanical composition QA

**final result: passed** for this isolated botanical revision. No open P0, P1 or P2 findings.

## Authority and intentional changes

The user requests mirroring the left ginkgo and harmonious composition for every selected-device × breakpoint combination. The subsequent explicit correction rejects reducing the plants: keep the drawing large and vary placement, occlusion and cropping. The earlier scale-down implementation and its 39-case results are archived in `scaled-rejected/`; they are not current design evidence.

The selected generated source remains [the ginkgo hero](../hero-implementation-2026-09-07/selected-reference.png), amended by the user's requests for grass, original type/italic/sage treatment, horizontal mirroring and now fixed illustration scale. No new raster generation or editing was needed; the mirror is a CSS transform of the existing ginkgo image.

## Visual comparison

[Combined browser comparison](comparison-final.png) uses a 1440×900 viewport and fits the 1435×1096 source and 1440×1100 final Desktop screenshot into equal-width columns. Root inspected this comparison, the full-size Desktop capture, portrait recordings and narrow crops. Actual recording pixels and animation states differ from the generated product image intentionally; real app media remains authoritative. The final Desktop capture shows the translated English reader frame, and the final wide Phone capture shows the real language menu. Neither is a fabricated interface.

| Fidelity surface | Result |
| --- | --- |
| Composition | Plants anchor to the selected recording's frame. Wide Desktop, Tablet and Phone form one group; plants no longer sit remotely at viewport edges when the frame narrows. Narrow Phone uses one large ginkgo fragment. Pass. |
| Typography | Original words, Newsreader/DM Sans, 32px intro / 56px desktop main type, sage italic ending and control styling unchanged. Pass. |
| Geometry | Every visible ginkgo is 240×480px; every visible grass is 320×640px. Normal overlap is 40.8px / 80px; narrow portrait ginkgo overlap is 86.4px. Device-specific visibility avoids squeezing both illustrations into inadequate margins. Original frame widths and media aspect ratios are restored. Pass. |
| Color and surfaces | Existing near-white PNGs blend into the isolated ivory hero with multiply. No visible checkerboard or rectangular image boundary. Thin frame, shadow and background remain. Pass. |
| Assets and details | Only the ginkgo image receives scaleX(-1). Its wrapper positioning remains independent. The opaque frame covers overlapping stems/leaves; decoration is pointer-inert and hidden from assistive technology. Pass. |

At 1440px with Desktop selected, the recording remains x240, y463.35, width960, height615.72. Heading/action/control anchors remain unchanged. Full-size ginkgo enters behind the left frame edge; grass enters behind the right frame edge. Full-size illustration crops at viewport boundaries are intentional, including the narrow Phone crop; no miniature plant is used.

## Coverage

[Measurements](measurements.json) contain all 39 combinations: Desktop, Tablet and Phone selected at **320, 390, 480, 481, 600, 601, 834, 900, 901, 1100, 1101, 1440 and 1920px**. Checks found:

- Zero page horizontal-overflow cases.
- Zero visible-asset size deviations from 240×480 / 320×640.
- Correct visibility on both sides of the 480, 600, 900 and 1100px composition boundaries.
- Device-specific stage widths and source ratios preserved for manual selections, including Desktop on a phone-sized window and Phone on a wide window.
- The existing cached initial media-query selection is untouched. CSS composition updates on resize while the chosen recording remains selected.
- Original source video still plays automatically, muted. Final Desktop and Phone captures were verified with readyState 4 and advancing playback; initial empty loading captures were replaced.
- Image wrappers remain aria-hidden and pointer-events:none; ginkgo transform is a horizontal mirror. The frame's z-index covers overlap without placing decoration over the recorded interface.

Curated evidence: [Desktop](desktop-final.png), [wide Tablet](1440-tablet.png), [wide Phone](1440-phone.png), [834px Tablet](834-tablet.png), [834px Phone](834-phone.png), [390px Phone](390-phone.png). An independent visual review inspected the five portrait compositions and passed their scale, crop and hierarchy. It requested replacing one blank loading capture, which was corrected and visually rechecked by root.

## Corrections and verification limits

The first attempt shrank both plants per device and viewport. The user rejected that direction; it was replaced, not polished further. Fixed-size artwork now uses selective visibility and intentional occlusion. The temporary additional reduction of the Desktop frame was also removed.

Scoped ESLint and isolated TypeScript pass (0 diagnostics). Documentation validation and git diff whitespace checks pass. Existing original landing/product/shared styles, media files, source PNGs and unrelated billing RFC edits are preserved. No new full production build claim; no deployment or push. Sticky header and initial device-selection logic are unchanged from the previously verified implementation. Comprehensive responsive redesign of other sections remains outside this correction.
