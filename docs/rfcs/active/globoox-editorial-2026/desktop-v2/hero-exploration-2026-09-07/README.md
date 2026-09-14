---
type: archive
status: archived
owner: design-engineering
last_verified: 2026-09-07
---

# Hero exploration — 7 September 2026

**Later user feedback:** user doubts that Compact centered improves the current page and flags typography. Root's favorable critique below is historical, not validated progress or approval. The newer [ImageGen typography round](../hero-type-imagegen-2026-09-07/README.md) now supplies the latest visible 1/2/3 mapping. None of this earlier round is selected.

**Exploration only; no option selected or implemented.** User requests current screenshot → composition diagnosis → ImageGen variants using the actual current product interface. Preserve latest live autoplay/no-View-screenshot changes. Old hero styling remains a secondary visual reference. Original marketing text, app icon, real media and section structure remain locked. No push/deploy.

## Grounding and diagnosis before generation

[Current browser capture](current.png):1440×1100CSS pixels. Actual Mac recording loaded atreadyState4. Header96px, headline starts170px and occupies200px, actual media starts556px and measures958×614px. This pushes product evidence too far down. Long centered copy, CTA, device row and screen form a serial vertical stack. Large side botanicals compete with the real app. Header1280px, copy960px and different product-stage boundaries lack common visual anchors. A thin inset header rule alone will not solve the whole hierarchy.

All three built-in ImageGen calls attach current.png, `public/images/device-posters/mac.webp` (directly inspected actual product), and `../saved-hero-reference.png` (directly inspected initial concept, ONLY literary balance and header divider). Existing fake reader and old invented heading are explicitly excluded in every prompt. Full exact prompts are adjacent. User-context preflight found no separate saved plugin context; all context comes from this project and user instructions.

## Display-order mapping — authoritative for a later numeric selection

These images were generated and displayed independently, once each, in this exact order:

| Display number | Generated image | Exact prompt | Original ImageGen filename |
| --- | --- | --- | --- |
|1|[Compact centered](compact-centered.png)|[Prompt](compact-centered-prompt.txt)|exec-1f7a310e-d8b6-4442-a8c5-758bbfbaf3e9.png|
|2|[Reader beside copy](reader-beside-copy.png)|[Prompt](reader-beside-copy-prompt.txt)|exec-44f7cfa9-76aa-49f1-bff8-4c5f18f670d8.png|
|3|[Editorial opening](editorial-opening.png)|[Prompt](editorial-opening-prompt.txt)|exec-872c6501-8cb3-4248-83a2-82d520d22a1a.png|

Requested canvas1440×1100; generated files1435×1096. Copied unchanged from built-in ImageGen output. [Local gallery](index.html) preserves all three plus current screenshot.

## Root visual critique

1. Clearest conservative improvement: reduced foliage restores product priority, ruled header feels deliberate, and the stack is shorter. Still somewhat serial and centered; generated demo is narrower than the1060px requested. Good basis if preserving the existing familiar composition matters most.
2. Proves that showing media earlier is possible, but the unchanged long heading becomes a heavy six-line column. Generator makes product frame too tall relative to the1280:820 original. This is a composition study, not an approved media implementation; never stretch the real video to match that error.
3. Useful stronger editorial structure: left-aligned introduction and CTA share one band above wide demo. CTA feels slightly detached and foliage is taller than requested; would refine these if selected. App frame ratio also drifts somewhat from the supplied asset.

All preserve the essential actual two-column French reader concept and avoid invented product features. ImageGen nevertheless re-renders source text, logo details and media geometry; these generated pixels are not production assets. Future implementation must place the original app icon and real recording unchanged at1280:820, and use canonical Unicode marketing copy from messages. The precise app appearance must not be inferred from the generator's rerendering.

Next step: user chooses/refines a direction; no build work performed in this exploration. Earlier hero and language sign-offs remain history, not selection of these options.
