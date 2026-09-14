---
type: rfc
status: implemented
owner: design-engineering
last_verified: 2026-09-08
---

# Smooth section navigation and pointer focus

Latest user correction supersedes the previous instant-jump implementation. Menu/home navigation now visibly scrolls smoothly; How it works keeps its current step during travel instead of playing the sequence. [Validation](design-qa.md).

`useSectionNavigation.ts` owns native smooth scrolling and its lifecycle. A data attribute on the isolated page pauses the walkthrough observer during navigation. Settling removes the flag and signals a fresh step calculation. Wheel, touch, pointer input, scrolling keys, Escape or Tab cancel the trip and resume normal page interaction. A new destination cancels the previous trip. Menu closes immediately and URL fragments remain navigable. Only keyboard-initiated navigation transfers focus to the destination after arrival; pointer clicks do not leave focused sections behind.

Smooth motion is explicitly requested by the user, including in the current browser environment which reports prefers-reduced-motion: reduce. This request is applied to deliberate section-link activation only; it introduces no automatic animation.

Demo tabs blur after pointer clicks; keyboard activation/arrow traversal keeps focus and its visible outline. Native language select records pointer versus keyboard input: its pointer-opened focus ring is suppressed without preventing the native dropdown from opening. Escape dismisses a pointer-opened selector and blurs it. Tab/keyboard entry retains a visible focus outline. No global focus-outline removal.

Original wording, fonts, botanical scale/lower fade, hero button, header divider, real media and block order remain. Existing project styling is secondary visual reference. Isolated landing only, no push/deploy. Earlier direct-jump docs are historical.
