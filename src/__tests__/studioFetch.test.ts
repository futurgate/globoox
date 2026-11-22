import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { studioFetch } from '@/lib/studioFetch';
import { bookGet } from '@/app/studio/_components/bookRequests';

vi.mock('@/lib/api', () => ({
  hasReaderSessionCookie: () => false,
  getStoredReaderAccessToken: () => 'fixture-account',
}));

const call = vi.fn<typeof fetch>();
const historyUrl = '/api/studio/recipe-runs?bookId=test&targetLang=EN';

beforeEach(() => {
  vi.useFakeTimers();
  call.mockReset();
  vi.stubGlobal('fetch', call);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('loads history on first open after a temporary browser network error', async () => {
  call.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(Response.json({ runs: [] }));
  const result = bookGet(historyUrl);
  await vi.advanceTimersByTimeAsync(500);
  await expect(result).resolves.toEqual({ runs: [] });
  expect(call).toHaveBeenCalledTimes(2);
  for (const [url, init] of call.mock.calls) {
    expect(url).toBe(historyUrl);
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer fixture-account');
  }
});

it('shows a Russian message when the proxy is still unavailable after a retry', async () => {
  call.mockImplementation(async () => Response.json({ error: 'Backend is unavailable' }, { status: 502 }));
  const result = expect(bookGet(historyUrl)).rejects.toThrow('Сервер временно недоступен.');
  await vi.advanceTimersByTimeAsync(500);
  await result;
  expect(call).toHaveBeenCalledTimes(2);
});

it('respects Retry-After and cancels recovery when leaving the page', async () => {
  const controller = new AbortController();
  call.mockResolvedValueOnce(new Response(null, { status: 503, headers: { 'Retry-After': '2' } }));
  const result = expect(bookGet(historyUrl, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  await vi.advanceTimersByTimeAsync(1500);
  controller.abort();
  await result;
  await vi.runAllTimersAsync();
  expect(call).toHaveBeenCalledTimes(1);
});

it('leaves a longer cooldown and an authorization failure to the caller', async () => {
  call.mockResolvedValueOnce(new Response(null, { status: 429, headers: { 'Retry-After': '120' } }))
    .mockResolvedValueOnce(Response.json({ error: 'Forbidden' }, { status: 403 }));
  expect((await studioFetch(historyUrl)).status).toBe(429);
  await expect(bookGet(historyUrl)).rejects.toThrow('Недостаточно прав');
  expect(call).toHaveBeenCalledTimes(2);
});

it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('does not resend %s after a network failure', async method => {
  call.mockRejectedValue(new TypeError('Load failed'));
  await expect(studioFetch('/api/translation-workspace/books/test/run', { method })).rejects.toThrow('Не удалось связаться');
  await vi.runAllTimersAsync();
  expect(call).toHaveBeenCalledTimes(1);
});
