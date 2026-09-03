# Translation Anchor Stabilization: Full Plan

## 0) Why this document exists

Bug report:
- "Text after first translation opened not at the original place"
- User had to go back ~2 pages and wait ~20 seconds.

This document defines a single, explicit architecture to prevent anchor drift during language switch.

---

## 1) Product goal

When user switches language in Reader:
- Keep user on the same logical text fragment (anchor), not the same numeric page.
- Avoid post-switch jumps caused by repeated repagination.
- Keep a visible fast escape hatch: user can choose to read immediately with known instability.

---

## 2) Scope and non-goals

In scope:
- Reader language switch flow.
- Translation orchestration priorities.
- Frontend state machine.
- Backend contract for anchor-stabilization translation.
- Logging, metrics, tests, DoD.

Out of scope:
- Full redesign of paginator algorithm.
- Replacing existing block model.
- Changing auth/session architecture.

---

## 3) Current root cause summary

Current implementation uses two translation paths at once:
1. `GET /api/chapters/:id/content?lang=XX`
2. `POST /api/chapters/:id/translate` (viewport streaming)

Both can update visible text after initial restore.
Every text update can trigger `computePages(...)` again.
This causes page composition drift around anchor.

Main issue:
- Anchor restore is effectively one-shot.
- After that, more translated blocks arrive and reflow changes again.

Additional context (client caching):
- The client caches chapter content locally (IndexedDB) to reduce refetches and loading states during navigation.
- This is compatible with anchor stabilization, but the stabilization flow must explicitly control when cached/streamed updates
  are allowed to mutate the visible `displayBlocks`, otherwise pagination can still reflow after the anchor is restored.

---

## 4) Target architecture (agreed constraints)

Mandatory decisions from this plan:
1. No adaptive batching.
2. `start -> anchor` translation is requested as one logical chunk.
3. For this chunk, backend returns a single final payload (non-stream), not block NDJSON.
4. "Progressive unlock" UX exists and is in English.
5. Priorities are exactly three:
   - Priority 1: viewport (instant request, high priority, result kept ready but not auto-shown during stabilization).
   - Priority 2: start -> anchor (blocking stabilization path, one-shot payload, used for canonical re-layout).
   - Priority 3: prefetch next 3 pages (can stream, same style as now).

Compatibility note (per-block caching):
- Caching translations per block `(blockId, lang)` (client-side) is aligned with this plan:
  - Stabilization path (Priority 2) can prime the cache in one shot (range payload), then the UI applies it deterministically.
  - Viewport/prefetch streaming updates (Priority 1/3) can update cache without forcing immediate re-layout during stabilization.
- The key constraint remains: do not let streaming updates mutate the layout-critical window while the anchor is being stabilized.

---

## 5) New backend contract (required)

### 5.1 New endpoint

`POST /api/chapters/{chapterId}/translate-range`

Request:
```json
{
  "lang": "FR",
  "from_position": 0,
  "to_position": 875,
  "timeout_ms": 30000,
  "job_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

Response (single JSON, no NDJSON stream):
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "translated_blocks": [
    {
      "id": "cb-1",
      "chapter_id": "ch-1",
      "position": 1,
      "type": "paragraph",
      "original_text": "...",
      "translations": { "FR": "..." },
      "metadata": {}
    }
  ],
  "range": {
    "from_position": 0,
    "to_position": 875,
    "block_count": 412
  },
  "metrics": {
    "cache_hits": 350,
    "cache_misses": 62,
    "llm_calls": 4,
    "duration_ms": 7210
  }
}
```

Errors (single JSON, no NDJSON stream):
```json
{
  "error": "timeout",
  "code": 408,
  "message": "Request timed out before all blocks could be translated",
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "duration_ms": 30012
}
```

### 5.2 Requirements

- Deterministic order by `position`.
- Include both cached and newly translated blocks in one response.
- Respect request timeout and return proper error code.
- Idempotent for same `(chapterId, lang, from_position, to_position)` (cache makes output stable; `job_id` is for correlation/retries).
- Operational limits must be explicit and enforced server-side:
  - `413` if range exceeds max blocks (currently: 200).
  - `408` on deadline.
  - `429` on per-user concurrent range limit (currently: 3).

### 5.3 Why a dedicated endpoint

- We need one canonical commit point for `start -> anchor`.
- Streaming block updates are useful for post-anchor prefetch, but harmful for anchor stabilization.

---

## 6) Frontend orchestration model

## 6.1 Sequence (language switch)

1. User selects language.
2. Reader captures anchor (`blockId`, `sentenceIndex`, `blockPosition`, `chapterId`).
3. Reader enters `STABILIZING` state.
4. Fire Priority 1 (viewport translate) immediately:
   - request can run,
   - results are buffered,
   - not applied to visible content yet.
5. Fire Priority 2 (`start -> anchor` one-shot endpoint).
6. Show stabilization overlay with progress + CTA:
   - Primary text: `Preparing your text position...`
   - Secondary text: `This may take up to a few seconds.`
   - Button: `Read now (may shift)`
7. When Priority 2 resolves:
   - merge range result into chapter blocks,
   - run one canonical `computePages(...)`,
   - restore by anchor,
   - unlock visible content.
8. Apply buffered Priority 1 results if still relevant.
9. Start Priority 3 prefetch (`+3 pages`) via existing streaming model.
10. Exit `STABILIZING` -> `LIVE_READING`.

## 6.2 Why Priority 1 exists if not displayed immediately

- It reduces latency after unlock because current viewport may already be translated by the time stabilization completes.
- It allows fast-path if user taps `Read now (may shift)`.

---

## 7) State machine

States:
- `IDLE`
- `SWITCH_INIT`
- `STABILIZING`
- `UNLOCKED_READ_NOW`
- `LIVE_READING`
- `FAILED`

Events:
- `LANG_SWITCH_REQUESTED(lang)`
- `P1_VIEWPORT_DONE`
- `P2_RANGE_DONE`
- `READ_NOW_CLICKED`
- `P3_PREFETCH_STARTED`
- `ABORT_SWITCH`
- `TIMEOUT`
- `ERROR`

Transitions:
1. `IDLE --LANG_SWITCH_REQUESTED--> SWITCH_INIT`
2. `SWITCH_INIT --> STABILIZING`
3. `STABILIZING --READ_NOW_CLICKED--> UNLOCKED_READ_NOW`
4. `STABILIZING --P2_RANGE_DONE--> LIVE_READING`
5. `UNLOCKED_READ_NOW --P2_RANGE_DONE--> LIVE_READING`
6. `STABILIZING --TIMEOUT/ERROR--> FAILED`
7. `FAILED --READ_NOW_CLICKED--> LIVE_READING` (fallback to current streaming behavior)
8. Any state (except IDLE) `--ABORT_SWITCH--> IDLE`

Rules:
- Only one active language-switch job per reader instance.
- New switch invalidates previous job by `jobId` (front generates and keeps the latest one; late responses are ignored).
- Late responses with old `jobId` are ignored.

### 7.1 Glow policy (state-driven)

Glow and translation visual indicators must be controlled by state machine, not timeout.

Mapping:
- `STABILIZING` -> `glow = on` (strong)
- `UNLOCKED_READ_NOW` -> `glow = on` (soft)
- `LIVE_READING` -> `glow = off`

---

## 8) Open questions / known constraints (must be decided)

1. Range limit vs anchor distance:
   - Backend limit is 200 blocks per request.
   - Decide what frontend does if `anchor_position - chapter_start > 200`:
     - option A: chunk multiple `translate-range` calls (must keep deterministic merge + one canonical repagination),
     - option B: fall back to `Read now (may shift)` UX immediately.
2. Block schema alignment:
   - OpenAPI `ContentBlock` uses `original_text` + `translations` (per-language map).
   - Ensure frontend chapter block types match the actual server payload before implementing merge logic.
- `FAILED` -> `glow = off`
- `IDLE` / `SWITCH_INIT` -> `glow = off`

Rules:
- Timeout cannot be the source of truth for glow visibility.
- Timeout may only act as fail-safe if state transition event is missing.
- Glow must be purely visual and must not affect layout metrics.
- Any overlay label (`Translating...`) must remain absolute-positioned and excluded from page height calculations.

---

## 8) Cancellation and timeout policy

## 8.1 Client

- For each switch create `switchJobId` + `AbortController`s:
  - `acP1Viewport`
  - `acP2Range`
  - `acP3Prefetch`
- On any new language switch / chapter switch / explicit navigation jump:
  - abort all controllers,
  - increment `switchJobId`,
  - ignore stale promises.

## 8.2 Timeout policy

- `P2 range` hard timeout: `45s`.
- If timeout hits:
  - state -> `FAILED`,
  - show message: `We couldn't fully prepare this position in time.`
  - show button: `Continue reading now`.

## 8.3 Server safeguards (requested)

- Server-side deadline for range jobs.
- Return structured timeout error (`408` or domain-specific code).
- Optional: cache in-progress dedupe by `(chapterId, lang, to_position)`.

---

## 9) Source of truth policy

During `STABILIZING`:
- Canonical content source for visible layout is Priority 2 range response.
- `GET /content?lang` and Priority 1 results must not re-layout visible page before P2 commit.

After `LIVE_READING`:
- Existing viewport streaming merge is allowed.
- Prefetch is limited to next 3 pages.

---

## 10) UI/UX specification (English only)

Overlay content:
- Title: `Preparing your text position...`
- Subtitle: `We are translating up to where you left off.`
- Small note: `You can start now, but page position may shift.`
- Button: `Read now (may shift)`
- Optional progress line: `Translated X of Y blocks`

Behavior:
- Overlay is non-blocking visually but blocks page-turn controls while in strict stabilizing mode.
- If user clicks button, controls unlock immediately and app enters `UNLOCKED_READ_NOW`.

---

## 11) Detailed implementation plan (frontend)

## 11.1 Reader flow changes

File: `src/components/Reader/ReaderView.tsx`

Add:
- `switchMode` state machine enum.
- `switchJobRef` (`jobId`, controllers, timestamps).
- `bufferedViewportTranslations` store for P1.
- `stabilizationOverlay` UI + button handler.

Change language switch handler:
- capture anchor,
- initialize job,
- start P1 + P2,
- block visible re-layout commit until P2 done or user presses `Read now`.

## 11.2 API client additions

File: `src/lib/api.ts`

Add:
- `translateRangeToAnchor(chapterId, lang, anchor, signal)`.
- Typed interfaces:
  - `TranslateRangeRequest`
  - `TranslateRangeResponse`

Keep existing:
- `translateBlocksStreaming(...)` for P3 and live viewport mode.

## 11.3 Translation hook adjustments

File: `src/lib/hooks/useViewportTranslation.ts`

Add mode gates:
- `mode: 'stabilizing' | 'live'`
- In `stabilizing`:
  - allow enqueue/request for P1 but callback goes to buffer,
  - do not mutate visible `displayBlocks`.
- In `live`:
  - current behavior.

Prefetch window change:
- from `10` pages ahead to `3` pages ahead (as requested).

## 11.4 Optional route plumbing in Next API layer

New route:
- `src/app/api/chapters/[id]/translate-range/route.ts`
- proxy pass-through to backend (like existing routes).

---

## 12) Planned diff map

Expected touched files:
1. `src/components/Reader/ReaderView.tsx`
2. `src/lib/api.ts`
3. `src/lib/hooks/useViewportTranslation.ts`
4. `src/app/api/chapters/[id]/translate-range/route.ts` (new)
5. `src/components/Reader/TranslationGlow.tsx` or related UI wrapper (if overlay hosted there)
6. `docs-for-humans/api-architecture.md` (contract update)

Backend (external to this repo, for handoff):
1. New `POST /api/chapters/{id}/translate-range`
2. Timeout/error contract
3. Cache behavior definition for range endpoint

---

## 13) Logging and observability

New client events:
- `language_switch_stabilization_started`
  - props: `book_id`, `chapter_id`, `from_lang`, `to_lang`, `anchor_position`
- `language_switch_read_now_clicked`
  - props: `book_id`, `chapter_id`, `elapsed_ms`
- `language_switch_stabilization_completed`
  - props: `duration_ms`, `range_block_count`, `p1_ready`, `used_read_now`
- `language_switch_stabilization_failed`
  - props: `reason`, `duration_ms`
- `anchor_drift_after_unlock`
  - props: `drift_pages`, `drift_blocks`, `mode`

Debug logs:
- job lifecycle (`jobId`, start, cancel, complete).
- P1/P2/P3 request IDs and timing.
- late-response ignored logs with stale `jobId`.

---

## 14) Test plan

## 14.1 Unit tests

1. State machine transitions:
- normal completion
- read-now path
- timeout path
- cancel + stale-response ignore

2. Anchor restore correctness:
- exact `blockId + sentenceIndex`
- fallback by `blockPosition`

3. Queue policy:
- P1 buffering in stabilizing mode
- P3 only in live mode
- prefetch window = 3

## 14.2 Integration tests

1. Switch language at chapter start.
2. Switch language at chapter middle.
3. Switch language near chapter end.
4. Click `Read now (may shift)` immediately.
5. Rapid double language switch (`EN -> FR -> DE`) with stale response arrival.
6. Chapter switch during stabilization.

Assertions:
- no crash,
- anchor restored within accepted drift,
- stale job cannot overwrite active state.

## 14.3 Manual QA checklist

- iPhone Safari, Android Chrome, Desktop Chrome/Safari.
- Slow network profile.
- Large chapter with many long paragraphs.
- Verify overlay copy is English.

---

## 15) Definition of Done (DoD)

Functional:
1. On language switch, app enters stabilization mode.
2. `start -> anchor` is requested via dedicated one-shot endpoint.
3. Anchor restore uses canonical range result before unlock.
4. `Read now (may shift)` works and is trackable.
5. Post-unlock prefetch is max 3 pages ahead.

Reliability:
1. Stale job responses never mutate active UI.
2. Timeout path handled with clear fallback.
3. Cancel path works for new language/chapter/user jump.

Quality:
1. Added tests pass.
2. Added analytics events visible.
3. No TypeScript errors.

UX:
1. Copy is English-only as specified.
2. User can always choose immediate reading.
3. Position-jump bug is significantly reduced.

---

## 16) Open questions for backend handoff

1. Max payload size for one-shot range response?
2. Expected upper bound latency for `translate-range` at 95th percentile?
3. Is backend able to atomically return cached + newly translated blocks in deterministic order?
4. Should timeout be hard 45s server-side or configurable per request?

---

## 17) Rollout strategy

1. Behind feature flag: `reader_anchor_stabilized_switch_v1`.
2. Internal dogfooding.
3. 10% rollout.
4. Compare metrics:
- anchor drift,
- time-to-readable,
- switch failure rate,
- read-now click rate.
5. Full rollout after stable 7 days.

---

## 18) Short backend request draft (for copy-paste)

We need a new endpoint for language-switch anchor stabilization:

- `POST /api/chapters/{chapterId}/translate-range`
- Input: lang + range (`chapter_start -> anchor`)
- Output: single JSON with all translated blocks in deterministic order
- No NDJSON streaming for this endpoint
- Include cache/latency metrics in response
- Support request timeout and clear error code

Reason: we must do one canonical re-layout pass before unlock to prevent anchor drift.
