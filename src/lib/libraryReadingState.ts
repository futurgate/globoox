import type { ApiBook, BookReadingProgress } from './api';

export type LibraryProgressRow = BookReadingProgress & {
  server_updated_at?: string | null;
  idb_updated_at?: string | null;
};

export function timestampMs(value: string | null | undefined): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

export function newestTimestamp(...values: Array<string | null | undefined>): string | null {
  let latest: string | null = null;
  for (const value of values) {
    if (timestampMs(value) > timestampMs(latest)) latest = value ?? null;
  }
  return latest;
}

export function sameBookOrder(a: readonly string[] | null | undefined, b: readonly string[] | null | undefined): boolean {
  if (!a || !b) return a === b;
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export function mergeLibraryProgress(existing: LibraryProgressRow | undefined, incoming: LibraryProgressRow): LibraryProgressRow {
  const serverUpdated = newestTimestamp(existing?.server_updated_at, incoming.server_updated_at ?? incoming.updated_at);
  const idbUpdated = newestTimestamp(existing?.idb_updated_at, incoming.idb_updated_at ?? incoming.updated_at);
  const source = !existing || timestampMs(incoming.updated_at) >= timestampMs(existing.updated_at) ? incoming : existing;
  const next = {
    ...source,
    server_updated_at: serverUpdated,
    idb_updated_at: idbUpdated,
    updated_at: newestTimestamp(serverUpdated, idbUpdated, existing?.updated_at, incoming.updated_at),
  };
  if (existing && Object.keys(next).every((key) => existing[key as keyof LibraryProgressRow] === next[key as keyof LibraryProgressRow])) return existing;
  return next;
}

/** Only explicit reading actions may outrank a server timestamp. Legacy store
 * entries with serverUpdatedAt also contain lastRead set by background sync. */
export function localReadingTimestamp(progress: {
  lastRead?: string;
  localLastReadAt?: string;
  localLastReadScope?: string;
  serverUpdatedAt?: string;
} | undefined, scopeKey?: string): string | null {
  if (!progress) return null;
  if (progress.localLastReadAt && scopeKey && progress.localLastReadScope !== scopeKey) return null;
  return progress.localLastReadAt ?? (progress.serverUpdatedAt ? null : progress.lastRead ?? null);
}

export function progressBelongsToScope(progress: {
  serverProgressScope?: string;
  localLastReadScope?: string;
} | undefined, scopeKey: string): boolean {
  const owner = progress?.serverProgressScope ?? progress?.localLastReadScope;
  // Existing unscoped persisted entries remain compatible. New scoped entries
  // cannot provide another account's progress while its IDB/network read runs.
  return !owner || owner === scopeKey;
}

export function compareRecentlyReadBooks(
  a: ApiBook,
  b: ApiBook,
  lastRead: (id: string) => string | null,
  previousRank: ReadonlyMap<string, number>,
): number {
  const aTime = timestampMs(lastRead(a.id));
  const bTime = timestampMs(lastRead(b.id));
  if (aTime !== bTime) return aTime > bTime ? -1 : 1;
  // Stable for books with no activity, and for equal timestamps. A streamed
  // tail must not reorder existing cards merely because UUIDs differ.
  const aRank = previousRank.get(a.id);
  const bRank = previousRank.get(b.id);
  if (aRank != null || bRank != null) {
    if (aRank == null) return 1;
    if (bRank == null) return -1;
    if (aRank !== bRank) return aRank - bRank;
  }
  const createdA = timestampMs(a.created_at);
  const createdB = timestampMs(b.created_at);
  if (createdA !== createdB) return createdA > createdB ? -1 : 1;
  return a.id.localeCompare(b.id);
}

/** A scope/version owns one queue. Appending a stream batch extends the queue
 * instead of aborting work already in flight. Each drained sweep is published
 * together; dispose prevents late responses from publishing into a new scope. */
export function createLibraryProgressQueue<T>(options: {
  read: (id: string, signal: AbortSignal) => Promise<T>;
  publish: (results: Array<{ id: string; value: T }>) => void;
  concurrency?: number;
}) {
  const controller = new AbortController();
  const queued = new Set<string>();
  const requested = new Set<string>();
  let running = false;

  const drain = async () => {
    if (running || controller.signal.aborted) return;
    running = true;
    const results: Array<{ id: string; value: T }> = [];
    try {
      while (queued.size && !controller.signal.aborted) {
        const ids = [...queued].slice(0, Math.max(1, options.concurrency ?? 4));
        ids.forEach((id) => queued.delete(id));
        const batch = await Promise.all(ids.map(async (id) => {
          try {
            return { id, value: await options.read(id, controller.signal) };
          } catch {
            // A later enqueue can retry a failed read. Do not spin while offline.
            requested.delete(id);
            return null;
          }
        }));
        for (const result of batch) if (result) results.push(result);
      }
      if (!controller.signal.aborted && results.length) options.publish(results);
    } finally {
      running = false;
    }
  };

  return {
    enqueue(ids: readonly string[]) {
      if (controller.signal.aborted) return;
      for (const id of ids) {
        if (requested.has(id)) continue;
        requested.add(id);
        queued.add(id);
      }
      void drain();
    },
    dispose() {
      controller.abort();
      queued.clear();
    },
  };
}
