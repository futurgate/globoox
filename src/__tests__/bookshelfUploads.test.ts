import { describe, expect, it } from 'vitest'
import { applyUploadEvent, uploadedCatalogItem } from '@/lib/bookshelfUploads'
import { item } from './catalogFixtures'

describe('parsed upload metadata and operation identity', () => {
  it('never exposes provisional filename metadata before parser confirmation', () => {
    const raw = { ...item('pending'), title: 'filename.epub', author: 'temporary', metadata_ready: false,
      cover: { url: '/api/v2/books/pending/cover', version: '1', width: null, height: null } }
    expect(uploadedCatalogItem(raw, false)).toMatchObject({ title: '', author: null, cover: null, processing_status: 'processing' })
  })
  it('shows parsed text independently of an absent or later cover, and stops absent author/title skeletons when ready', () => {
    expect(uploadedCatalogItem({ ...item('pending'), title: ' Parsed ', author: null, metadata_ready: true }, false))
      .toMatchObject({ title: 'Parsed', author: null, cover: null })
    expect(uploadedCatalogItem({ ...item('ready'), title: null, author: null, metadata_ready: true }, true))
      .toMatchObject({ title: 'Untitled book', author: null, cover: null, processing_status: 'ready' })
  })
  it('does not trust a job preview with a noncatalog cover URL or malformed membership fields', () => {
    expect(uploadedCatalogItem({ ...item('pending'), metadata_ready: true, cover: { url: 'https://outside.invalid/x', version: '1', width: null, height: null } }, false)).toBeUndefined()
    expect(uploadedCatalogItem({ ...item('pending'), metadata_ready: true, is_own: undefined }, true)).toBeUndefined()
  })
  it('keeps one canonical entry and does not resurrect a dismissed local attempt', () => {
    const first = { attemptId: 'first', fileName: 'first.epub', phase: 'uploading' as const }
    const second = { attemptId: 'second', fileName: 'second.epub', phase: 'uploading' as const }
    const entries = applyUploadEvent(applyUploadEvent([], first), { ...first, phase: 'complete', bookId: 'same' })
    const deduplicated = applyUploadEvent(applyUploadEvent(entries, second), { ...second, phase: 'complete', bookId: 'same' })
    expect(deduplicated.map(entry => entry.attemptId)).toEqual(['second'])
    expect(applyUploadEvent([], { ...first, phase: 'complete', bookId: 'late' })).toEqual([])
  })
})
