---
type: reference
status: current
owner: design-engineering
last_verified: 2026-09-10
---

# Illustration and Quality review

**Visual result: passed for the requested scope.** Root inspected the generated alternatives, integrated both refined B assets, and reviewed the resulting pricing, closing and Quality layouts. The rejected Free sprig and dense closing fern remain historical material. This is a scoped implementation review, not a claim of user approval or whole-product certification.

## Evidence and visual comparison

All captures use the isolated English light-theme preview, actual loaded Newsreader/DM Sans, DPR1. Desktop captures are1440×1024. Narrow captures use1000px height to include the comparison and pricing corners; explicit390×844 views were also inspected interactively.

- [Pricing before/after](pricing-before-after.png): same heading, pricing content, buttons, frames and upper sprig. The lower sprig now follows the corner diagonally instead of hanging as a thin vertical stalk. The last refinement reduces stem and leaf-vein weight. Its visible leaves clear the action button, including the compact three-column layout at801px. Mobile Free gains28px bottom space to accommodate the art.
- [Closing before/after](closing-before-after.png): the dense faded fern is replaced by sparse sage leaves on graphite stems. Both sides remain legible, with a clear central title and action. The artwork is positioned as two CSS-clipped portions of the same generated canvas; source PNGs are not modified. Multiply and a1.01 CSS brightness adjustment remove near-white paper seams. No blanket24% opacity or vertical plant truncation remains. Horizontal edge cropping at intermediate widths is intentional.
- [Quality before/after](quality-before-after.png): current intro, typography, paper and shared frame retained. The deliberate change is the original landing's full-width wipe principle. Metadata remains in a fixed paired header; passages clip without changing measure. A6px margin on either side of the divider avoids joined Russian/English glyphs. The gap disappears at either endpoint. Desktop preview includes more canonical sentences to support the wider measure; mobile retains the previous shorter preview. Expanded content remains complete.

Root opened all three combined comparisons and their full-size sources. Any altered framing, height or artwork noted above is deliberate; old source copy and isolated route constraints govern the implementation, not invented mock text.

## Responsive review

Viewed eight widths for each changed area:320,390,768,800,801,901,1100,1440px. [Pricing matrix](pricing-matrix.png), [closing matrix](start-matrix.png), [Quality matrix](quality-matrix.png). Matrix order is320/390/768/800 across the first row and801/901/1100/1440 across the second. Full captures are named `pricing-WIDTH-final.png`, `start-WIDTH-final.png` and `quality-WIDTH-final.png`.

- No horizontal document overflow in the measured24 area/width states.
- Free retains its lower-left botanical after the grid stacks; it is decorative and does not intercept pointer input.
- Closing medium-width branches were corrected after the901px review revealed a leaf touching “free.” Current final captures show clear text. At ≤540px the illustrations sit below the action instead of squeezing its title. At larger widths they frame the center; outside stems may be cropped horizontally at the viewport edge.
- Quality retains21px prose and full-width layers at every size. The320px comparison is narrow by design: drag to an endpoint or hide translation to read a complete passage. It is not a two-column reading layout. The endpoint handle stays reachable inside the card, including its keyboard focus ring.

## Interaction verification

- Default split50/50. Real browser pointer drags changed50→19→58 and cleared pointer focus after release. Movement uses no transition/easing.
- Focused Home/End reached0/100; PageDown twice plus ArrowLeft produced78. Hide then Show preserved78 and the same measured height. Translation and handle are hidden from the accessibility tree/tab order when disabled.
- Original/translation layer geometry stays fixed while clipping changes. Hidden translation still contributes to layout height, preventing a vertical jump. The final desktop measurement is996.93px for the complete section both before and after hiding; each prose layer remains820px wide. See [hidden state](quality-hidden-final.png).
- Read full excerpt reveals all canonical text: Russian1143characters and English1114characters in the DOM, with no hidden paragraph/remainder nodes. Collapse restores the abbreviated preview. Responsive preview extension uses CSS, without viewport state or word rewriting.
- Pointer capture,8px horizontal touch-intent threshold, pan-y/pinch-zoom, cancel/lost-capture cleanup and keyboard semantics were independently reviewed. Browser-native touch input passed in a fresh isolated Chrome152 context at390×844, using CDP touch events. Horizontal100px changed50→79 with no scroll; vertical120px scrolled144px while preserving50. Explicit cancellation released capture, and the subsequent drag worked. No page errors. See [touch evidence](quality-touch-qa.json) and [capture](quality-touch-qa.png). This verifies browser-native input emulation, not physical-device testing.

## Checks and limitations

Scoped ESLint passes for EditorialLanding, PricingSection and QualitySection. Documentation validation reports the same nine missing-frontmatter issues in older mobile/motion records, with none in this round. TypeScript reports the same12 pre-existing errors in duplicate generated route declarations and backup landing pages; none point at this change. No generated product UI, media, original app/landing, shared stylesheet, billing RFC or unrelated user edits were changed.

During development one screenshot loop captured an “Unexpected end of JSON input” Next development overlay and stale scroll positions. Those captures were replaced after full navigation/reload and reinspection. The same server error occurred repeatedly before this work in the long-running development process; no stack tied it to this change. Fresh local GET returned200, current server JSON files parsed, stable captures and final console checks were clean. A transient development-runtime failure is plausible, not a proven root cause. Do not use a stale overlay capture as final design evidence.

No commit, push or deployment. The local preview remains `/landing-editorial`.
