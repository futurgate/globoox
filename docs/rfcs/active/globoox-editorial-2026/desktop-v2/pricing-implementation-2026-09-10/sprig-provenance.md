---
type: rfc
status: implemented
owner: design-engineering
last_verified: 2026-09-10
---

# Pricing sprig — asset provenance, 2026-09-10

Selected reference: `../pricing-footer-2026-09-10/04-shared-paper-refined.png`, upper-right three-leaf accent. This is a standalone decorative botanical, not a product screen. User selected pricing option 4 for implementation.

## Production asset

- File: `public/redesign/pricing/sprig.png`.
- Built-in ImageGen; no CLI/API fallback.
- PNG, 1024 × 1536, RGBA, 1,311,523 bytes.
- Alpha range 0–254; 1,404,758 completely transparent pixels (89.31% of canvas). All botanical pixels use generated antialiasing/transparency; alpha was not changed.
- Nonempty silhouette at alpha > 5: x64–965, y68–1419. Full sprig uncropped with margin on all sides.
- SHA256: `1c854142f02c20b4da734bb5cc90793bed476cc479125183193dbfd6bc0d317d`.
- Asset is a byte-for-byte copy of generated output `Codex generated_images/01a08bff-89e1-7e71-991a-bfd5289333a0/exec-f03168c2-11f2-4b67-a4fe-1a87dbed3345.png`.

## Generation / review

1. `sprig-generation-prompt.txt`: style/subject reference supplied to built-in ImageGen. Output had the correct three-leaf silhouette, but painted a checkerboard into RGB with no alpha. Rejected result is preserved as `sprig-generation-rejected-rgb.png`; it must not ship.
2. `sprig-extraction-prompt.txt`: targeted built-in ImageGen background extraction preserving the subject. Result has actual transparent pixels and clean edges. Selected as the production PNG.

`sprig-alpha-preview.png` is a QA-only composite onto exact page color #f7f5ed, resized to 320 × 480 for visual inspection. It showed no checkerboard, paper rectangle or visible halo. This preview is not the production asset. Production art received no code-driven background removal or drawing edits.

Intended CSS dimensions are roughly 82 × 123 px (2:3 source ratio); visible plant will occupy about72 × 108 px within that box. Use decorative empty alt / aria-hidden as appropriate. Preserve the subtle scale from the selected pricing reference. Component placement and browser QA are owned by root.
