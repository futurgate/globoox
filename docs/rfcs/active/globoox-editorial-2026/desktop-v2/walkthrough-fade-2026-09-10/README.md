---
type: rfc
status: implemented
owner: design-engineering
last_verified: 2026-09-10
---

# Non-mobile walkthrough crossfade

User requested fade transitions in non-mobile How it Works. CSS-only: screenshots crossfade opacity over280ms ease, outgoing visibility becomes hidden only after its fade finishes; incoming visibility is immediate. Same grid position and dimensions. Step text/arrow colors and active marker fade over220ms. No timers or changes to scroll/tab/navigation logic. Opacity-only transition has no spatial motion.

Browser1440px: click1→2, native scroll2→3→2→1 and rapid1→3 verified. checks.json contains actual intermediate opacity values in both directions, loaded-image state and settled0/0/1 opacities with hidden/hidden/visible. Desktop final screenshot visually inspected. Mobile390px verified: desktop panel hidden, all three square episode images opacity1 with0s transition. Original words/media and mobile bottom/top/top crops preserved. git diff --check passed. No deploy or push. Existing unrelated edits preserved.
