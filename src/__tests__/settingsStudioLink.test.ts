import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, expect, it, vi } from 'vitest'
import SettingsPage from '@/app/(app)/settings/page'

const { auth, read } = vi.hoisted(() => ({ auth: vi.fn(), read: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({}) }))
vi.mock('@/lib/hooks/useAuth', () => ({ useAuth: auth }))
vi.mock('@/lib/hooks/useSubscription', () => ({ useSubscription: () => ({ subscription: null }) }))
vi.mock('@/app/studio/_components/bookRequests', () => ({ useBookData: read }))

beforeEach(() => {
  read.mockReset()
  auth.mockReturnValue({ user: { id: 'account', user_metadata: {} }, loading: false })
})

it.each([true, false])('uses the server grant to show the same-origin Studio link (admin profile: %s)', isAdmin => {
  auth.mockReturnValue({ user: { id: 'account', user_metadata: {} }, isAdmin, loading: false })
  read.mockReturnValue({ data: { canStartTranslation: true } })
  const html = renderToStaticMarkup(createElement(SettingsPage))
  expect(read).toHaveBeenCalledWith('/api/studio/translation-access', 0)
  expect(html).toContain('href="/studio"')
  expect(html).toContain('Translation Studio')
})

it.each([null, { data: { canStartTranslation: false } }, { error: 'offline' }])('hides the entry without positive confirmation', result => {
  read.mockReturnValue(result)
  expect(renderToStaticMarkup(createElement(SettingsPage))).not.toContain('href="/studio"')
})

it('skips the access check for guests', () => {
  auth.mockReturnValue({ user: null, loading: false })
  expect(renderToStaticMarkup(createElement(SettingsPage))).not.toContain('href="/studio"')
  expect(read).not.toHaveBeenCalled()
})
