---
type: reference
status: current
owner: design-system
last_verified: 2026-10-01
implementation:
  - src/lib/themes.ts
  - src/lib/notifications.ts
  - src/components/ui
  - src/app/(app)/dev/components-preview/page.tsx
---

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

See [Marketing subsystem](marketing.md).

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

## Notifications

The App uses Sonner 2.0.8 through one [AppToaster](../../../src/components/ui/app-toaster.tsx), mounted in the App layout. Feature code calls the [shared notification API](../../../src/lib/notifications.ts); it must not mount another host or create a separate timer/queue. The [dedicated styles](../../../src/components/ui/app-toaster.css) use App semantic roles and inherit the App palette independently of Reader surfaces.

1. Call `setNotificationScope(scopeKey)` with the current account/guest/share scope and capture its returned handle when an operation starts. Pass that handle to `notify({ scope, operationId, event, title, description?, kind?, action? })`. Scope changes/logout clear messages and retire old handles, including an A → B → A switch. A matching session/token refresh keeps the scope.
2. Use a unique `operationId` per attempt and a stable `event` per transition. The same operation updates one message; repeated events are ignored. `dismissNotification(scope, operationId)` also rejects later results for that operation. Deduplication is in memory for the current scope lifetime; features must not manufacture completion events on reload.
3. A message has at most one action. At most three operations remain active; a new one retires the oldest without keyboard focus. Message lifetime is six seconds, or ten with an action. Sonner owns timers, hover/document-hidden pause and dismissal. The wrapper suspends expiry during keyboard focus, expands the stack, and grants a full lifetime after focus leaves; a focused action is not evicted by a new notification.
4. Modal owners call `setNotificationsSuppressed(true, owner)` and release the same owner on close/unmount. This clears visible messages and drops new ones without a backlog. Errors and recovery actions belonging to an open modal stay inside it. Persistent offline, failed-operation and unknown-status recovery remain in their card/banner/modal after a toast disappears.

The host sits above bottom navigation and the safe area, with a `visualViewport` adjustment for keyboard occlusion. It does not move focus on arrival. All current kinds, including `error`, use **one native Sonner polite live region**; there is no urgent/assertive alert API. Do not add a second live region around the same message.

The [preview catalog](../../../src/app/%28app%29/dev/components-preview/page.tsx) demonstrates success, one-action recovery and deduplication. Focused checks are `src/__tests__/notifications.test.ts` and `e2e/notifications.mjs`; the browser fixture checks real Sonner behavior, not a full product flow or physical-device keyboard behavior.

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

See [Typography and motion](typography-and-motion.md).

## Contributor Rules

1. Do not reintroduce duplicated theme values in feature code.
2. Do not use reader semantic roles outside reader UI.
3. Do not use app semantic roles to style reader chrome.
4. Do not rebuild modal headers, action rows, or drawer shells locally.
5. Prefer semantic roles over raw grouped/background utility classes.
6. Update the preview catalog when changing shared UI contracts.
7. Treat marketing as its own subsystem instead of forcing landing sections into app primitives.
