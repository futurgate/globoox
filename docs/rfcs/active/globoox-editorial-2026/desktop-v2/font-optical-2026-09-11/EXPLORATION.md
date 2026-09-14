---
type: reference
status: active
owner: design-engineering
last_verified: 2026-09-11
---

# Quality comparison: optical typography exploration

The user authorized typography experiments and implementation **inside the isolated Quality comparison only**, asking for comparable visible letter size and similar Russian/English text density. The user rejected Garamond's historical character. Other sections retain their current fonts; the canonical passages, headings and descriptions remain unchanged. This record preserves the experiments behind the current choice. It does not authorize a global font replacement, copy changes or deployment.

The earlier font-density exploration remains historical material and has not been overwritten. Current implementation and browser results are recorded separately in this round's [QA measurements](qa-metrics.json), [QA records](qa-records.json) and [evidence directory](evidence/).

## Establishing the actual baseline

The Russian comparison had fallen back to Georgia while English used the locally loaded Newsreader. This was a font-coverage difference, not simply different CSS sizes. Newsreader's official distribution covers Latin, Latin Extended and Vietnamese, with no Cyrillic subset. The local font inspection and browser rendered-font inspection confirmed the fallback. See [Production Type's description](https://github.com/productiontype/Newsreader/blob/master/README.md) and [Google Fonts coverage metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/newsreader/METADATA.pb).

A direct browser comparison also established that **Newsreader at 21px with `font-optical-sizing: auto` matched explicit `opsz: 21`**. The initial assumption that this should be converted to `opsz: 15.75` was incorrect and is superseded. Preserve [round-one cases](exploration/round-1-cases-superseded.json) and [round-one metrics](exploration/round-1-metrics-superseded.json) for provenance only. The [automatic optical-size probe](exploration/check-newsreader-auto.cjs) documents the comparison; it uses a running local preview from the repository working directory.

The corrected [optical cases](exploration/optical-cases.json) and [metrics](exploration/optical-metrics.json) use the explicit 21 baseline. Experiments compared the complete canonical Russian and English passages, including their original nonbreaking spaces, at the same text measures. FontTools outline bounds supplied lowercase and capital ink heights; actual Chrome layout supplied line counts. Matching lowercase `о/o` alone did not guarantee matching capital size, weight or overall reading texture.

## Candidates and visual decisions

The exploration included Source Serif 4, Literata, Lora, PT Serif, STIX Two Text, Tinos and additional variable serif families. The downloaded-source records are preserved in [initial font sources](exploration/initial-font-sources.json) and [additional font sources](exploration/additional-font-sources.json). Their file paths are portable logical names under `source-fonts/`; the complete experimental TTFs are not bundled in this documentation. Download URLs and available hashes remain in those records. [Additional coverage and axes](exploration/additional-font-coverage-and-axes.json) records the inspected files.

| Direction | Measurement and visual result | Evidence |
| --- | --- | --- |
| Existing Newsreader/Georgia | The English and Russian runs were visibly different; retained only as the starting point. | [Baseline](exploration/00-newsreader-georgia-baseline.png) |
| Source Serif 4, large optical size | Best visual fit for the restrained comparison. Preserved recognizable, readable Cyrillic proportions without width compression. It remained the preferred Russian family even when other candidates scored better on line counts. | [Source Serif study](exploration/01-source-serif-4-60.png) |
| Noto Serif at width 80 | Reached **13 lines at 820px and 37 at 288px**, matching the corrected English reference, but looked compressed and visually mismatched. | [Rejected Noto study](exploration/02-noto-serif-80-rejected.png) |
| Merriweather at width 90 / optical size 32 | Also reached **13/37 lines**, but was rejected for its heavier, compressed character and small-looking capitals. | [Rejected Merriweather study](exploration/03-merriweather-90-rejected.png) |

The Noto/Merriweather capitals measured roughly **12.2–12.25px** in those normalized samples, versus approximately **14.25px** in the then-current Newsreader reference. The recorded outline values for the corrected Noto/Merriweather cases are about 12.16px and 12.22px respectively. This illustrates why a numerically perfect line count was not accepted as a successful design.

Roboto Serif offered designed width, optical-size and grade axes, and its current files include Cyrillic. IBM Plex Serif supplied another contemporary control. They did not displace the visually preferred Source Serif direction. Official background: [Roboto Serif / Commercial Type](https://commercialtype.com/news/roboto_serif), [Merriweather / Sorkin Type](https://github.com/SorkinType/merriweather), [IBM typography](https://www.ibm.com/design/language/typography/typeface/).

## Testing Source Serif for both languages

A separate test used Source Serif 4 for both languages: Russian `opsz` 48/60 at 20–20.4px, and English `opsz` 8/12/16/20 with size calculated to match the Russian lowercase ink height. None of the 32 combinations satisfied letter size, capital size and density together.

| Russian / English settings | Lowercase ink | Capital ink RU / EN | Full-text lines at 820px | Full-text lines at 288px |
| --- | --- | --- | --- | --- |
| RU 20.2px, opsz 60; EN 18.074px, opsz 8 | 9.615px both | 13.534 / 12.109px | 14 / 13 | 43 / 40 |
| RU 20.388px, opsz 60; EN 19.371px, opsz 20 | 9.705px both | 13.660 / 12.978px | 15 / 13 | 43 / 39 |

Smaller English optical sizes brought line counts closer but gave English heavier letters and noticeably smaller capitals. The same-family approach was therefore rejected in this round. [Reviewed comparison](exploration/source-both-shortlist-rejected.png), [cases](exploration/source-both-cases.json), [measurements](exploration/source-both-metrics.json).

## Developing and rounding the selected pairing

The next pass retained Newsreader for English and adjusted both optical size and weight. Compare [balanced B](exploration/balanced-b-pair.png) with [balanced C](exploration/balanced-c-pair.png). **Balanced C was selected for implementation refinement.** Its exploratory values were RU Source Serif 4 at 20.311px / weight 460 / opsz 60, and EN Newsreader at 19.272px / weight 360 / opsz 10. [All balanced cases](exploration/balanced-pair-cases.json) preserve the alternatives.

The final implementation uses practical rounded values:

| Property | Russian prose | English prose |
| --- | --- | --- |
| Family | Source Serif 4, isolated `Editorial Source Serif` face | Existing `Editorial Newsreader` face |
| Size | **20.2px** | **19.3px** |
| Weight | **450** | **360** |
| Optical size | **60**, baked into the static font | **10**, explicit variable setting |
| Line height | **32px** | **32px** |

The Source face uses `ascent-override: 70.22%`, `descent-override: 25.32%` and `line-gap-override: 0%` to align its line metrics with the English run. These settings normalize the baseline and line box; they do **not** squeeze, stretch or change the glyph outlines. The actual letterforms keep their designed proportions. Matching full-text line counts exactly remains secondary to a convincing optical match; the current QA data records the remaining differences rather than hiding them.

The [pair cases](exploration/pair-cases.json), [raw pair probes](exploration/pair-live-metrics-raw.json) and [raw balanced probes](exploration/balanced-pair-live-metrics-raw.json) are exploratory evidence. Their range-rectangle counts can include an enclosing span rectangle; do not treat those raw `lines` fields as the final rendered line-count authority. Use this round's current QA measurements for the implementation.

## Reproducible font asset

The static Source Serif asset is derived from the complete official Source Serif 4 variable TTF at weight 450 / opsz 60. It retains the requested available Latin `0020–024F`, Cyrillic `0400–052F`, punctuation `2000–206F`, and `20AC`, `2116`, `FEFF` coverage, along with layout tables and font names/license records. The current asset contains 532 supported codepoints and all 118 Russian/English alphabet letters.

- [Build script](font-build/build-source-serif-comparison.py) requires explicit `--source` and `--output` paths; no machine-specific defaults remain.
- [Verification record](font-build/source-serif-4-comparison.verification.json) preserves per-letter source/static bounds, source hash and final asset hash with portable paths.
- [Implementation provenance](font-provenance.json) records the source URL and shipped relative asset path.

Example from a prepared font workspace:

```sh
python3 build-source-serif-comparison.py \
  --source source-fonts/SourceSerif4-Variable.ttf \
  --output generated/source-serif-4-comparison.woff2
```

The output is **58,252 bytes**, SHA256 `1c165a6f36f78a942ab3e5c8b779513f0c43e2c0f8660730a9f0a906a59ea37d`. The maximum checked outline difference from the full variable source is 0.495 font units, approximately **0.010px at 20.2px**, within integer-coordinate rounding. The build keeps source timestamps stable and retains OFL records. This documentation task made no code or production-asset changes and performed no deployment.
