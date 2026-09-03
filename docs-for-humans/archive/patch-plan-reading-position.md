# Patch Plan: Reading Position API Integration & Library Progress

> **Related:** For the broader roadmap (paginator, gestures, tap zones), see [`reader-pagination-status-and-plan.md`](./reader-pagination-status-and-plan.md).  
> This document focuses on **immediate API integration** and **bug fixes**.
>
> **Translation v2 note:** Reader progress/anchor logic must remain compatible with Translation v2 invariants:
> - visible blocks use HIGH priority translation,
> - reconcile is IDB-first,
> - prefetch windows are block-based (`LOW` forward, `EXTRALOW` backward), not page-count based.

## ЗАЧЕМ (Why)

We need to integrate the updated Reading Position API (`/api/books/{id}/reading-position`) to:

1. **Make server the source of truth** for reading position across devices/sessions
2. **Fix the "flash to page 1" bug** — currently reader shows first page then jumps to saved position (async anchor restore)
3. **Enable accurate block-level progress** in Library (currently uses chapter-based %, not actual block position)
4. **Implement proper "Continue Reading"** — currently based on local `lastRead`, not server `updated_at`
5. **Add caching layer** to avoid re-fetching on tab switches while keeping data fresh
6. **Sync total_blocks** from server response to calculate accurate progress % per book

---

## 1. Current State Analysis

### 1.1 Reader (`ReaderView.tsx`)

**How reading position works now:**
- GET `/api/books/{bookId}/reading-position` fetched in `useEffect` on mount (line 183)
- Anchor restored async AFTER first render → causes "flash to page 1" bug
- Position saved on:
  - Page turn (throttled ~1s) via `saveAnchor()` → `persistAnchor()` → PUT (line 254-280)
  - Language switch (line 338-350)
- Position NOT saved on chapter switch (`goToChapter` has no save)
- Uses local Zustand store (`readingAnchors`) as cache
- `updated_at` read from GET (line 203), `updated_at_client` sent in PUT (line 263)

**Initial render flow (buggy):**
```
1. useState: currentPageIdx = 0, currentChapterIndex from local store
2. useEffect: fetchReadingPosition() → async
3. First render: shows page 0 (first page of chapter)
4. GET response arrives → setCurrentChapterIndex + setAnchor
5. Pages recomputed → setCurrentPageIdx to anchor
6. User sees "jump" from page 1 to actual position
```

### 1.2 Library (`library/page.tsx`)

**Progress calculation:**
- Uses local Zustand `progress[book.id]?.progress` (line 89)
- Progress calculated in Reader: `(currentChapterIndex / chapters.length) * 100` (ReaderView line 112)
- **Does NOT use block-level position or total_blocks**

**Continue Reading:**
- Determined by sorting `progress` by `lastRead` timestamp (line 20-23)
- `lastRead` updated locally in `updateProgress` (store.ts line 111)
- **Does NOT sync with server `updated_at` from reading-position**

**Missing:**
- No fetch of reading-position for books in Library
- No `total_blocks` from PUT response stored anywhere
- No reconciliation between local cache and server

### 1.3 API Client (`api.ts`)

**Current types:**
```typescript
export interface ReadingPosition {
  book_id: string
  chapter_id: string | null
  block_id: string | null
  block_position: number | null
  lang: string | null
  updated_at: string | null
}

export interface SaveReadingPositionRequest {
  chapter_id: string
  block_id?: string | null
  block_position?: number | null
  lang?: string | null
  updated_at_client?: string
}

// PUT response type is too narrow:
saveReadingPosition(...): Promise<{ success: boolean; persisted: boolean }>
```

**Missing from types:**
- `content_version` (block count in chapter)
- `total_blocks` (total blocks in book)
- `reason: "stale_client"` response variant

### 1.4 Store (`store.ts`)

**Current structure:**
```typescript
interface ReadingProgress {
  [bookId: string]: {
    chapter: number
    progress: number  // chapter-based %
    lastRead: string  // local timestamp
  }
}

interface ReadingAnchor {
  chapterId: string
  blockId: string
  blockPosition: number
  updatedAt: string
}
```

**Missing:**
- `totalBlocks` per book
- `blockProgress` (global block index / total blocks)
- Server `updated_at` for Continue Reading sorting

---

## 2. Required Changes

### 2.1 API Types (`src/lib/api.ts`)

**Update PUT response type:**
```typescript
export interface SaveReadingPositionResponse {
  success: boolean
  persisted: boolean
  book_id?: string
  chapter_id?: string
  block_id?: string | null
  block_position?: number | null
  content_version?: number    // blocks in current chapter
  total_blocks?: number       // total blocks in book
  updated_at?: string         // server timestamp
  reason?: 'stale_client'     // only when persisted: false
}

export function saveReadingPosition(
  bookId: string,
  data: SaveReadingPositionRequest
): Promise<SaveReadingPositionResponse>
```

**Add new interface for Library progress:**
```typescript
export interface BookReadingProgress {
  book_id: string
  chapter_id: string | null
  block_id: string | null
  block_position: number | null
  total_blocks: number        // from PUT response
  content_version: number     // chapter block count
  updated_at: string | null
}
```

### 2.2 Store (`src/lib/store.ts`)

**Add totalBlocks to progress:**
```typescript
interface ReadingProgress {
  [bookId: string]: {
    chapter: number
    progress: number          // keep for fallback
    blockProgress?: number    // NEW: (blockIndex / totalBlocks) * 100
    totalBlocks?: number      // NEW: total blocks in book
    lastRead: string          // keep for local fallback
    serverUpdatedAt?: string  // NEW: from server reading-position
  }
}
```

**Add method to update server-based progress:**
```typescript
updateServerProgress: (
  bookId: string,
  data: {
    blockPosition?: number
    totalBlocks?: number
    serverUpdatedAt: string
  }
) => void
```

### 2.3 Reader View (`src/components/Reader/ReaderView.tsx`)

#### 2.3.1 Fix "Flash to Page 1" Bug

**Add initial restore gate:**
```typescript
const [initialRestoreDone, setInitialRestoreDone] = useState(false)

// In fetchReadingPosition effect:
.then((remote) => {
  // ... existing logic ...
  setRemoteAnchorReady(true)
  setInitialRestoreDone(true)  // NEW
})

// In pagesReady effect:
useEffect(() => {
  if (!remoteAnchorReady) return
  if (!pagesReady || pages.length === 0) return
  if (!initialRestoreDone) return  // NEW: wait for restore

  // ... existing anchor restore logic ...
}, [remoteAnchorReady, pagesReady, pages, initialRestoreDone, ...])
```

**Render skeleton until restore:**
```typescript
if (!initialRestoreDone && isAuthenticated) {
  return (
    <div className="h-dvh flex items-center justify-center">
      <Skeleton className="h-7 w-64" />
    </div>
  )
}
```

#### 2.3.2 Save Position on Chapter Switch

**Update `goToChapter`:**
```typescript
const goToChapter = useCallback((index: number) => {
  if (index >= 1 && index <= chapters.length) {
    // Save anchor BEFORE switching
    if (currentPageBlocks.length > 0) {
      const currentBlock = currentPageBlocks[0]
      saveAnchor(currentBlock.id, currentBlock.position)
    }

    anchorRestoredRef.current = false
    setCurrentPageIdx(0)
    setPagesReady(false)
    setPages([])
    setCurrentChapterIndex(index)
  }
}, [chapters.length, currentPageBlocks, saveAnchor])
```

#### 2.3.3 Update Progress with total_blocks

**Handle PUT response:**
```typescript
const persistAnchor = useCallback((anchor: ReadingAnchor) => {
  storeSetAnchor(bookId, anchor)
  if (!isAuthenticated) return

  void saveReadingPosition(bookId, {
    chapter_id: anchor.chapterId,
    block_id: anchor.blockId,
    block_position: anchor.blockPosition,
    lang: activeLang.toUpperCase(),
    updated_at_client: anchor.updatedAt,
  }).then((response) => {
    // NEW: Update store with server data
    if (response.total_blocks) {
      updateServerProgress(bookId, {
        blockPosition: anchor.blockPosition,
        totalBlocks: response.total_blocks,
        serverUpdatedAt: response.updated_at ?? anchor.updatedAt,
      })
    }
  }).catch(() => {
    // Keep local state as fallback
  })
}, [bookId, storeSetAnchor, isAuthenticated, activeLang, updateServerProgress])
```

### 2.4 Library Page (`src/app/library/page.tsx`)

#### 2.4.1 Fetch Reading Positions for All Books

**Add new hook or extend useBooks:**
```typescript
// In useBooks.ts
const [progressData, setProgressData] = useState<Record<string, BookReadingProgress>>({})

const fetchAllProgress = useCallback(async (bookIds: string[]) => {
  const results = await Promise.allSettled(
    bookIds.map(id => fetchReadingPosition(id))
  )
  const progress: Record<string, BookReadingProgress> = {}
  results.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      progress[bookIds[idx]] = result.value
    }
  })
  setProgressData(progress)
}, [])

// Call in refresh effect after books loaded
useEffect(() => {
  if (books.length > 0) {
    fetchAllProgress(books.map(b => b.id))
  }
}, [books])
```

#### 2.4.2 Calculate Block-Based Progress

**Update progress calculation:**
```typescript
const getBookProgress = useCallback((book: ApiBook) => {
  const localProgress = progress[book.id]
  const serverProgress = progressData[book.id]

  // Prefer server data if available
  if (serverProgress?.total_blocks && serverProgress.block_position != null) {
    return {
      progress: Math.round((serverProgress.block_position / serverProgress.total_blocks) * 100),
      source: 'server'
    }
  }

  // Fallback to local chapter-based progress
  return {
    progress: localProgress?.progress || 0,
    source: 'local'
  }
}, [progress, progressData])
```

#### 2.4.3 Continue Reading by Server updated_at

**Update lastBook selection:**
```typescript
const lastReadEntry = useMemo(() => {
  // First try server updated_at
  const serverEntries = Object.entries(progressData)
    .filter(([, data]) => data.updated_at != null)
    .sort((a, b) => 
      new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime()
    )

  if (serverEntries.length > 0) {
    return serverEntries[0]
  }

  // Fallback to local lastRead
  return Object.entries(progress).sort(
    (a, b) => new Date(b[1].lastRead).getTime() - new Date(a[1].lastRead).getTime()
  )[0]
}, [progressData, progress])
```

### 2.5 Caching Layer

#### 2.5.1 Books Cache (`src/lib/useBooks.ts`)

**Add stale-while-revalidate:**
```typescript
const STALE_TIME_MS = 60000 // 1 minute

interface CachedBooks {
  data: ApiBook[]
  fetchedAt: number
}

const booksCache = new Map<string, CachedBooks>()

export function useBooks() {
  const [books, setBooks] = useState<ApiBook[]>([])
  const [loading, setLoading] = useState(true)
  const [isStale, setIsStale] = useState(false)

  const refresh = useCallback(async () => {
    const cached = booksCache.get('all')
    const now = Date.now()

    if (cached && now - cached.fetchedAt < STALE_TIME_MS) {
      setBooks(cached.data)
      setIsStale(false)
      setLoading(false)
      return
    }

    if (cached) {
      setBooks(cached.data) // Show stale immediately
      setIsStale(true)
    }

    setLoading(true)
    try {
      const data = await fetchBooks('active')
      booksCache.set('all', { data, fetchedAt: now })
      setBooks(data)
      setIsStale(false)
    } catch (err: any) {
      setError(err.message || 'Failed to load books')
    } finally {
      setLoading(false)
    }
  }, [])

  // Revalidate on visibility change (throttled)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isStale) {
        refresh()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [isStale, refresh])
}
```

#### 2.5.2 Reading Position Cache

**Add per-book cache with TTL:**
```typescript
// In api.ts or separate cache module
const positionCache = new Map<string, {
  data: ReadingPosition
  expiresAt: number
}>()

const POSITION_TTL_MS = 30000 // 30 seconds

export function fetchReadingPosition(bookId: string): Promise<ReadingPosition> {
  const cached = positionCache.get(bookId)
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.data)
  }

  return request<ReadingPosition>(`/api/books/${bookId}/reading-position`)
    .then((data) => {
      positionCache.set(bookId, {
        data,
        expiresAt: Date.now() + POSITION_TTL_MS
      })
      return data
    })
}
```

---

## 3. File-by-File Change Summary

| File | Changes | Priority |
|------|---------|----------|
| `src/lib/api.ts` | Add `SaveReadingPositionResponse`, `BookReadingProgress` types; update `saveReadingPosition` return type | P0 |
| `src/lib/store.ts` | Add `totalBlocks`, `blockProgress`, `serverUpdatedAt` to `ReadingProgress`; add `updateServerProgress` | P0 |
| `src/components/Reader/ReaderView.tsx` | Add `initialRestoreDone` gate; save on chapter switch; handle PUT response with `total_blocks` | P0 |
| `src/app/library/page.tsx` | Fetch reading positions; calculate block-based progress; sort Continue by `updated_at` | P1 |
| `src/lib/useBooks.ts` | Add stale-while-revalidate cache; visibility revalidation | P1 |
| `src/lib/api.ts` | Add position cache with TTL | P2 |

---

## 4. Implementation Order

### Phase 1: Core API Integration (P0)
1. Update API types (`api.ts`)
2. Update store with `totalBlocks` support (`store.ts`)
3. Fix "flash to page 1" bug (`ReaderView.tsx`)
4. Save position on chapter switch (`ReaderView.tsx`)
5. Handle `total_blocks` from PUT response (`ReaderView.tsx`)

### Phase 2: Library Progress (P1)
1. Fetch reading positions in Library (`library/page.tsx`)
2. Calculate block-based progress percentage
3. Sort Continue Reading by server `updated_at`
4. Add books cache with stale-while-revalidate (`useBooks.ts`)

### Phase 3: Caching Polish (P2)
1. Add reading-position cache with TTL (`api.ts`)
2. Add visibility-based revalidation
3. Add cache invalidation on explicit actions

---

## 5. Testing Checklist

### Reader
- [ ] Opens directly at saved position (no flash to page 1)
- [ ] Position saved on page turn (throttled)
- [ ] Position saved on chapter switch
- [ ] Position saved on language switch
- [ ] Guest users work with local storage only
- [ ] `total_blocks` received and stored after PUT

### Library
- [ ] Progress shows block-based % (not chapter-based)
- [ ] Continue Reading shows most recently updated by server
- [ ] Fallback to local data when server unavailable
- [ ] Books list cached (no refetch on tab switch within 60s)

### API
- [ ] PUT response includes `content_version` and `total_blocks`
- [ ] Stale client response handled gracefully
- [ ] Guest response (`persisted: false`) handled

---

## 6. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing progress tracking | Keep local `progress` as fallback; gradual migration |
| Over-fetching reading positions | Cache with TTL; batch requests if needed |
| Anchor restore race conditions | `initialRestoreDone` gate; cancel effects on unmount |
| Server unavailable | Fallback to local storage; show error state |

---

## 7. Definition of Done

- [ ] All API types match new contract
- [ ] Reader opens at saved position without visual jump
- [ ] Position saved on all navigation events
- [ ] Library shows accurate block-based progress
- [ ] Continue Reading uses server `updated_at`
- [ ] Caching prevents unnecessary refetches
- [ ] All tests pass
- [ ] No regressions for guest users
