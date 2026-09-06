---
type: reference
status: current
owner: design-engineering
last_verified: 2026-09-05
---

# Hero study — selection and implementation

Selected `hero-v2.png` after inspecting the user's saved composition reference, actual Mac poster and existing app icon. The exact prompt is preserved in `prompt.txt`. It requested the complete original headline, external device controls, a separate Play action, a thin warm screen contour, and botanical art behind the real app.

The generated image is composition-only. Its re-rendered text, logo and product content are not source assets. Code retains the full canonical Unicode headline, original icon, actual recordings and posters. The only new marketing line is “A world of books. Open to you.”

Browser art direction reduced the initial 68px headline to 64px, lifted botanical framing, softened its bottom edge and kept the recording at 960px. The model's strong peripheral plants were moderated to protect product legibility. The final contour is 1px with a 10px radius; it does not simulate hardware.

See [actual hero evidence](../../evidence/hero-final.png) and [QA](../../QA.md).
