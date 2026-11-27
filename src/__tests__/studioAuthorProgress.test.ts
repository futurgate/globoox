import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import { AuthorProgress } from '@/app/studio/_components/BookWorkspace'

const read = vi.hoisted(() => vi.fn())
vi.mock('@/app/studio/_components/bookRequests', async importOriginal => ({
  ...await importOriginal<typeof import('@/app/studio/_components/bookRequests')>(), useBookData: read,
}))

function render(studioTargetLang?: string, totalUsd: number | null = 42) {
  vi.stubGlobal('React', React)
  read.mockReturnValue({ data: { studioTargetLang, model: 'internal-model',
    byLanguage: [{ lang: 'EN', blocksTranslated: 2, blocksRemaining: 3, cost: { totalUsd } }],
  } })
  return renderToStaticMarkup(React.createElement(AuthorProgress, { bookId: 'book', lang: 'EN' }))
}
afterEach(() => vi.unstubAllGlobals())

it.each([undefined, 'FR'])('keeps progress while hiding an unconfirmed recipe price (%s)', lang => {
  const html = render(lang)
  expect(html).toContain('2 из 5')
  expect(html).not.toContain('42')
  expect(html).not.toContain('internal-model')
  expect(html).toContain('Прогноз стоимости по сохранённому рецепту пока недоступен')
})

it('shows the saved recipe price or reports its missing tariff', () => {
  const html = render('EN')
  expect(html).toContain('42,00')
  expect(html).not.toContain('internal-model')
  expect(render('EN', null)).toContain('пока нет тарифа')
})
