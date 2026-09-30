import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { safeLocalReturnPath } from '../lib/authNavigation'

const auth = vi.hoisted(() => ({
  search: new URLSearchParams(),
  exchangeCodeForSession: vi.fn(),
  createClient: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useSearchParams: () => auth.search, useRouter: () => ({ push: vi.fn() }) }))
vi.mock('next/link', () => ({ default: ({ children, ...props }: { children: React.ReactNode }) => React.createElement('a', props, children) }))
vi.mock('@/lib/supabase/server', () => ({ createClient: auth.createClient }))
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/posthog', () => ({ trackUserLoggedIn: vi.fn() }))
import AuthPage from '../app/(app)/auth/page'
import RegisterPage from '../app/(app)/auth/register/page'
import { GET } from '../app/(app)/auth/callback/route'

const origin = 'https://fixture.invalid'
const sharedShelf = '/my-books?share=fixture%2Bshared%26book'
function hrefFor(markup: string, label: string): string {
  const link = [...markup.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
    .find(match => match[2].replace(/<[^>]+>/g, '').trim() === label)
  expect(link, `Link ${label} exists`).toBeDefined()
  return link![1].replaceAll('&amp;', '&')
}
const callbackRequest = (next: string, code = 'fixture-code') => new Request(
  `${origin}/auth/callback?${new URLSearchParams({ next, ...(code ? { code } : {}) })}`,
)

beforeEach(() => {
  vi.stubGlobal('React', React)
  auth.search = new URLSearchParams()
  auth.exchangeCodeForSession.mockReset()
  auth.createClient.mockReset().mockResolvedValue({ auth: { exchangeCodeForSession: auth.exchangeCodeForSession } })
})
afterEach(() => vi.unstubAllGlobals())

describe('local auth return paths', () => {
  it.each([
    null, undefined, '', 'https://outside.invalid/path', '//outside.invalid/path',
    'javascript:alert(1)', 'my-books', '\\outside.invalid', '/\\outside.invalid',
    '/\n/outside.invalid', '/\t/outside.invalid', '/reader/\u0000book', '/reader/\u007fbook',
    '/%5coutside.invalid', '/%2foutside.invalid', '/%0d/outside.invalid',
    '/a/..//outside.invalid', '/invalid%encoding',
  ])('falls back for an unsafe return value: %j', value => {
    expect(safeLocalReturnPath(value)).toBe('/my-books')
  })

  it.each(['/my-books', sharedShelf, '/reader/fixture-book?share=fixture%2Btoken#position'])('preserves a local return value: %s', value => {
    expect(safeLocalReturnPath(value)).toBe(value)
  })
})

describe('real auth routes and form navigation', () => {
  it('keeps a shared shelf through OAuth failure, retry/register navigation, guest return and successful callback', async () => {
    auth.exchangeCodeForSession.mockResolvedValueOnce({ error: { message: 'Synthetic expired code' } })
    const failed = await GET(callbackRequest(sharedShelf))
    const retry = new URL(failed.headers.get('location')!)
    expect(retry.origin).toBe(origin)
    expect(retry.pathname).toBe('/auth')
    expect(retry.searchParams.get('error')).toBe('auth_failed')
    expect(retry.searchParams.get('next')).toBe(sharedShelf)

    auth.search = retry.searchParams
    const signIn = renderToStaticMarkup(React.createElement(AuthPage))
    expect(signIn).toContain('Authentication failed. Please try again.')
    expect(hrefFor(signIn, 'Browse as guest')).toBe(sharedShelf)
    const register = new URL(hrefFor(signIn, 'Create account'), origin)
    expect(register.searchParams.get('next')).toBe(sharedShelf)

    auth.search = register.searchParams
    const signInAgain = new URL(hrefFor(renderToStaticMarkup(React.createElement(RegisterPage)), 'Sign in'), origin)
    expect(signInAgain.searchParams.get('next')).toBe(sharedShelf)
    auth.exchangeCodeForSession.mockResolvedValueOnce({ error: null })
    const successful = await GET(callbackRequest(signInAgain.searchParams.get('next')!))
    expect(successful.headers.get('location')).toBe(origin + sharedShelf)
    expect(auth.exchangeCodeForSession).toHaveBeenCalledTimes(2)
  })

  it('keeps the explicit guest return when the OAuth callback has no code', async () => {
    const response = await GET(callbackRequest(sharedShelf, ''))
    auth.search = new URL(response.headers.get('location')!).searchParams
    expect(hrefFor(renderToStaticMarkup(React.createElement(AuthPage)), 'Browse as guest')).toBe(sharedShelf)
    expect(auth.createClient).not.toHaveBeenCalled()
  })

  it('applies the same fallback to login, registration, callback failure and callback success', async () => {
    const external = '//outside.invalid/steal'
    auth.search = new URLSearchParams({ next: external })
    const signIn = renderToStaticMarkup(React.createElement(AuthPage))
    expect(hrefFor(signIn, 'Browse as guest')).toBe('/my-books')
    expect(new URL(hrefFor(signIn, 'Create account'), origin).searchParams.get('next')).toBe('/my-books')
    const register = renderToStaticMarkup(React.createElement(RegisterPage))
    expect(new URL(hrefFor(register, 'Sign in'), origin).searchParams.get('next')).toBe('/my-books')

    const failed = await GET(callbackRequest(external, ''))
    expect(new URL(failed.headers.get('location')!).searchParams.get('next')).toBe('/my-books')
    auth.exchangeCodeForSession.mockResolvedValueOnce({ error: null })
    const successful = await GET(callbackRequest(external))
    expect(successful.headers.get('location')).toBe(origin + '/my-books')
  })
})
