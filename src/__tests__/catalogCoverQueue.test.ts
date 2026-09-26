import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { context, item, microtasks } from './catalogFixtures'
const cache = vi.hoisted(() => new Map<string, Blob>())
vi.mock('@/lib/catalogCache', () => ({
  getCatalogCover: vi.fn(async (scope: string, id: string, version: string) => cache.get(`${scope}:${id}:${version}`) ?? null),
  putCatalogCover: vi.fn(async (scope: string, id: string, version: string, blob: Blob) => { cache.set(`${scope}:${id}:${version}`, blob) }),
}))
vi.mock('@/lib/api', () => ({ getShareToken: () => null }))
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))
import { getCatalogCover } from '@/lib/catalogCache'
import { requestCatalogCover } from '@/lib/catalogCoverQueue'
const controllers: AbortController[] = []
const makeController = () => { const controller = new AbortController(); controllers.push(controller); return controller }
let calls: { url: string; signal: AbortSignal; resolve: (ok?: boolean) => void }[]
let live = 0, peak = 0
beforeEach(() => {
  vi.useFakeTimers(); cache.clear(); calls = []; live = 0; peak = 0
  vi.stubGlobal('fetch', vi.fn((url: string, options: RequestInit) => new Promise((resolve, reject) => {
    const signal = options.signal as AbortSignal; let done = false; live++; peak = Math.max(peak, live)
    const finish = () => { if (done) return false; done = true; live--; signal.removeEventListener('abort', abort); return true }
    const abort = () => { if (finish()) reject(new Error('aborted')) }
    signal.addEventListener('abort', abort, { once: true })
    calls.push({ url, signal, resolve: (ok = true) => { if (finish()) resolve(new Response(new Blob(['image'], { type: 'image/png' }), { status: ok ? 200 : 404, headers: { 'Content-Type': 'image/png' } })) } })
  })))
})
afterEach(async () => { for (const controller of controllers.splice(0)) controller.abort(); await tick(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })
const book = (id: string) => ({ ...item(id), cover: { url: `/api/v2/books/${id}/cover`, version: 'v1', width: null, height: null } })
const request = (id: string, controller = makeController(), scope = context) => requestCatalogCover(book(id), scope, false, controller.signal).catch(() => null)
async function tick() { await vi.advanceTimersByTimeAsync(0); await microtasks() }
async function drain() { for (let i = 0; i < 40; i++) { calls.forEach(call => call.resolve()); await tick() } }

describe('autonomous FIFO cover downloads', () => {
  it('downloads all 18 without card mounting, deduplicates subscribers and caps concurrency at four', async () => {
    const pending = Array.from({ length: 18 }, (_, i) => request(String(i)))
    const duplicate = request('0'); await tick()
    expect(calls.map(call => call.url)).toEqual(['0', '1', '2', '3'].map(id => `/api/v2/books/${id}/cover`))
    calls[2].resolve(); await tick(); expect(calls[4].url).toContain('/4/cover')
    await drain(); await Promise.all([...pending, duplicate])
    expect(calls).toHaveLength(18); expect(cache.size).toBe(18); expect(peak).toBe(4)
    await request('17'); expect(calls).toHaveLength(18)
  })
  it('starts the eight-second request timer only after a queue slot becomes available', async () => {
    const pending = Array.from({ length: 5 }, (_, i) => request(String(i)))
    await tick(); await vi.advanceTimersByTimeAsync(7000)
    calls[0].resolve(); await tick(); expect(calls).toHaveLength(5)
    await vi.advanceTimersByTimeAsync(1500)
    expect(calls[4].signal.aborted).toBe(false)
    calls[4].resolve(); await Promise.all(pending)
  })
  it('one failed cover releases its slot and does not stop the queue', async () => {
    const pending = Array.from({ length: 7 }, (_, i) => request(String(i)))
    await tick(); calls[0].resolve(false); await tick(); expect(calls).toHaveLength(5)
    await drain(); const results = await Promise.all(pending)
    expect(results[0]).toBeNull(); expect(results.slice(1).every(Boolean)).toBe(true)
  })
  it('cancelling one mounted subscriber leaves the shared shelf download alive', async () => {
    const owner = makeController(), card = makeController()
    const first = request('a', owner); const second = request('a', card)
    await tick(); card.abort(); await second
    expect(calls[0].signal.aborted).toBe(false)
    calls[0].resolve(); expect(await first).toBeInstanceOf(Blob)
  })
  it('scope disposal aborts running work and removes queued work before another account starts', async () => {
    const owner = makeController(); const pending = Array.from({ length: 8 }, (_, i) => request(String(i), owner))
    await tick(); owner.abort(); await Promise.all(pending); await tick()
    expect(calls).toHaveLength(4); expect(calls.every(call => call.signal.aborted)).toBe(true)
    const next = request('0', makeController(), { ...context, scopeKey: 'different-account' })
    await tick(); calls[4].resolve(); expect(await next).toBeInstanceOf(Blob)
    expect(cache.size).toBe(1)
  })
  it('a late valid cache read wins and cancels the redundant network request', async () => {
    let finish!: (blob: Blob) => void
    vi.mocked(getCatalogCover).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const pending = request('late'); await vi.advanceTimersByTimeAsync(151)
    expect(calls).toHaveLength(1)
    finish(new Blob(['cached'], { type: 'image/png' })); expect(await pending).toBeInstanceOf(Blob)
    expect(calls[0].signal.aborted).toBe(true)
  })
})
