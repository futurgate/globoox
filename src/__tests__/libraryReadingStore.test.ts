import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

let store: typeof import('@/lib/store').useAppStore;
const storage = new Map<string, string>();

beforeAll(async () => {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
  });
  store = (await import('@/lib/store')).useAppStore;
});

beforeEach(() => { store.setState({ progress: {} }); });
afterAll(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('library reading activity is distinct from server synchronization', () => {
  it('records genuine opening activity immediately and preserves it through a server refresh', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-16T12:00:00Z'));
    store.getState().touchLastRead('book');
    expect(store.getState().progress.book.localLastReadAt).toBe('2026-09-16T12:00:00.000Z');
    vi.setSystemTime(new Date('2026-09-16T12:05:00Z'));
    store.getState().updateServerProgress('book', { serverUpdatedAt: '2026-09-15T12:00:00Z', blockPosition: 50, totalBlocks: 100 });
    expect(store.getState().progress.book.lastRead).toBe('2026-09-16T12:00:00.000Z');
    expect(store.getState().progress.book.localLastReadAt).toBe('2026-09-16T12:00:00.000Z');
    expect(store.getState().progress.book.blockPosition).toBe(50);
  });

  it('does not turn fetching another book progress into a new reading event', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-16T12:05:00Z'));
    store.getState().updateServerProgress('remote', { serverUpdatedAt: '2026-09-10T12:00:00Z', blockPosition: 30 });
    expect(store.getState().progress.remote.lastRead).toBe('2026-09-10T12:00:00Z');
    expect(store.getState().progress.remote.localLastReadAt).toBeUndefined();
  });

  it('preserves genuine legacy activity when receiving the first server progress', () => {
    store.setState({ progress: { book: { lastRead: '2026-09-16T12:00:00Z' } } });
    store.getState().updateServerProgress('book', { serverUpdatedAt: '2026-09-10T12:00:00Z', scopeKey: 'account-a' });
    expect(store.getState().progress.book.localLastReadAt).toBe('2026-09-16T12:00:00Z');
    expect(store.getState().progress.book.localLastReadScope).toBe('account-a');
  });

  it('allows deliberate backward navigation to record new activity without maximizing the position', () => {
    store.getState().updateProgress('book', 90, 100);
    vi.setSystemTime(new Date('2026-09-16T12:06:00Z'));
    store.getState().updateProgress('book', 20, 100);
    expect(store.getState().progress.book.blockPosition).toBe(20);
    expect(store.getState().progress.book.localLastReadAt).toBe('2026-09-16T12:06:00.000Z');
  });
});
