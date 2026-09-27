import { afterEach, describe, expect, it, vi } from 'vitest'
const legacy = vi.hoisted(() => ({ list: vi.fn(), snapshot: vi.fn() }))
vi.mock('@/lib/contentCache', () => ({ getCachedBooksList: legacy.list, getCachedLibraryViewSnapshot: legacy.snapshot }))
import { getCatalogCover, getCatalogManifest, loadCatalogCache, putCatalogCover, putCatalogManifest } from '../lib/catalogCache'
import { context, deferred, manifest, microtasks } from './catalogFixtures'
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); legacy.list.mockReset(); legacy.snapshot.mockReset() })

/** Actual cache code owns opens/transactions; the test controls only disk completion. */
function controlledDisk(value: unknown) {
  const completeReads: (() => void)[] = []
  const open = vi.fn(() => {
    const opening: Record<string, unknown> = {}
    opening.result = { close: vi.fn(), transaction: () => {
      const transaction: Record<string, unknown> = {}
      transaction.objectStore = () => ({
        get: () => {
          const request: Record<string, unknown> = { result: value }
          completeReads.push(() => { (request.onsuccess as () => void)?.(); (transaction.oncomplete as () => void)?.() })
          return request
        },
        put: () => {
          const request: Record<string, unknown> = {}
          queueMicrotask(() => { (request.onsuccess as () => void)?.(); (transaction.oncomplete as () => void)?.() })
          return request
        },
      })
      return transaction
    } }
    queueMicrotask(() => (opening.onsuccess as () => void)?.())
    return opening
  })
  vi.stubGlobal('indexedDB', { open })
  return { open, completeReads }
}

describe('scoped catalog storage and conservative legacy migration', () => {
  it('coalesces concurrent manifest/cache reads and keeps the newer server record over late disk', async () => {
    const scope = `${context.scopeKey}-coalesced-late-manifest`
    const old = { manifest: manifest(['old'], scope), savedAt: 1, origin: 'server' }
    const disk = controlledDisk(old)
    const a = getCatalogManifest(scope)
    const b = loadCatalogCache({ ...context, scopeKey: scope }, context.userId!)
    const c = loadCatalogCache({ ...context, scopeKey: scope }, context.userId!)
    await microtasks()
    expect(disk.open).toHaveBeenCalledTimes(1)
    expect(disk.completeReads).toHaveLength(1)
    const fresh = manifest(['new'], scope)
    await putCatalogManifest(fresh)
    disk.completeReads[0]()
    const entries = await Promise.all([a, b, c])
    expect(entries.every(entry => entry?.manifest === fresh)).toBe(true)
    expect((await getCatalogManifest(scope))?.manifest).toBe(fresh)
    expect(legacy.list).not.toHaveBeenCalled()
  })

  it.each(['blocked', 'stalled'] as const)('bounds a %s IDB open, closes a late connection, and permits a new attempt', async mode => {
    vi.useFakeTimers()
    const scope = `${context.scopeKey}-open-${mode}`
    const openings: Record<string, unknown>[] = []
    const close = vi.fn()
    const open = vi.fn(() => {
      const opening: Record<string, unknown> = { result: { close } }
      openings.push(opening)
      if (mode === 'blocked') queueMicrotask(() => (opening.onblocked as () => void)?.())
      return opening
    })
    vi.stubGlobal('indexedDB', { open })
    const a = getCatalogManifest(scope), b = getCatalogManifest(scope)
    await vi.advanceTimersByTimeAsync(300)
    expect(await a).toBeNull(); expect(await b).toBeNull()
    expect(open).toHaveBeenCalledTimes(1)
    ;(openings[0].onsuccess as () => void)()
    expect(close).toHaveBeenCalledTimes(1)
    const retry = getCatalogManifest(scope)
    await vi.advanceTimersByTimeAsync(300)
    expect(await retry).toBeNull()
    expect(open).toHaveBeenCalledTimes(2)
  })

  it('bounds and coalesces stalled legacy reads, ignoring late legacy data after a server response', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('indexedDB', { open: () => { throw new Error('denied') } })
    const scope = `${context.scopeKey}-legacy-stalled`
    const old = deferred<unknown>()
    legacy.list.mockReturnValue(old.promise)
    const a = loadCatalogCache({ ...context, scopeKey: scope }, context.userId!)
    const b = loadCatalogCache({ ...context, scopeKey: scope }, context.userId!)
    await vi.advanceTimersByTimeAsync(300)
    expect(await a).toBeNull(); expect(await b).toBeNull()
    expect(legacy.list).toHaveBeenCalledTimes(1)
    const fresh = manifest(['server'], scope)
    await putCatalogManifest(fresh)
    old.resolve({ scope: context.userId, status: 'all', fetchedAt: 1, books: [{ ...manifest(['old']).items[0] }] })
    await microtasks()
    expect(legacy.snapshot).not.toHaveBeenCalled()
    expect((await getCatalogManifest(scope))?.manifest).toBe(fresh)
  })

  it('preserves an owned legacy fallback when only the old order snapshot stalls', async () => {
    vi.useFakeTimers()
    const scope = `${context.scopeKey}-legacy-order-stalled`
    legacy.list.mockResolvedValue({ scope: context.userId, status: 'all', fetchedAt: 1, books: manifest(['kept']).items })
    legacy.snapshot.mockReturnValue(new Promise(() => {}))
    const read = loadCatalogCache({ ...context, scopeKey: scope }, context.userId!)
    await vi.advanceTimersByTimeAsync(300)
    const entry = await read
    expect(entry?.origin).toBe('legacy')
    expect(entry?.manifest.items.map(book => book.id)).toEqual(['kept'])
  })

  it('coalesces local cover reads and keeps a newer downloaded blob over a late disk blob', async () => {
    const scope = `${context.scopeKey}-coalesced-cover`
    const old = new Blob(['old'], { type: 'image/png' })
    const fresh = new Blob(['new'], { type: 'image/png' })
    const disk = controlledDisk(old)
    const a = getCatalogCover(scope, 'a', 'v1'), b = getCatalogCover(scope, 'a', 'v1')
    await microtasks()
    expect(disk.open).toHaveBeenCalledTimes(1)
    await putCatalogCover(scope, 'a', 'v1', fresh)
    disk.completeReads[0]()
    expect(await a).toBe(fresh); expect(await b).toBe(fresh)
    expect(await getCatalogCover(scope, 'a', 'v1')).toBe(fresh)
  })

  it('continues with bounded memory storage when IndexedDB throws', async () => {
    vi.stubGlobal('indexedDB', { open: () => { throw new Error('storage denied') } })
    const data = manifest(['a'], `${context.scopeKey}-denied`)
    await putCatalogManifest(data)
    expect((await getCatalogManifest(data.scope_key))?.manifest.items[0].id).toBe('a')
    const cover = new Blob(['fixture'], { type: 'image/png' })
    await putCatalogCover(data.scope_key, 'a', 'v1', cover)
    expect(await getCatalogCover(data.scope_key, 'a', 'v1')).toBe(cover)
    expect(await getCatalogCover(`${data.scope_key}-other`, 'a', 'v1')).toBeNull()
    expect(await getCatalogCover(data.scope_key, 'a', 'v2')).toBeNull()
  })

  it('does not trust corrupted persisted manifests', async () => {
    vi.stubGlobal('indexedDB', { open: () => {
      const opening: Record<string, unknown> = {}
      const transaction: Record<string, unknown> = {
        objectStore: () => ({ get: () => {
          const request: Record<string, unknown> = { result: { savedAt: 1, origin: 'server', manifest: { complete: false } } }
          queueMicrotask(() => { (request.onsuccess as () => void)?.(); (transaction.oncomplete as () => void)?.() })
          return request
        } }),
      }
      opening.result = { transaction: () => transaction, close: () => {} }
      queueMicrotask(() => (opening.onsuccess as () => void)?.())
      return opening
    } })
    expect(await getCatalogManifest(`${context.scopeKey}-corrupt`)).toBeNull()
  })

  it('does not migrate an authenticated share list from ambiguous old account-only keys', async () => {
    const share = { ...context, scopeKey: `${context.scopeKey}-share`, shareToken: 'fixture-share' }
    expect(await loadCatalogCache(share, context.userId!)).toBeNull()
    expect(legacy.list).not.toHaveBeenCalled()
  })

  it('rejects malformed old entries without resetting the existing content database', async () => {
    legacy.list.mockResolvedValue({ scope: context.userId, status: 'all', fetchedAt: 1, books: [{ id: 'bad' }] })
    legacy.snapshot.mockResolvedValue(null)
    expect(await loadCatalogCache({ ...context, scopeKey: `${context.scopeKey}-bad-old` }, context.userId!)).toBeNull()
  })

  it('migrates exact scoped lists once and copies legacy cover only when requested', async () => {
    const scoped = { ...context, scopeKey: `${context.scopeKey}-migrate` }
    const original = { id: 'old', title: 'Old', author: null, cover_url: 'data:image/png;base64,aGVsbG8=', created_at: '2026-09-01T00:00:00Z', status: 'active', is_own: true, original_language: 'en', available_languages: ['en'] }
    legacy.list.mockResolvedValue({ scope: context.userId, status: 'all', fetchedAt: 1, books: [original] })
    legacy.snapshot.mockResolvedValue(null)
    const migrated = await loadCatalogCache(scoped, context.userId!)
    expect(migrated?.origin).toBe('legacy')
    expect(migrated?.manifest.items[0].cover?.url).toMatch(/^\/api\/v2\//)
    const version = migrated!.manifest.items[0].cover!.version
    const blob = await getCatalogCover(scoped.scopeKey, 'old', version)
    expect(await blob?.text()).toBe('hello')
    const reads = legacy.list.mock.calls.length
    await loadCatalogCache(scoped, context.userId!)
    expect(legacy.list).toHaveBeenCalledTimes(reads)
    expect(original.cover_url).toBe('data:image/png;base64,aGVsbG8=')
  })

  it('does not decode a large nonvisible legacy cover to produce the offline index', async () => {
    const scoped = { ...context, scopeKey: `${context.scopeKey}-large-legacy` }
    const decode = vi.spyOn(globalThis, 'atob')
    const old = { id: 'large-unseen', title: 'Large', author: null, cover_url: `data:image/png;base64,${'A'.repeat(4 * 1024 * 1024)}`, created_at: '2026-09-01T00:00:00Z', status: 'active', original_language: 'en', available_languages: ['en'] }
    legacy.list.mockResolvedValue({ scope: context.userId, status: 'all', fetchedAt: 1, books: [old] })
    legacy.snapshot.mockResolvedValue(null)
    const cached = await loadCatalogCache(scoped, context.userId!)
    expect(cached?.manifest.items[0].title).toBe('Large')
    expect(cached?.manifest.items[0].cover?.version).toBe('legacy-1-large-unseen')
    expect(decode).not.toHaveBeenCalled()
    decode.mockRestore()
  })

  it('recovers after a failed manifest write leaves only a durable migration marker', async () => {
    const persisted = new Map<string, Map<string, unknown>>()
    let denyManifestWrites = true
    vi.stubGlobal('indexedDB', { open: () => {
      const opening: Record<string, unknown> = {}
      opening.result = { close: () => {}, transaction: (name: string) => {
        const entries = persisted.get(name) ?? new Map<string, unknown>()
        persisted.set(name, entries)
        const transaction: Record<string, unknown> = {}
        const request = (key: string, value?: unknown, write = false) => {
          const result: Record<string, unknown> = {}
          queueMicrotask(() => {
            if (write && name === 'manifests' && denyManifestWrites) {
              (transaction.onabort as () => void)?.()
              return
            }
            if (write) entries.set(key, value)
            result.result = write ? key : entries.get(key)
            ;(result.onsuccess as () => void)?.()
            ;(transaction.oncomplete as () => void)?.()
          })
          return result
        }
        transaction.objectStore = () => ({ get: (key: string) => request(key), put: (value: unknown, key: string) => request(key, value, true) })
        return transaction
      } }
      queueMicrotask(() => (opening.onsuccess as () => void)?.())
      return opening
    } })
    const scoped = { ...context, scopeKey: `${context.scopeKey}-partial-migration` }
    const old = { id: 'preserved', title: 'Preserved', author: null, created_at: '2026-09-01T00:00:00Z', status: 'active', original_language: 'en', available_languages: ['en'] }
    legacy.list.mockResolvedValue({ scope: context.userId, status: 'all', fetchedAt: 1, books: [old] })
    legacy.snapshot.mockResolvedValue(null)
    const first = await loadCatalogCache(scoped, context.userId!)
    expect(first?.manifest.items[0].title).toBe('Preserved')
    await putCatalogManifest(first!.manifest, 'legacy', context.userId!)
    expect(persisted.get('migration')?.get(scoped.scopeKey)).toBe(true)
    expect(persisted.get('manifests')?.has(scoped.scopeKey)).toBe(false)

    // Reload clears memory while the marker and untouched legacy database survive.
    vi.resetModules()
    const restarted = await import('../lib/catalogCache')
    denyManifestWrites = false
    const recovered = await restarted.loadCatalogCache(scoped, context.userId!)
    expect(recovered?.manifest.items[0].title).toBe('Preserved')
    expect(legacy.list).toHaveBeenCalledTimes(2)
    await restarted.putCatalogManifest(recovered!.manifest, 'legacy', context.userId!)
    expect(persisted.get('manifests')?.has(scoped.scopeKey)).toBe(true)
    await restarted.loadCatalogCache(scoped, context.userId!)
    expect(legacy.list).toHaveBeenCalledTimes(2)
  })
})
