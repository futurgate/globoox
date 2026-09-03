---
type: adr
status: accepted
owner: design-system
date: 2026-04-05
last_verified: 2026-09-01
implementation:
  - src/lib/themes.ts
  - src/components/ui
  - src/components/landing
---

# ADR-0004: Separate interface domains and use canonical overlay primitives

## Context

Product UI, reading surfaces, and marketing storytelling have different typography, layout, motion, and surface needs. Reusing raw color values or ad-hoc overlay shells across them caused visual drift and repeated behavior for focus, escape, backdrop, scroll lock, safe areas, and actions.

## Decision

- Maintain separate App, Reader, and Marketing semantic domains over one shared brand foundation.
- App and Reader theme selections remain independent.
- Marketing owns its expressive layout and motion rather than being forced into App primitives.
- Shared overlays centralize behavior in canonical iOS-style primitives and patterns.
- Confirmation and short informational blocking flows use the alert pattern, not new toast/banner families.

## Alternatives considered

### One semantic theme surface for every experience

Not selected because it couples Reader readability and Marketing art direction to product-shell constraints.

### Rebuild each modal from fixed-position feature markup

Rejected because portal, focus, escape, outside-click, scroll-lock, safe-area, animation, and z-index behavior would continue to diverge.

### Pixel-copy UIKit screenshots

Not selected. The contract preserves iOS interaction proportions and semantics without treating one screenshot as a cross-platform implementation spec.

## Consequences

- Feature code chooses a domain and a canonical pattern before styling details.
- Shared primitives own geometry and behavior; product components own content.
- Cross-domain reuse happens at the brand/accessibility foundation, not by importing another domain's semantic roles.

## Sources

- [Design system](../reference/product/design-system.md)
- [Marketing subsystem](../reference/product/marketing.md)
- [Historical overlay plan](../archive/2026-03/plans/ios-overlay-components-plan.md)
