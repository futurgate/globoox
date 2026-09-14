---
type: archive
status: archived
owner: design-engineering
last_verified: 2026-09-07
---

# Hero illustration language — 7 September 2026

**Three ImageGen studies complete and displayed; no live implementation.** Latest user clarification: transfer the drawing manner of Languages, not its tree subject. Botanical subjects are allowed, but the main requirement is stylistic consistency. User authorizes this ImageGen exploration after root recommends developing typography study 3.

Current originals, generated mocks and past decisions are preserved. The existing project remains a secondary visual reference; canonical words, real app media, original icon, isolated route and block structure remain binding. No push or deployment. This round changes only exploration artifacts and documentation.

## Brief and sources

Target: a 1440 × 1100 desktop hero that introduces translating e-books and makes the real reading interface the primary visual. Refine the previous sentence hierarchy with lighter, smaller main type and a connected introductory line. Replace dense botanical walls with sparse drawings in Languages' graphite/soft local watercolor technique. No repetition of the language tree/cards/seedlings; no aged paper, fog or dense engraving.

Every built-in ImageGen call independently attached the same directly inspected references:

1. [Earlier sentence hierarchy mock](../hero-type-imagegen-2026-09-07/sentence-hierarchy.png), composition/type starting point only.
2. [Current Languages capture](../refinements-2026-09-07/desktop-final.png), illustration manner and material/color authority, not a subject to duplicate.
3. `public/images/device-posters/mac.webp`, actual 1280:820 French two-column reading interface.
4. [Actual current hero capture](../hero-exploration-2026-09-07/current.png), original brand, controls and page source.

The transparent language tree asset was also directly inspected during preparation; it was not separately attached because the Languages capture already provides its appearance in context. User-context preflight found no separate saved Product Design context. No new external research was needed.

## Authoritative display order

All three images were generated independently and displayed exactly once in this order. This is the latest 1/2/3 mapping; the earlier typography round has a separate historical mapping.

| Display | Image | Exact full prompt | Original output filename |
| --- | --- | --- | --- |
| 1 | [Ginkgo margin](ginkgo-margin.png) | [Prompt](ginkgo-margin-prompt.txt) | exec-a0fa4566-1b3a-4061-8e31-dd701012d95f.png |
| 2 | [Paper marginalia](paper-marginalia.png) | [Prompt](paper-marginalia-prompt.txt) | exec-214011a1-1908-4e92-936d-d7c4da34f624.png |
| 3 | [Meadow line](meadow-line.png) | [Prompt](meadow-line-prompt.txt) | exec-990e8e88-90b4-4f3b-bfca-399419c8460b.png |

Sources reside under `~/.codex/generated_images/01a07109-a720-7981-ada1-2f1ba712a484/`. Workspace PNGs are unchanged copies. Built-in ImageGen only; no CLI fallback, raster editing or code compositing. [Comparison gallery](index.html) includes Languages, the previous type study and all three outputs.

## Root visual review

**1 is root's preferred direction for further refinement, not user approval.** It has the clearest product priority and the most restrained headline of this set. Ginkgo's fan shapes transfer the muted drawing treatment without repeating the language tree. The single left accent and open right margin are useful. However, the branch is taller/lower and the leaves larger than requested; its base exits the canvas instead of tucking behind the frame. The screenshot also drifts right from the shared center axis. A next study should refine that placement and avoid making the fan leaves too uniformly regular.

**2 is weaker.** The hand-drawn medium carries across subjects, but large folded sheets feel like stationery props. The left page is much larger than the requested small fragment. Main headline returns to the earlier oversized treatment despite the common smaller-type instruction. The demo ratio also changes visibly. Do not copy these geometry errors into code.

**3 is a credible alternate silhouette, but too tall.** The fine stem is quieter than the former fern wall and the illustration is unobtrusive over most of its area. The generator extends it into headline height despite an explicit below-demo-top placement instruction. That compromises separation between headline and artwork. Headline remains heavier/larger than requested; demo axis drifts left. Lower and shorten the stem if this subject is pursued.

The shared prompts lock typography and geometry, but ImageGen did not hold them precisely. These images therefore explore related directions rather than demonstrate a controlled pixel-identical comparison. All preserve the headline's words and order; future HTML must still use canonical `getLandingMessages('en')` including punctuation and the nonbreaking hyphen.

The actual source interface is recognizable in all three, with two French text columns and a slim top bar. ImageGen re-renders text, icon details and frame proportions: these are composition references only. Never ship generated app pixels or change the actual recording to match them. Future implementation must retain the original app icon, real video at its 1280:820 ratio and existing device controls/autoplay behavior.

Next step: feedback/selection or a targeted refinement. No claim that the hero is finished; no live hero change was made in this round.
