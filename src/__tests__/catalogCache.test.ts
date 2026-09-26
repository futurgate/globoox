import { afterEach, describe, expect, it, vi } from 'vitest'
const legacy = vi.hoisted(() => ({ list: vi.fn(), snapshot: vi.fn() }))
vi.mock('@/lib/contentCache', () => ({ getCachedBooksList: legacy.list, getCachedLibraryViewSnapshot: legacy.snapshot }))
import { getCatalogCover, getCatalogManifest, loadCatalogCache, putCatalogCover, putCatalogManifest } from '../lib/catalogCache'
import { context, manifest } from './catalogFixtures'
afterEach(() => { vi.unstubAllGlobals(); legacy.list.mockReset(); legacy.snapshot.mockReset() })

describe('scoped catalog storage and conservative legacy migration', () => {
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
