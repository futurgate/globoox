---
type: reference
status: current
owner: engineering
last_verified: 2026-10-01
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
3. Forward prefetch uses a 5,000-character budget within the current chapter.
4. Backward recovery/prefetch covers up to 10 blocks within the current chapter.
5. A separate next-chapter warmup starts after approximately 1.5 seconds with a 5,000-character budget.
6. IntersectionObserver visibility with a 50% root margin can enqueue additional low-priority blocks.

The maximum request batch is 10 blocks. Both queue flush paths currently schedule without an additional debounce delay.

Every viewport queue request belongs to one book/account/chapter/language context. Unknown block IDs are rejected before enqueue. Neighboring chapter IDs must never be appended to the current chapter queue: the next-chapter warmup has its own chapter endpoint and cancellation context. Content and display snapshots carry their book/chapter identity in addition to language; a previous chapter's cached blocks cannot authorize translation for a newly selected chapter.

When high-priority work arrives, it can abort any active request, not only a low-priority request. Unfinished IDs are returned to scheduling or recovery; stale responses are prevented from becoming the active result.

## Recovery and reconciliation

An aborted client request does not prove that server work stopped. Recovery therefore checks server truth rather than immediately issuing duplicate work.

Current recovery parameters:

- reconcile updates coalesce for approximately 120 ms;
- `/blocks/text` recovery polling runs approximately every 1.5 seconds;
- recovery checks at most 50 blocks per batch;
- retry cooldown is 30 seconds;
- automatic recovery retry is capped at three attempts after the initial request;
- an individual translation stream has a 60-second deadline and a status read has a 10-second deadline;
- unresolved recovery leaves automatic polling after 120 seconds.

If the backend has already persisted a translation, reconcile returns it. If work is still active, it remains pending. Missing or stale work can return to the translation queue.

Only a non-empty successful result for a requested ID counts as translated. Explicit errors, empty successes and IDs omitted by a partial stream remain failed work; successful text/cache entries are retained. Recovery shares the foreground queue, so it cannot launch a competing stream for the same block. After exhaustion the visible page shows an error and a manual retry; repeated clicks cannot enqueue duplicate work. Optional backend `reason`/`retryable` fields suppress automatic regeneration for missing chapter/block IDs. Those errors offer a targeted chapter reload that bypasses fresh content cache; other chapters and the reading position are preserved.

Generation and request-owner checks reject late stream/status callbacks after book, account, chapter or language changes and unmount. Cancellation aborts active transports. Already accepted successful text remains cached; aborted outstanding work may be reconciled in the active chapter, but old callbacks cannot update the new view or write additional cache entries.

Temporary display readiness is not a new request owner. When cached fallback is revalidated within the same chapter/language, binding the fresh snapshot must preserve an already running stream and its retry budget. New enqueue waits for binding; callbacks validate IDs against the accepted source snapshot immediately, including before display binding finishes. Ready source text wins over a late stream result. Replacing or completing IDs clears obsolete failure/pending markers without regenerating ready text.

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
