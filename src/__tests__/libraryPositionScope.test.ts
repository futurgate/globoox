import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/posthog', () => ({ trackApiRequest: vi.fn(), trackTranslateStreamClient: vi.fn() }));
import { fetchReadingPosition, positionCacheInvalidateAll, saveReadingPosition } from '@/lib/api';

const response = (value: unknown) => new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } });
const position = (day: number) => ({ book_id: 'shared-book', chapter_id: 'chapter', block_id: `block-${day}`, block_position: day, lang: 'en', updated_at: `2026-09-${day}T12:00:00Z` });

beforeEach(() => { positionCacheInvalidateAll(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('reading-position cache belongs to the account, not just the book', () => {
  it('does not serve account A reading activity to account B for a shared book ID', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response(position(10))).mockResolvedValueOnce(response(position(12)));
    vi.stubGlobal('fetch', fetchMock);
    expect((await fetchReadingPosition('shared-book', undefined, 'account-a')).block_position).toBe(10);
    expect((await fetchReadingPosition('shared-book', undefined, 'account-b')).block_position).toBe(12);
    expect((await fetchReadingPosition('shared-book', undefined, 'account-a')).block_position).toBe(10);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps save acknowledgements scoped while preserving existing wire payloads', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(position(10)))
      .mockResolvedValueOnce(response({ ...position(16), success: true, persisted: true }))
      .mockResolvedValueOnce(response(position(12)));
    vi.stubGlobal('fetch', fetchMock);
    await fetchReadingPosition('shared-book', undefined, 'account-a');
    const payload = { chapter_id: 'chapter', block_id: 'block-16', block_position: 16, lang: 'en' };
    await saveReadingPosition('shared-book', payload, 'account-a');
    expect((await fetchReadingPosition('shared-book', undefined, 'account-a')).block_position).toBe(16);
    expect((await fetchReadingPosition('shared-book', undefined, 'account-b')).block_position).toBe(12);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const putOptions = fetchMock.mock.calls[1][1] as RequestInit;
    expect(putOptions.method).toBe('PUT');
    expect(JSON.parse(putOptions.body as string)).toEqual(payload);
  });

  it('invalidates only the saving account and fetches authoritative data after stale_client', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(position(10)))
      .mockResolvedValueOnce(response(position(12)))
      .mockResolvedValueOnce(response({ success: true, persisted: false, reason: 'stale_client' }))
      .mockResolvedValueOnce(response(position(16)));
    vi.stubGlobal('fetch', fetchMock);
    await fetchReadingPosition('shared-book', undefined, 'account-a');
    await fetchReadingPosition('shared-book', undefined, 'account-b');
    await saveReadingPosition('shared-book', { chapter_id: 'chapter' }, 'account-a');
    expect((await fetchReadingPosition('shared-book', undefined, 'account-b')).block_position).toBe(12);
    expect((await fetchReadingPosition('shared-book', undefined, 'account-a')).block_position).toBe(16);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
