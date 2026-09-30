import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('next/link', () => ({ default: ({ children, ...props }: { children: React.ReactNode }) => React.createElement('a', props, children) }))
vi.mock('@/lib/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: false }) }))
vi.mock('@/lib/useCatalogCover', () => ({ useCatalogCover: () => ({ url: null, loading: false }) }))
import CatalogBookCard from '../components/Store/CatalogBookCard'
import { context, item } from './catalogFixtures'

afterEach(() => vi.unstubAllGlobals())
describe('real bookshelf card links', () => {
  it.each([null, 'fixture-shared-book+token'])('carries only the supplied share context in both title and cover links: %s', shareToken => {
    // Vitest's JSX transform is classic; production uses Next's automatic transform.
    vi.stubGlobal('React', React)
    const markup = renderToStaticMarkup(React.createElement(CatalogBookCard, {
      book: item('fixture-book'), context: { ...context, shareToken }, offline: false,
    }))
    const links = [...markup.matchAll(/href="([^"]+)"/g)].map(match => match[1])
    const expected = '/reader/fixture-book' + (shareToken ? `?share=${encodeURIComponent(shareToken)}` : '')
    expect(links).toEqual([expected, expected])
  })
})
