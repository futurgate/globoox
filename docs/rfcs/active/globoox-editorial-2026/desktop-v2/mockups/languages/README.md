---
type: rfc
status: active
owner: design-engineering
last_verified: 2026-09-05
---

# Languages — desktop v2 visual study

Generated and visually inspected on 2026-09-05 with the built-in `image_gen` tool. No landing code was changed for this study.

## Selected artifact and provenance

- Selected: [languages-v2-selected.png](languages-v2-selected.png). Actual output is 1726 × 911px, with the same aspect ratio as the requested 1440 × 760px desktop section. It is a composition reference at 1440px, not an exact-resolution browser capture.
- First pass retained: [languages-v2-list.png](languages-v2-list.png).
- Exact first prompt: [prompt.txt](prompt.txt).
- Exact correction prompt: [prompt-refinement.txt](prompt-refinement.txt).
- User style reference: the user-supplied `download.png`, archived as [saved-hero-reference.png](../../saved-hero-reference.png), inspected before generation. Its paper, pine ink and typographic restraint informed this section; its invented hero text, icon and product screen were not used as content authority.
- First generated source, relative to `CODEX_HOME`: `generated_images/01a0710a-8942-76a3-aa03-4aa3b738e6ff/exec-a81f478c-cc77-471e-9f7e-8564fe0f6e92.png`.
- Selected generated source, relative to `CODEX_HOME`: `generated_images/01a0710a-8942-76a3-aa03-4aa3b738e6ff/exec-518a2a53-c73a-4af6-8115-f06229608fa6.png`. Both default outputs remain intact; copies are saved here.

## Critique and implementation guidance

The selected direction resolves the empty language-switching interaction by presenting all four native names together. It keeps the complete original heading and description, all four current English-language names, all six future labels and the five original `soon` markers. The first pass unnecessarily repeated English within its row; the targeted second pass removes that duplicate. The final image was inspected again from its saved file.

The strongest elements are the clear native-name/English-label relationship, equal treatment of the available languages, a calm continuous cream background and hierarchy established by alignment instead of cards or dividing rules. The scale remains subordinate to the product hero. No mock app interface or unsupported translation example appears.

For implementation, use actual Newsreader and DM Sans assets and the source strings from `getLandingMessages('en')`; the raster is never a copy source or a replacement for real HTML. Preserve the original current order: English, Spanish, Russian, French. Use a semantic static list, no button/tab semantics. Verify Cyrillic font coverage and optical alignment in the browser. Keep native names around 34–38px at 1440px rather than blindly reproducing generated font metrics.

The future-language row wraps `and dozens more` alone. This is readable but slightly detached; a browser implementation can tighten its spacing and font size or deliberately balance two lines, while keeping every original label. The source description already explains current and future availability, so no extra availability heading is needed. Sage markers are supporting decoration; availability must remain clear from the text.

This is a desktop-only language-section reference. It does not change the landing block order, the real hero media, mobile presentation or original marketing copy. Device controls are outside this section: the user's latest direction places them above the hero screen, superseding the earlier research suggestion to place them below.
