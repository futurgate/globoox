import { afterEach, describe, expect, it, vi } from 'vitest'

const { getSession, getUser } = vi.hoisted(() => ({ getSession: vi.fn(), getUser: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getSession, getUser } }) }))
vi.mock('@sentry/nextjs', () => ({ addBreadcrumb: vi.fn(), captureException: vi.fn() }))
import { requireBackendProxy } from '../app/(app)/api/_proxy'
import { GET as downloadSeries } from '../app/(app)/api/series/[id]/download-translated/route'
import { GET, PUT } from '../app/(app)/api/books/[id]/reading-position/route'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks() })

describe('reading position account binding', () => {
  const context = { params: Promise.resolve({ id: 'book' }) }
  const request = (method: string, scope?: string) => new Request('https://app.example/api/books/book/reading-position', {
    method,
    headers: scope === undefined ? {} : { 'X-Reading-User': scope },
    ...(method === 'PUT' ? { body: '{"block_position":5}' } : {}),
  })
  const setup = (user: string | null) => {
    vi.stubEnv('API_URL', 'https://backend.example')
    getSession.mockResolvedValue({ data: { session: user ? { user: { id: user }, access_token: 'session-token' } : null } })
    const fetcher = vi.fn().mockResolvedValue(new Response('{"block_position":5}', { headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetcher)
    return fetcher
  }

  it.each(['GET', 'PUT'])('rejects a queued %s after switching account before dispatch', async method => {
    const fetcher = setup('next-user')
    const response = await (method === 'GET' ? GET : PUT)(request(method, 'previous-user'), context)
    expect(response.status).toBe(401)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('rejects an intent after logout', async () => {
    const fetcher = setup(null)
    expect((await PUT(request('PUT', 'previous-user'), context)).status).toBe(401)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('forwards an intent using the same session that passed the scope check', async () => {
    const fetcher = setup('current-user')
    expect((await PUT(request('PUT', 'current-user'), context)).status).toBe(200)
    expect(getSession).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer session-token')
    expect(fetcher.mock.calls[0][1].body).toBe('{"block_position":5}')
  })

  it('verifies browser-only auth for an API call and forwards the credential that passed verification', async () => {
    const f = setup(null)
    const req = new Request('https://app.example/api/books/process', { headers: { Authorization: 'Bearer fixture-token' } })
    getUser.mockResolvedValue({ data: { user: null }, error: { status: 401 } })
    expect((await requireBackendProxy(req)).status).toBe(401)
    expect(f).not.toHaveBeenCalled()
    getUser.mockResolvedValue({ data: { user: { id: 'account' } }, error: null })
    expect((await requireBackendProxy(req)).status).toBe(200)
    expect(getUser).toHaveBeenCalledWith('fixture-token')
    expect(f.mock.calls[0][1].headers.Authorization).toBe('Bearer fixture-token')
  })

  it('pins an already verified workspace identity while continuing to reject stale reading intents', async () => {
    const f = setup(null)
    expect((await requireBackendProxy(request('GET'), 'expected', { userId: 'wrong', token: 'fixture-token' })).status).toBe(401)
    expect(f).not.toHaveBeenCalled()
    expect((await requireBackendProxy(request('GET'), 'expected', { userId: 'expected', token: 'fixture-token' })).status).toBe(200)
    expect(f.mock.calls[0][1].headers.Authorization).toBe('Bearer fixture-token')
  })

  it('preserves existing requests without the optional scope header', async () => {
    const fetcher = setup('current-user')
    expect((await GET(request('GET'), context)).status).toBe(200)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})

describe('series downloads through the shared proxy', () => {
  it.each(['application/zip', 'application/octet-stream; charset=binary'])('forwards the authenticated ZIP with type %s', async contentType => {
    vi.stubEnv('API_URL', 'https://backend.example')
    getSession.mockResolvedValue({ data: { session: { user: { id: 'owner' }, access_token: 'session-token' } } })
    const bytes = Uint8Array.of(0x50, 0x4b, 0, 0xff)
    const disposition = 'attachment; filename="series.zip"'
    const fetcher = vi.fn().mockResolvedValue(new Response(bytes, { headers: {
      'content-type': contentType, 'content-disposition': disposition, 'x-skipped-volumes': '1',
    } }))
    vi.stubGlobal('fetch', fetcher)

    const response = await downloadSeries(new Request('https://app.example/api/series/test/download-translated?lang=EN'))
    expect(fetcher).toHaveBeenCalledWith('https://backend.example/api/series/test/download-translated?lang=EN',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer session-token' }) }))
    expect(response.status).toBe(200)
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes)
    expect(response.headers.get('content-type')).toBe(contentType)
    expect(response.headers.get('content-disposition')).toBe(disposition)
    expect(response.headers.get('x-skipped-volumes')).toBe('1')
  })
})
