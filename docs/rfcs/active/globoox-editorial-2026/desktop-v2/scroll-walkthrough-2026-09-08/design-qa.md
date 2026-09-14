---
type: rfc
status: implemented
owner: design-engineering
last_verified: 2026-09-08
---

# Scroll walkthrough QA

**final result: passed for the requested changes**

## Visual evidence

- [Hero and header,1440×1100](hero-header-1440.png): hero button has no arrow; centered text; inset thin rule; botanical treatment preserved.
- Desktop [Step1](desktop-step-1.png), [Step2](desktop-step-2.png), [Step3](desktop-step-3.png): original layout remains composed while the actual product screen and highlighted step change together.
- Mobile390×844 [Step1](mobile-step-1.png), [Step2](mobile-step-2.png), [Step3](mobile-step-3.png): both description and screen remain visible below the header; natural scrolling advances the sequence.
- [Tablet768×1024](fit-768x1024.png): screenshot enlarged to240px after visual review so it remains prominent.
- [Desktop1440×700](fit-1440x700.png), [Phone320×568](fit-320x568.png): full panel fits beneath the header without clipping the final step or screenshot.

All linked states were visually inspected by root. No independent-agent review or new botanical15-cell claim in this round.

## Browser interaction checks

1. At1440×1100, menu entry lands at section top120.07px below a96px header. Wheel deltas+440/+400 change Step1→2→3;−400/−440 return Step3→2→1. Sticky layout top remains120px. `scroll-evidence.json` records the actual measurements.
2. Continued native scrolling releases the block: after1500px from entry, layout top is−279.93px and the next content is reachable. No scroll trap.
3. Clicking Step3 selects its real Spanish screenshot. ArrowUp from that focused tab selects Step2 and moves focus/scroll accordingly.
4. All five desktop menu destinations tested directly: Quality, Languages, Team, Start reading, How it works. `navigation-evidence.json` records fragment, focus and final top. Start reading is clamped by the document bottom and remains visible; other sections align at120px. No intermediate walkthrough playback.
5. At390×844, native+330/+300/−300 scroll changes1→2→3→2 with layout top108px. Mobile Languages link closes menu and lands at107.91px below the84px header.
6. Hero CTA contains zero SVG arrows and its original label. Header pseudo-rule measures1280×1px at1440. Logo return-to-top lands at scrollY0 after final direct-navigation correction.
7. Scoped ESLint and landing-entry TypeScript pass (zero diagnostics). Documentation check passed (74 governed files); git diff --check passed. No production build, physical-device testing or deployment claimed.

Local development HMR briefly left a reload unhydrated during testing. A fresh reload restored interaction; mobile initial Phone selection and menu/scroll checks then passed. Existing console output includes missing local PostHog token and earlier framework CSS-HMR errors; no claim of globally clean dev logs.

## Preserved scope

Original marketing copy, heading order, actual media, font families, app icon, product routes and current botanical assets remain. Scroll changes do not fake product functionality. Older click-only walkthrough descriptions are historical and superseded by this record.
