---
type: reference
status: historical
owner: design-engineering
last_verified: 2026-09-10
---

# How it Works — two scroll-controlled motion options

**Latest visual refinement:** [stronger selected tabs](selected-tabs/README.md) — selected motion mode is forest/ivory; the current step has a scroll-weighted sage background and3px marker. Motion geometry unchanged. Earlier screenshots below predate only this color refinement.

Implemented and browser reviewed on 2026-09-10 at `/landing-editorial#how-it-works`.

## Current authority

The user requests two alternatives on the same landing for comparison. Fade is the default; the temporary **Fade / Stack** buttons above the screen change only the motion mapping and preserve the current scroll position. No option has been selected as the permanent design.

This supersedes the earlier smoothstep scroll fade and its blocked browser QA. Earlier documents and screenshots remain historical. Original project visuals are secondary references; canonical copy, actual screenshots, fonts, section order and the isolated route remain authoritative. No commit, push or deployment in this round.

## Motion mapping

Shared sticky runway: **220svh**, previously 100svh. Transitions occupy **10–43%** and **57–90%**. At a 1000px viewport each transition spans 726px of scroll, versus 250px previously. Stable click targets are 5%, 50% and 95%. No timers, CSS transitions, smoothing spring or autonomous completion. Every animation property is a linear function of scroll within its phase.

**Fade:** the outgoing screenshot disappears over the first half of each transition. The incoming screenshot appears over the second half. No overlap; the exact midpoint is plain paper, with no extra blank hold. The same stationary frame persists.

**Stack:** the next card begins 28px lower. Its paper surface reaches full opacity over the first 18% of the transition; its image appears from 30% to 95%. Retiring content fades out over the first 30%, removing clipped status-bar details from exposed card edges. Cards remain opaque paper after their contents retire. Previous card scale/offset: 95.5% / −14px. After the third screen, the oldest is 92% / −28px, the middle is 95.5% / −14px, and the newest is 100% / 0px. The surface is #f3f0e8, sampled from the real reader screenshots.

Step emphasis uses separate linear weights. Logical selection remains correct through the empty midpoint of either fade. All three original screenshot assets remain the same; inactive layers are hidden from assistive technology.

## Layout and interaction

Only the non-mobile walkthrough (>800px) uses these alternatives. Each card clips its own screenshot; the stack stage allows the two older edges to extend above it. Forty-four pixels between controls and the foreground card leave 16px above the final stack. The screen height reserves 112px for controls, that gap and incoming-card travel. Very short desktop viewports necessarily show a smaller whole-screen preview.

Mobile ≤800px retains the existing three native vertical episodes with 1:1 crops, bottom/top/top alignment, and no comparison controls or sticky runway. Original words are untouched.

Manual step clicks scroll smoothly to stable positions. Arrow/Home/End navigation preserves keyboard focus with preventScroll. Pointer clicks blur controls. Menu navigation retains the existing pause signal so it does not play through the walkthrough while travelling to another section.

## Review

Root prefers Stack for the sense of progression; both remain available for user testing. The first inspection found clipped old phone status bars above incoming cards. Retiring-content opacity was added and the full sequence was reviewed again.

- [Final Stack sequence](final-stack-sequence.png)
- [Final Fade sequence](final-fade-sequence.png)
- [Desktop Stack](final-stack-1440x1000-0-95.png)
- [Desktop Fade](final-fade-1440x1000-0-95.png)
- [Viewport gallery](index.html)
- [Mobile preservation](mobile-review.png)
- [QA details](design-qa.md)

Unprefixed desktop images and sequence sheets are the initial review before the retirement-content correction. Use `final-*` for current desktop evidence. Screenshots were transferred from Chrome as JPEG quality85 and saved as PNG for the evidence gallery.

## Files

- `src/components/landing-editorial/HowItWorksSection.tsx`
- `src/components/landing-editorial/HowItWorksSection.module.css`
- `src/components/landing-editorial/walkthroughMotion.ts`

Validation: scoped ESLint and diff checks pass, independent mathematical invariants pass, browser motion/interaction and visual review pass. Whole-project TypeScript still fails on pre-existing duplicate generated route declarations and backup landing props; no errors reported for these changed files.
