import { afterEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ session: vi.fn(), share: vi.fn(() => null as string | null) }))
vi.mock('@/lib/api', () => ({ getShareToken: mocks.share }))
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { getSession: mocks.session } }) }))
import { sha256 } from 'js-sha256'
import { CatalogError, fetchCatalogManifest, resolveCatalogContext, catalogRequestUrl } from '../lib/catalogApi'
import { validateCatalogManifest } from '../lib/catalogTypes'
import { context, deferred, manifest } from './catalogFixtures'
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); mocks.share.mockReturnValue(null) })

describe('catalog API identity, framing and completeness', () => {
  it('sends actual session identity and preserves share context for authenticated users', async () => {
    mocks.share.mockReturnValue('private-share-token')
    mocks.session.mockResolvedValue({ data: { session: { user: { id: context.userId }, access_token: 'fixture-token' } }, error: null })
    const actual = await resolveCatalogContext(new AbortController().signal, context.userId)
    expect(actual.scopeKey).toBe(`user:${context.userId}::${sha256('private-share-token')}`)
    expect(actual.headers['X-Catalog-User']).toBe(context.userId)
    expect(actual.headers.Authorization).toBe('Bearer fixture-token')
    expect(catalogRequestUrl('/api/v2/library', actual)).toBe('/api/v2/library?share=private-share-token')
  })

  it('rejects a guest session when the caller expects an authenticated user', async () => {
    mocks.session.mockResolvedValue({ data: { session: null }, error: null })
    await expect(resolveCatalogContext(new AbortController().signal, context.userId)).rejects.toMatchObject({ kind: 'auth' })
  })

  it('aborts hanging getSession without waiting for the promise', async () => {
    mocks.session.mockReturnValue(new Promise(() => {}))
    const controller = new AbortController()
    const promise = resolveCatalogContext(controller.signal)
    controller.abort(new CatalogError('timeout', 'deadline'))
    await expect(promise).rejects.toMatchObject({ kind: 'timeout' })
  })

  it('bounds body consumption after successful headers', async () => {
    const body = deferred<string>()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, headers: new Headers({ 'content-type': 'application/json' }), text: () => body.promise })))
    const controller = new AbortController()
    const result = fetchCatalogManifest(context, controller.signal)
    await Promise.resolve()
    controller.abort(new CatalogError('timeout', 'deadline'))
    await expect(result).rejects.toMatchObject({ kind: 'timeout' })
    body.resolve(JSON.stringify(manifest()))
  })

  it.each([401, 403, 404, 500])('classifies HTTP %i without calling legacy endpoints', async status => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response('{}', { status, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetch)
    await expect(fetchCatalogManifest(context, new AbortController().signal)).rejects.toMatchObject({ kind: status < 404 ? 'auth' : status === 404 ? 'deployment' : 'network' })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toContain('/api/v2/library')
  })

  it('rejects HTML success, duplicate IDs, wrong scope, partial lists and base64 contamination', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html/>', { headers: { 'content-type': 'text/html' } })))
    await expect(fetchCatalogManifest(context, new AbortController().signal)).rejects.toMatchObject({ kind: 'deployment' })
    expect(() => validateCatalogManifest(manifest(['same', 'same']), context.scopeKey)).toThrow()
    expect(() => validateCatalogManifest(manifest(), 'foreign')).toThrow()
    expect(() => validateCatalogManifest({ ...manifest(), complete: false }, context.scopeKey)).toThrow()
    const data = manifest()
    expect(() => validateCatalogManifest({ ...data, items: [{ ...data.items[0], cover_url: 'data:image/png;base64,abc' }] }, context.scopeKey)).toThrow()
  })
})
