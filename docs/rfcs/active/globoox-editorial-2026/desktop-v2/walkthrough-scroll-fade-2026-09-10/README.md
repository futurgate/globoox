---
type: rfc
status: implemented
owner: design-engineering
last_verified: 2026-09-10
---

# Scroll-position-driven walkthrough fades

User rejects a time-based fade triggered at step boundaries. Opacity must follow the actual scroll position, stop at intermediate values when scrolling stops and reverse with scroll.

Implemented in isolated HowItWorksSection: normalized sticky runway progress drives three screen weights. Transition1→2 spans15–40% of runway, transition2→3 spans60–85%. Smoothstep interpolation gives gentle spatial entry/exit, with stable screens between transitions. Weights sum to1; at27.5% weights are0.5/0.5/0, at72.5%0/0.5/0.5. Opacity/visibility now come directly from these weights; there is NO timed CSS transition or autonomous animation loop. One requestAnimationFrame is scheduled only in response to scroll/resize/navigation completion.

Step text, arrows and markers follow the same weights. The dominant screen supplies aria-selected/tabpanel labeling. Clicking or keyboard-selecting a step smoothly scrolls to7.5/50/92.5% (stable full-screen positions), so the same scroll mapping drives those transitions. Existing section-navigation pause is retained. Mobile≤800px remains the three static square episodes with bottom/top/top crops.

Validation: edited TSX ESLint passed; git diff --check passed; local preview responds HTTP200. These are NOT browser verification. The old browser binding disconnected, discovery timed out and reset its kernel. Browser plugin updated from26.901.41600 to26.903.61454; new client was found, but its trusted worker still imports missing26.901.41600/scripts/browser-service.mjs. Browser QA is blocked by that runtime mismatch. No current screenshots or stopped-midfade browser verification claimed. Prior280ms fade evidence is historical and cannot validate this implementation.

Next browser check after runtime recovery: stop at27.5% and72.5%, confirm opacity values hold after a delay, reverse scroll and compare, exercise rapid direction changes, button/keyboard navigation and section-menu bypass, verify mobile isolation. No deployment/push. Preserve all prior artifacts and unrelated edits.
