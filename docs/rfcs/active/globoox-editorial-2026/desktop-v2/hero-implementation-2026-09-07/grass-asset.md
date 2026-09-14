---
type: postmortem
status: complete
owner: design-engineering
last_verified: 2026-09-07
---

# Meadow grass asset — 2026-09-07

Current implementation asset: `public/redesign/hero-botanical/meadow-grass.png`.

The user selected the ginkgo hero composition and explicitly requested the grass from the meadow-line mock as a second botanical accent. This asset transfers that grass subject and the sparse graphite / olive watercolor technique of the Languages tree. It contains no product imagery, UI or marketing copy.

## Production file and rendering

- Built-in ImageGen, three calls. No CLI/API fallback and no raster editing.
- Final generated file copied unchanged into the public asset path.
- Dimensions: **887 × 1774 px**, RGB PNG, **707,379 bytes**.
- **This file has no alpha channel.** Two transparent-output requests returned an RGB checkerboard, so those attempts were rejected for production. Root approved a clean white-background generation with CSS `mix-blend-mode: multiply` on the ivory page.
- Four 60 × 60 corner samples: each channel range **253–255**, mean about **254.3**. Visually uniform near-white, with no checkerboard. Minor model-generated near-white variation remains; avoid claiming mathematically exact #ffffff.
- The complete slender stem is uncut, with five small seed clusters (one more than the four requested) and a few long lower leaves. This follows the seed-head distribution in the user's supplied crop closely.
- Botanical occupied width is much narrower than the 887 px canvas: account for the transparent-equivalent white margin when sizing. At a 700 px full-image height the botanical visible width is roughly 215 px, with the base toward the left and upper head leaning right.
- Render decoratively (`alt=""`, `aria-hidden`, `pointer-events:none`), place underneath the demo layer and use CSS multiply. Do not use a white rectangle without blending. Verify the page screenshot for any visible edge.

## References

1. `desktop-v2/hero-illustration-2026-09-07/meadow-line.png` — subject and placement.
2. `public/redesign/language-garden/tree.png` — technique reference.
3. Generated output 1 — edit input to transparency retry.
4. Generated output 2 — edit input to final white-background fallback.

## Provenance

1. Initial isolated grass, rejected painted checkerboard:
   `~/.codex/generated_images/01a07c6f-1230-7eb3-a559-3de495439f86/exec-2bcca643-4e27-4ab9-b223-b9629a63c152.png`
2. Transparency retry, rejected painted checkerboard:
   `~/.codex/generated_images/01a07c6f-1230-7eb3-a559-3de495439f86/exec-2ea51810-b3d6-47de-837c-aeb9cd2fb118.png`
3. **Selected white-background asset**, copied unchanged:
   `~/.codex/generated_images/01a07c6f-1230-7eb3-a559-3de495439f86/exec-eef97889-bf6c-4feb-aa21-bb7d262ff50f.png`

## Exact initial prompt

```text
Use case: background-extraction / stylized-concept.
Asset type: production transparent PNG botanical illustration for the right margin of the Globoox landing page hero.
Input image 1 is the selected subject/composition reference: use ONLY the slender meadow grass drawn at the far right of that hero screenshot. All typography, product screen and page background are to be omitted. Input image 2 is technique reference only: delicate graphite contour with restrained natural olive watercolor washes and fine interior linework.
Primary request: create an isolated, complete, tall meadow grass sprig matching the grass in image 1: one slender gently curving main stem, four airy seed-head clusters, a few long pointed leaves concentrated on its lower half. The base begins at the lower left and the upper seed head rises toward the upper right, with subtle uneven branches. Keep the specimen beautifully spare and graceful. Faithful to the supplied drawing, not a new busy bouquet.
Canvas and composition: tall portrait roughly 480 by 1440 proportions. Whole stem and tips visible, no cropping. Minimal 4 percent transparent safety margin around the illustration. Main stem with natural asymmetric lean; loose open negative space between leaves. Intended CSS display around 200 px wide by 700 px tall beside a real app demonstration.
Medium: fine graphite and muted tan/olive watercolor, contemporary natural history illustration. Precise but soft hand-drawn contour; translucent olive wash within leaves, fine veins, small softly tan seed grains. Match the tree reference's quiet drawing manner without importing its tree subject. Low saturation, no hard black outline, no distress or antique paper texture.
Output: genuine transparent RGBA background, alpha zero outside the botanical drawing. No page, no cream or white rectangle, no paper texture in empty areas, no checkerboard painted into pixels, no ground, no shadow, no glow, no vignette, no text, no frame, no root ball, no labels. Preserve fine antialiased semitransparent edges; no matte halo.
```

## Exact transparency retry prompt

```text
Use case: background-extraction. Edit the attached botanical sprig image. Preserve the existing botanical sprig exactly, including stem, seed heads, olive leaves, fine linework and tall composition. Remove its entire white and pale-grey checkerboard background and return an actual TRANSPARENT PNG with an alpha channel, not a picture of a checkerboard. The attached current file was RGB, which fails the task. Outside the plant all pixels must have alpha=0. Smooth semitransparent antialiased plant edges only; no background swatch or halo. No other changes, no new objects, no text.
```

## Exact selected asset prompt

```text
Edit only the background of the attached meadow grass illustration: replace the checkerboard with an absolutely solid uniform pure white RGB #FFFFFF background. No gray squares, no texture, no vignette, no shadows, no glow. Keep the drawing's olive/tan graphite-and-watercolor technique, delicate long leaves, airy seedheads, complete tall uncut stem and exact silhouette unchanged. This is a production botanical asset for a warm cream webpage where pure white will be composited with CSS multiply. Uniform pure white must reach the silhouette cleanly between every seed head and leaf. No text, no other objects.
```

