---
type: rfc
status: draft
owner: design-engineering
last_verified: 2026-09-08
---

# Mobile How it Works — five ImageGen layouts

**Subsequent decision:** user selected option1; see [implemented mobile walkthrough](../mobile-walkthrough-implementation-2026-09-08/README.md). Original exploration record below is historical.

User request: “Сделай в imagegen вариантов пять разной вёрстки.”
Five independent ImageGen outputs generated and visually reviewed. Exploration only: no option selected by user, no live code changed, no deployment/push. Existing project visuals remain secondary; current editorial art direction, canonical copy, actual product media and block order stay authoritative.

## Display order and critique

Each PNG contains three mobile states of ONE proposed layout. These are generated composition studies, not browser screenshots or working interactions.

1. [Vertical editorial episodes](01-vertical-episodes.png) — root's preferred UX direction. Native vertical reading, exact step title immediately above large product image. Every step appears naturally without a tap. Strong product scale and uncluttered hierarchy. Before implementation shorten the image crops around the meaningful action; avoid three unnecessarily tall full-phone images. The added divider under the section heading is optional, not a requirement.
2. [Top stepper](02-top-stepper.png) — compact explicit navigation above the active title and screen. Clear sequence, but numbered circles plus underline plus repeated Step label are redundant. Generated state 2 shifts media downward; a real implementation would reserve consistent caption height. Later steps require deliberate discovery.
3. [Accordion](03-accordion.png) — every step title remains accessible while one image expands. Direct navigation and economical page length. Visually more like a help section, with more rules and controls. The generation does not consistently preserve row/media heights; it demonstrates the mechanism, not final dimensions.
4. [Swipe cards](04-swipe-cards.png) — neighboring card edge indicates horizontal navigation; controls are reachable below. Familiar gesture with strong media scale. Additional card framing reduces available screenshot width, and later steps may be missed. The generated last state incorrectly retains a next-card fragment; a real gallery must end properly and disable the initial previous control.
5. [Product-first with bottom caption](05-product-first.png) — root's preferred compact alternative. Screen gets visual priority and lower controls are comfortable to reach. Caption follows the visual rather than preparing the reader. Crop 1 cuts off the actual lower upload button: adjust crop if selected. Remove redundant next arrow at final step and reserve caption height for step 2.

Recommendation: develop 1 for the most natural mobile walkthrough; 5 if a single compact stage is more important than automatically exposing all three steps. No user selection assumed.

## Evidence / generation

- [Exact prompts and input references](prompts.json)
- [Output provenance and permanent source paths](manifest.json)
- [Local comparison gallery](index.html)
- Input 1: existing 390px mobile screenshot from ../mobile-walkthrough-review-2026-09-08/01-upload.png
- Inputs 2–4: actual screenshots in public/images/how-it-works/1.1.webp, 2.1-en.webp, 3-en-es.webp
- All four references were visually inspected before generation.
- All five outputs were visually inspected together and displayed in numbered order 1–5.
- Authentic screenshots were supplied as references. Generated app pixels are still illustrative approximations and must NEVER replace the real screenshots in shipped code.
- Canonical words were requested verbatim; source copy remains authoritative over generated capitalization, wrapping or small pixel/text artifacts.
- This is visual review, not interaction/accessibility QA. The proposed behaviors need implementation and browser validation only after a direction is chosen.

