---
type: rfc
status: implemented
owner: design-engineering
last_verified: 2026-09-07
---

# Hero botanicals — fixed scale and frame anchoring

**Implemented; visual and interaction QA passed.** This revision preserves full-size botanical illustrations while adapting their overlap, viewport cropping and visibility to the selected recording. [Current QA](design-qa.md) · [Desktop final](desktop-final.png) · [Wide Phone](1440-phone.png) · [Narrow Phone](390-phone.png) · [Reference comparison](comparison-final.png).

**The user rejected reduced-size botanicals.** Every screenshot and measurement in [scaled-rejected/](scaled-rejected/) belongs to that rejected attempt. Those files remain historical evidence and must not be used as current visual authority. Earlier favorable review statements about miniature botanical scaling are superseded by this explicit correction.

## Current composition contract

The existing ginkgo and meadow-grass PNGs now live inside the actual product recording stage. Its width follows the selected Desktop, Tablet or Phone recording. The illustration roots therefore stay attached to the recording edges when a visitor switches device tabs, instead of remaining attached to viewport edges.

- Ginkgo retains a **240 × 480 CSS px** image box whenever shown. Its wrapper is anchored with `right: 100%` and `bottom: 0`. The image alone is mirrored with `scaleX(-1)`, leaving the wrapper anchor unchanged.
- The normal ginkgo translation is **17%**, or **40.8px**, toward the frame. For Phone and Tablet at viewport widths of 600px or less, it becomes **36%**, or **86.4px**. This changes overlap without changing illustration scale.
- Meadow grass retains a **320 × 640 CSS px** image box whenever shown. It is anchored with `left: 100%` and `bottom: 0`, then translated **−25%**, or **−80px**, toward the frame.
- The frame has `position: relative`, `z-index: 1` and an opaque background; it hides the portions of the botanical stems that overlap it. The page's existing `overflow: clip` supplies intentional viewport-edge cropping.
- Both illustrations retain `mix-blend-mode: multiply` for their near-white RGB backgrounds. The existing isolated hero supplies the blending context. Neither PNG is represented as a transparent cutout.
- Decoration remains `aria-hidden`, has empty image alt text and uses `pointer-events: none`. It cannot obstruct device controls or product interaction. Absolutely positioned artwork does not change the recording stage's layout height or playback visibility bounds.

## Device × viewport matrix

`w` is the viewport width in CSS pixels. This table describes the **selected recording**, including manual selections that differ from the initial media-query choice. Every visible ginkgo remains 240 × 480px and every visible grass remains 320 × 640px.

| Viewport | Desktop selected | Tablet selected | Phone selected |
|---|---|---|---|
| `w > 1100` | Ginkgo 17%; grass −25% | Ginkgo 17%; grass −25% | Ginkgo 17%; grass −25% |
| `900 < w ≤ 1100` | Ginkgo 17%; grass hidden | Ginkgo 17%; grass −25% | Ginkgo 17%; grass −25% |
| `600 < w ≤ 900` | Both hidden | Ginkgo 17%; grass −25% | Ginkgo 17%; grass −25% |
| `480 < w ≤ 600` | Both hidden | Ginkgo 36%; grass hidden | Ginkgo 36%; grass hidden |
| `w ≤ 480` | Both hidden | Both hidden | Ginkgo 36%; grass hidden |

The narrow rules selectively hide artwork where its full scale would crowd the selected frame. They do not resize the PNGs. At widths of 600px or less, device-tab text remains 12px with 20px gaps and an 18px gap below the controls; tab gaps become 14px at 370px or less.

## Recording frame sizes and behavior

Original frame sizing is restored. The rejected attempt's additional `100vw - 144px` desktop-frame cap is removed.

| Recording | Stage/frame width |
|---|---|
| Desktop | Full available showcase width, capped at 960px |
| Tablet, `w > 600` | `min(385px, 100%)` |
| Tablet, `w ≤ 600` | `min(350px, 100%)` |
| Phone | `min(250px, 100%)` |

Available showcase width comes from the existing centered reader wrapper: the product-stage width minus 160px above 900px, viewport width minus 64px at 900px or less, and viewport width minus 40px at 540px or less. The product stage itself remains capped at 1440px. The 960px showcase cap applies throughout.

The 1px frame border, 10px corners, shadow and real recording aspect ratios are unchanged: Desktop 1280:820, Tablet 768:1170, Phone 540:1170. Stage and frame share the same selected-device state.

Initial device selection remains Phone at `w ≤ 600`, Tablet at `600 < w ≤ 1100`, and Desktop above 1100px. The client caches that first media-query result before assigning any recording source. Later viewport changes adjust composition through CSS without replacing the selected recording; manual tab choices remain intact. Muted looping playback, offscreen/background pausing, native fallback controls and keyboard tab navigation are unchanged.

## Scope and verification

The code review covered `ProductRecording.tsx`, `ProductRecording.module.css`, `EditorialLanding.tsx` and `EditorialLanding.module.css`. Scoped ESLint passed and the isolated TypeScript program reported **0 diagnostics**. Browser checks passed for all three selected devices at 13 widths (39 combinations). Every visible asset retains its fixed dimensions, no horizontal page overflow was found, and source media ratios are preserved. Root reviewed full-scale captures and a normalized source comparison; an independent visual review found no remaining composition defects. See [QA details](design-qa.md) and [measurements](measurements.json).

Original marketing copy, Newsreader/DM Sans families, sage italic emphasis, app icon, product recordings, botanical source PNGs and landing block order remain intact. No raster editing or new generation is part of this correction. Work stays isolated to `/landing-editorial`; the existing project remains a secondary visual reference. No deployment or push.
