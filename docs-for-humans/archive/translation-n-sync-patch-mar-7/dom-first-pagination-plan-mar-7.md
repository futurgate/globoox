# DOM-First Pagination Plan

## Why We Are Changing It

Current pagination has three connected problems:

1. Text can still be clipped at the bottom of the page.
2. Runtime rescue logic can re-split already split paragraph fragments.
3. Page layout can visibly drift while reading because pagination is being corrected after visible render.

The root issue is that pagination truth is still partially decided outside the exact DOM layout that the user sees.

The target model is:

- text is the source of truth
- pagination is derived from text
- paragraph splits happen only in one place
- visible pages are committed only after the required prefix of the chapter is stably laid out

## Core Principles

### 1. Text First, Layout Second

For a given chapter and language:

- translated text arrives first
- pagination/layout is recalculated from that text
- visible reader state is updated only from the resulting layout

Layout must never become an alternative source of truth relative to the text content.

### 2. Splits Happen Only In Hidden Layout Pass

Paragraphs may be split across pages, but only inside the hidden pagination pass.

This means:

- no re-splitting already split fragments on the visible page
- no repeated runtime fragmentation of the same paragraph while the user pages forward
- no rescue path that turns one paragraph into a column of one-word fragments

### 3. Commit Stable Prefix, Compute Tail In Background

The user does not need the whole chapter laid out before seeing the current reading position.

Instead:

- compute the chapter from the start up to the current anchor
- also compute a forward buffer after the anchor
- once that prefix is stable, commit it to the visible reader
- continue laying out the rest of the chapter in the background

This gives stable current-page pagination without waiting for the whole chapter.

### 4. Cache By Layout Key

Pagination results should be cached by a layout key:

- `bookId`
- `chapterId`
- `lang`
- `viewportWidth`
- `viewportHeight`
- `fontSize`
- optionally any future typography settings that affect wrapping

If the same chapter is opened again with the same layout key and the same text version, we should reuse the cached layout immediately.

## Data Model

For each chapter/layout key we want to store:

- `contentVersion`
- `pages: string[][]`
- `finalBlocks: ContentBlock[]`
- `fragmentMap: Record<fragmentId, parentId>`
- `computedUntilBlockId` or `computedUntilPosition`
- `isComplete`

`finalBlocks` are the normalized blocks plus any paragraph fragments created by the layout pass.

The important point is:

- we are caching layout results, not just page numbers
- the cache includes where the paragraph splits are

## What Counts As A New Version

Layout becomes stale when any of these changes:

1. text changes
   - new translation arrives
   - fallback is replaced by target text
   - source language content changes

2. layout changes
   - viewport width
   - viewport height
   - font size

When this happens:

- old cached layout is not deleted immediately
- but it is considered stale for commit purposes
- a new hidden layout pass is started

## Hidden Layout Pipeline

### Input

- chapter blocks for current language
- current layout key
- current reading anchor

### Steps

1. Normalize blocks.
   - lists become item-level blocks
   - paragraphs remain whole before layout

2. Create hidden layout root.
   - same width as visible page
   - same typography
   - same wrapper semantics as visible render

3. Walk chapter from the start.
   - append blocks to hidden page
   - test real DOM fit

4. If a paragraph does not fit:
   - split it in hidden DOM
   - create `part-N` fragment blocks
   - continue with the remainder

5. Record:
   - page membership
   - generated fragments
   - fragment parent mapping

6. Stop early once stable prefix is ready for visible commit.
   - prefix must include everything from chapter start to current anchor
   - plus a forward buffer

7. Continue rest of chapter in background until complete.

## Visible Commit Rules

We should not commit every intermediate layout mutation to the screen.

Visible commit should happen only when:

- the current anchor is inside the computed prefix
- all splits up to that anchor are final for this content/layout version

Then:

- commit `pages`
- commit `finalBlocks`
- commit `fragmentMap`
- show visible reader

Until then:

- show skeleton or blurred content state

This is acceptable because blurred untranslated content already behaves like a skeleton from the user's point of view.

## Navigation Behavior

### Moving Forward

Moving to the next page must not re-trigger a full chapter layout pass by itself.

Instead:

- if next page is already inside committed prefix, move instantly
- if next page enters not-yet-committed tail, wait for the layout worker to extend the committed prefix

### Moving Backward

Backward navigation should be fully stable because everything before the current anchor must already be laid out and committed.

If the user opens the chapter in the middle:

- the system first computes from chapter start to that point
- then backward paging uses already committed layout

This avoids the current problem where paging backward causes visible re-pagination drift.

## Chapter Boundaries

We also want layout prefetch across chapters.

When the user approaches the end of a chapter:

- precompute the next chapter layout in the background

When the user approaches the start:

- keep the previous chapter layout warm if possible

This should use the same layout key rules as the current chapter.

## Persistence Strategy

### Memory Cache

Use memory cache for:

- active chapter layout
- nearby chapter layouts
- instant paging within the session

### IndexedDB Cache

Store completed or partially completed chapter layout by layout key in IDB.

This allows:

- reopening the same chapter without re-layout
- fast return from Library
- reuse after refresh

IDB entries should include:

- layout key
- contentVersion
- pages
- finalBlocks
- fragmentMap
- completion metadata

## Interaction With Translation

Translation and pagination should be separated cleanly:

1. translation writes target text
2. text version changes
3. pagination for affected chapter/layout key becomes stale
4. hidden layout pass recomputes
5. visible stable prefix is recommitted

This means:

- translation is primary
- pagination is derived
- no race where layout mutates independently of text truth

## Transitional Cleanup Needed

To complete migration to this model, we need to remove:

1. runtime paragraph re-splitting on visible page
2. page-turn-triggered full re-layout
3. any effect that re-applies anchor restore after visible pages are already stable
4. block-level rescue that accumulates new fragments while paging

## Implementation Stages

### Stage 1
Move paragraph splitting truth fully into the hidden layout pass.

Done on March 7:

- removed visible-page runtime rescue that was mutating `pages` after paint
- switched hidden paragraph fitting from rough word-count fit to DOM-first character fit
- added a widow/orphan guard so the end of a page does not keep a one-word paragraph fragment
- kept visible reader commit tied to hidden pass result instead of post-paint correction

Current observed result:

- no sampled bottom overlap in browser smoke (`overflowPx = 0` on sampled pages)
- no cumulative degradation of one paragraph into a column of tiny fragments while paging forward
- chapter is still laid out as one hidden pass today; stable-prefix commit and background tail are still the next step, not finished yet

Important implementation note from the latest pass:

- the decisive fix was not another split heuristic
- the decisive fix was changing the hidden pagination probe to an offscreen page root that mirrors the visible reader page container
- before that change, browser checks still showed real visible overlap even when hidden-pass checks looked green
- after moving pagination into an offscreen `container max-w-2xl mx-auto px-4 h-full` probe, sampled browser paging showed `overflowPx = 0` across forward and backward navigation samples

Stabilize current reader behavior.

- stop re-pagination on page turn
- stop repeated anchor-restore jumps
- remove visible-page fragment accumulation

### Stage 2

Refactor hidden pagination pass into stable-prefix builder.

- chapter start to current anchor
- forward buffer
- background tail continuation

### Stage 3

Persist layout cache in IDB by layout key and content version.

Done on March 7:

- added `chapter_layout` IndexedDB store
- persisted chapter layout entries with:
  - `pages`
  - `finalBlocks`
  - `fragmentMap`
  - `currentPageIdx`
- switched layout cache key from a text-length heuristic to a real layout-content signature plus:
  - viewport width
  - viewport height
  - font size
  - language
- Reader now hydrates layout from memory first, then from IDB, before falling back to a fresh hidden pagination pass

Browser verification:

- after a full browser reload on the same chapter/layout key, `chapter_layout` entries were present in IDB
- reopening the reader restored the same visible text fragment after reload
- this means layout reuse is no longer limited to module-memory cache inside one route lifetime

### Stage 4

Add neighboring chapter layout prefetch.

## Success Criteria

The new model is successful when:

1. bottom clipping is gone
2. paging forward does not create one-word fragment columns
3. paging backward from mid-chapter is stable
4. page turns do not re-run full chapter pagination
5. chapter/layout cache makes repeated opens instant
6. translation updates trigger re-layout only through text-version invalidation

## Immediate Next Step

Immediate engineering direction:

- remove runtime re-splitting of visible fragments
- keep paragraph splitting only inside hidden chapter layout pass
- make visible reader consume committed stable prefix only
