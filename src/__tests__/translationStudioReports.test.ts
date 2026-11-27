import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { readerCheckJournalRows } from '@/lib/readerCheckJournalCsv'
import type { ReaderCheckJournalItem } from '@/lib/api'
import { BookRuns, epubCheckSummary } from '@/app/studio/_components/BookEdition'
import { ProjectRunHistory } from '@/app/studio/_components/ProjectRunHistory'
import { BookExecution, StageCard } from '@/app/studio/_components/BookStage'

const { read } = vi.hoisted(() => ({ read: vi.fn() }))
vi.mock('@/app/studio/_components/bookRequests', () => ({
  bookEndpoint: (_bookId: string, action: string) => action,
  useBookData: read,
  useBookAction: () => ({}),
}))

describe('translation studio reports', () => {
  it('distinguishes checked EPUBs from a failed build and a legacy empty report', () => {
    const empty = { blocking: [], warnings: [] }
    expect(epubCheckSummary({ ...empty, status: 'checked' })).toContain('ошибок: 0')
    expect(epubCheckSummary({ ...empty, status: 'unavailable' })).toContain('не проверен')
    expect(epubCheckSummary(empty)).toContain('нет статуса')
    expect(epubCheckSummary({ ...empty, blocking: ['ZIP'] })).toContain('ошибок: 1')
  })
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

  it('keeps polling a series if another volume is running after an error', () => {
    read.mockReset()
    renderToStaticMarkup(React.createElement(ProjectRunHistory, { projectId: 'project' }))
    const poll = read.mock.calls[0][2]
    expect(poll({ groups: [{ status: 'error', volumes: [{ status: 'error' }, { status: 'running' }] }] })).toBe(true)
    expect(poll({ groups: [{ status: 'error', volumes: [{ status: 'error' }, { status: 'done' }] }] })).toBe(false)
  })

  it('shows chapter errors when the translation worker has finished processing the book', () => {
    read.mockImplementation((url: string) => url === 'translate-full-book'
      ? { data: { state: 'complete', totalChapters: 3, counts: { done: 2, error: 1 } } }
      : { data: { runs: [] } })
    const card = React.createElement(StageCard, { stage: 'translate', bookId: 'book', lang: 'EN', models: [] })
    const html = renderToStaticMarkup(React.createElement(BookExecution, null, card))
    expect(html).toContain('глав с ошибкой: 1')
  })
})
