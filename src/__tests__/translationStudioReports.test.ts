import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { readerCheckJournalRows } from '@/lib/readerCheckJournalCsv'
import type { ReaderCheckJournalItem } from '@/lib/api'
import { BookRuns } from '@/app/studio/_components/BookEdition'

const { read } = vi.hoisted(() => ({ read: vi.fn() }))
vi.mock('@/app/studio/_components/bookRequests', () => ({
  bookEndpoint: (_bookId: string, action: string) => action,
  useBookData: read,
  useBookAction: () => ({}),
}))

describe('translation studio reports', () => {
  it('keeps the diagnostic fields and their order in reader-check journal exports', () => {
    const item: ReaderCheckJournalItem = {
      id: 'item', chapterId: 'chapter', chapterNumber: 0, chapterTitle: 'Архив', variant: 'reader',
      severity: 'minor', outcome: 'rejected', rejectReason: 'mismatch', quote: 'Строка, "цитата"',
      problem: 'Неверное число', before: 'один', after: 'два', changeNote: null, blockId: null,
      matchType: 'fuzzy', matchScore: 0, createdAt: '2026-01-01',
    }
    expect(readerCheckJournalRows([item])).toEqual([
      ['Chapter #', 'Chapter', 'Variant', 'Severity', 'Outcome', 'Reason', 'Quote', 'Problem', 'Before', 'After', 'Change', 'Match', 'Score'],
      ['0', 'Архив', 'reader', 'minor', 'rejected', 'mismatch', 'Строка, "цитата"', 'Неверное число', 'один', 'два', '', 'fuzzy', '0'],
    ])
  })

  it('shows actual and estimated stage usage and the search/fix breakdown from the two existing reports', () => {
    const estimate = { llmCalls: 8, tokensIn: 101, tokensOut: 95, costUsd: 0.12, priceKnown: true }
    const measured = { ...estimate, llmCalls: 7, tokensIn: 99, cachedTokensIn: 11, thoughtsTokens: 9, durationMs: 1020 }
    const search = { stage: 'reader-check', calls: 3, tokensIn: 32, tokensOut: 20, costUsd: 0.02, durationMs: 500 }
    const correction = { stage: 'correction', calls: 4, tokensIn: 67, tokensOut: 75, costUsd: 0.10, durationMs: 520 }
    read.mockImplementation((action: string) => action === 'fiction-costs' ? {
      data: { hasMeasured: true, totals: { measured }, stages: [{ stage: 'reader-check', ran: true, estimate, measured }] },
    } : action === 'fiction-cost-runs' ? {
      data: { runs: [{ runId: 'run', kind: 'reader-check', model: 'test-model', startedAt: null,
        total: { calls: 7, tokensIn: 99, tokensOut: 95, costUsd: 0.12, durationMs: 1020 }, stages: [search, correction] }] },
    } : { data: { limit: 50, runs: [{ id:'studio-run', bookId:'book', operation:'translate', createdAt:'2026-11-01', stages:{translate:{status:'done'}},
      costUsd:null, usageComplete:false, spend:[{stage:'translate',tokensIn:302,tokensOut:71}] }] } })
    const html = renderToStaticMarkup(React.createElement(BookRuns, { bookId: 'book', lang: 'EN' }))
    for (const text of ['Расчётно', 'Фактически', 'Входные токены', 'Выходные токены', 'Поиск замечаний',
      'Исправление замечаний', 'Всего за запуск', 'test-model', '>67</td>', '>32</td>', 'Данные неполные', '>302</td>', '>71</td>']) {
      expect(html).toContain(text)
    }
    expect(read.mock.calls.map(call => call[0])).toEqual(['fiction-costs', 'fiction-cost-runs', '/api/studio/recipe-runs?bookId=book&targetLang=EN'])
  })
})
