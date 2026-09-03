# Design System Contract

This document is the source of truth for how UI should be composed in the product.

## Layers

Use these layers in order:

1. Tokens
2. Primitives
3. Patterns
4. Product components
5. Page compositions

Page-level code must not skip downward and rebuild primitive chrome locally.

## Theme Domains

There are two theme domains:

1. App domain
2. Reader domain

There is also a separate marketing design sub-system for landing and promotional experiences.

See `docs/marketing-subsystem.md`.

Both resolve through shared theme definitions in `src/lib/themes.ts`.

Selections are independent:

1. App theme controls product UI surfaces.
2. Reader theme controls reader surfaces.

Do not duplicate light/dark/forest values in feature files.

## App Semantic Roles

Use app semantic roles for non-reader product UI:

1. `--app-shell-bg`
2. `--app-section-bg`
3. `--app-surface-bg`
4. `--app-elevated-bg`
5. `--app-chrome-bg`
6. `--app-input-bg`
7. `--app-text`
8. `--app-text-muted`
9. `--app-text-subtle`
10. `--app-accent`
11. `--app-border`
12. `--app-divider`

Prefer these over generic `background`, `foreground`, `muted`, or ad hoc grouped surface classes when working on app pages.

## Reader Semantic Roles

Use reader semantic roles only inside the reader:

1. `--reader-panel-bg`
2. `--reader-chrome-bg`
3. `--reader-text`
4. `--reader-muted-text`
5. `--reader-subtle-text`
6. `--reader-accent`
7. `--reader-border`

Reader drawers and dropdowns must use reader-scoped shared primitives instead of app surface classes.

## Primitive Rules

Shared primitives define geometry and role, not page-specific styling.

Examples:

1. `IOSItemsStack` owns clipping, radius, and surface tone.
2. `IOSBottomDrawer` owns modal shell and drawer tone.
3. `IOSBottomDrawerHeader` owns drawer header chrome.
4. `IOSDialog` owns compact dialog shell.
5. `IOSDialogFooter` and `IOSAction*` own dialog action layout.

If a product component needs a new visual role, extend the primitive API first.

Do not patch primitive appearance from page code with unrelated local classes unless that role is being formalized.

## Patterns

Use canonical patterns before inventing new modal shapes:

1. `IOSAlertDialog`
2. `IOSFeatureDialog`
3. `IOSFlowDialog`
4. Reader bottom-drawer pattern

Feature code should choose a pattern first, not start from `IOSModalShell`.

## Inline Style Rule

Inline styles are allowed only for computed values, for example:

1. dynamic width
2. calculated position
3. gradients
4. theme preview swatches

Inline styles must not carry semantic roles like primary text color, surface color, or border role.

## Preview Catalog

`src/app/(app)/dev/components-preview/page.tsx` is not just a demo page.

It is the contract preview for:

1. primitive usage
2. pattern selection
3. button and list-row behavior
4. semantic role examples

When primitives or patterns change, update the preview catalog in the same change.

## Typography And Motion

Typography and motion are part of the system, not per-component styling leftovers.

Use semantic roles and timing roles before inventing local values.

See `docs/typography-motion.md`.

## Contributor Rules

1. Do not reintroduce duplicated theme values in feature code.
2. Do not use reader semantic roles outside reader UI.
3. Do not use app semantic roles to style reader chrome.
4. Do not rebuild modal headers, action rows, or drawer shells locally.
5. Prefer semantic roles over raw grouped/background utility classes.
6. Update the preview catalog when changing shared UI contracts.
7. Treat marketing as its own subsystem instead of forcing landing sections into app primitives.
