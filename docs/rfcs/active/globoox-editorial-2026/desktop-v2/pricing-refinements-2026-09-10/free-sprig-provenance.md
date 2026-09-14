---
type: rfc
owner: design-engineering
last_verified: 2026-09-10
title: Free plan botanical asset provenance
date: 2026-09-10
status: generated-and-visually-reviewed
tool: built-in-imagegen
asset: public/redesign/pricing/free-sprig.png
reference: public/redesign/pricing/sprig.png
width: 1024
height: 1536
format: PNG
channels: RGB
has_alpha: false
background: near-white
required_css_blend: multiply
bytes: 1100980
sha256: 4705bc78ed51bc1d6fe695d9f85027e00b80effad3cfb0b79c4a47e5ad6c93f9
---

# Free plan botanical

The user requested a second botanical at the Free plan's lower-left corner while preserving the praised existing upper-right sprig. The new image is a separately generated drawing with two unequal main leaves and a small tip leaf, reaching diagonally upward/right. It uses the existing sprig's muted sage watercolor and fine brown/graphite drawing manner. It is neither a mirrored duplicate nor an edit to the original asset.

## Selected output and rendering

`public/redesign/pricing/free-sprig.png` is a byte-for-byte copy of the fifth built-in ImageGen output. Its background is **near-white RGB, not transparent**. Use `mix-blend-mode: multiply` on the isolated warm paper surface (#f7f5ed), consistent with the already established hero botanical treatment. The production image received no code-driven drawing edits, masking or background removal.

The source is 1024 × 1536 (2:3). Use `object-fit: contain` if the CSS box differs from that ratio. Intended box is approximately 90 × 125 px desktop and 70 × 95 px mobile; keep it decorative and clear of the Free CTA. Final positioning and overlap checks are part of component/browser QA.

## Generation record

| Pass | Prompt | Result |
| --- | --- | --- |
| 1 | `free-sprig-generation-prompt.txt` | New matching sprig; rejected because transparency was painted as a checkerboard into RGB. Preserved as `free-sprig-01-rejected-rgb.png`. |
| 2 | `free-sprig-extraction-prompt.txt` | Background extraction failed; still RGB checkerboard. Preserved as `free-sprig-02-rejected-extraction.png`. |
| 3 | `free-sprig-extraction-2-prompt.txt` | Stronger extraction failed; still RGB checkerboard. Preserved as `free-sprig-03-rejected-extraction.png`. |
| 4 | `free-sprig-extraction-3-prompt.txt` | Short extraction request failed; still RGB checkerboard. Preserved as `free-sprig-04-rejected-extraction.png`. |
| 5 | `free-sprig-white-prompt.txt` | Clean near-white background, subject and sparse composition preserved. Selected; no further alpha retries. |

Root explicitly accepted using the white RGB result with CSS multiply because the user's required outcome was a matching second botanical, not an alpha-specific asset. No CLI/API fallback or other image editing service was used.

## Visual and technical checks

- Metadata confirms three RGB channels and `hasAlpha: false`; do not describe this file as a transparent PNG.
- 1,442,180 pixels have all channels ≥253 (91.7% of the canvas), including the empty margins; 267,857 are exactly white.
- The full stem and every leaf remain uncropped, with generous margins.
- `free-sprig-multiply-preview.png` is a **QA-only** rendering on exact page paper using multiply, at 320 × 480. The preview shows no visible checkerboard, rectangle or halo.
- The upward/right gesture complements the taller upper-right sprig. The unequal leaf sizes avoid an identical decorative pair; the small tip leaf keeps the top light. At intended tiny rendering the line remains readable; CSS placement still needs browser review against the button and border.
- Original `public/redesign/pricing/sprig.png` was preserved. No source code, root documentation, commit or deployment was changed by this asset task.
