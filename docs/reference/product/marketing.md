---
type: reference
status: current
owner: marketing
last_verified: 2026-10-30
implementation:
  - src/app/landing/landing.css
  - src/components/landing
  - src/components/landing-business
  - src/app/authors/page.tsx
  - src/app/publishers/page.tsx
---

# Marketing Subsystem

The landing experience is a separate design sub-system.

It is not the same thing as the product app UI.

## Rule

Use this split:

1. Shared theme foundation for palette identity and global brand consistency.
2. App subsystem for authenticated product UI.
3. Reader subsystem for reading surfaces.
4. Marketing subsystem for landing and promotional experiences.

## What Marketing Owns

Marketing owns its own:

1. typography voice
2. layout rhythm
3. visual storytelling
4. gradients and decorative effects
5. section-level art direction

These should not be forced into app primitives.

## What Marketing Should Still Reuse

Marketing should still stay aligned with shared brand foundation:

1. brand palette direction
2. broad tone hierarchy
3. link and action meaning
4. accessibility expectations

## Current Implementation

The primary localized landing foundation lives in `src/components/landing/landing.css`; legacy `/landing` also retains `src/app/landing/landing.css`.

### Authors and publishers

`/authors` and `/publishers` are public Russian business landings, built from the supplied B2B presentation with the primary landing's Lora/Inter typography and marketing tokens. Both use `BusinessLandingPage` with an explicit audience and share their translation, languages, comparison, trial, publishing process and contact sections. Each has its own canonical/social metadata and sitemap entry.

- Authors omit the partner strip and advisors. Their four-person team reuses the main landing's copy, profiles and photos, excluding only the final future-of-reading sentence.
- Publishers retain the presentation's partner strip, four biographies and advisors.
- Languages reuse the primary landing's `SupportedLanguages` book/orbit composition, with nine upcoming languages from the presentation. Its six-position layout on the main landing is unchanged. Publishing steps use the forest-green surface and contrasting light type.
- Hero eyebrows name only the page's own audience; both first-screen buttons say `Связаться с нами` and open email directly.
- `BusinessEmailButton` opens email to the user-confirmed `lomovski@globoox.co` for hero/contact/trial, with distinct contact and trial subjects. No book or message is submitted by the site.
- The recipient and ready-made `mailto:` are absent from server HTML and the passive page DOM. Client code assembles the URI on native mouse/touch/keyboard activation and rejects synthetic DOM clicks. This is light obfuscation, not human verification: scripts can recover the address from the client bundle, and browser automation can generate trusted events. No CAPTCHA/server check is installed. A no-JavaScript contact hint explains why the action is unavailable.
- Shared header defaults preserve the main landing. Business pages hide the locale selector and link the logo to `/ru`, avoiding nonexistent translated audience routes.
- Both pages use the existing cookie banner and consent boundary, remain public for signed-in visitors, and set `lang="ru"` on the page shell.
- The shared comparison supports pointer/touch and keyboard arrows, Shift, Home/End with slider semantics.

Implementation, source provenance and checks: [authors/publishers record](../../rfcs/active/authors-publishers-landings/README.md).

Marketing semantic aliases should be preferred there, for example:

1. `--marketing-shell-bg`
2. `--marketing-surface-bg`
3. `--marketing-overlay-bg`
4. `--marketing-card-bg`
5. `--marketing-border`
6. `--marketing-text`
7. `--marketing-text-muted`
8. `--marketing-text-subtle`
9. `--marketing-accent`
10. `--marketing-accent-hover`
11. `--marketing-accent-soft`

## Constraints

1. Do not restyle landing sections with app semantic roles.
2. Do not import reader semantic roles into landing components.
3. Do not force landing typography into app text scales unless that is an explicit redesign decision.
4. Keep landing mockups and motion local to the marketing subsystem.

## Practical Boundary

Use app primitives when the thing is a product interaction.

Use marketing-local components when the thing is a storytelling section.

Examples:

1. Product auth form: app subsystem.
2. Reader settings drawer: reader subsystem.
3. Landing hero, reviews carousel, comparison storytelling, animated device mockups: marketing subsystem.
