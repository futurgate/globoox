import { describe, expect, it, vi } from 'vitest'
import { createReadingActivityQueue } from '@/lib/readingActivity'
import type { CatalogContext } from '@/lib/catalogTypes'

class MemoryStorage implements Storage {
  values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

const BOOK = '11111111-1111-4111-8111-111111111111'
const SECOND = '22222222-2222-4222-8222-222222222222'
const scope = (name = 'user:a::share-none'): CatalogContext => ({
  scopeKey: name, userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', guestId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  shareToken: null, headers: { 'X-Catalog-User': 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
})
const context = scope()
const controller = () => new AbortController()
const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(yes => { resolve = yes })
  return { promise, resolve }
}
const tick = async () => { for (let i = 0; i < 10; i++) await Promise.resolve() }
const body = (init?: RequestInit) => JSON.parse(String(init?.body)) as {
  events: Array<{ event_id: string; book_id: string; occurred_at: string; age_ms: number }>
}
const ack = (init?: RequestInit, version = '1', key = context.scopeKey) => new Response(JSON.stringify({
  scope_key: key, activity_version: version, acknowledged_event_ids: body(init).events.map(event => event.event_id),
}), { status: 200, headers: { 'Content-Type': 'application/json' } })
let sequence = 0
function fixture(storage = new MemoryStorage(), wall = Date.parse('2026-09-25T12:00:00Z')) {
  const clock = { wall, monotonic: 100 }
  const fetcher = vi.fn<typeof fetch>(async (_url, init) => ack(init))
  const queue = createReadingActivityQueue({
    storage: () => storage, wallNow: () => clock.wall, monotonicNow: () => clock.monotonic,
    randomId: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`, fetch: fetcher,
  })
  return { queue, clock, storage, fetcher }
}

describe('Reader readiness and real activity', () => {
  it('does not record unopened/unready/empty pages, and deduplicates StrictMode readiness even after ACK', async () => {
    const { queue, fetcher } = fixture()
    expect(queue.recordVisible(context, BOOK, 'session', 'chapter:block', false)).toBeNull()
    expect(queue.recordVisible(context, BOOK, 'session', '', true)).toBeNull()
    expect(queue.getPendingRecency(context.scopeKey)).toEqual({})
    expect(queue.recordVisible(context, BOOK, 'session', 'chapter:block', true)?.durable).toBe(true)
    await queue.flush(context, controller().signal)
    expect(queue.recordVisible(context, BOOK, 'session', 'chapter:block', true)).toBeNull()
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(queue.getPendingRecency(context.scopeKey)).toEqual({})
  })

  it('throttles changed positions but allows subsequent backward reading and new visits', async () => {
    const { queue, clock, fetcher } = fixture()
    queue.recordVisible(context, BOOK, 'session', 'chapter:block-20', true)
    clock.monotonic += 1_000
    expect(queue.recordVisible(context, BOOK, 'session', 'chapter:block-21', true)).toBeNull()
    clock.monotonic += 30_000
    expect(queue.recordVisible(context, BOOK, 'session', 'chapter:block-5', true)).not.toBeNull()
    expect(queue.recordVisible(context, BOOK, 'next-visit', 'chapter:block-5', true)).not.toBeNull()
    await queue.flush(context, controller().signal)
    expect(body(fetcher.mock.calls[0][1]).events).toHaveLength(3)
  })
})

describe('durable event occurrence and clock policy', () => {
  it('retries a lost acknowledgement with the same ID and original occurrence, not retry time', async () => {
    const { queue, clock, fetcher } = fixture()
    const event = queue.enqueue(context, BOOK)
    fetcher.mockRejectedValueOnce(new Error('connection lost after server commit'))
    await expect(queue.flush(context, controller().signal)).rejects.toThrow('connection lost')
    clock.wall += 60_000
    clock.monotonic += 60_000
    await queue.flush(context, controller().signal)
    const first = body(fetcher.mock.calls[0][1]).events[0]
    const retried = body(fetcher.mock.calls[1][1]).events[0]
    expect(retried).toEqual({ ...first, event_id: event.eventId, age_ms: 60_000 })
    expect(queue.getPendingRecency(context.scopeKey)).toEqual({})
  })

  it('restores a pending event after reload and preserves its elapsed offline age', async () => {
    const first = fixture()
    const event = first.queue.enqueue(context, BOOK)
    const reloaded = fixture(first.storage, first.clock.wall + 86_400_000)
    await reloaded.queue.flush(context, controller().signal)
    expect(body(reloaded.fetcher.mock.calls[0][1]).events[0]).toMatchObject({ event_id: event.eventId, age_ms: 86_400_000 })
    expect(reloaded.queue.getVersion(context.scopeKey)).toBe('1')
  })

  it('cancels constant device clock offsets and uses monotonic age through an in-page clock change', async () => {
    const ahead = fixture(undefined, Date.parse('2026-10-25T12:00:00Z'))
    const behind = fixture(undefined, Date.parse('2026-08-25T12:00:00Z'))
    for (const f of [ahead, behind]) {
      f.queue.enqueue(context, BOOK)
      f.clock.wall -= 10_000_000
      f.clock.monotonic += 2345
      await f.queue.flush(context, controller().signal)
      expect(body(f.fetcher.mock.calls[0][1]).events[0].age_ms).toBe(2345)
    }
    expect(body(ahead.fetcher.mock.calls[0][1]).events[0].occurred_at)
      .not.toBe(body(behind.fetcher.mock.calls[0][1]).events[0].occurred_at)
  })

  it.each([-1, 31 * 86_400_000])('preserves invalid reloaded age %s without promoting it to current activity', async elapsed => {
    const first = fixture()
    first.queue.enqueue(context, BOOK)
    const next = fixture(first.storage, first.clock.wall + elapsed)
    await expect(next.queue.flush(context, controller().signal)).rejects.toMatchObject({ kind: 'clock' })
    expect(next.fetcher).not.toHaveBeenCalled()
    expect(Object.keys(next.queue.getPendingRecency(context.scopeKey))).toEqual([BOOK])
  })
})

describe('acknowledgements, scope and races', () => {
  it('never flushes another account or share scope, and keeps tokens out of durable storage', async () => {
    const { queue, fetcher, storage } = fixture()
    const other = { ...scope('user:b::different-share'), shareToken: 'private-token', headers: { 'X-Catalog-User': 'b' } }
    queue.enqueue(context, BOOK)
    queue.enqueue(other, SECOND)
    await queue.flush(context, controller().signal)
    expect(body(fetcher.mock.calls[0][1]).events.map(event => event.book_id)).toEqual([BOOK])
    expect(queue.getPendingRecency(other.scopeKey)).toHaveProperty(SECOND)
    expect(JSON.stringify([...storage.values])).not.toContain('private-token')
  })

  it('rejects an acknowledgement from another scope without deleting the pending event', async () => {
    const { queue, fetcher } = fixture()
    queue.enqueue(context, BOOK)
    fetcher.mockImplementationOnce(async (_url, init) => ack(init, '1', 'other-account'))
    await expect(queue.flush(context, controller().signal)).rejects.toMatchObject({ kind: 'auth' })
    expect(queue.getPendingRecency(context.scopeKey)).toHaveProperty(BOOK)
  })

  it.each([401, 403])('treats HTTP %s as an identity failure instead of offline mode', async status => {
    const { queue, fetcher } = fixture()
    queue.enqueue(context, BOOK)
    fetcher.mockResolvedValueOnce(new Response('{}', { status }))
    await expect(queue.flush(context, controller().signal)).rejects.toMatchObject({ kind: 'auth', status })
    expect(queue.getPendingRecency(context.scopeKey)).toHaveProperty(BOOK)
  })

  it.each(['not json', 'null', JSON.stringify({ scope_key: context.scopeKey, activity_version: '1', acknowledged_event_ids: [] })])(
    'keeps malformed or empty acknowledgements out of connectivity fallback (%s)', async response => {
      const { queue, fetcher } = fixture()
      queue.enqueue(context, BOOK)
      fetcher.mockResolvedValueOnce(new Response(response))
      await expect(queue.flush(context, controller().signal)).rejects.toMatchObject({ kind: 'response' })
      expect(queue.getPendingRecency(context.scopeKey)).toHaveProperty(BOOK)
    })

  it.each([404, 405, 503])('distinguishes absent activity route/migration (%s) from an offline network', async status => {
    const { queue, fetcher } = fixture()
    queue.enqueue(context, BOOK)
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ data: { code: 'migration_required' } }), { status }))
    await expect(queue.flush(context, controller().signal)).rejects.toMatchObject({ kind: 'deployment', status })
    expect(queue.getPendingRecency(context.scopeKey)).toHaveProperty(BOOK)
  })

  it('removes only acknowledged IDs and retains a monotonic version beyond JS integer precision', async () => {
    const { queue, fetcher } = fixture()
    const first = queue.enqueue(context, BOOK)
    queue.enqueue(context, SECOND)
    fetcher.mockImplementationOnce(async () => new Response(JSON.stringify({ scope_key: context.scopeKey,
      activity_version: '90071992547409930', acknowledged_event_ids: [first.eventId] })))
    fetcher.mockImplementationOnce(async (_url, init) => ack(init, '90071992547409929'))
    expect(await queue.flush(context, controller().signal)).toBe('90071992547409930')
    expect(body(fetcher.mock.calls[1][1]).events.map(event => event.book_id)).toEqual([SECOND])
    expect(queue.getPendingRecency(context.scopeKey)).toEqual({})
  })

  it('shares duplicate flushes; one caller cancelling does not cancel another caller', async () => {
    const { queue, fetcher } = fixture()
    const gate = deferred<Response>()
    fetcher.mockImplementationOnce(() => gate.promise)
    queue.enqueue(context, BOOK)
    const first = controller()
    const second = controller()
    const a = queue.flush(context, first.signal)
    const b = queue.flush(context, second.signal)
    await tick()
    first.abort()
    await expect(a).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(false)
    gate.resolve(ack(fetcher.mock.calls[0][1]))
    expect(await b).toBe('1')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('ignores a late aborted acknowledgement and safely retries the same event', async () => {
    const { queue, fetcher } = fixture()
    const gate = deferred<Response>()
    fetcher.mockImplementationOnce(() => gate.promise)
    const event = queue.enqueue(context, BOOK)
    const abort = controller()
    const task = queue.flush(context, abort.signal)
    await tick()
    abort.abort()
    await expect(task).rejects.toMatchObject({ name: 'AbortError' })
    gate.resolve(ack(fetcher.mock.calls[0][1]))
    await tick()
    expect(queue.getPendingRecency(context.scopeKey)).toHaveProperty(BOOK)
    await queue.flush(context, controller().signal)
    expect(body(fetcher.mock.calls[1][1]).events[0].event_id).toBe(event.eventId)
  })

  it('includes an event queued during a pending flush before returning the causal barrier', async () => {
    const { queue, fetcher } = fixture()
    const gate = deferred<Response>()
    fetcher.mockImplementationOnce(() => gate.promise)
    queue.enqueue(context, BOOK)
    const task = queue.flush(context, controller().signal)
    await tick()
    queue.enqueue(context, SECOND)
    gate.resolve(ack(fetcher.mock.calls[0][1]))
    await task
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(body(fetcher.mock.calls[1][1]).events.map(event => event.book_id)).toEqual([SECOND])
  })

  it('bounds batches at 32 and does not lose events from another tab', async () => {
    const first = fixture()
    const second = fixture(first.storage)
    for (let i = 0; i < 33; i++) first.queue.enqueue(context, BOOK)
    for (let i = 0; i < 32; i++) second.queue.enqueue(context, SECOND)
    await first.queue.flush(context, controller().signal)
    expect(first.fetcher.mock.calls.map(([, init]) => body(init).events.length)).toEqual([32, 32, 1])
    expect(first.queue.getPendingRecency(context.scopeKey)).toEqual({})
  })

  it('keeps a damaged outbox record for diagnosis instead of silently acknowledging its loss', async () => {
    const { queue, fetcher, storage } = fixture()
    queue.enqueue(context, BOOK)
    const key = [...storage.values.keys()].find(value => value.includes(':event:'))!
    storage.setItem(key, '{damaged')
    await expect(queue.flush(context, controller().signal)).rejects.toMatchObject({ kind: 'storage' })
    expect(storage.getItem(key)).toBe('{damaged')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('keeps online delivery usable when storage rejects a write, without claiming durability', async () => {
    const { queue, storage } = fixture()
    vi.spyOn(storage, 'setItem').mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError') })
    expect(queue.enqueue(context, BOOK).durable).toBe(false)
    expect(queue.getStorageError()).not.toBeNull()
    expect(await queue.flush(context, controller().signal)).toBe('1')
    expect(queue.getPendingRecency(context.scopeKey)).toEqual({})
  })
})
