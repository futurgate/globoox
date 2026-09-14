---
type: rfc
status: implemented
owner: design-engineering
last_verified: 2026-09-08
---

# Scroll walkthrough, inset header rule, quieter hero CTA

Implemented at `/landing-editorial` following the latest explicit user request. [Visual and interaction QA](design-qa.md).

- Hero CTA keeps its canonical label and loses only its arrow. It sizes naturally around the centered text; other CTA arrows remain.
- Sticky header has a1px rule under its existing inner container:1280px wide with80px side margins at1440,350px wide with20px margins at390. It does not run to viewport edges or change header height.
- How it works retains the three original descriptions, order and actual screenshots. Native page scroll advances1→2→3 and reverses3→2→1. A sticky inner layout stays below the header for one additional small-viewport height of document travel, divided into thirds. No wheel/touch interception, scroll locking or internal scroll container.
- Clicking a step or using arrow/Home/End keys moves directly to that step's document position. Tab semantics and visible focus remain. Screens stay mounted in one grid cell to avoid layout jumps; only the active screenshot is visible/exposed to assistive technology.
- Desktop and mobile header links jump immediately to their target section using its sticky-header offset. They bypass the walkthrough sequence, update the URL fragment, close the mobile menu and focus the destination. Modified clicks retain native link behavior. Logo/footer home links use the same direct jump.
- The panel and screenshot fit the available viewport height. Narrow layouts put the heading above a description/screenshot pair; tablet images reach240px, desktop316px. Low-height views compact spacing/type while preserving font families and words.

Only EditorialLanding.tsx/.module.css and HowItWorksSection.tsx/.module.css changed for this request. Product/app pages and shared styles remain untouched. Latest full-size botanical placement and lower-only fade are retained. Existing project visuals remain secondary references; all older artifacts are preserved. No commit, push or deployment in this round.
