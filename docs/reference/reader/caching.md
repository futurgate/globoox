---
type: reference
status: current
owner: reader
last_verified: 2026-09-01
implementation:
  - src/components/Reader/ReaderView.tsx
  - src/lib/contentCache.ts
---

# Reader Caching and Versioning

## Layout caches

Reader pagination uses:

- a module-level in-memory layout cache for same-session reuse;
- the IndexedDB `chapter_layout` store for reload/remount reuse.

The IndexedDB database is `globoox-cache`, schema version `9`.

## Cache identity

The pagination key includes:

- chapter identity;
- content/layout signature;
- resolved column width and page height;
- typography settings;
- active Reader theme/language inputs;
- pagination algorithm version.

## Algorithm version

Current `PAGINATION_ALGO_VERSION`:

```text
v2026-03-25-probe-visible-css-parity
```

When the version changes, Reader clears in-memory layouts and IndexedDB chapter layouts, then records the new value in `reader.pagination_algo_version`.

Increment the version whenever old cached page splits are incompatible with new measurement, normalization, typography, or pagination rules. Do not use a version bump as a substitute for fixing an incomplete cache key.

## Content relationship

Chapter content uses `chapter_skeleton` plus per-language `block_text`; layout cache entries are derived artifacts. Content/translation truth always wins over a cached page layout.
