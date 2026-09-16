import { describe, expect, it } from 'vitest'
import type { ApiBook } from '@/lib/api'
import { BooksRequestGuard, sameBooks } from '@/lib/useBooksState'

const book: ApiBook = {
  id: 'one', title: 'Book', author: 'Author', cover_url: '/cover.png',
  original_language: 'EN', available_languages: ['EN', 'FR'], selected_language: 'FR',
  status: 'active', created_at: '2026-09-16T00:00:00Z', is_own: true,
}

describe('useBooks metadata identity', () => {
  it('recognizes independently deserialized identical payloads', () => {
    expect(sameBooks([book], JSON.parse(JSON.stringify([book])))).toBe(true)
  })

  it('does not hide any currently typed metadata changes', () => {
    const changes: { [K in keyof ApiBook]-?: ApiBook[K] } = {
      id: 'other', title: 'Changed', author: null, cover_url: null,
      original_language: 'RU', available_languages: ['EN', 'ES'], selected_language: null,
      status: 'hidden', created_at: '2026-09-17T00:00:00Z', is_own: false,
    }
    for (const [key, value] of Object.entries(changes)) {
      expect(sameBooks([book], [{ ...book, [key]: value }]), key).toBe(false)
    }
  })

  it('preserves additions, deletions and meaningful server order changes', () => {
    const other = { ...book, id: 'two' }
    expect(sameBooks([book], [book, other])).toBe(false)
    expect(sameBooks([book, other], [book])).toBe(false)
    expect(sameBooks([book, other], [other, book])).toBe(false)
  })
})

describe('useBooks request ownership', () => {
  it('accepts fast disk hydration while network is pending, but not after the first batch', () => {
    const guard = new BooksRequestGuard()
    guard.activate()
    const disk = guard.hydrationVersion()
    guard.beginRequest()
    expect(guard.canHydrate(disk)).toBe(true)
    guard.markPublished()
    expect(guard.canHydrate(disk)).toBe(false)
  })

  it('a local mutation rejects an old GET and late disk without affecting its replacement', () => {
    const guard = new BooksRequestGuard()
    guard.activate()
    const disk = guard.hydrationVersion()
    const old = guard.beginRequest()
    expect(guard.invalidateRequest()).toBe(true)
    guard.markPublished()
    expect(old.controller.signal.aborted).toBe(true)
    expect(guard.isCurrent(old)).toBe(false)
    expect(guard.canHydrate(disk)).toBe(false)
    const next = guard.beginRequest()
    guard.finishRequest(old)
    expect(guard.isCurrent(next)).toBe(true)
    expect(guard.inFlight).toBe(true)
  })

  it('forced refresh supersedes a pending request including its finally handler', () => {
    const guard = new BooksRequestGuard()
    guard.activate()
    const first = guard.beginRequest()
    const replacement = guard.beginRequest()
    expect(guard.isCurrent(first)).toBe(false)
    expect(first.controller.signal.aborted).toBe(true)
    guard.finishRequest(first)
    expect(guard.isCurrent(replacement)).toBe(true)
    guard.finishRequest(replacement)
    expect(guard.inFlight).toBe(false)
  })

  it('scope disposal rejects both data and loader/error completions, including effect replay', () => {
    const guard = new BooksRequestGuard()
    guard.activate()
    const disk = guard.hydrationVersion()
    const old = guard.beginRequest()
    guard.dispose()
    expect(guard.isCurrent(old)).toBe(false)
    expect(guard.canHydrate(disk)).toBe(false)
    guard.activate()
    const current = guard.beginRequest()
    expect(guard.isCurrent(old)).toBe(false)
    expect(guard.canHydrate(disk)).toBe(false)
    expect(guard.isCurrent(current)).toBe(true)
  })
})
