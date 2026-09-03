# Reader: Pagination, Gestures, Progress & Language

## 1) Current State (as per codebase)

| Area | Current Status | Notes |
|---|---|---|
| Page-based layout | No | Currently a long scroll through the entire chapter |
| Drag/swipe page turning | No | No gesture handlers implemented |
| Tap on screen edges | No | Tap zones not implemented |
| Block-level progress (`anchorBlock`) | Partial | Saved in Zustand (`readingAnchors`), but NOT used in Library for progress display |
| Server-side progress saving | Partial | `GET/PUT /api/books/:bookId/reading-position` called from Reader only; Library uses local `lastRead` |
| Language switch without losing block anchor | Partial | Anchor is preserved in Reader, but Library doesn't reflect server `updated_at` |
| Progressive translation | Yes | `IntersectionObserver` + `POST /translate` |
| Block-based progress in Library | No | Library shows chapter-based %, not `block_position / total_blocks` |
| Continue Reading by server time | No | Sorted by local `lastRead`, not server `updated_at` |

### Reader UX
- The current reader is a vertically scrolling single-chapter view, not a paginated mode.
- Chapter navigation uses `prev/next` buttons and a TOC.
- No `drag/swipe` gestures for page turning.
- No near-edge tap zones for page turning.

### Data Model & Rendering
- Content arrives as a `ContentBlock[]` array (each block has an `id` and `position`).
- Blocks are rendered sequentially as one long column.
- Pagination (splitting content into viewport-sized pages) is not implemented.

### Progress Saving
- Progress is saved locally via Zustand (`persist` to local storage).
- Progress format: `bookId -> { chapter, progress%, lastRead }` (chapter-based %).
- Block-level anchor (`blockId`/`position`) IS saved in Zustand (`readingAnchors`), but **NOT used in Library**.
- Server-side endpoint `GET/PUT /api/books/:bookId/reading-position` EXISTS but is only called from Reader, not Library.
- Library shows chapter-based progress and sorts "Continue Reading" by local `lastRead`, not server `updated_at`.

### Language & Translation
- On language switch, `PATCH /api/books/:id/language` is called (saves `selected_language` for the book).
- Chapter content is then re-fetched for the new language.
- No block-level anchoring is applied during language switch.

### Progressive Translation
- Progressive translation is present in the project:
  - The `useViewportTranslation` hook tracks blocks via `IntersectionObserver`.
  - Visible blocks are batched and sent to `POST /api/chapters/:id/translate`.
  - Translated blocks are merged into `displayBlocks`.
- Note: `GET /content?lang=XX` runs in parallel — the backend contract should be explicitly defined to avoid a dual/conflicting translation strategy.

---

## 2) Gaps vs. Target State

### Frontend work needed
- Page-based chapter layout fitted to the current viewport (replacing the scroll column).
- Page turning:
  - `drag/swipe` left/right (not from the very edge, to avoid conflicts with system gestures).
  - `tap` in near-edge zones for next/prev page.
- Reading position logic based on `anchorBlock`:
  - The anchor is the topmost block on the current page.
  - Saved and restored as the primary source of truth.
- On language switch:
  - Preserve the same `anchorBlock`.
  - Rebuild pages for the new language starting from that anchor.
  - The visual page number may change — this is expected behavior.

### Backend work needed
- Endpoint is available: `GET/PUT /api/books/:bookId/reading-position`.
- Keep contract aligned across backend + frontend docs and include conflict/guest behavior.

---

## 3) What to Request from Backend

### Current Contract
- `PUT /api/books/:bookId/reading-position`
  - Body:
```json
{
  "chapter_id": "ch-...",
  "block_id": "cb-...", 
  "block_position": 123, 
  "lang": "EN", 
  "updated_at_client": "2026-02-17T12:00:00Z"
}
```
  - `chapter_id` is required.
  - `block_id`, `block_position`, `lang`, `updated_at_client` are optional.
  - Guest response:
```json
{
  "success": true,
  "persisted": false
}
```
  - Stale-client response:
```json
{
  "success": true,
  "persisted": false,
  "reason": "stale_client"
}
```
  - Success response:
```json
{
  "success": true,
  "persisted": true,
  "book_id": "book-...",
  "chapter_id": "ch-...",
  "block_id": "cb-...",
  "block_position": 123,
  "content_version": 642,
  "total_blocks": 8400,
  "updated_at": "2026-02-17T12:00:05Z"
}
```
- `GET /api/books/:bookId/reading-position`
  - Response:
```json
{
  "book_id": "book-...",
  "chapter_id": "ch-...",
  "block_id": "cb-...",
  "block_position": 123,
  "lang": "EN",
  "updated_at": "2026-02-17T12:00:05Z"
}
```
  - For guests, returns the same shape with `null` values.

### Contract Requirements
- `PUT` must be idempotent.
- Last-write-wins by `updated_at` / `updated_at_client`.
- If `block_id` is not found in the current chapter revision: fallback to `block_position` (nearest valid block).
- If saved position is beyond chapter content, auto-resolve to first valid block.

### Optional (post-MVP)
- `POST /api/books/:bookId/reading-position/batch` for throttled bulk updates.

---

## 4) Page Numbers: MVP Recommendation

Absolute page numbers (`Page 37 of 412`) are **not recommended for MVP** because:
- Page count depends on language, font, screen size, and safe area insets.
- With progressive/mosaic translation, total page count cannot be computed reliably or cheaply.
- The risk of UX errors outweighs the value at this stage.

**Recommended for MVP:**
- Show chapter + relative progress:
  - `Chapter 3`
  - `Block 128 / 642` (or `%` of blocks in the chapter)
- Add page numbers later, once either:
  - Full chapter translation is available, or
  - Background pre-layout of the full chapter is supported for a given config (lang + font + viewport).

---

## 5) Roadmap to Target State

### Phase 0: Lock Down Contracts (quick)
- Agree on the backend `reading-position` endpoint.
- Agree on the translation source of truth:
  - Either `GET /content?lang` returns the fully localized content,
  - Or the frontend handles lazy translation via `/translate`.
- Eliminate ambiguity in the contract.

### Phase 1: Anchor-First Progress + Library Sync

**Reader:**
- Add a client model: `readingPosition[bookId] = { chapterId, blockId, blockPosition, updatedAt }`.
- Update the anchor on every successful page turn (throttled/debounced).
- Sync anchor to backend via `PUT /api/books/:bookId/reading-position`.
- On reader entry: restore anchor first, then build the page from it.

**Library (NEW):**
- Fetch `GET /api/books/:bookId/reading-position` for each book (with caching).
- Calculate progress as `block_position / total_blocks * 100` (not chapter-based).
- Sort "Continue Reading" by server `updated_at` (fallback to local `lastRead`).
- Reconcile local Zustand store with server data on mount.

### Phase 2: Paginator
- Implement `paginateBlocks(blocks, startAnchor, layoutConfig)`:
  - Input: `blocks`, viewport height/width, typography settings.
  - Output: array of pages, each with a `topBlockId` + list of visible blocks/fragments.
- For now, avoid complex text-fragment splitting within a paragraph (if a block doesn't fit, carry it over whole); refine later.

### Phase 3: Gestures & Tap Zones
- Add an interaction layer over the page:
  - Central safe zone for drag/swipe (avoiding system edge zones).
  - Near-edge tap zones for `prev/next`.
- Constraints:
  - Do not intercept gestures inside input fields or menu overlays.
  - Do not break the iOS system back gesture.

### Phase 4: Language Switch Without Losing Position
- Before switching: capture the current `anchorBlock`.
- After receiving/updating blocks for the new language:
  - Find the same `blockId` (or fall back by `position`).
  - Rebuild pages.
  - Open the page where that block is at the top.

### Phase 5: Polish & Observability
- Metrics: page-turn latency, translation queue latency, anchor restore success rate.
- Error logging for `anchor not found` cases.

---

## 6) Risks & Mitigations

- **Risk:** Conflict between two translation strategies (`GET /content?lang` vs. viewport translate).
  **Mitigation:** Single contract + feature flag for the mode.

- **Risk:** Heavy pre-layout cost on large chapters.
  **Mitigation:** Incremental pagination from anchor (windowed) — do not compute the full chapter at once.

- **Risk:** Position jumps when translations arrive asynchronously.
  **Mitigation:** Lock `anchorBlock` as source of truth and rebuild pages deterministically.

---

## 7) Definition of Done

**Reader:**
- Reader opens a book at the saved `anchorBlock`.
- Page turning works via drag and tap, without conflicting with system edge gestures.
- On language switch, the user stays at the same logical position (`anchorBlock`), even if the visual page number changes.
- Position is saved to the backend and restored across devices/sessions.

**Library:**
- Progress bar shows block-based % (`block_position / total_blocks * 100`).
- "Continue Reading" sorted by server `updated_at`.
- Local Zustand store reconciled with server data on mount.

**General:**
- With partial translation, the reader remains stable with no spurious page numbers.
