import { describe, expect, it } from 'vitest'
import { createReaderAnchorGuard, queueReadingAnchorCacheWrite } from '@/lib/readingPositionWriter'

const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(yes => { resolve = yes })
  return { promise, resolve }
}
const anchor = (position: number, sentenceIndex = 0) => ({
  chapterId: 'chapter', blockId: 'same-block', blockPosition: position, sentenceIndex,
})

describe('Reader anchor callbacks belong to their navigation and lifetime', () => {
  it('keeps the newest local position when an older save acknowledgement arrives', async () => {
    const guard = createReaderAnchorGuard()
    guard.activate()
    let local = anchor(0)
    guard.advance()
    const oldRequest = guard.capture()
    const ack = deferred<ReturnType<typeof anchor>>()
    const applying = ack.promise.then(value => { if (guard.current(oldRequest)) local = value })
    // Local navigation is visible immediately, before its throttled network write.
    local = anchor(5)
    guard.advance()
    ack.resolve(anchor(0))
    await applying
    expect(local.blockPosition).toBe(5)
  })

  it.each(['restore GET', 'stale-client reconciliation GET'])('ignores %s after a newer local navigation', async () => {
    const guard = createReaderAnchorGuard()
    guard.activate()
    const remote = deferred<ReturnType<typeof anchor>>()
    const restoring = guard.capture()
    let local = anchor(0)
    const applying = remote.promise.then(value => { if (guard.current(restoring)) local = value })
    local = anchor(5)
    guard.advance()
    remote.resolve(anchor(0))
    await applying
    expect(local.blockPosition).toBe(5)
  })

  it('treats movement within one block as a new intent, including backward movement', () => {
    const guard = createReaderAnchorGuard()
    guard.activate()
    let local = anchor(5, 8)
    guard.advance()
    const oldRequest = guard.capture()
    local = anchor(5, 2)
    guard.advance()
    if (guard.current(oldRequest)) local = anchor(5, 8)
    expect(local.sentenceIndex).toBe(2)
    expect(guard.current(guard.capture())).toBe(true)
  })

  it('rejects callbacks after unmount and StrictMode reactivation while a new Reader is independent', () => {
    const first = createReaderAnchorGuard()
    first.activate()
    const oldRequest = first.capture()
    first.dispose()
    const reopened = createReaderAnchorGuard()
    reopened.activate()
    expect(first.current(oldRequest)).toBe(false)
    expect(reopened.current(reopened.capture())).toBe(true)
    first.activate()
    expect(first.current(oldRequest)).toBe(false)
  })

  it('blocks a revalidation started during a throttled local intent until that intent is acknowledged', () => {
    const guard = createReaderAnchorGuard()
    guard.activate()
    guard.advance()
    const intent = guard.capture()
    expect(guard.canRestore(intent)).toBe(false)
    guard.advance()
    const latest = guard.capture()
    guard.settled(intent)
    expect(guard.canRestore(latest)).toBe(false)
    guard.settled(latest)
    expect(guard.canRestore(latest)).toBe(true)
  })
})

describe('persisted Reader anchors retain local write order across routes', () => {
  it('finishes an old IDB write before a later anchor while other scopes can continue', async () => {
    const oldDisk = deferred<void>()
    const writes: string[] = []
    const first = queueReadingAnchorCacheWrite('account-a:book', async () => {
      await oldDisk.promise
      writes.push('a:0')
    })
    const latest = queueReadingAnchorCacheWrite('account-a:book', async () => { writes.push('a:5') })
    await queueReadingAnchorCacheWrite('account-b:book', async () => { writes.push('b:9') })
    expect(writes).toEqual(['b:9'])
    oldDisk.resolve()
    await Promise.all([first, latest])
    expect(writes).toEqual(['b:9', 'a:0', 'a:5'])
  })

  it('does not discard a later anchor after a storage failure', async () => {
    const first = queueReadingAnchorCacheWrite('quota:book', async () => { throw new Error('quota') })
    let saved = false
    const latest = queueReadingAnchorCacheWrite('quota:book', async () => { saved = true })
    await expect(first).rejects.toThrow('quota')
    await latest
    expect(saved).toBe(true)
  })
})
