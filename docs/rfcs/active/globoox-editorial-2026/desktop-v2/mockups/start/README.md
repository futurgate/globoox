---
type: rfc
status: active
owner: design-engineering
last_verified: 2026-09-05
---

# Closing CTA and footer — selected composition study

[Generated mockup](start-footer-v2.png) · [Exact ImageGen prompt](prompt.txt)

This study follows the [Desktop V2 direction](../../DIRECTION.md). It covers the existing `start` block and Footer only. The root art director will review the mock before any implementation changes.

## Selection

Select the continuous paper composition: a centered closing invitation, one clear upload action, restrained botanical echoes at the margins, and a footer whose identity and full statement form two deliberate groups. Space provides the transition into the footer. No extra divider or tinted panel is needed.

The unchanged existing brand icon gives this ending a recognizable product identity. The dark CTA connects that identity to an action. The left fern and right seed stem bring back the hero's visual language without introducing another product illustration or a new marketing block.

The footer keeps the full original statement readable and gives the wordmark enough weight to conclude the page. Its asymmetry provides a useful change from the centered CTA above.

## Corrections required in implementation

The generated composition is useful, but its literal proportions need restraint at the 1440px desktop target:

- The generated top icon and button are much larger than the prompt requested. Use the real icon at approximately 56px, a 72px CTA heading, and a button around 290 × 58px. Preserve a minimum 44px action height. The final view should feel like a page ending rather than a second hero.
- Keep the botanical fragments smaller and quieter than this output, especially the tall right-hand stem. Confine them to the outer margins and keep the action visually dominant. Do not reuse generated text or icons from the bitmap.
- Use the unchanged `public/icon.svg` asset. The model reproduced its identity recognizably but introduced surface shading; that is not an approved brand alteration.
- Use the canonical `getLandingMessages('en')` strings as live HTML. The generated footer uses a typographic apostrophe in “world’s”; the actual source string uses “world's”. The bitmap is not copy authority.
- Use approximately 40px footer wordmark type and 16–17px statement type, rather than copying the output's oversized wordmark. Preserve the original statement in full.

The section adds no claims, links, devices, fields, pricing, testimonials, or product functionality. The existing optional floating scripts may remain only as very subtle decoration if they contribute to the final composition; they are not a new content requirement.

## Generation and provenance

- Generated on 2026-09-05 with the built-in ImageGen tool, in one call as requested.
- Reference 1: the user-supplied desktop art-direction image named `download.png`; used for paper, pine, typography and botanical composition only. Its invented product screen, copy and replacement logo were excluded.
- Reference 2: `public/icon-512.png`, inspected before generation and confirmed to represent the existing `public/icon.svg` app icon. It establishes the real brand identity.
- Original copy verified against `src/lib/landing-i18n/index.ts`, including the complete CTA and footer statement/copyright. Canonical structural references are the original CTA and Footer components.
- Requested canvas: 1440 × 900. Actual tool output: 1586 × 992, RGB PNG, 1,287,599 bytes. The original output is preserved without cropping or resizing. Treat this as a composition study for the 1440px implementation, not pixel-perfect final code.
- Generated source filename: `exec-8e1c2d9a-3356-4133-bc1c-a92fce6877da.png`; the copied project artifact is `start-footer-v2.png`.
- Visual inspection completed from the ImageGen result. This task changed no source code or existing assets.
