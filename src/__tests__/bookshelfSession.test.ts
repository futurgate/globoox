import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { updateSession } from '../lib/supabase/middleware'

const origin = 'https://session-fixture.invalid'
const cookieName = 'sb-session-fixture-auth-token'
const user = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'session@example.invalid', aud: 'authenticated', role: 'authenticated',
  app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z',
}
const session = (expiresAt: number, access = 'synthetic-access', refresh = 'synthetic-refresh') => ({
  access_token: access, refresh_token: refresh, token_type: 'bearer',
  expires_at: expiresAt, expires_in: 3600, user,
})
const cookie = (value: unknown) => `base64-${Buffer.from(JSON.stringify(value)).toString('base64url')}`
const decode = (value: string) => JSON.parse(Buffer.from(value.slice(7), 'base64url').toString())
const request = (path: string, value?: unknown) => new NextRequest(`https://app.example${path}`, {
  headers: value === undefined ? {} : { cookie: `${cookieName}=${cookie(value)}` },
})

describe('public bookshelf session renewal with the real Supabase SDK', () => {
  let calls: string[]
  let refreshDenied: boolean

  beforeEach(() => {
    calls = []
    refreshDenied = false
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', origin)
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'synthetic-anon-key')
    // No real network is allowed; only the external transport is substituted.
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : String(input))
      const method = init?.method ?? (input instanceof Request ? input.method : 'GET')
      if (url.origin !== origin) throw new Error('Unexpected external destination')
      calls.push(`${method} ${url.pathname}${url.search}`)
      if (url.pathname === '/auth/v1/user' && method === 'GET') {
        return Response.json(user)
      }
      if (url.pathname === '/auth/v1/token' && method === 'POST' && url.searchParams.get('grant_type') === 'refresh_token') {
        return refreshDenied
          ? Response.json({ msg: 'Refresh token revoked', code: 'refresh_token_not_found' }, { status: 400 })
          : Response.json(session(Math.floor(Date.now() / 1000) + 3600, 'renewed-access', 'renewed-refresh'))
      }
      throw new Error(`Unexpected fixture request: ${method} ${url.pathname}`)
    }))
  })

  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

  it.each(['/my-books', '/my-books/', '/my-books?_rsc=fixture'])('does not remotely authorize the public shell %s for a fresh session', async path => {
    const response = await updateSession(request(path, session(Math.floor(Date.now() / 1000) + 3600)))
    expect(response.status).toBe(200)
    expect(calls).toEqual([])
    expect(response.cookies.getAll()).toEqual([])
    expect(await response.text()).toBe('')
  })

  it('keeps guests local and never renders a private identity into the shell response', async () => {
    const response = await updateSession(request('/my-books'))
    expect(calls).toEqual([])
    expect(await response.text()).toBe('')
  })

  it('renews an expired session and writes the real SDK cookie to both downstream request and response', async () => {
    const incoming = request('/my-books', session(Math.floor(Date.now() / 1000) - 1))
    const response = await updateSession(incoming)
    expect(calls).toEqual(['POST /auth/v1/token?grant_type=refresh_token'])
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    const renewedCookie = response.cookies.get(cookieName)
    expect(renewedCookie).toBeDefined()
    expect(decode(renewedCookie!.value).access_token).toBe('renewed-access')
    expect(decode(incoming.cookies.get(cookieName)!.value).refresh_token).toBe('renewed-refresh')
    // A following reload accepts the renewed cookie without a second refresh/user request.
    calls.length = 0
    await updateSession(request('/my-books', decode(renewedCookie!.value)))
    expect(calls).toEqual([])
  })

  it('clears an expired session when refresh is rejected, without retaining a private identity', async () => {
    refreshDenied = true
    const incoming = request('/my-books', session(Math.floor(Date.now() / 1000) - 1))
    const response = await updateSession(incoming)
    expect(calls).toEqual(['POST /auth/v1/token?grant_type=refresh_token'])
    expect(response.cookies.get(cookieName)?.value).toBe('')
    expect(response.cookies.get(cookieName)?.maxAge).toBe(0)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(incoming.cookies.get(cookieName)?.value).toBe('')
    expect(await response.text()).toBe('')
  })

  it.each(['/settings', '/reader/fixture', '/auth/callback?code=fixture', '/my-books/private'])('preserves live user validation outside the exact public shelf: %s', async path => {
    await updateSession(request(path, session(Math.floor(Date.now() / 1000) + 3600)))
    expect(calls).toEqual(['GET /auth/v1/user'])
  })
})
