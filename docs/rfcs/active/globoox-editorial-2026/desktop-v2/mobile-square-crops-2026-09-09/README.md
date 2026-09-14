---
type: rfc
status: implemented
owner: design-engineering
last_verified: 2026-09-09
---

# Square mobile walkthrough crops

User explicitly requests square crops, steps2/3 aligned at top and step1 at bottom. Implemented only the mobile episode aspect ratio (1:1) and updated its comment; existing object-position bottom/top/top retained. Applies at≤800px. Desktop, canonical words, original image files and all other blocks are unchanged. No deployment.

Visually reviewed all three states at320/390/430/768px using the four *-final-review.png boards. Frame dimensions respectively280/342/382/420px square; no horizontal overflow. geometry.json records dimensions and exact object-position. Desktop1440 checked: sticky layout retained and mobile list hidden. git diff --check passed. No additional tests warranted for this CSS-only crop adjustment.

Known consequence of literal bottom alignment: first crop preserves the complete file picker and Upload button, but the dialog heading and part of its explanatory text are above the square. The top introductory line intersects the crop edge. This was reported to the user; no unrequested offset, fade or image edits were introduced. Language menu fits fully; translated paragraph continuation is intentionally cropped.

Evidence: *-step-*-final.jpg are final full-viewport screenshots after dismissing cookie consent. *-final-review.png are extracted content comparisons derived from those full captures using final-capture-bounds.json. Initial *-step-*.jpg include cookie consent. Earlier *-crop-*.jpg and *-review.png captured the wrong document region through the browser clip API and are failed capture history, NOT QA evidence. Original captures preserved.

This square ratio supersedes the prior788:1240 crop in mobile-walkthrough-implementation-2026-09-08. That implementation's other behaviors remain current.
