import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/posthog', () => ({ trackApiRequest: vi.fn(), trackTranslateStreamClient: vi.fn() }));
import { fetchReadingPosition, positionCacheInvalidateAll, saveReadingPosition } from '@/lib/api';
import type { SaveReadingPositionRequest } from '@/lib/api';

const response = (value: unknown) => new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } });
const position = (day: number) => ({ book_id: 'shared-book', chapter_id: 'chapter', block_id: `block-${day}`, block_position: day, lang: 'en', updated_at: `2026-09-${day}T12:00:00Z` });

const at = (second: number) => `2026-09-26T12:00:${String(second).padStart(2, '0')}.000Z`;
const intent = (block: number, second = block): SaveReadingPositionRequest => ({
  chapter_id: 'chapter', block_id: `block-${block}`, block_position: block,
  sentence_index: block, lang: 'en', updated_at_client: at(second),
});
const acknowledgement = (bookId: string, block: number, second: number) => ({
  success: true, persisted: true, book_id: bookId, chapter_id: 'chapter',
  block_id: `block-${block}`, block_position: block, sentence_index: block,
  lang: 'en', updated_at: at(second),
});

function deferredTransport() {
  const calls: Array<{
    url: string;
    method: string;
    body: SaveReadingPositionRequest | undefined;
    finish: (value: unknown) => void;
  }> = [];
  const fetchMock = vi.fn((url: string | URL | Request, options?: RequestInit) => new Promise<Response>((resolve) => {
    calls.push({
      url: String(url),
      method: options?.method ?? 'GET',
      body: typeof options?.body === 'string' ? JSON.parse(options.body) : undefined,
      finish: (value) => resolve(response(value)),
    });
  }));
  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}

// Let already-scheduled transport/JSON microtasks finish without resolving any response.
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

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
    expect(new Headers(putOptions.headers).get('X-Reading-User')).toBe('account-a');
    expect(new Headers((fetchMock.mock.calls[2][1] as RequestInit).headers).get('X-Reading-User')).toBe('account-b');
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

describe('reading-position transport preserves the latest local intent', () => {
  it('serializes saves and rebases the queued timestamp on its own successful acknowledgement', async () => {
    const { calls, fetchMock } = deferredTransport();
    const bookId = 'serialized-book';
    // Reproduced live: a ~1200ms interval exceeds Reader throttling, but the
    // first PUT's server timestamp still arrives after the second local intent.
    const firstPayload = { ...intent(0, 0), updated_at_client: '2026-09-26T18:41:37.939Z' };
    const latestPayload = { ...intent(5, 1), updated_at_client: '2026-09-26T18:41:39.176Z' };
    const olderWriteServerTime = '2026-09-26T18:41:40.073Z';
    const firstSave = saveReadingPosition(bookId, firstPayload, 'serialized-account');
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    const latestSave = saveReadingPosition(bookId, latestPayload, 'serialized-account');
    await settle();
    expect(calls).toHaveLength(1);
    expect(calls[0].body).toEqual(firstPayload);

    calls[0].finish({ ...acknowledgement(bookId, 0, 2), updated_at: olderWriteServerTime });
    await firstSave;
    await vi.waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].method).toBe('PUT');
    expect(calls[1].body).toMatchObject({ ...latestPayload, updated_at_client: expect.any(String) });
    expect(Date.parse(calls[1].body?.updated_at_client ?? '')).toBeGreaterThanOrEqual(Date.parse(olderWriteServerTime));
    expect(latestPayload.updated_at_client).toBe('2026-09-26T18:41:39.176Z');

    calls[1].finish(acknowledgement(bookId, 5, 3));
    await latestSave;
    expect((await fetchReadingPosition(bookId, undefined, 'serialized-account')).block_position).toBe(5);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('coalesces unsent positions to the newest intent while settling every caller', async () => {
    const { calls } = deferredTransport();
    const bookId = 'coalesced-book';
    const saves = [saveReadingPosition(bookId, intent(0, 0), 'coalesced-account')];
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    saves.push(saveReadingPosition(bookId, intent(1, 1), 'coalesced-account'));
    saves.push(saveReadingPosition(bookId, intent(2, 2), 'coalesced-account'));
    saves.push(saveReadingPosition(bookId, intent(5, 3), 'coalesced-account'));
    await settle();
    expect(calls).toHaveLength(1);

    calls[0].finish(acknowledgement(bookId, 0, 4));
    await vi.waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].body?.block_position).toBe(5);
    expect(calls[1].body?.sentence_index).toBe(5);
    calls[1].finish(acknowledgement(bookId, 5, 5));
    const results = await Promise.all(saves);
    expect(results).toHaveLength(4);
    expect(results[0].persisted).toBe(true);
    expect(results[1]).toMatchObject({ success: true, persisted: false });
    expect(results[2]).toMatchObject({ success: true, persisted: false });
    expect(results[3].persisted).toBe(true);
    await settle();
    expect(calls).toHaveLength(2);
    expect((await fetchReadingPosition(bookId, undefined, 'coalesced-account')).block_position).toBe(5);
  });

  it('allows different account scopes for the same book to save independently', async () => {
    const { calls, fetchMock } = deferredTransport();
    const bookId = 'parallel-shared-book';
    const saveA = saveReadingPosition(bookId, intent(1, 1), 'parallel-account-a');
    const saveB = saveReadingPosition(bookId, intent(8, 2), 'parallel-account-b');
    await vi.waitFor(() => expect(calls).toHaveLength(2));
    const callA = calls.find((call) => call.body?.block_position === 1)!;
    const callB = calls.find((call) => call.body?.block_position === 8)!;
    callB.finish(acknowledgement(bookId, 8, 3));
    await saveB;
    expect((await fetchReadingPosition(bookId, undefined, 'parallel-account-b')).block_position).toBe(8);
    callA.finish(acknowledgement(bookId, 1, 4));
    await saveA;
    expect((await fetchReadingPosition(bookId, undefined, 'parallel-account-a')).block_position).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not let a GET started before a newer save replace the saved position cache', async () => {
    const { calls, fetchMock } = deferredTransport();
    const bookId = 'late-get-book';
    const staleGet = fetchReadingPosition(bookId, undefined, 'late-get-account');
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    const save = saveReadingPosition(bookId, intent(5, 1), 'late-get-account');
    await vi.waitFor(() => expect(calls).toHaveLength(2));
    expect(calls.map((call) => call.method)).toEqual(['GET', 'PUT']);
    calls[1].finish(acknowledgement(bookId, 5, 2));
    await save;
    calls[0].finish({ ...position(10), book_id: bookId, block_id: 'block-0', block_position: 0, updated_at: at(0) });
    await staleGet;

    expect((await fetchReadingPosition(bookId, undefined, 'late-get-account')).block_position).toBe(5);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry stale_client or rebase a queued intent on another device timestamp', async () => {
    const { calls } = deferredTransport();
    const bookId = 'external-stale-book';
    const firstSave = saveReadingPosition(bookId, intent(0, 0), 'external-stale-account');
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    const latestPayload = intent(5, 1);
    const latestSave = saveReadingPosition(bookId, latestPayload, 'external-stale-account');
    calls[0].finish({ success: true, persisted: false, reason: 'stale_client', updated_at: at(9) });
    expect(await firstSave).toMatchObject({ persisted: false, reason: 'stale_client' });
    await vi.waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].body).toEqual(latestPayload);
    calls[1].finish({ success: true, persisted: false, reason: 'stale_client', updated_at: at(9) });
    expect(await latestSave).toMatchObject({ persisted: false, reason: 'stale_client' });
    await settle();
    expect(calls).toHaveLength(2);
  });

  it('keeps one save queue when a later caller takes over after cache invalidation', async () => {
    const { calls } = deferredTransport();
    const bookId = 'new-caller-book';
    const scope = 'new-caller-account';
    const firstReaderSave = () => saveReadingPosition(bookId, intent(0, 0), scope);
    const laterReaderSave = () => saveReadingPosition(bookId, intent(5, 1), scope);
    const firstSave = firstReaderSave();
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    positionCacheInvalidateAll();
    const laterSave = laterReaderSave();
    await settle();
    expect(calls).toHaveLength(1);
    calls[0].finish(acknowledgement(bookId, 0, 2));
    await firstSave;
    await vi.waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].body?.block_position).toBe(5);
    calls[1].finish(acknowledgement(bookId, 5, 3));
    await laterSave;
    expect((await fetchReadingPosition(bookId, undefined, scope)).block_position).toBe(5);
  });
});
