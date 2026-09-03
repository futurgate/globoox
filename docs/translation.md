## Translation System Architecture

### Overview
The translation system uses a **priority-based queue** with streaming responses. When reading a book in a non-source language, blocks are translated on-demand with smart prefetching.

### Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      Page Navigation                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  ReaderView.tsx - useEffect on currentPageIdx change        │
│                                                             │
│  1. Current page blocks → enqueueBlocksImmediate() [HIGH]   │
│  2. Next 10 pages blocks → enqueueBlocks() [LOW]            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│           useViewportTranslation.ts - Queue System          │
│                                                             │
│  HIGH PRIORITY QUEUES:                                      │
│  • highPriorityPendingIds (waiting to send)                 │
│  • highPriorityQueuedIds (waiting for in-flight to finish)  │
│                                                             │
│  LOW PRIORITY QUEUES:                                       │
│  • pendingIds (prefetch waiting to send)                    │
│  • queuedIds (prefetch waiting for in-flight)               │
│                                                             │
│  IN-FLIGHT:                                                 │
│  • inflightIds (currently being translated)                 │
│  • translatedIds (already completed)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     scheduleFlush()                          │
│                                                             │
│  HIGH priority → immediate (0ms debounce)                   │
│  LOW priority → 100ms debounce                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     flushPending()                           │
│                                                             │
│  • If LOW priority batch in-flight & HIGH priority arrives: │
│    → ABORT low-priority, move blocks back to pending        │
│  • Combine queues: HIGH priority blocks FIRST               │
│  • Take up to MAX_BATCH_SIZE (10) blocks                    │
│  • Send to server via translateBlocksStreaming()            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│        Server: /api/chapters/[id]/translate.post.ts         │
│                                                             │
│  1. Check translation_cache table (Supabase)                │
│  2. Cache HITs → stream immediately                         │
│  3. Cache MISSes → batch LLM call (Gemini)                  │
│  4. Store translations in cache                             │
│  5. Stream results back as NDJSON                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Client: handleBlocksTranslated()                │
│                                                             │
│  • Each block arrives as soon as server emits it            │
│  • displayBlocks state updated with translated text         │
│  • UI re-renders with translated content                    │
└─────────────────────────────────────────────────────────────┘
```

### Key Behaviors

| Scenario | Behavior |
|----------|----------|
| Navigate to new page | Current page blocks get **immediate** HIGH priority translation |
| Prefetch in background | Next 2 pages enqueued as LOW priority |
| User navigates faster than translation | LOW priority batch **aborted**, current page gets priority |
| Cache hit | Block streamed instantly (no LLM wait) |
| Cache miss | LLM batch (up to 10 blocks), ~5-20s depending on length |

### Console Log Events
- `translate_current_page` — current page blocks enqueued (high priority)
- `prefetch_enqueue` — next pages enqueued (low priority)  
- `enqueue_blocks_immediate` — high priority enqueue details
- `abort_low_priority` — low priority batch aborted for high priority
- `flush_start` / `flush_done` — batch sent to server / completed
- `block_received` — individual block translation received