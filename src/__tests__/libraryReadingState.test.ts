import { describe, expect, it, vi } from 'vitest';
import type { ApiBook } from '@/lib/api';
import {
  compareRecentlyReadBooks,
  createLibraryProgressQueue,
  localReadingTimestamp,
  mergeLibraryProgress,
  newestTimestamp,
  type LibraryProgressRow,
} from '@/lib/libraryReadingState';

const book = (id: string, created_at = '2026-09-01T00:00:00Z') => ({ id, created_at }) as ApiBook;
const time = (day: number) => `2026-09-${String(day).padStart(2, '0')}T00:00:00Z`;
const row = (updated_at: string, block_position: number): LibraryProgressRow => ({
  book_id: 'a', chapter_id: 'chapter', block_id: `block-${block_position}`, block_position,
  total_blocks: 100, content_version: 0, updated_at,
  server_updated_at: updated_at, idb_updated_at: updated_at,
});
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };

describe('library ordering across asynchronous updates', () => {
  it('uses saved timestamps immediately, with identical order before and after local hydration', () => {
    const books = [book('a'), book('b')];
    const rank = new Map([['a', 0], ['b', 1]]);
    const snapshot: Record<string, string> = { a: time(1), b: time(2) };
    const sort = (progress: Record<string, string>) => [...books].sort((a, b) =>
      compareRecentlyReadBooks(a, b, (id) => newestTimestamp(snapshot[id], progress[id]), rank)
    ).map((entry) => entry.id);
    expect(sort({})).toEqual(['b', 'a']);
    expect(sort({ a: time(1), b: time(2) })).toEqual(['b', 'a']);
    expect(sort({ a: time(1), b: time(2) })).toEqual(['b', 'a']);
  });

  it('keeps known equal-time books in place when UUIDs from a streamed tail sort earlier', () => {
    const rank = new Map([['z', 0], ['y', 1]]);
    const sorted = [book('z'), book('y'), book('a')].sort((a, b) => compareRecentlyReadBooks(a, b, () => null, rank));
    expect(sorted.map((entry) => entry.id)).toEqual(['z', 'y', 'a']);
  });

  it('allows a genuinely newer remote reading event to change the order', () => {
    const rank = new Map([['a', 0], ['b', 1]]);
    const times = { a: time(2), b: time(3) };
    expect([book('a'), book('b')].sort((a, b) => compareRecentlyReadBooks(a, b, (id) => times[id as keyof typeof times], rank)).map((entry) => entry.id)).toEqual(['b', 'a']);
  });

  it('preserves an explicit local reading event against an older server response', () => {
    const local = { lastRead: time(3), localLastReadAt: time(3), serverUpdatedAt: time(1) };
    expect(newestTimestamp(time(1), localReadingTimestamp(local))).toBe(time(3));
  });

  it('does not treat legacy background sync time as a reading event', () => {
    expect(localReadingTimestamp({ lastRead: time(9), serverUpdatedAt: time(1) })).toBeNull();
    expect(localReadingTimestamp({ lastRead: time(2) })).toBe(time(2));
  });

  it('does not borrow a reading event from another account for the same shared book', () => {
    const progress = { lastRead: time(3), localLastReadAt: time(3), localLastReadScope: 'account-a' };
    expect(localReadingTimestamp(progress, 'account-a')).toBe(time(3));
    expect(localReadingTimestamp(progress, 'account-b')).toBeNull();
  });

  it('rejects late old progress but permits deliberate backward navigation with a newer timestamp', () => {
    const current = row(time(3), 20);
    expect(mergeLibraryProgress(current, row(time(1), 80))).toBe(current);
    const reread = mergeLibraryProgress(current, row(time(4), 5));
    expect(reread.block_position).toBe(5);
    expect(reread.updated_at).toBe(time(4));
  });

  it('does not publish a different row for an identical position', () => {
    const current = row(time(2), 40);
    expect(mergeLibraryProgress(current, { ...current })).toBe(current);
  });
});

describe('library progress queue', () => {
  it('extends a running sweep without restarting reads and publishes only when coherent', async () => {
    const reads = new Map<string, ReturnType<typeof deferred<string>>>();
    const read = vi.fn((id: string) => { const task = deferred<string>(); reads.set(id, task); return task.promise; });
    const publish = vi.fn();
    const queue = createLibraryProgressQueue({ read, publish, concurrency: 2 });
    queue.enqueue(['a', 'b']);
    queue.enqueue(['a', 'b', 'c', 'd']);
    expect(read.mock.calls.map(([id]) => id)).toEqual(['a', 'b']);
    reads.get('a')!.resolve('A');
    await flush();
    expect(publish).not.toHaveBeenCalled();
    reads.get('b')!.resolve('B');
    await flush();
    expect(read.mock.calls.map(([id]) => id)).toEqual(['a', 'b', 'c', 'd']);
    expect(publish).not.toHaveBeenCalled();
    reads.get('c')!.resolve('C'); reads.get('d')!.resolve('D');
    await flush();
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish.mock.calls[0][0].map((result: { id: string }) => result.id)).toEqual(['a', 'b', 'c', 'd']);
    queue.enqueue(['a', 'b', 'c', 'd']);
    expect(read).toHaveBeenCalledTimes(4);
    queue.dispose();
  });

  it('does not apply late responses after leaving an account or progress version', async () => {
    const task = deferred<string>();
    let signal: AbortSignal | undefined;
    const publish = vi.fn();
    const queue = createLibraryProgressQueue({ read: (_id, nextSignal) => { signal = nextSignal; return task.promise; }, publish });
    queue.enqueue(['a']); queue.dispose();
    expect(signal?.aborted).toBe(true);
    task.resolve('old-account');
    await flush();
    expect(publish).not.toHaveBeenCalled();
  });

  it('keeps successful reads after one failure and retries the failed id only on a later enqueue', async () => {
    const read = vi.fn().mockResolvedValueOnce('A').mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce('B');
    const publish = vi.fn();
    const queue = createLibraryProgressQueue({ read, publish });
    queue.enqueue(['a', 'b']); await flush();
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish.mock.calls[0][0]).toEqual([{ id: 'a', value: 'A' }]);
    expect(read).toHaveBeenCalledTimes(2);
    queue.enqueue(['a', 'b']); await flush();
    expect(read).toHaveBeenCalledTimes(3);
    expect(publish.mock.calls[1][0]).toEqual([{ id: 'b', value: 'B' }]);
    queue.dispose();
  });
});
