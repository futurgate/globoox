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


describe('upload recovery identity', () => {
  it('replaces a failed attempt in place at explicit retry start and ignores its late result', () => {
    const failure = { attemptId: 'failed', fileName: 'old.epub', phase: 'error' as const, bookId: 'same' };
    const other = { attemptId: 'other', fileName: 'other.epub', phase: 'processing' as const, bookId: 'other-book' };
    const retry = { attemptId: 'retry', fileName: 'fixed.epub', phase: 'uploading' as const,
      retryBookId: 'same', bookId: 'same', replacesAttemptId: 'failed' };
    const replaced = applyUploadEvent([other, failure], retry);
    expect(replaced.map(entry => entry.attemptId)).toEqual(['other', 'retry']);
    expect(applyUploadEvent(replaced, { ...failure, phase: 'error', error: 'Late old result' })).toEqual(replaced);
    expect(applyUploadEvent(replaced, { ...retry, phase: 'complete', bookId: 'canonical-ready' })).toHaveLength(2);
  });
  it('replaces a local failed placeholder without a server id, preserving unrelated attempts', () => {
    const entries = [{ attemptId: 'old', fileName: 'old.epub', phase: 'error' as const },
      { attemptId: 'other', fileName: 'other.epub', phase: 'processing' as const }];
    const replaced = applyUploadEvent(entries, { attemptId: 'new', fileName: 'new.epub', phase: 'uploading', replacesAttemptId: 'old' });
    expect(replaced.map(entry => entry.attemptId)).toEqual(['new', 'other']);
  });
  it('keeps authoritative ready previews readable while nonterminal error previews remain processing', () => {
    expect(uploadedCatalogItem({ ...item('ready'), metadata_ready: true, processing_status: 'ready' }, false)?.processing_status).toBe('ready')
    expect(uploadedCatalogItem({ ...item('retrying'), metadata_ready: true, processing_status: 'error' }, false)?.processing_status).toBe('processing')
  })
  it('checking the same upload retains its job identity and clears stale feedback after recovery', () => {
    const first = { attemptId: 'attempt', fileName: 'name.epub', phase: 'uploading' as const }
    const unknown = applyUploadEvent([first], { ...first, phase: 'status_unknown', jobId: 'same-job', issue: 'status_unknown', error: 'No connection' })
    const checking = applyUploadEvent(unknown, { ...first, phase: 'processing' })
    expect(checking).toHaveLength(1)
    expect(checking[0]).toMatchObject({ attemptId: 'attempt', jobId: 'same-job', phase: 'processing' })
    expect(checking[0].error).toBeUndefined()
    expect(checking[0].issue).toBeUndefined()
    const ready = applyUploadEvent(checking, { ...first, phase: 'complete', bookId: 'canonical', orderConfirmed: true })
    expect(ready[0]).toMatchObject({ bookId: 'canonical', orderConfirmed: true })
    expect(ready[0].issue).toBeUndefined()
  })
})
