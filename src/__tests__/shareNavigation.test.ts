import { afterEach, describe, expect, it, vi } from 'vitest'
import { getShareToken, shareTokenFromSearch, withShareContext } from '../lib/shareNavigation'
const session = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api', async () => ({ getShareToken: (await import('../lib/shareNavigation')).getShareToken }))
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { getSession: session } }) }))
import { catalogContextHint, catalogRequestUrl, resolveCatalogContext } from '../lib/catalogApi'
import { validateCatalogManifest } from '../lib/catalogTypes'
import { manifest } from './catalogFixtures'

const origin = 'https://fixture.invalid'
function navigate(path: string) {
  const location = new URL(path, origin)
  const readStorage = vi.fn((key: string) => key === 'globoox:share_token' ? 'old-persistent-share' : null)
  vi.stubGlobal('window', { location, localStorage: { getItem: readStorage } })
  return readStorage
}
afterEach(() => { vi.unstubAllGlobals(); session.mockReset() })

describe('explicit share navigation and catalog identity', () => {
  it('ignores a legacy persistent share token on the ordinary public shelf', () => {
    const readStorage = navigate('/my-books')
    expect(getShareToken()).toBeNull()
    const publicContext = catalogContextHint(null)
    expect(publicContext.shareToken).toBeNull()
    expect(catalogRequestUrl('/api/v2/library', publicContext)).toBe('/api/v2/library')
    expect(readStorage).not.toHaveBeenCalled()
  })

  it('keeps explicit access through share entry, Reader, reload and back, then leaves it on ordinary navigation', () => {
    const token = 'fixture-share+with&reserved=characters'
    const shelf = withShareContext('/my-books', token)
    navigate(shelf)
    const sharedScope = catalogContextHint(null).scopeKey
    const reader = withShareContext('/reader/fixture-book', getShareToken())
    navigate(reader)
    expect(getShareToken()).toBe(token)
    navigate(reader) // Reload/new tab must need no stored token.
    expect(catalogContextHint(null).scopeKey).toBe(sharedScope)
    expect(withShareContext('/my-books', getShareToken())).toBe(shelf)
    navigate(shelf)
    expect(new URL(catalogRequestUrl('/api/v2/library', catalogContextHint(null)), origin).searchParams.get('share')).toBe(token)
    navigate('/my-books')
    expect(getShareToken()).toBeNull()
    expect(catalogContextHint(null).scopeKey).not.toBe(sharedScope)
  })

  it('does not accept the previous share manifest after a query-only scope change', () => {
    navigate('/my-books?share=fixture-a')
    const a = catalogContextHint(null)
    navigate('/my-books?share=fixture-b')
    const b = catalogContextHint(null)
    expect(b.scopeKey).not.toBe(a.scopeKey)
    expect(() => validateCatalogManifest(manifest(['fixture-book'], a.scopeKey), b.scopeKey)).toThrow()
    navigate('/my-books')
    const publicContext = catalogContextHint(null)
    expect(() => validateCatalogManifest(manifest(['fixture-book'], b.scopeKey), publicContext.scopeKey)).toThrow()
  })

  it('keeps share context through the existing encoded auth next/callback path', async () => {
    const token = 'fixture-auth+share&context'
    const next = withShareContext('/my-books', token)
    const authUrl = `/auth?next=${encodeURIComponent(next)}`
    navigate(authUrl)
    expect(getShareToken()).toBeNull() // The auth screen itself is not a shared shelf.
    const callback = `/auth/callback?next=${encodeURIComponent(new URL(authUrl, origin).searchParams.get('next')!)}`
    navigate(new URL(callback, origin).searchParams.get('next')!)
    const a = '00000000-0000-4000-8000-000000000001'
    const b = '00000000-0000-4000-8000-000000000002'
    session.mockResolvedValue({ data: { session: { user: { id: a }, access_token: 'fixture-a' } } })
    const accountA = await resolveCatalogContext(new AbortController().signal, a)
    expect(accountA.shareToken).toBe(token)
    session.mockResolvedValue({ data: { session: { user: { id: b }, access_token: 'fixture-b' } } })
    const accountB = await resolveCatalogContext(new AbortController().signal, b)
    expect(accountB.scopeKey).not.toBe(accountA.scopeKey)
    expect(accountB.headers.Authorization).toBe('Bearer fixture-b')
    expect(() => validateCatalogManifest(manifest(['fixture-book'], accountA.scopeKey), accountB.scopeKey)).toThrow()
    navigate('/my-books')
    expect((await resolveCatalogContext(new AbortController().signal, b)).shareToken).toBeNull()
  })

  it('preserves other navigation parameters and fragments while replacing share context', () => {
    expect(withShareContext('/my-books?upload=1&share=old#top', 'fixture-new')).toBe('/my-books?upload=1&share=fixture-new#top')
    expect(withShareContext('/my-books?share=old#top', null)).toBe('/my-books#top')
    expect(() => withShareContext('https://elsewhere.invalid/', 'fixture')).toThrow()
  })

  it.each(['', '?share=', '?share=a&share=b', `?share=${'x'.repeat(257)}`])('rejects absent, ambiguous or oversized URL context: %s', search => {
    expect(shareTokenFromSearch(search)).toBeNull()
  })
})
