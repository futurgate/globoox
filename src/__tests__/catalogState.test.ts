import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/api', () => ({ getShareToken: () => null }))
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))
import { CatalogController, type CatalogDependencies } from '../lib/catalogState'
import { CatalogError, type CatalogManifest } from '../lib/catalogTypes'
import type { CatalogCacheEntry } from '../lib/catalogCache'
import { context, deferred, item, manifest, microtasks } from './catalogFixtures'

function setup(overrides: Partial<CatalogDependencies> = {}) {
  const data = manifest(['cached'])
  const deps: CatalogDependencies = {
    hint: () => context, resolve: async () => context,
    cache: async () => ({ manifest: data, savedAt: 1, origin: 'server' }), cached: () => null,
    persist: vi.fn(async () => {}), flush: async () => '0', fetch: async () => manifest(),
    update: async () => {}, delete: async () => {}, create: async () => item('new'), ...overrides,
  }
  return { controller: new CatalogController(deps), deps }
}
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('server-first catalog ownership and deadlines', () => {
  it('keeps the initial index running during upload and merges already parsed metadata after its receipt', async () => {
    const response = deferred<CatalogManifest>()
    const { controller } = setup({ fetch: () => response.promise })
    const initial = controller.refresh()
    await microtasks()
    const finish = controller.beginExternalMutation()
    controller.acceptUploadedBook({ ...item('upload'), processing_status: 'processing', metadata_ready: true })
    response.resolve(manifest(['existing']))
    await initial
    expect(controller.snapshot.loading).toBe(false)
    expect(controller.snapshot.books.map(book => book.id).sort()).toEqual(['existing', 'upload'])
    expect(controller.snapshot.context?.scopeKey).toBe(context.scopeKey)
    finish()
  })
  it('preserves a ready canonical duplicate and retires an error placeholder while ordering is pending', async () => {
    const initial = manifest(['existing', 'pending'])
    initial.items[1].processing_status = 'error'
    const { controller } = setup({ fetch: async () => initial })
    await controller.refresh()
    controller.acceptUploadedBook({ ...item('existing'), processing_status: 'processing' }, 'pending')
    expect(controller.snapshot.books).toEqual([item('existing')])
  })
  it('cannot overwrite an in-flight archive/delete with a job snapshot', async () => {
    const deleted = deferred<void>()
    const { controller } = setup({ delete: () => deleted.promise })
    await controller.refresh()
    const removal = controller.mutate('a', 'delete')
    controller.acceptUploadedBook(item('a'))
    expect(controller.snapshot.books.some(book => book.id === 'a')).toBe(false)
    controller.dispose()
    deleted.resolve()
    await removal
  })
  it('accepts complete upload metadata without waiting for a new index and preserves server recency', async () => {
    const initial = manifest(['newer', 'older'])
    initial.items[0].last_read_at = '2026-10-01T12:00:00Z'
    initial.items[1].last_read_at = '2026-09-01T12:00:00Z'
    const { controller, deps } = setup({ fetch: async () => initial })
    await controller.refresh()
    const finish = controller.beginExternalMutation()
    const uploaded = { ...item('uploaded'), last_read_at: '2026-09-30T12:00:00Z', processing_status: 'ready' as const, metadata_ready: true }
    controller.acceptUploadedBook(uploaded)
    expect(controller.snapshot.books.map(book => book.id)).toEqual(['newer', 'uploaded', 'older'])
    expect(controller.snapshot.books[1]).toEqual(uploaded)
    expect(deps.persist).toHaveBeenLastCalledWith(expect.objectContaining({ items: controller.snapshot.books }))
    finish()
  })

  it('deduplicates a canonical upload and retires only its pending placeholder', async () => {
    const initial = manifest(['existing', 'pending', 'other'])
    initial.items[1].processing_status = 'processing'
    const { controller } = setup({ fetch: async () => initial })
    await controller.refresh()
    const finish = controller.beginExternalMutation()
    controller.acceptUploadedBook({ ...item('existing'), title: 'Parsed title', processing_status: 'ready' }, 'pending')
    expect(controller.snapshot.books.map(book => book.id).sort()).toEqual(['existing', 'other'])
    expect(controller.snapshot.books.find(book => book.id === 'existing')?.title).toBe('Parsed title')
    finish()
    controller.dispose()
    controller.acceptUploadedBook(item('late'))
    expect(controller.snapshot.books.some(book => book.id === 'late')).toBe(false)
  })
  it('keeps even a ready disk cache hidden until the server confirms, including true empty', async () => {
    const response = deferred<CatalogManifest>()
    const { controller } = setup({ fetch: () => response.promise })
    const run = controller.refresh()
    await microtasks()
    expect(controller.snapshot.books).toEqual([])
    expect(controller.snapshot.loading).toBe(true)
    response.resolve(manifest([]))
    await run
    expect(controller.snapshot.books).toEqual([])
    expect(controller.snapshot.loading).toBe(false)
    expect(controller.snapshot.offline).toBe(false)
  })

  it('bounds a hanging identity call, shows exact scoped fallback, and ignores its late success', async () => {
    const identity = deferred<typeof context>()
    const fetch = vi.fn(async () => manifest(['late']))
    const { controller } = setup({ resolve: () => identity.promise, fetch })
    const run = controller.refresh()
    await vi.advanceTimersByTimeAsync(5000)
    await run
    expect(controller.snapshot.books.map(book => book.id)).toEqual(['cached'])
    expect(controller.snapshot.error?.kind).toBe('timeout')
    identity.resolve(context)
    await microtasks()
    expect(fetch).not.toHaveBeenCalled()
    expect(controller.snapshot.offline).toBe(true)
  })

  it('uses one deadline for activity acknowledgement and fetch/body, not separate allowances', async () => {
    const ack = deferred<string>()
    const response = deferred<CatalogManifest>()
    const fetch = vi.fn(() => response.promise)
    const { controller } = setup({ flush: () => ack.promise, fetch })
    const run = controller.refresh()
    await vi.advanceTimersByTimeAsync(3200)
    ack.resolve('23')
    await microtasks()
    expect(fetch).toHaveBeenCalledWith(context, expect.any(AbortSignal), '23')
    await vi.advanceTimersByTimeAsync(1800)
    await run
    expect(controller.snapshot.error?.kind).toBe('timeout')
    response.resolve(manifest(['late'], context.scopeKey, '23'))
    await microtasks()
    expect(controller.snapshot.books.map(book => book.id)).toEqual(['cached'])
  })

  it('accepts a three-second validation without showing stale fallback or renewing on a late deadline', async () => {
    const response = deferred<CatalogManifest>()
    const { controller } = setup({ fetch: () => response.promise })
    const run = controller.refresh()
    await vi.advanceTimersByTimeAsync(3000)
    expect(controller.snapshot.loading).toBe(true)
    expect(controller.snapshot.offline).toBe(false)
    expect(controller.snapshot.books).toEqual([])
    response.resolve(manifest(['fresh']))
    await run
    expect(controller.snapshot.books.map(book => book.id)).toEqual(['fresh'])
    await vi.advanceTimersByTimeAsync(3000)
    expect(controller.snapshot.error).toBeNull()
    expect(controller.snapshot.offline).toBe(false)
  })

  it('keeps fallback during Retry and rejects late previous result/finally', async () => {
    const first = deferred<CatalogManifest>(), second = deferred<CatalogManifest>()
    const fetch = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { controller } = setup({ fetch })
    const initial = controller.refresh()
    await vi.advanceTimersByTimeAsync(5000)
    await initial
    const retry = controller.refresh()
    await microtasks()
    first.resolve(manifest(['expired']))
    await microtasks()
    expect(controller.snapshot.books.map(book => book.id)).toEqual(['cached'])
    expect(controller.snapshot.refreshing).toBe(true)
    expect(controller.snapshot.loading).toBe(false)
    second.resolve(manifest(['fresh']))
    await retry
    expect(controller.snapshot.books.map(book => book.id)).toEqual(['fresh'])
    expect(controller.snapshot.offline).toBe(false)
  })

  it('does not reuse a disposed A request after A → B → A', async () => {
    const old = deferred<CatalogManifest>()
    const a = setup({ fetch: () => old.promise }).controller
    const run = a.refresh()
    await microtasks()
    a.dispose()
    await run
    const bContext = { ...context, scopeKey: 'user:b::scope', userId: 'b' }
    const b = setup({ hint: () => bContext, resolve: async () => bContext, fetch: async () => manifest(['b'], bContext.scopeKey) }).controller
    await b.refresh()
    const newA = setup({ fetch: async () => manifest(['new-a']) }).controller
    await newA.refresh()
    old.resolve(manifest(['expired-a']))
    await microtasks()
    expect(b.snapshot.books[0].id).toBe('b')
    expect(newA.snapshot.books[0].id).toBe('new-a')
  })

  it('distinguishes auth/invalid deployment from offline and does not expose cached books', async () => {
    for (const kind of ['auth', 'deployment', 'invalid-response'] as const) {
      const { controller } = setup({ fetch: async () => { throw new CatalogError(kind, 'rejected') } })
      await controller.refresh()
      expect(controller.snapshot.books).toEqual([])
      expect(controller.snapshot.offline).toBe(false)
      expect(controller.snapshot.error?.kind).toBe(kind)
    }
  })

  it('rejects a manifest older than the acknowledged reading event', async () => {
    const { controller } = setup({ flush: async () => '9007199254740993', fetch: async () => manifest(['old'], context.scopeKey, '9007199254740992') })
    await controller.refresh()
    expect(controller.snapshot.books).toEqual([])
    expect(controller.snapshot.error?.kind).toBe('invalid-response')
  })

  it('ends skeleton without storage or cache when network fails', async () => {
    const { controller } = setup({ cache: async () => { throw new Error('denied') }, fetch: async () => { throw new Error('offline') } })
    await controller.refresh()
    expect(controller.snapshot.loading).toBe(false)
    expect(controller.snapshot.offline).toBe(true)
    expect(controller.snapshot.books).toEqual([])
  })

  it('does not publish a fallback arriving after the offline deadline or either of two retries', async () => {
    const disk = deferred<CatalogCacheEntry | null>()
    const initial = deferred<CatalogManifest>(), firstRetry = deferred<CatalogManifest>(), secondRetry = deferred<CatalogManifest>()
    const fetch = vi.fn().mockReturnValueOnce(initial.promise).mockReturnValueOnce(firstRetry.promise).mockReturnValueOnce(secondRetry.promise)
    const { controller } = setup({ cache: () => disk.promise, fetch })
    const start = controller.refresh()
    await vi.advanceTimersByTimeAsync(5000); await start
    expect(controller.snapshot.offline).toBe(true)
    expect(controller.snapshot.loading).toBe(false)
    expect(controller.snapshot.books).toEqual([])
    disk.resolve({ manifest: manifest(['old']), savedAt: 1, origin: 'server' })
    await microtasks()
    expect(controller.snapshot.books).toEqual([])
    const retryA = controller.refresh(true); await microtasks()
    const retryB = controller.refresh(true); await microtasks()
    secondRetry.resolve(manifest(['new'])); await retryB
    initial.resolve(manifest(['late-initial'])); firstRetry.resolve(manifest(['late-retry'])); await retryA
    await microtasks()
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(controller.snapshot.books.map(book => book.id)).toEqual(['new'])
    expect(controller.snapshot.offline).toBe(false)
  })

  it('preserves cached order when pending activity is corrupt, with a distinct activity error', async () => {
    const { controller } = setup({ flush: async () => { throw new Error('Stored reading activity is invalid') }, pendingRecency: () => { throw new Error('invalid') } })
    await controller.refresh()
    expect(controller.snapshot.books.map(book => book.id)).toEqual(['cached'])
    expect(controller.snapshot.error?.kind).toBe('activity')
    expect(controller.snapshot.error?.message).toContain('Stored reading activity')
    expect(controller.snapshot.offline).toBe(true)
  })

  it('preserves DOM-driving array identity for identical mounted revalidation', async () => {
    const { controller } = setup()
    await controller.refresh()
    const before = controller.snapshot.books
    await controller.refresh()
    expect(controller.snapshot.books).toBe(before)
    expect(controller.snapshot.loading).toBe(false)
  })
})

describe('optimistic mutation reconciliation', () => {
  it('a new page lifetime waits for the previous scoped mutation before requesting the index', async () => {
    const change = deferred<void>()
    const first = setup({ update: () => change.promise }).controller
    await first.refresh()
    const mutation = first.mutate('a', 'hidden')
    first.dispose()
    const fetch = vi.fn(async () => manifest(['b']))
    const next = setup({ fetch }).controller
    const refresh = next.refresh()
    await microtasks()
    expect(fetch).not.toHaveBeenCalled()
    change.resolve()
    await mutation
    await refresh
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(next.snapshot.books.map(book => book.id)).toEqual(['b'])
  })

  it('does not persist unacknowledged edits and rejects a second mutation of the same book', async () => {
    const change = deferred<void>()
    const persist = vi.fn(async () => {})
    const { controller } = setup({ persist, update: () => change.promise })
    await controller.refresh()
    const before = persist.mock.calls.length
    const first = controller.mutate('a', 'hidden').catch(() => {})
    expect(persist).toHaveBeenCalledTimes(before)
    await expect(controller.mutate('a', 'active')).rejects.toMatchObject({ kind: 'mutation' })
    change.reject(new Error('failed'))
    await first
    expect(controller.snapshot.books[0].status).toBe('active')
    expect(persist).toHaveBeenCalledTimes(before)
  })

  it('late list GET cannot resurrect an archived book', async () => {
    const late = deferred<CatalogManifest>(), mutation = deferred<void>()
    const fetch = vi.fn().mockResolvedValueOnce(manifest()).mockReturnValueOnce(late.promise)
      .mockResolvedValueOnce({ ...manifest(), items: [{ ...item('a'), status: 'hidden' }, item('b')] })
    const { controller } = setup({ fetch, update: () => mutation.promise })
    await controller.refresh()
    const refresh = controller.refresh()
    await microtasks()
    const change = controller.mutate('a', 'hidden')
    late.resolve(manifest())
    await refresh
    expect(controller.snapshot.books[0].status).toBe('hidden')
    mutation.resolve()
    await change
    await microtasks()
    expect(controller.snapshot.books[0].status).toBe('hidden')
  })

  it('rollback of one book does not undo a concurrent successful deletion', async () => {
    const update = deferred<void>(), deletion = deferred<void>()
    const fetch = vi.fn().mockResolvedValueOnce(manifest()).mockResolvedValueOnce(manifest(['a']))
    const { controller } = setup({ fetch, update: () => update.promise, delete: () => deletion.promise })
    await controller.refresh()
    const hide = controller.mutate('a', 'hidden').catch(() => {})
    const remove = controller.mutate('b', 'delete')
    deletion.resolve()
    await remove
    update.reject(new Error('failed'))
    await hide
    await microtasks()
    expect(controller.snapshot.books.map(book => [book.id, book.status])).toEqual([['a', 'active']])
  })
})


describe('mutation access failures', () => {
  it.each([
    { authFirst: true, otherOutcome: 'success' },
    { authFirst: true, otherOutcome: 'error' },
    { authFirst: false, otherOutcome: 'success' },
    { authFirst: false, otherOutcome: 'error' },
  ])('keeps access denied with authFirst=$authFirst and another $otherOutcome', async ({ authFirst, otherOutcome }) => {
    const denied = deferred<void>()
    const other = deferred<void>()
    const fetch = vi.fn(async () => manifest(['a', 'b']))
    const { controller } = setup({ fetch, delete: id => id === 'a' ? denied.promise : other.promise })
    await controller.refresh()
    const authError = Object.assign(new Error('Session expired'), { status: 401 })
    const otherError = Object.assign(new Error('Write response unavailable'), { status: 500 })
    const a = controller.mutate('a', 'delete').catch(error => error)
    const b = controller.mutate('b', 'delete').catch(error => error)
    const denyAccess = async () => { denied.reject(authError); expect(await a).toBe(authError) }
    const settleOther = async () => {
      if (otherOutcome === 'error') { other.reject(otherError); expect(await b).toBe(otherError) }
      else { other.resolve(); expect(await b).toBeUndefined() }
    }
    if (authFirst) { await denyAccess(); await settleOther() }
    else { await settleOther(); await denyAccess() }
    await microtasks()
    expect(controller.snapshot.books).toEqual([])
    expect(controller.snapshot.context).toBeNull()
    expect(controller.snapshot.error).toMatchObject({ kind: 'auth', status: 401 })
    // The other response must not start an automatic revalidation after access was denied.
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('preserves both typed rejections when concurrent auth failures clear the same shelf', async () => {
    const first = deferred<void>()
    const second = deferred<void>()
    const { controller } = setup({ fetch: async () => manifest(['a', 'b']), delete: id => id === 'a' ? first.promise : second.promise })
    await controller.refresh()
    const errorA = Object.assign(new Error('Session expired'), { status: 401 })
    const errorB = Object.assign(new Error('Forbidden'), { status: 403 })
    const a = controller.mutate('a', 'delete').catch(error => error)
    const b = controller.mutate('b', 'delete').catch(error => error)
    first.reject(errorA)
    expect(await a).toBe(errorA)
    expect(controller.snapshot.context).toBeNull()
    second.reject(errorB)
    expect(await b).toBe(errorB)
    expect(controller.snapshot.books).toEqual([])
    expect(controller.snapshot.error).toMatchObject({ kind: 'auth', status: 401 })
  })
})
