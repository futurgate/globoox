import { afterEach, describe, expect, it, vi } from 'vitest'
import { proxyCatalog } from '../app/(app)/api/_catalogProxy'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('catalog proxy', () => {
  it('forwards explicit identity/share and binary body with private caching', async () => {
    vi.stubEnv('API_URL', 'https://backend.example/')
    const fetcher = vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), {
      headers: { 'content-type': 'image/webp', 'cache-control': 'public, max-age=999' },
    }))
    vi.stubGlobal('fetch', fetcher)
    const response = await proxyCatalog(new Request('https://app.example/api/v2/books/id/cover?share=fixture&version=1', {
      headers: { 'x-catalog-user': 'user-a', authorization: 'Bearer fixture', cookie: 'unrelated=private' },
    }))
    expect(fetcher.mock.calls[0][0]).toBe('https://backend.example/api/v2/books/id/cover?share=fixture&version=1')
    const options = fetcher.mock.calls[0][1]
    expect(options.headers.get('authorization')).toBe('Bearer fixture')
    expect(options.headers.get('x-catalog-user')).toBe('user-a')
    expect(options.headers.get('cookie')).toBeNull()
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3])
  })

  it('preserves authorization errors instead of returning empty success', async () => {
    vi.stubEnv('API_URL', 'https://backend.example')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":"Expired identity"}', { status: 401 })))
    const response = await proxyCatalog(new Request('https://app.example/api/v2/library', { headers: { 'x-catalog-user': 'user-a' } }))
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Expired identity' })
  })

  it('rejects missing identity without contacting the backend', async () => {
    vi.stubEnv('API_URL', 'https://backend.example')
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    expect((await proxyCatalog(new Request('https://app.example/api/v2/library'))).status).toBe(400)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('bounds a chunked activity body even without content-length', async () => {
    vi.stubEnv('API_URL', 'https://backend.example')
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(16385)); controller.close() } })
    const request = new Request('https://app.example/api/v2/reading-activity', {
      method: 'POST', headers: { 'x-catalog-user': 'guest' }, body, duplex: 'half',
    } as RequestInit)
    expect((await proxyCatalog(request)).status).toBe(413)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('cancels an incoming body that has not finished when the client aborts', async () => {
    vi.stubEnv('API_URL', 'https://backend.example')
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    const controller = new AbortController()
    const request = new Request('https://app.example/api/v2/reading-activity', {
      method: 'POST', headers: { 'x-catalog-user': 'guest' }, body: new ReadableStream(),
      signal: controller.signal, duplex: 'half',
    } as RequestInit)
    const response = proxyCatalog(request)
    controller.abort()
    expect((await response).status).toBe(499)
    expect(fetcher).not.toHaveBeenCalled()
  })
})
