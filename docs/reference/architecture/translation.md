---
type: reference
status: current
owner: engineering
last_verified: 2026-09-01
implementation:
  - src/lib/hooks/useViewportTranslation.ts
  - src/lib/hooks/useChapterContent.ts
  - src/lib/hooks/useReaderMetadataTranslations.ts
  - src/lib/api.ts
  - src/lib/contentCache.ts
  - src/components/Reader/ReaderView.tsx
---

# Translation Architecture

## Core invariant

For a translated Reader surface, readiness is determined by the existence of target text for `(blockId, activeLang)`.

- Target text exists: render it as ready.
- Target text is missing: render fallback text under blur and reconcile or request translation.
- A non-empty `block.text` value alone is not proof that the target language is ready.

This is the accepted Translation v2 model. See [ADR-0003](../../decisions/ADR-0003-translation-v2-transitional-model.md).

## Three data paths

### Snapshot

`GET /api/chapters/{id}/content?lang=XX` supplies a non-empty chapter snapshot and structural fallback. It is not the sole source of truth for target-language readiness.

### Reconcile

`POST /api/chapters/{id}/blocks/text` checks a set of block IDs and returns their current target-text state. The client uses this path to recover already-completed work after aborts, navigation, reload, or a disconnected stream.

### Push

`POST /api/chapters/{id}/translate` starts or joins translation work. The request body is:

```ts
{
  lang: string
  blockIds: string[]
  anchorBlockId?: string | null
  direction?: 'up' | 'down'
}
```

The normal response is NDJSON with per-block results followed by `translate_done`. The client also supports a JSON-array fallback.

## Client storage

IndexedDB stores:

- language-agnostic chapter structure in `chapter_skeleton`;
- fallback values with the skeleton;
- target values separately in `block_text`, keyed by block and language.

When blocks are assembled for the UI, target text wins. Fallback remains visible under the pending treatment until target text exists. Fallback must never be written into the target-language cache as if it were a completed translation.

Reader metadata uses a separate bundle cache, `reader_metadata_bundles`.

## Scheduling

`useViewportTranslation` maintains high- and low-priority pending/queued sets plus in-flight, translated, pending, and recovery state.

Current policy:

1. The first two translatable blocks on the visible page are enqueued as high priority.
2. The rest of the visible page is enqueued as low priority.
3. Forward prefetch uses a 5,000-character budget and can cross chapter boundaries.
4. Backward recovery/prefetch covers up to 10 blocks.
5. A separate next-chapter warmup starts after approximately 1.5 seconds with a 5,000-character budget.
6. IntersectionObserver visibility with a 50% root margin can enqueue additional low-priority blocks.

The maximum request batch is 10 blocks. Both queue flush paths currently schedule without an additional debounce delay.

When high-priority work arrives, it can abort any active request, not only a low-priority request. Unfinished IDs are returned to scheduling or recovery; stale responses are prevented from becoming the active result.

## Recovery and reconciliation

An aborted client request does not prove that server work stopped. Recovery therefore checks server truth rather than immediately issuing duplicate work.

Current recovery parameters:

- reconcile updates coalesce for approximately 120 ms;
- `/blocks/text` recovery polling runs approximately every 1.5 seconds;
- recovery checks at most 50 blocks per batch;
- retry cooldown is 30 seconds;
- automatic recovery retry is capped at three attempts.

If the backend has already persisted a translation, reconcile returns it. If work is still active, it remains pending. Missing or stale work can return to the translation queue.

There is no durable cross-process queue guarantee in this frontend contract. A complete backend process loss can still lose in-flight work.

## Reader metadata and table of contents

Book title, author, and chapter titles are translated as one logical Reader metadata bundle through:

`POST /api/books/{id}/reader-metadata/translate`

The bundle has local cache reuse and in-flight deduplication. Inside Reader, metadata and TOC content share one pending surface so individual rows do not flicker between languages. Library continues to display canonical/original book identity.

## UI commit and repagination

Translated blocks merge into `displayBlocks` by ID and persist per block/language. Text changes can invalidate pagination, so Reader coalesces layout work and retains the logical block anchor across recomputation.

More aggressive chunk-level commits, token-budget scheduling, and first-readable-viewport staging are proposals, not current behavior. See the active [translation orchestration RFC](../../rfcs/active/translation-orchestration.md).

## Diagnostics

Current console/event labels include:

- `translate_current_page`
- `prefetch_forward_enqueue`
- `prefetch_backward_enqueue`
- `prefetch_next_chapter_enqueue`
- `enqueue_blocks`
- `enqueue_blocks_immediate`
- `abort_inflight`
- `flush_start`
- `block_received`
- `flush_done`

PostHog also records stream, batch, session-summary, and book-translation lifecycle events; see [analytics](../product/analytics-posthog.md).
