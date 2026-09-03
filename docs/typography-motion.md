# Typography And Motion

This document defines the baseline text and motion system across product UI.

## Subsystems

There are three different typography voices:

1. App UI
2. Reader UI
3. Marketing UI

They should feel related, but they are not identical.

## App Typography

App UI should use a compact product scale.

Current semantic roles:

1. `--app-type-display-size`
2. `--app-type-title-size`
3. `--app-type-heading-size`
4. `--app-type-body-size`
5. `--app-type-caption-size`
6. `--app-type-meta-size`

Use them conceptually even when a component still carries a concrete class value.

Practical mapping:

1. Display: page hero/header moments inside app surfaces.
2. Title: section or modal titles.
3. Heading: card titles, grouped section headings, important row labels.
4. Body: primary content and explanations.
5. Caption: secondary support text.
6. Meta: labels, chips, eyebrow text, compact metadata.

## Reader Typography

Reader typography is controlled by reader theme configuration and reading settings.

Reader rules stay local to readability:

1. body weight and heading weight come from reader theme
2. line height is reader-controlled
3. reading content should not be forced into app page scales

## Marketing Typography

Marketing has its own subsystem voice.

Current semantic roles:

1. `--marketing-type-hero-size`
2. `--marketing-type-section-size`
3. `--marketing-type-body-size`
4. `--marketing-type-meta-size`

Marketing can keep larger display contrast, more editorial typography, and more expressive pacing.

## Motion Roles

App motion timing roles:

1. `--motion-fast`
2. `--motion-base`
3. `--motion-slow`
4. `--motion-ease-standard`
5. `--motion-ease-exit`
6. `--motion-ease-emphasis`

Marketing keeps its own equivalents where storytelling motion differs.

## Motion Usage

Use the timing roles like this:

1. Fast: pressed state, icon feedback, opacity changes.
2. Base: popovers, dropdowns, standard overlay fades.
3. Slow: drawers, emphasis transitions, larger surface moves.

## Rules

1. Do not invent arbitrary transition durations in feature code unless the interaction is unique and justified.
2. Do not mix app motion roles into reader-specific drawer physics without reason.
3. Do not force marketing motion into app overlays.
4. When adding a new repeated text size, decide whether it is a new semantic role before duplicating it.
5. Keep preview examples in sync with these rules.
