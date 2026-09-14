---
type: reference
status: historical
owner: design-engineering
last_verified: 2026-09-10
---

# Mobile How it Works — option 1 implemented, 2026-09-10

**Current authority: user-selected continuous chapters, implemented and browser verified.** This replaces the rejected square crops. Earlier ideation/no-selection and square-approval statements are historical. Existing project visuals remain secondary; current editorial direction, canonical words, genuine product media and block order remain authoritative.

## User selection

Selected [displayed option 1](../mobile-portrait-options-2026-09-10/01-continuous-chapters.png), with a thin divider below “Three simple steps” and a heading that stays below the site header through the first two steps. Step 3 pushes that heading upward. This instruction explicitly authorizes implementation.

## Implemented behavior

- At widths up to 800px, three complete portrait screenshots follow their original captions in ordinary vertical page flow. No square cropping, internal scroll, tabs or automatic screenshot replacement on mobile.
- The shared eyebrow/title wrapper uses native `position: sticky`, top aligned with the 84px site header. Its opaque paper background covers passing media; its 1px rule stays inset to the content column.
- Its containing block holds the first two episodes. Step 3 is the following sibling, so it naturally releases the heading on arrival. The existing trailing padding leaves 60px between the moving divider and Step 3 (52px below 360px). Reverse scrolling restores exactly the same positions. No extra scroll handler or timed animation was added.
- Portrait frames are centered, maximum 300px wide; image height is automatic at the real 788:1705 ratio. At 320px the frame becomes 280px, respecting 20px page gutters. The text column is at most 420px; standard phone gutters are 24px.
- Newsreader/DM Sans, the original app icon, all canonical copy, real screenshots, desktop Fade/Stack controls and stronger selected states remain intact.

The selected generated mock is a composition reference. Its altered app pixels, compressed image proportions and slightly different header/type scale do not replace the existing assets and typography. The newly requested pinned heading and divider take precedence over the mock.

## Scope and evidence

Only `src/components/landing-editorial/HowItWorksSection.tsx` and its CSS Module changed for this implementation, plus durable documentation. No app/shared styles/old landing edits. No commit, push or deployment in this turn.

[Design QA](design-qa.md) records source comparison, breakpoint/scroll verification and check results. [Combined comparison](source-comparison.png): selected concept on the left, actual first chapter on the right. [Geometry](geometry.json) contains measured sticky positions and source dimensions.

Local preview: http://127.0.0.1:3000/landing-editorial#how-it-works

Browser verification used the available Chrome DevTools connection because the installed Browser plugin has a stale runtime import path. Evidence is from a real local Chromium render with emulated viewports, not generated screenshots or a physical Safari session.
