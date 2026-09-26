import { afterEach, describe, expect, it, vi } from 'vitest'

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getSession } }) }))
vi.mock('@sentry/nextjs', () => ({ addBreadcrumb: vi.fn(), captureException: vi.fn() }))
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

  it('preserves existing requests without the optional scope header', async () => {
    const fetcher = setup('current-user')
    expect((await GET(request('GET'), context)).status).toBe(200)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
