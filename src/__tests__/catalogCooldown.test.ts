import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
vi.mock('@/lib/api', () => ({ getShareToken: () => null }))
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))
import { CatalogController, type CatalogDependencies } from '@/lib/catalogState'
import { beginCatalogValidation, confirmCatalog, hasFreshCatalogConfirmation, invalidateCatalogConfirmation } from '@/lib/catalogFreshness'
import { createReadingActivityQueue } from '@/lib/readingActivity'
import type { CatalogCacheEntry } from '@/lib/catalogCache'
import { context as originalContext, manifest, microtasks } from './catalogFixtures'

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
})
