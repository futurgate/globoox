---
type: reference
status: implemented
owner: design-engineering
last_verified: 2026-09-13
---

# Faster menu travel through How it Works

Implemented on `/landing-editorial`. The user approved accelerating menu navigation through the desktop sticky interval in both directions, with the Stack frozen and ordinary manual scrolling preserved. This supersedes the earlier native menu-scroll timing; original copy, media, fonts, styling, section geometry and app remain unchanged. Existing project visuals remain secondary references. Before snapshots are preserved in `before/` (`.txt` source snapshots are excluded from compilation).

## Behavior

One continuous animation follows a virtual scroll coordinate. The middle of the sticky interval travels at3× the uncompressed route's local speed; smooth ramps across its first/last10% join ordinary travel without velocity resets. The full interval consumes40% of its former virtual distance. Document height and sticky positioning never change. The same mapping handles upward/downward travel, partial crossings and destinations inside the interval.

Timing is `min(900, 240 + sqrt(virtualDistance) * 8)` milliseconds, with one smoothstep easing over the entire route. The900ms cap is the scheduled duration, not a guarantee under browser frame stalls. Shorter travel receives a shorter duration. Narrow screens without this desktop sticky panel receive regular smooth menu travel without interval compression.

Clicking How it Works prepares Step1 before the section enters view, removing the late Step3→Step1 replacement observed in the first video review. Other menu destinations keep the current Stack frozen until arrival. Wheel, touchstart, pointerdown and scroll/navigation keys cancel travel; Resize, history navigation and backgrounding also cancel. RAF is stopped before the pause is released and actual scroll progress is restored. Cancellation inside the interval can reconcile the frozen card directly to its actual scroll state; it does not jump the page to its former destination. Keyboard arrival transfers focus without additional scrolling. Modified link clicks retain native behavior.

## Verification

Twenty trips at1440×1000,901×900,801×900 and390×844 passed: downward/upward crossings, direct How it Works visits from both sides, and Languages navigation. Every recorded trip had intermediate monotonic positions, a frozen Stack, unchanged document height, and a final target error below1.1px. Mobile navigation closes normally. Additional Team/Pricing/Start/footer Back to top destinations passed, including bottom-of-document clamping.

At1440×1000, Hero→Quality and return were each about0.78s versus1.21s previously (observed click/settle traces). The pinned interval appeared in8 sampled frames in each direction, versus13 down/11 up previously, at approximately60Hz. These measurements demonstrate shorter travel in both directions; the entire transition is not claimed to be3× faster.

Wheel interruption inside the interval was checked in both directions. Replacing an active destination, Escape cancellation, keyboard focus and viewport resize cancellation passed. Normal manual progress0→0.5→1→0.5→0 still selects Steps1→2→3→2→1. No browser errors. Six pure route tests verify exact endpoints, compression, reversal, partial overlap, monotonicity and continuous velocity. Scoped ESLint, landing-entry TypeScript (zero diagnostics) and whitespace checks pass.

The prescribed browser runtime failed to import its versioned service. QA used a fresh anonymous installed-Chrome instance through local Playwright. Video/contact-frame review caught and confirmed the destination-preparation correction. Artifacts were written outside the watched repo during QA, then archived here. No cross-browser or physical-touch-device result claimed.

- [Final return to How it Works, video](evidence/menu-transit-final.webm)
- [Final arrival sequence](evidence/arrival-final.png)
- [Quality arrival](evidence/quality-arrival.png)
- [Final browser traces](qa.json) / [previous native-scroll traces](baseline.json)
- [Remaining menu destinations](remaining-links.json)

Implementation is limited to useSectionNavigation.ts, its new pure sectionNavigationMotion.ts helper/tests, and a geometry marker/start listener in HowItWorksSection.tsx. No CSS, layout, wording, original app/landing, billing RFC, commit, push or deployment changes in this round.
