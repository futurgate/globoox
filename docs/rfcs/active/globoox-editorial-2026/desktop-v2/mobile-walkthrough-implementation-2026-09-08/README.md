---
type: rfc
status: implemented
owner: design-engineering
last_verified: 2026-09-08
---

# Mobile walkthrough — selected vertical episodes

User selected option 1: “Первый самый норм.” Exact displayed target: [01-vertical-episodes.png](../mobile-walkthrough-imagegen-2026-09-08/01-vertical-episodes.png). This implements that direction on the existing isolated /landing-editorial route. Earlier no-selection/no-implementation statements in the exploration README are historical.

## Behavior and dimensions

- At widths up to 800px, three original steps form a native vertical ordered list. Original title appears immediately above each actual screenshot. No sticky stage, hidden step content, tab controls or artificial scroll runway.
- At 801px and above, existing sticky scroll progression and direct keyboard-accessible step tabs remain. Scroll tracking does not update state on narrow screens; resizing back restores it.
- Content width: viewport minus 48px, capped at 420px; below 360px, viewport minus 40px. Actual frame is 342px at a 390px viewport (previous mobile frame was 152px).
- Main heading 40px, step headings 32px / 1.13, original Newsreader. At less than 360px: 35px and 29px. Original DM Sans labels, colors and original marketing copy unchanged.
- Title-to-image 24px, label-to-title 10px, between episodes 60px (52px under 360px).
- All three media slots use aspect ratio 788:1240. Upload anchors at bottom to retain the complete upload sheet/button and book-cover context. Language choice and translated reading anchor at top.
- Original 788×1705 WebP files are reused directly (68/137/153KB), without secondary lossy recompression. No new asset generation and no generated app pixels shipped.
- Screenshot interface elements are image content, not fake interactive controls.
- Same section ID; menu still scrolls smoothly to it and other sections.
- Existing original landing/app, hero, all other blocks and deployment remain untouched by this round.

## Validation

[Design QA](design-qa.md) · [Gallery](index.html) · [Geometry](geometry.json) · [Desktop scroll sequence](desktop-scroll.json).

All three mobile states visually compared to selected reference. Widths 320,390,430,600,768,800,801,1440 visually reviewed, plus 390×600 low-height check. No horizontal overflow. Menu targets clear sticky header. Desktop native scroll verified 1→2→3→2→1.

Scoped ESLint passed. Whole-project TypeScript remains blocked by existing backup-route prop errors and duplicate generated .next/types/routes.d 2.ts declarations; output contains no errors in the edited walkthrough component. Existing development PostHog missing-token console errors remain. These were not addressed in this isolated design task. No push/deploy.

## Files changed

Only HowItWorksSection.tsx and its CSS Module for implementation; this record and additive project authority/QA notices for documentation. Prior artifacts and unrelated edits preserved.

