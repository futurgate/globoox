---
type: reference
status: implemented
owner: design-engineering
last_verified: 2026-09-11
---

# Quality: optically matched Russian and English

Implemented at `/landing-editorial#quality`. This round supersedes the earlier discussion-only EB Garamond recommendation. The user authorized experimentation and implementation, asked for matching perceived letter size and similar line counts, and identified Garamond's historical character as a poor fit.

Russian prose and the Russian chapter heading now use **Source Serif 4**. English prose keeps **Newsreader**, with a smaller optical-size setting and a lighter weight. The result preserves natural letter proportions while matching lowercase height, capital height, baseline and perceived darkness. The rest of the landing's typography, copy, media, section structure and interaction code are unchanged. The existing project's visual material remains a secondary reference.

| Setting | Russian prose | English prose |
|---|---|---|
| Family | Source Serif 4 | Newsreader |
| CSS size | 20.2px | 19.3px |
| Weight | 450 | 360 |
| Optical size | 60, baked into the static font | 10 |
| Shared line height | 32px | 32px |

The Source font's ascent/descent overrides align the baseline without transforming the letters. Outline measurements for matched shapes: `о/o` height 9.635/9.714px; `х/x` 9.151/9.328px; `Н/H` 13.514/13.407px. These outline dimensions describe the chosen glyphs, not a guarantee of identical perceived size for every character or browser rasterizer. See [final glyph measurements](final-glyph-metrics.json).

At widths up to 800px, Russian prose also uses native language-aware hyphenation with at least three letters on either side of a break. This prevents long Russian words from wasting much of a narrow line. Original strings, punctuation and nonbreaking spaces remain byte-for-byte unchanged. Hyphenation depends on browser dictionaries; browsers without Russian hyphenation retain the readable, uncompressed font pairing but may show a larger line-count difference.

## Final browser results

Counts are the complete current excerpt, rendered with the shipped font and original component. In collapsed mode the existing mobile/desktop excerpt boundaries remain unchanged.

| Viewport width | Collapsed RU / EN lines | Full RU / EN lines |
|---|---:|---:|
| 320 | 11 / 11 | 56 / 55 |
| 390 | 8 / 8 | 41 / 40 |
| 430 | 7 / 7 | 36 / 35 |
| 768 | 4 / 3 | 17 / 16 |
| 800 | 3 / 3 | 16 / 16 |
| 801 | 8 / 8 | 18 / 16 |
| 1024 | 7 / 6 | 14 / 13 |
| 1440 | 7 / 6 | 14 / 13 |
| 1728 | 7 / 6 | 14 / 13 |

At 1440px, the previous full-excerpt count was 16/13. At 390px it was 52/37. The selected pairing substantially reduces the excess Russian height without narrowing the outlines to force a perfect count.

- [Desktop, final](evidence/quality-1440-collapsed.png)
- [Phone, final](evidence/quality-390-collapsed.png)
- [Full excerpt, phone](evidence/quality-390-expanded.png)
- [Translation hidden](evidence/quality-1440-hidden.png)
- [Complete QA measurements](qa-metrics.json)
- [Exploration and rejected alternatives](EXPLORATION.md)

## Verification and implementation boundary

Nine widths were captured and visually reviewed. Measurements wait for the exact font faces to load and for two paint frames after resizing. First-line text boxes align across both languages at every width; there is no horizontal page overflow. Full canonical text equality and unchanged component source were checked against the pre-edit snapshot. The shipped Russian prose and chapter use only Source Serif glyphs; English uses only Newsreader glyphs, confirmed with Chrome's rendered-font inspection.

Hide/Show preserves the split at 52%; Home/End reach 0/100%. Prose measure and book height remain stable through these actions. Six consecutive pointer Hide/Show cycles also passed in a focused interaction check. The earlier long screenshot harness occasionally attempted a toggle while focus-driven camera scrolling was still in progress; explicit camera placement before interaction resolved that harness issue. No interaction code was changed. Scoped ESLint and diff whitespace checks pass; no page errors were recorded. This CSS/font change did not require a new application unit-test suite.

The browser plugin bootstrap referenced a missing versioned service, so local QA used a fresh anonymous installed-Chrome instance through the project's Playwright dependency. These results establish the tested Chrome/macOS rendering, not identical dictionary/rasterizer behavior across all browsers.

## Font asset and preservation

The selected font is a **58,252-byte static WOFF2**, with Latin/Cyrillic/punctuation coverage and OFL licensing. Only the selected weight/optical size ships. Instancing changes outlines by at most 0.010px at the chosen size due to font-grid rounding. [Provenance](font-provenance.json), [reproducible build](font-build/build-source-serif-comparison.py), [verification](font-build/source-serif-4-comparison.verification.json).

Previous component/CSS snapshots are in `before/`; older studies remain in `font-density-2026-09-11/` and this round's `exploration/`. Current implementation changes are limited to `QualitySection.module.css` and the new isolated font/license. No app/shared CSS, original landing, billing RFC, copy, commit, push or deployment changes were made in this round.
