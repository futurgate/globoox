---
type: reference
status: historical
owner: design-engineering
last_verified: 2026-09-10
---

# Motion mapping verification — 2026-09-10

Status: **passed**. Rechecked after visual QA refinement: retiring stack screenshots clear during the first 30% of each transition, leaving opaque paper edges. This supersedes the earlier check of retained screenshot content in the rear cards.

The actual `walkthroughMotion.ts` helper was transpiled through the installed TypeScript compiler and evaluated independently. Source SHA-256: `7f4ca7563a096b776fe519b15d982f8749b5db80597d1e5c68bfb9ca2fa09e3f`. Both modes were checked at 30,001 progress values each, including positions outside the sticky runway.

- finite bounded outputs across [-1,2]: **passed**.
- fade has zero simultaneous screenshot overlap: **passed**.
- stack has zero simultaneous screenshot overlap: **passed**.
- fade opacity slopes are linear within all four fade segments: **passed**.
- stack screenshot is invisible until its surface is opaque: **passed**.
- both modes hold exact stable selected steps: **passed**.
- stack final geometry and step2 geometry match specification: **passed**.
- retired stack screenshots clear while opaque paper survives: **passed**.
- logical active step stays correct through blank fade midpoints: **passed**.
- forward/reverse evaluation gives identical output without stored state: **passed**.
- outside-runway progress clamps to stable endpoints: **passed**.
- continuous values at all mapping boundaries: **passed**.

The Fade opacity mapping is linear within each segment. Neither mode allows simultaneous visible screenshot content. At the exact blank-paper midpoint in Fade, logical selection advances to the next step rather than resetting to the first. Stack image opacity remains zero until its paper surface is fully opaque; retiring content clears before the incoming screenshot appears. The final stack scales are 92%, 95.5%, and 100%, with top offsets −28px, −14px, and 0px. All three paper surfaces remain opaque, while only the foreground screenshot retains content.

These are mathematical and source-level checks only. They do not establish rendered visual quality, browser compositing, scroll performance, viewport fit, image loading, mobile behavior, or keyboard/navigation correctness. Root's separate browser review covers those concerns. Numeric evidence is in `motion-mapping-checks.json`.
