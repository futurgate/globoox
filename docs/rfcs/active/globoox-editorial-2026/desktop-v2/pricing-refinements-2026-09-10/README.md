---
type: rfc
status: implemented
owner: design-engineering
last_verified: 2026-09-10
---

# Pricing and footer refinements — 2026-09-10

Latest user steering supersedes earlier Current Plan, single botanical and footer-logo decisions:

1. Free CTA is **Start for free**; destination remains `/my-books`.
2. Remove the footer wordmark/icon. Original mission, copyright and Back to top remain. Header brand and final CTA icon are outside the footer and remain.
3. Add a distinct complementary botanical at the Free plan's lower-left corner. Preserve the praised original upper-right sprig.
4. Harmonize the external pricing frame with hero, Quality and How it Works.

All changes are isolated to `/landing-editorial` components/styles/assets. Original pages/app, billing RFC, other marketing words and relative block order are preserved. No commit, push or deployment.

## Framing

The former pricing outer border used #dadccd, 4px corners and no shadow; product frames used warmer, stronger outlines with 8–13px corners and soft shadows. External frames now share scoped editorial variables in `EditorialLanding.module.css`:

- `--ed-frame-border: #c9c7b9`, 1px solid.
- `--ed-frame-radius: 10px`.
- `--ed-frame-shadow`: existing hero's two soft shadow layers, reused by pricing, Quality and desktop/mobile walkthrough frames.
- Pricing internal rules stay quieter with `--ed-frame-divider: #e1dfd4`.

Hero frame appearance is unchanged by the token extraction. Other frame surfaces are harmonized without changing dimensions, real screen media or motion logic. Pricing remains one shared three-column surface on desktop and three stacked plans on mobile. The small bottom explanation stays centered.

## Botanical positioning

The second image belongs to the Free article itself, so it follows that plan when the grid becomes a column. The outer group permits decoration beyond its border. Both sprigs are decorative, noninteractive images; pricing text and buttons remain live HTML.

The new generated file uses a clean white RGB background and CSS `mix-blend-mode: multiply`, matching the existing hero botanical compositing approach. It is not described as an alpha PNG. ImageGen alpha attempts were rejected because they contained painted checkerboards. No hand-cut background or code-drawn artwork is used. Production file and prompt provenance are recorded alongside this document by the asset subtask.

## Verification

Current visual evidence: `pricing-before.png`, `footer-before.png`, `hero-frame.png`, `quality-frame.png`, `walkthrough-frame.png`, `walkthrough-mobile-frame.png`, `footer-desktop.png`, `footer-mobile.png`. Browser computed styles confirm identical border/radius/shadow on all four frame families. Final two-sprig review passed at eight widths from320–1440px. See [QA](design-qa.md), [desktop result](pricing-1440-settled.png), [mobile result](pricing-390-settled.png) and [before/after](pricing-before-after.png).

The standard browser runtime still fails to import its stale cached service path; the already-established local Chrome DevTools page is reused for screenshots and visible-state checks. No auth/session data is accessed.

Production second asset: `public/redesign/pricing/free-sprig.png`; [built-in ImageGen prompts and provenance](free-sprig-provenance.md). Both source illustrations remain distinct.
