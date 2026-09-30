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


## Snapshot ownership and position writes

`useChapterContent` stores the book, chapter and language together with each content snapshot. A render selecting another owner marks the previous snapshot stale immediately, including before an IndexedDB read finishes. The Reader display snapshot uses the same ownership check before pagination, translation and position persistence. A background refresh of the same chapter retains its usable cached text.

A targeted chapter reload bypasses the normal fresh-cache path while preserving the currently readable snapshot until a valid replacement arrives. Late responses for a previous book/chapter/language cannot publish or repopulate its state after navigation.

Same-chapter table-of-contents navigation saves the target block anchor, as do previous/next page actions. Returning to a previous chapter preserves the last-page sentinel until that chapter's owned pages exist.

Frontend position writes are serialized within one JavaScript context per account/book. The backend additionally commits against the `reading_progress.updated_at` value it observed: conditional UPDATE for an existing row, INSERT for a missing row. A conflict returns the existing `persisted:false, reason:stale_client` contract rather than overwriting the concurrent winner. A successful update strictly advances its timestamp, including same-millisecond saves. Snapshot, commit and conflict-refresh database failures return 503 without acknowledging persistence. No database migration is required.

This is optimistic conflict detection, not a guarantee of ordering user intentions across devices with different clocks. The existing client-time versus server-acknowledgement policy remains; simultaneous clients can receive a conflict. Intentional backwards navigation against an acknowledged position is supported. One origin's local cache is not shared with another origin or device.
