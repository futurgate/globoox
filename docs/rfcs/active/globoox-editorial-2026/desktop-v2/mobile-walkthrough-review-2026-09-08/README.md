---
type: rfc
status: draft
owner: design-engineering
last_verified: 2026-09-08
---

# Mobile walkthrough — discussion, not implementation approval

User says mobile How it works looks poor and is uncomfortable, asks for ideas. Current code remains unchanged. Captured current390×844 browser flow; screenshot width measured152px. All three screenshots opened/visually inspected in this review.

1. [Upload](01-upload.png): functional but product detail too small; simultaneous inactive descriptions take width/attention from the upload UI.
2. [Language selection](02-language.png): functional but long original description wraps narrowly while the language menu is unreadable at this scale.
3. [Reading](03-reading.png): functional but reading screenshot cannot demonstrate readable typography; page travel mostly changes a small image/selection while the composition remains stationary.

The original copy, actual screenshots and calm palette are strengths. Problem is mobile composition and interaction, not missing decoration. Readability is a visible accessibility concern; this is not a screen-reader or WCAG compliance audit. Development overlays appear in captures; no product flow was blocked. Initial direct-hash capture moved during hydration and is archived as initial-anchor-shift.png, not accepted main evidence.

Recommended discussion direction: native vertical three-step story on mobile, each original step description above a large, intentionally framed crop of its actual product screenshot (upload dialog / language menu / translated reading). No pinned scroll runway, no simultaneous side-by-side list and narrow screen. Keep section order, canonical copy, actual media and desktop behavior. Aim for roughly280–320px product width on390px viewport; crop only to emphasize the relevant real UI, preserving context. No new generated UI or decorative botanicals needed here.

Alternative if compact height is essential: one large screenshot with its current description above, three accessible step controls and horizontal swipe; trades vertical-scroll discoverability for compactness. Neither proposal is selected or implemented. No deployment.
