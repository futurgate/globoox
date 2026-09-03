---
type: index
status: current
owner: engineering
last_verified: 2026-09-01
---

# Globoox Documentation

This is the entry point for project documentation.

## Trust order

When documents disagree, use this order:

1. Current code and tests.
2. `docs/reference/` for the documented current state.
3. Accepted records in `docs/decisions/` for why the current state was chosen.
4. `docs/runbooks/` for operational procedures.
5. `docs/rfcs/` for proposed or not-yet-completed work.
6. `docs/archive/` for historical context only.

An archived document never overrides a current reference, even when the archived document calls itself “final” or “source of truth”.

## Current reference

### Architecture

- [API and sync](reference/architecture/api-and-sync.md)
- [Translation](reference/architecture/translation.md)
- [Reader overview](reference/reader/README.md)
- [Reader architecture](reference/reader/architecture.md)
- [Pagination rules](reference/reader/pagination.md)
- [Reader cache and versioning](reference/reader/caching.md)
- [Reader typography and hyphenation](reference/reader/typography.md)
- [Reader rules register](reference/reader/rules-register.md)

### Product and design

- [Design system contract](reference/product/design-system.md)
- [Typography and motion](reference/product/typography-and-motion.md)
- [Marketing subsystem](reference/product/marketing.md)
- [PostHog analytics](reference/product/analytics-posthog.md)
- [Brandbook](reference/product/brandbook.html)

## Runbooks

- [Local development](runbooks/local-development.md)
- [Troubleshooting](runbooks/troubleshooting.md)
- [Safari-specific issues](runbooks/safari.md)
- [Reader layout debugging](runbooks/reader-layout-debugging.md)

## Decisions and proposals

- [Architecture decision records](decisions/README.md)
- [RFC index](rfcs/README.md)
- [Documentation policy](documentation-policy.md)
- [Historical archive](archive/README.md)

## Maintenance rule

Every behavior-changing pull request should answer both questions:

1. Which current reference must change?
2. Does this change require a new ADR or resolve an RFC?

Do not add new planning documents directly under `docs/`.

Validate metadata and active local links with:

```bash
npm run docs:check
```
