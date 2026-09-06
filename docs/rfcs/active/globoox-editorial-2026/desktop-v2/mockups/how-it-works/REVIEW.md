---
type: rfc
status: active
owner: design-engineering
last_verified: 2026-09-05
---

# How it works — one product stage

This is a desktop-v2 composition study, awaiting the parent designer's review. No implementation was changed. The user's later instruction requests one generated mock per block and autonomous selection; that overrides the skill's default three-option/user-selection sequence.

## Evidence examined

- `src/components/landing/UsageAnimation.tsx`: the canonical walkthrough uses three 70vh step regions, a sticky header, a sticky phone, and scroll-derived screen selection. The first two steps also switch screenshots halfway through their scroll interval. Mobile uses 60vh rows plus a 45vh tail, with copy layered into the phone's region.
- `src/components/landing-editorial/EditorialLanding.tsx` and its CSS Module: v1 replaces the scroll sequence with three 248px-tall cropped screenshot cards. A full-screen dialog restores the screenshot context after a click.
- `qa/desktop-final.png`: confirms the prior three-card treatment and its small product content. It is historical v1 evidence, not a fresh v2 capture.
- Actual full source screenshots `public/images/how-it-works/1.1.webp`, `2.1-en.webp`, and `3-en-es.webp`: individually opened and inspected. Upload has a real bottom-sheet dialog; the second image has the real four-language menu; the third shows the actual Spanish reading screen. These files remain the implementation source of truth.
- The user-supplied `download.png`, archived as [saved-hero-reference.png](../../saved-hero-reference.png): individually opened; used only for paper/ink, serif/sans, botanical marginalia, and calm composition. Its app screen, headline, and brand icon are not product/copy authority.

## Selected direction and interaction

Use a single full phone screenshot to the right of an explicit three-step list. All three original instructions remain visible together. The generated mock shows Step 2 selected because its language menu makes the function especially legible; implementation should initially show Step 1, then allow direct selection of any step.

Each complete text row is a keyboard-accessible selection target. A small copper marker, selected semantics and the corresponding screenshot indicate the current step. Up/Down/Home/End operate the vertical tablist. Selection changes the screenshot immediately, with no scroll dependency, sticky region, auto-advance, scroll jump, or forced animation. Normal page scrolling remains normal.

Use the complete source image at roughly 340–350px wide (736–758px tall at its original 788:1705 ratio) on a 1440px desktop. The generated result showed that this is more readable than the initial 300px proposal. A fine edge and quiet shadow can separate the real screenshot from the paper. Keep original status bars, app colors, controls and typography intact. Optional image enlargement is secondary to the already-readable inline image; do not require a dialog to understand the step.

## Exact copy authority

`src/lib/landing-i18n/index.ts`, English `usage` object:

- How it Works
- Three simple steps
- Step 1 — Upload your ebook.
- Step 2 — Choose your language to translate the book.
- Step 3 — Enjoy your book!

All words and punctuation in the generated mock's marketing content match these strings; uppercase labels are typographic presentation only.

## Critical inspection of generated output

The one-stage hierarchy is a meaningful improvement over both old mechanics: full screenshot context is visible, all three steps are discoverable, and the implied interaction is explicit. The paper, pine text, small copper marker, subtle rules and single faint fern remain coherent with the chosen literary direction. There are no invented benefits, cards, extra CTAs or extra blocks.

The output moved the title from the prompt's centered heading to the left column and increased the screenshot. Retain the left-column heading and larger screenshot: the resulting pair forms a stronger coherent section. However, reduce the generated title from its oversized apparent 85–90px to about 64–68px at 1440px, and hold step descriptions near 32–34px. The product should remain the main visual evidence. Increase the selected-state distinction modestly in implementation, while keeping all inactive text readable.

ImageGen reconstructed some screenshot typography and paragraph layout despite the preservation instruction. **The generated screen must never be used as a shipped product asset or pixel-level source.** The mock is composition-only. Implementation must insert the original `2.1-en.webp` unchanged, with the other original images used for their corresponding tabs. No CSS remake of the app UI and no generated screen crop.

The faint fern is optional. Use the already-approved botanical asset in a restrained margin if it fits; do not add a new visual merely to reproduce the generator's decoration. The section does not need a second dominant botanical frame.

## Generation provenance

- Tool: built-in ImageGen, 2026-09-05; one generation, four attached reference image paths.
- Exact prompt: [prompt.txt](prompt.txt).
- Result: [how-it-works-stage.png](how-it-works-stage.png).
- Requested target: 1440×960. Tool output: 1536×1024, same 3:2 ratio, retained without resizing.
- Original output, relative to `CODEX_HOME`: `generated_images/01a07123-2543-7640-8f04-a626a2d896c9/exec-b396408a-8611-4dd6-b903-4090f5e992e0.png`.
- Attached refs in order: the user-supplied `download.png`, archived as [saved-hero-reference.png](../../saved-hero-reference.png); original `1.1.webp`; original `2.1-en.webp`; original `3-en-es.webp`. Exact input paths remain recorded in [prompt.txt](prompt.txt).
- This PNG is an internal visual target for section composition only. The canonical marketing copy and real screenshots override generated differences.
