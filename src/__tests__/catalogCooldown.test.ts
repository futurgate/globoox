import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
vi.mock('@/lib/api', () => ({ getShareToken: () => null }))
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))
import { CatalogController, type CatalogDependencies } from '@/lib/catalogState'
import { beginCatalogValidation, confirmCatalog, hasFreshCatalogConfirmation, invalidateCatalogConfirmation } from '@/lib/catalogFreshness'
import { createReadingActivityQueue } from '@/lib/readingActivity'
import type { CatalogCacheEntry } from '@/lib/catalogCache'
import { context as originalContext, deferred, manifest, microtasks } from './catalogFixtures'

class MemoryStorage implements Storage {
  values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}
let sequence = 0
let storage: MemoryStorage
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-26T10:00:00Z')); storage = new MemoryStorage(); vi.stubGlobal('localStorage', storage) })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
function setup(ids = ['a']) {
  const context = { ...originalContext, scopeKey: `cooldown-${++sequence}` }
  let cached: CatalogCacheEntry | null = null
  const data = { ...manifest(ids), scope_key: context.scopeKey }
  const fetcher = vi.fn<CatalogDependencies['fetch']>(async (_context, _signal, minimum) => ({ ...data, activity_version: minimum }))
  const dependencies: CatalogDependencies = {
    hint: () => context, resolve: async () => context, cached: () => cached, cache: async () => cached,
    persist: async value => { cached = { manifest: value, savedAt: Date.now(), origin: 'server' } },
    fetch: fetcher, flush: async () => '0', update: async () => {}, delete: async () => {}, create: async () => data.items[0],
  }
  return { context, data, dependencies, fetcher, page: () => new CatalogController(dependencies), cached: () => cached }
}

describe('confirmed 10-second shelf cooldown', () => {
  it.each(['missing', 'expired'] as const)('starts the server request before a stalled disk read when the receipt is %s', async receipt => {
    const f = setup()
    if (receipt === 'expired') {
      await f.page().refresh()
      await vi.advanceTimersByTimeAsync(10_000)
    }
    f.fetcher.mockClear()
    const disk = deferred<CatalogCacheEntry | null>()
    const server = deferred<typeof f.data>()
    f.dependencies.cached = () => null
    f.dependencies.cache = () => disk.promise
    f.fetcher.mockImplementation(() => server.promise)
    const page = f.page()
    const rendered: string[][] = []
    page.subscribe(view => { if (!view.loading) rendered.push(view.books.map(book => book.id)) })
    const refresh = page.refresh()
    try {
      await microtasks()
      expect(f.fetcher).toHaveBeenCalledTimes(1)
      expect(page.snapshot.loading).toBe(true)
      server.resolve(f.data)
      await refresh
      disk.resolve({ manifest: { ...f.data, items: manifest(['stale']).items }, savedAt: 1, origin: 'legacy' })
      await microtasks()
      expect(page.snapshot.offline).toBe(false)
      expect(rendered).toEqual([['a']])
    } finally {
      page.dispose()
      disk.resolve(null)
      server.resolve(f.data)
      await refresh
    }
  })
  it('reuses a complete index at 5s across page lifetimes without extending its expiry', async () => {
    const f = setup(); const first = f.page(); await first.refresh(); first.dispose()
    await vi.advanceTimersByTimeAsync(5000)
    const second = f.page(); await second.refresh(); second.dispose()
    expect(second.snapshot.books.map(book => book.id)).toEqual(['a'])
    expect(f.fetcher).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(5000)
    await f.page().refresh()
    expect(f.fetcher).toHaveBeenCalledTimes(2)
  })
  it('reuses a real empty index, but force Retry always contacts the server', async () => {
    const f = setup([]); await f.page().refresh(); const page = f.page(); await page.refresh()
    expect(page.snapshot.books).toEqual([]); expect(f.fetcher).toHaveBeenCalledTimes(1)
    await page.refresh(true); expect(f.fetcher).toHaveBeenCalledTimes(2)
  })
  it('does not trust a receipt for another scope, another revision, or a legacy cache', async () => {
    const f = setup(); await f.page().refresh()
    expect(hasFreshCatalogConfirmation({ ...f.data, scope_key: 'other' })).toBe(false)
    expect(hasFreshCatalogConfirmation({ ...f.data, revision: 'changed' })).toBe(false)
    f.cached()!.origin = 'legacy'; await f.page().refresh(); expect(f.fetcher).toHaveBeenCalledTimes(2)
  })
  it('new reading invalidates the old index even after the event has been ACKed', async () => {
    const f = setup(); await f.page().refresh()
    const queue = createReadingActivityQueue({ storage: () => storage, wallNow: () => Date.now(), monotonicNow: () => 0,
      randomId: () => '00000000-0000-4000-8000-000000000001',
      fetch: async (_url, init) => new Response(JSON.stringify({ scope_key: f.context.scopeKey, activity_version: '2',
        acknowledged_event_ids: JSON.parse(String(init?.body)).events.map((event: { event_id: string }) => event.event_id) })),
    })
    queue.enqueue(f.context, '11111111-1111-4111-8111-111111111111')
    await queue.flush(f.context, new AbortController().signal)
    expect(queue.getPendingRecency(f.context.scopeKey)).toEqual({})
    expect(hasFreshCatalogConfirmation(f.data)).toBe(false)
    f.dependencies.flush = (context, signal) => queue.flush(context, signal)
    await f.page().refresh(); expect(f.fetcher).toHaveBeenCalledTimes(2)
    expect(f.cached()!.manifest.activity_version).toBe('2')
  })
  it('an upload blocks another shelf lifetime until it finishes, then forces a new index', async () => {
    const f = setup(); const page = f.page(); await page.refresh()
    const finish = page.beginExternalMutation(); const next = f.page(); const refresh = next.refresh()
    await microtasks(); expect(f.fetcher).toHaveBeenCalledTimes(1)
    finish(); await refresh; expect(f.fetcher).toHaveBeenCalledTimes(2)
  })
  it('archive/delete invalidate before the write, and a failed edit cannot reuse the old receipt', async () => {
    const f = setup(); const page = f.page(); await page.refresh()
    f.dependencies.update = async () => { expect(hasFreshCatalogConfirmation(f.data)).toBe(false); throw new Error('write failed') }
    await expect(page.mutate('a', 'hidden')).rejects.toThrow('write failed')
    await f.page().refresh(); expect(f.fetcher).toHaveBeenCalledTimes(2)
    f.dependencies.delete = async () => { expect(hasFreshCatalogConfirmation(f.data)).toBe(false) }
    await page.mutate('a', 'delete'); await microtasks(); expect(f.fetcher.mock.calls.length).toBeGreaterThanOrEqual(3)
  })
  it('returning focus during an upload does not turn its expected processing time into an offline error', async () => {
    const f = setup(); const page = f.page(); await page.refresh()
    const finish = page.beginExternalMutation(); await page.refresh()
    await vi.advanceTimersByTimeAsync(3500)
    expect(page.snapshot.offline).toBe(false); expect(page.snapshot.error).toBeNull()
    expect(f.fetcher).toHaveBeenCalledTimes(1)
    finish(); await microtasks(); expect(f.fetcher).toHaveBeenCalledTimes(2)
  })
  it('a mutation during the request prevents that response from acquiring a fresh receipt', () => {
    const f = setup(); const check = beginCatalogValidation(f.context.scopeKey)
    invalidateCatalogConfirmation(f.context.scopeKey); confirmCatalog(f.data, check)
    expect(hasFreshCatalogConfirmation(f.data)).toBe(false)
  })
  it('a concurrent tab invalidation during receipt persistence cannot be overwritten by that receipt', () => {
    const f = setup(); const validation = beginCatalogValidation(f.context.scopeKey)
    const save = storage.setItem.bind(storage); let interleaved = false
    vi.spyOn(storage, 'setItem').mockImplementation((key, value) => {
      if (!interleaved && JSON.parse(value).checkedAt) { interleaved = true; invalidateCatalogConfirmation(f.context.scopeKey) }
      save(key, value)
    })
    confirmCatalog(f.data, validation)
    expect(interleaved).toBe(true); expect(hasFreshCatalogConfirmation(f.data)).toBe(false)
  })
  it('clock rollback expires a receipt permanently; denied storage permits network operation only', async () => {
    const f = setup(); await f.page().refresh(); const now = Date.now()
    vi.setSystemTime(now - 1000); expect(hasFreshCatalogConfirmation(f.data)).toBe(false)
    vi.setSystemTime(now + 1000); expect(hasFreshCatalogConfirmation(f.data)).toBe(false)
    vi.spyOn(storage, 'setItem').mockImplementation(() => { throw new Error('denied') })
    await f.page().refresh(); await f.page().refresh(); expect(f.fetcher).toHaveBeenCalledTimes(3)
  })
  it('reload can use the persisted confirmation and disk manifest, without requiring cover cache', async () => {
    const f = setup(); await f.page().refresh(); const disk = f.cached()
    f.dependencies.cached = () => null; f.dependencies.cache = async () => disk
    await f.page().refresh(); expect(f.fetcher).toHaveBeenCalledTimes(1)
  })
  it.each([{ ids: ['a'] }, { ids: [] }])('reuses a complete disk index at 9,999ms without extending its receipt ($ids)', async ({ ids }) => {
    const f = setup(ids); await f.page().refresh(); const disk = f.cached()
    f.dependencies.cached = () => null; f.dependencies.cache = async () => disk
    await vi.advanceTimersByTimeAsync(9999)
    const page = f.page(); await page.refresh()
    expect(page.snapshot.books.map(book => book.id)).toEqual(ids)
    expect(f.fetcher).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    await f.page().refresh()
    expect(f.fetcher).toHaveBeenCalledTimes(2)
  })
  it('checks expiry again when disk reading crosses the 10-second boundary', async () => {
    const f = setup(); await f.page().refresh(); const cached = f.cached()
    const disk = deferred<CatalogCacheEntry | null>()
    f.dependencies.cached = () => null; f.dependencies.cache = () => disk.promise
    f.fetcher.mockClear()
    await vi.advanceTimersByTimeAsync(9999)
    const page = f.page(); const refresh = page.refresh()
    await microtasks(); expect(f.fetcher).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    disk.resolve(cached); await refresh
    expect(f.fetcher).toHaveBeenCalledTimes(1)
    expect(page.snapshot.offline).toBe(false)
  })
  it.each(['scope', 'revision', 'activity', 'partial'] as const)('rejects an eligible receipt when the disk manifest has mismatched %s', async field => {
    const f = setup(); await f.page().refresh()
    const cached = { ...f.cached()!, manifest: { ...f.data } }
    if (field === 'scope') cached.manifest.scope_key = 'another-scope'
    if (field === 'revision') cached.manifest.revision = 'another-revision'
    if (field === 'activity') cached.manifest.activity_version = '1'
    if (field === 'partial') Object.assign(cached.manifest, { complete: false })
    f.dependencies.cached = () => null; f.dependencies.cache = async () => cached
    await f.page().refresh()
    expect(f.fetcher).toHaveBeenCalledTimes(2)
  })
  it('rechecks invalidation immediately before publishing the cached result', async () => {
    const f = setup(); await f.page().refresh()
    f.fetcher.mockClear()
    const read = storage.getItem.bind(storage)
    let receiptReads = 0
    vi.spyOn(storage, 'getItem').mockImplementation(key => {
      const value = read(key)
      // First read admits disk/memory reuse; second validates the candidate.
      // Invalidate at the promise handoff before controller publication.
      if (key.includes('receipt:') && ++receiptReads === 2) queueMicrotask(() => invalidateCatalogConfirmation(f.context.scopeKey))
      return value
    })
    const page = f.page(); await page.refresh()
    expect(f.fetcher).toHaveBeenCalledTimes(1)
    expect(page.snapshot.offline).toBe(false)
  })
  it('awaits activity started during the disk read before fetching a newer manifest', async () => {
    const f = setup(); await f.page().refresh(); const cached = f.cached()
    f.fetcher.mockClear()
    const disk = deferred<CatalogCacheEntry | null>()
    const ack = deferred<Response>()
    const activityFetch = vi.fn<typeof fetch>(() => ack.promise)
    const eventId = '00000000-0000-4000-8000-000000000123'
    const queue = createReadingActivityQueue({ storage: () => storage, wallNow: () => Date.now(), monotonicNow: () => 0,
      randomId: () => eventId, fetch: activityFetch })
    f.dependencies.cached = () => null; f.dependencies.cache = () => disk.promise
    f.dependencies.flush = (context, signal) => queue.flush(context, signal)
    const page = f.page(); const refresh = page.refresh()
    await microtasks()
    queue.enqueue(f.context, '11111111-1111-4111-8111-111111111111')
    disk.resolve(cached); await microtasks()
    expect(activityFetch).toHaveBeenCalledTimes(1)
    expect(f.fetcher).not.toHaveBeenCalled()
    ack.resolve(new Response(JSON.stringify({ scope_key: f.context.scopeKey, activity_version: '2', acknowledged_event_ids: [eventId] })))
    await refresh
    expect(f.fetcher).toHaveBeenCalledWith(f.context, expect.any(AbortSignal), '2')
    expect(page.snapshot.offline).toBe(false)
  })
  it('waits for an upload started in another shelf lifetime during the disk read', async () => {
    const f = setup(); const first = f.page(); await first.refresh(); const cached = f.cached()
    f.fetcher.mockClear()
    const disk = deferred<CatalogCacheEntry | null>()
    f.dependencies.cached = () => null; f.dependencies.cache = () => disk.promise
    const next = f.page(); const refresh = next.refresh()
    await microtasks()
    const finish = first.beginExternalMutation()
    disk.resolve(cached); await microtasks()
    expect(f.fetcher).not.toHaveBeenCalled()
    finish(); await refresh
    expect(f.fetcher).toHaveBeenCalledTimes(1)
  })
  it('uses the healthy server when an eligible disk read fails', async () => {
    const f = setup(); await f.page().refresh()
    f.dependencies.cached = () => null
    f.dependencies.cache = async () => { throw new Error('denied') }
    const page = f.page(); await page.refresh()
    expect(f.fetcher).toHaveBeenCalledTimes(2)
    expect(page.snapshot.offline).toBe(false)
  })
  it('does not wait for disk when the acknowledgement is newer than an otherwise fresh receipt', async () => {
    const f = setup(); await f.page().refresh()
    f.fetcher.mockClear()
    f.dependencies.cached = () => null
    f.dependencies.cache = () => new Promise(() => {})
    f.dependencies.flush = async () => '2'
    const page = f.page(); await page.refresh()
    expect(f.fetcher).toHaveBeenCalledWith(f.context, expect.any(AbortSignal), '2')
    expect(f.fetcher).toHaveBeenCalledTimes(1)
    expect(page.snapshot.offline).toBe(false)
  })
})
