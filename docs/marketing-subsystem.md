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

Landing foundation lives in `src/app/landing/landing.css`.

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
