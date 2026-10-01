import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/posthog', () => ({ trackApiRequest: vi.fn(), trackTranslateStreamClient: vi.fn() }))
vi.mock('@/lib/contentCache', () => ({ setCachedBookMeta: vi.fn() }))
import { getJobStatus, waitForBookJob } from '@/lib/api'
import { item } from './catalogFixtures'

const json = (value: unknown) => Response.json(value)
const completed = { state: 'completed', progress: 100, result: { bookId: 'canonical-book', chapterCount: 7 } }
const tick = async () => { for (let i = 0; i < 12; i++) await Promise.resolve() }
let fetcher: ReturnType<typeof vi.fn<typeof fetch>>
beforeEach(() => { vi.useFakeTimers(); fetcher = vi.fn<typeof fetch>(); vi.stubGlobal('fetch', fetcher) })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('queued EPUB polling belongs to the upload lifetime', () => {
 it('reports progressive book snapshots but only completes after the job and ordering receipt', async () => {
  const book = { ...item('canonical-book'), metadata_ready: true, processing_status: 'ready' }
  fetcher.mockResolvedValueOnce(json({ state: 'active', book, progress: 90 })).mockResolvedValueOnce(json({ ...completed, book, order_confirmed: true }))
  const onBook = vi.fn(), done = vi.fn()
  const run = waitForBookJob('progressive', undefined, undefined, onBook).then(done)
  await tick()
  expect(done).not.toHaveBeenCalled()
  expect(onBook).toHaveBeenCalledWith(book)
  await vi.advanceTimersByTimeAsync(2000)
  await run
  expect(done).toHaveBeenCalledWith({ bookId: 'canonical-book', chapterCount: 7, book, orderConfirmed: true })
 })
 it('preserves completed content and reports its unconfirmed order separately', async () => {
  fetcher.mockResolvedValueOnce(json({ ...completed, order_confirmed: false }))
  await expect(waitForBookJob('unconfirmed')).resolves.toMatchObject({ bookId: 'canonical-book', orderConfirmed: false })
  expect(fetcher).toHaveBeenCalledTimes(1)
 })
 it('passes a request signal and bypasses response/inflight caches for fresh job status', async () => {
  fetcher.mockResolvedValueOnce(json({ state: 'waiting', progress: 0 })).mockResolvedValueOnce(json({ state: 'active', progress: 30 }))
  const controller = new AbortController()
  expect((await getJobStatus('same-job', controller.signal)).state).toBe('waiting')
  expect((await getJobStatus('same-job', controller.signal)).state).toBe('active')
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(fetcher.mock.calls[0][1]).toMatchObject({ signal: controller.signal, cache: 'no-store' })
 })
 it('waits through queue states and returns the final canonical ID with worker progress', async () => {
  fetcher.mockResolvedValueOnce(json({ state: 'waiting', progress: 0 }))
    .mockResolvedValueOnce(json({ state: 'active', progress: 45 }))
    .mockResolvedValueOnce(json(completed))
  const progress = vi.fn()
  const run = waitForBookJob('queue-states', undefined, progress)
  await vi.advanceTimersByTimeAsync(2000)
  expect(fetcher).toHaveBeenCalledTimes(2)
  await vi.advanceTimersByTimeAsync(2000)
  expect(await run).toEqual({ bookId: 'canonical-book', chapterCount: 7, orderConfirmed: true })
  expect(progress.mock.calls.map(call => call[0])).toEqual([0, 45, 100])
  expect(vi.getTimerCount()).toBe(0)
 })
 it.each([{ state: 'failed', failReason: 'Parse rejected', expected: 'Parse rejected' }, { state: 'completed', expected: 'invalid result' }])('does not publish $state without a valid completion', async status => {
  fetcher.mockResolvedValue(json(status))
  await expect(waitForBookJob('bad-result')).rejects.toThrow(status.expected)
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(vi.getTimerCount()).toBe(0)
 })
 it('does not start a request for an already unmounted attempt', async () => {
  const controller = new AbortController(); controller.abort()
  await expect(waitForBookJob('already-aborted', controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  expect(fetcher).not.toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(0)
 })
 it('aborts during a polling interval without sending another request', async () => {
  fetcher.mockResolvedValue(json({ state: 'active', progress: 20 }))
  const controller = new AbortController()
  const run = waitForBookJob('interval-abort', controller.signal)
  const rejected = expect(run).rejects.toMatchObject({ name: 'AbortError' })
  await tick(); controller.abort(); await rejected
  await vi.advanceTimersByTimeAsync(10_000)
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(vi.getTimerCount()).toBe(0)
 })
 it('a late response after unmount cannot resume polling or report completion', async () => {
  let release!: (value: Response) => void
  fetcher.mockReturnValue(new Promise(resolve => { release = resolve }))
  const controller = new AbortController(), progress = vi.fn()
  const run = waitForBookJob('late-abort', controller.signal, progress)
  const rejected = expect(run).rejects.toMatchObject({ name: 'AbortError' })
  await tick(); controller.abort(); await rejected
  expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true)
  release(json(completed)); await tick(); await vi.advanceTimersByTimeAsync(10_000)
  expect(progress).not.toHaveBeenCalled(); expect(fetcher).toHaveBeenCalledTimes(1)
 })
 it.each(['headers', 'body'])('bounds a hung %s by the same five-minute deadline', async part => {
  const never = new Promise<Response>(() => {})
  fetcher.mockImplementation(async () => part === 'headers' ? never : ({ ok: true, status: 200, headers: new Headers(), json: () => never }) as unknown as Response)
  const run = waitForBookJob('hung-' + part)
  const rejected = expect(run).rejects.toThrow('timed out')
  await vi.advanceTimersByTimeAsync(5 * 60 * 1000)
  await rejected
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true)
  expect(vi.getTimerCount()).toBe(0)
 })
 it('does not share one attempt cancellation with another poll for the same job', async () => {
  const releases: ((response: Response) => void)[] = []
  fetcher.mockImplementation(() => new Promise(resolve => releases.push(resolve)))
  const a = new AbortController(), b = new AbortController()
  const first = waitForBookJob('shared-job', a.signal), second = waitForBookJob('shared-job', b.signal)
  const rejected = expect(first).rejects.toMatchObject({ name: 'AbortError' })
  await tick(); expect(fetcher).toHaveBeenCalledTimes(2)
  a.abort(); await rejected
  expect(fetcher.mock.calls[1][1]?.signal?.aborted).toBe(false)
  releases[1](json(completed)); expect(await second).toEqual({ bookId: 'canonical-book', chapterCount: 7, orderConfirmed: true })
  releases[0](json(completed)); await tick()
  expect(vi.getTimerCount()).toBe(0)
 })
})


describe('upload outcomes separate unavailable status from confirmed processing failure', () => {
 it.each([500, 502, 404, 401, 403])('classifies HTTP %s without pretending the EPUB failed', async status => {
  fetcher.mockResolvedValueOnce(Response.json({ message: 'Synthetic transport response' }, { status }))
  const kind = status === 404 ? 'job_not_found' : status === 401 ? 'auth_required' : status === 403 ? 'forbidden' : 'status_unknown'
  await expect(waitForBookJob('same-job')).rejects.toMatchObject({ kind, jobId: 'same-job' })
  expect(fetcher).toHaveBeenCalledTimes(1)
 })
 it('resumes a known job after a transient network failure without creating a new upload', async () => {
  fetcher.mockRejectedValueOnce(new TypeError('Failed to fetch'))
  await expect(waitForBookJob('resume-this-job')).rejects.toMatchObject({ kind: 'status_unknown', jobId: 'resume-this-job' })
  fetcher.mockResolvedValueOnce(json({ state: 'active', progress: 70 })).mockResolvedValueOnce(json(completed))
  const retry = waitForBookJob('resume-this-job')
  await vi.advanceTimersByTimeAsync(2000)
  await expect(retry).resolves.toMatchObject({ bookId: 'canonical-book', orderConfirmed: true })
  expect(fetcher.mock.calls.map(call => String(call[0]))).toEqual(Array(3).fill('/api/jobs/resume-this-job'))
 })
 it('preserves a ready canonical snapshot when ordering ultimately fails', async () => {
  const book = { ...item('canonical-book'), metadata_ready: true, processing_status: 'ready' }
  fetcher.mockResolvedValueOnce(json({ state: 'failed', failReason: 'Ordering unavailable', book, order_confirmed: false }))
  await expect(waitForBookJob('ready-failed-order')).resolves.toMatchObject({ bookId: 'canonical-book', book, orderConfirmed: false })
 })
 it('does not attach metadata from a replaced pending ID to a canonical completion', async () => {
  const pending = { ...item('pending-id'), metadata_ready: true, processing_status: 'processing' }
  fetcher.mockResolvedValueOnce(json({ state: 'active', book: pending, progress: 30 }))
    .mockResolvedValueOnce(json(completed))
  const run = waitForBookJob('canonical-remap')
  await vi.advanceTimersByTimeAsync(2000)
  await expect(run).resolves.toEqual({ bookId: 'canonical-book', chapterCount: 7, orderConfirmed: true })
 })
 it('does not downgrade ready content if the following ordering status request loses connection', async () => {
  const book = { ...item('canonical-book'), metadata_ready: true, processing_status: 'ready' }
  fetcher.mockResolvedValueOnce(json({ state: 'active', progress: 99, book }))
    .mockRejectedValueOnce(new TypeError('Failed to fetch'))
  const run = waitForBookJob('ready-network')
  await vi.advanceTimersByTimeAsync(2000)
  await expect(run).resolves.toMatchObject({ bookId: 'canonical-book', book, orderConfirmed: false })
 })
 it('only a terminal failed state confirms processing failure', async () => {
  const book = { ...item('pending'), metadata_ready: false, processing_status: 'error' }
  fetcher.mockResolvedValueOnce(json({ state: 'delayed', progress: 15, book }))
    .mockResolvedValueOnce(json({ state: 'failed', failReason: 'EPUB parse rejected', book }))
  const run = waitForBookJob('failed-after-retry')
  const rejection = expect(run).rejects.toMatchObject({ kind: 'processing_failed', book, jobId: 'failed-after-retry' })
  await tick(); expect(fetcher).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(2000); await rejection
 })
 it('keeps the latest parsed metadata on a timed-out status request', async () => {
  const book = { ...item('pending'), metadata_ready: true, processing_status: 'processing' }
  fetcher.mockResolvedValueOnce(json({ state: 'active', book, progress: 30 }))
    .mockReturnValueOnce(new Promise(() => {}))
  const run = waitForBookJob('timeout-with-metadata')
  const rejection = expect(run).rejects.toMatchObject({ kind: 'status_unknown', book, jobId: 'timeout-with-metadata' })
  await vi.advanceTimersByTimeAsync(300000); await rejection
 })
})
