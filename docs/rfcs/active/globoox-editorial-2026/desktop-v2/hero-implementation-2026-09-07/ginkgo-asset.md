---
type: postmortem
status: complete
owner: design-engineering
last_verified: 2026-09-07
---

# Ginkgo production asset — 2026-09-07

The latest user selected the ginkgo hero mock and authorized implementing it together with meadow grass. This record covers only the ginkgo raster asset.

## Saved asset

- Production file: `public/redesign/hero-botanical/ginkgo.png`
- Dimensions: **887 × 1774 px**, portrait 1:2.
- Mode: **RGB, opaque. No alpha channel.**
- SHA-256: `fc6f98cdcb167575f5cade71e218224358f1718a4e5140cfb956b181360cd37a`
- Copied unchanged from built-in ImageGen output. No pixel editing, background removal, cropping or conversion was performed locally.
- Intended placement: roughly 230 × 480 CSS px at the lower left of the hero product screen. Final placement is owned by the implementation pass.

## Transparency fallback

Two built-in ImageGen attempts explicitly requesting a genuine alpha channel returned RGB images with painted checkerboards. They are rejected as production assets. Root then directed a pure-white-background fallback for CSS `mix-blend-mode: multiply`.

The selected third output has an almost-white background without the checkerboard. It is **not** transparent. Inspection of all four 25 px border strips found RGB channel ranges 253–255 and mean (254.22, 254.09, 254.25). This near-white noise is minimal, but the website must still visually verify the multiply blend on its ivory background. There is no visible shadow, ground or matte illustration frame.

## Visual inspection

The final image retains exactly four separate fan-shaped leaves: one top leaf, middle left and right leaves, and one lower-right leaf. A slender brown stem curves up from lower left. The entire stem and all leaf edges are intact with empty margins. Restrained sage/ivory fills and radiating vein detail match the selected hero subject; the line work is slightly more defined than the small reference rendering. No additional subject, text, UI, soil or pot is present.

## Inputs

1. `~/Desktop/download-1.png` — selected ginkgo hero mock; subject, silhouette and color authority. Also archived by root as `hero-illustration-2026-09-07/ginkgo-margin.png`.
2. `public/redesign/language-garden/tree.png` — drawing-manner reference only; its tree subject was not reused.

Both inputs were directly inspected before generation.

## Generation provenance and exact prompts

All three calls used the **built-in image_gen tool**. No CLI or API-key fallback.

1. Initial asset extraction, rejected because RGB checkerboard: [exact prompt](ginkgo-prompt-01.txt).
   - References: selected hero mock and Languages tree.
   - Output: `~/.codex/generated_images/01a07c43-fb37-71f3-b29d-11b189a87731/exec-a1b079a2-0644-419e-8279-9eabde153a6e.png`
2. Targeted alpha extraction, also rejected because RGB checkerboard: [exact prompt](ginkgo-prompt-02.txt).
   - Reference: attempt 1.
   - Output: `~/.codex/generated_images/01a07c43-fb37-71f3-b29d-11b189a87731/exec-a4ebd86e-329c-4d06-bf0c-f14143df4785.png`
3. **Selected opaque white fallback:** [exact prompt](ginkgo-prompt-03.txt).
   - Reference: attempt 2.
   - Output: `~/.codex/generated_images/01a07c43-fb37-71f3-b29d-11b189a87731/exec-fac01d20-0272-4ccf-bbde-ebbc655e7485.png`

Earlier generated source files remain intact. This subtask does not modify code, browser state, marketing text, product media or deployment.

