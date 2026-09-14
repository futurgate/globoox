---
type: reference
status: active
owner: design-engineering
last_verified: 2026-09-11
---

# Quality comparison: Cyrillic coverage and density

Discussion and browser measurements only. No live font replacement is selected or implemented. Preserve the user's existing typeface instruction until a replacement is approved. Existing project visuals remain a secondary reference; earlier visual QA does not establish consistent font coverage.

## Diagnosis

The shipped Newsreader roman and italic files have no Cyrillic characters. The official family supports Latin Plus, not Cyrillic: [Newsreader README](https://github.com/productiontype/Newsreader). Chrome's `CSS.getPlatformFontsForNode` confirms that the actual Russian paragraph uses Georgia for Cyrillic and Newsreader for supported characters; English uses Newsreader. This fallback was missed in earlier Quality QA.

## Method and evidence

Complete canonical excerpts were extracted from the current Quality component without editing their words. Russian contains 1,143 characters; English 1,114. Measurements use a fresh Chrome instance, fully loaded font files, weight 400, automatic optical sizing, 21px text and line-height 1.55. Actual rendered line counts come from Range rectangles at 820px and 288px prose widths. The baseline capture correctly establishes font fallback, but its recorded paragraph heights are collapsed-preview heights, not full-excerpt measurements. Use the dedicated metrics files for full-excerpt counts.

The [visual comparison](ru-newsreader-pairings.png) shows a shorter beginning of each passage in equally sized columns for glyph inspection. Its line counts are therefore different from the full-excerpt results below. Font testing was performed in an isolated HTML fixture, not by changing the landing.

| Russian setting | RU lines at 820px | EN lines at 820px | RU lines at 288px | EN lines at 288px |
|---|---:|---:|---:|---:|
| Current Georgia 21px | 16 | 13 | 52 | 37 |
| EB Garamond 21px | 14 | 13 | 42 | 37 |
| EB Garamond 22px | 15 | 13 | 43 | 37 |
| Tinos 21px | 15 | 13 | 44 | 37 |

English remains Newsreader 21px in every pairing. Exact data: [pairing-metrics.json](pairing-metrics.json). Earlier same-family trials are retained in `metrics.json` and `compact-metrics.json`; their English font also changes, so do not mix those English counts with this pairing table.

## Recommendation, pending discussion

EB Garamond is the strongest compact candidate measured for Russian while preserving English Newsreader. At 21px its total unwrapped Russian advance is about 14.7% smaller than the current Georgia fallback. It also looks smaller at the same CSS size: 22px is a useful optical-compensation candidate and still materially reduces the gap. This is a deliberate pairing, not an identical Cyrillic extension of Newsreader. Tinos is another compact option, but has a more ordinary Times-like appearance. Literata, Lora, Source Serif 4 and PT Serif did not improve Russian density at the tested size; supporting Cyrillic alone does not solve the problem.

No typeface guarantees identical space consumption across translations. Word lengths, nonbreaking spaces and letterforms affect wrapping; the canonical Russian excerpt contains 23 nonbreaking spaces. Do not squeeze glyphs, alter canonical text or force identical line counts to hide linguistic differences. The next implementation, if authorized, should explicitly load Cyrillic coverage and verify perceived size and readability in the actual wipe comparison.

Primary font source: [EB Garamond metadata and Cyrillic coverage](https://github.com/google/fonts/blob/main/ofl/ebgaramond/METADATA.pb), [font project](https://github.com/octaviopardo/EBGaramond12). Complete font files were loaded for these tests; none were added to public assets.
