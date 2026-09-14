---
type: rfc
status: implemented
owner: design-engineering
last_verified: 2026-09-08
---

# Natural botanical tops, lower fade

Implemented at `/landing-editorial`. User rejected the previous top cropping/fade; that visual treatment is superseded, even though the previous matrix was reviewed. The latest user amendment is primary authority; old project visuals remain secondary.

[15-cell screenshot gallery](index.html) · [Individual visual review](design-qa.md)

Only `ProductRecording.module.css` changes in this correction. No new imagery, component behavior, marketing copy, font, device frame size or section structure changes. Both existing drawings keep their scale (mirrored ginkgo240×480px, grass320×640px).

The decorative window now extends640px above the frame: enough for the entire tallest asset. There is no upper gradient. Each plant uses the lower of its natural bottom-aligned placement and a minimum top position, so a short selected recording lowers the plant instead of cutting its crown. The only fade occupies the last100px before the demo's bottom edge, reaching full transparency at that edge. The demo stays opaque above the art; only lateral fragments expose the fade. No stems extend visibly beneath the demo.

Minimum canvas-top offsets from frame top (the actual drawing has some internal blank space):

| Range / selection | Ginkgo | Grass |
|---|---:|---:|
| Default | 0px | −96px |
| Desktop ≤1100px | 32px | −16px |
| Desktop ≤900px | 16px | 0px |
| Tablet / Phone ≤600px | 64px | −4px |

Existing horizontal overlaps and fluid recording gutters remain. Intersections with empty control-area space are allowed; visible leaves/stems must clear labels, active underline and CTA. Both branches remain visible at every sampled combination, without miniaturization.

Evidence uses new filenames and a separate directory. `before.css` preserves this turn's starting CSS; the previous screenshots remain in `../hero-matrix-2026-09-08/`. Main evidence is390/540/768/1024/1440px × Desktop/Tablet/Phone, all visually reviewed after this correction. Extra320px screenshots and24 boundary measurements are separate checks. Actual recordings autoplay, so their captured frames vary.

No push or deployment.
