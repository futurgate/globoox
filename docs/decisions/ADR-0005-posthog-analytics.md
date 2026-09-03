---
type: adr
status: accepted
owner: product-analytics
date: 2026-03-26
last_verified: 2026-09-01
implementation:
  - src/instrumentation-client.ts
  - src/lib/posthog.ts
  - src/components/PostHogProvider.tsx
---

# ADR-0005: Use PostHog as the product analytics provider

## Context

The repository contains historical dashboard specifications for both PostHog and Amplitude. Only PostHog has an installed SDK, initialization, identity provider, consent integration, and live event call sites.

## Decision

PostHog is the single current product-event provider and source for event taxonomy documentation.

## Alternatives considered

### Amplitude

An Amplitude dashboard prototype was written, but no SDK, provider, or event implementation exists in the current repository.

The original reason PostHog was selected over Amplitude is not present in the available documents. It must remain recorded as undocumented rather than replaced with a reconstructed rationale.

## Consequences

- New product events and dashboards target PostHog.
- The Amplitude specification remains archived evidence, not a second current contract.
- Reconsidering providers requires a new ADR with migration, consent, identity, cost, and data-retention analysis.

## Sources

- [Current analytics reference](../reference/product/analytics-posthog.md)
- [Archived Amplitude prototype](../archive/2026-04/analytics/amplitude-dashboard-prototype.md)
