import type { SaveReadingPositionRequest, SaveReadingPositionResponse } from './api'

type Send = (payload: SaveReadingPositionRequest) => Promise<SaveReadingPositionResponse>
type Job = { payload: SaveReadingPositionRequest; send: Send; resolve: (value: SaveReadingPositionResponse) => void; reject: (error: unknown) => void }
type Writer = { running: boolean; pending?: Job; acknowledgedAt?: string; idle: Array<() => void> }

/** One in-flight PUT and one latest pending intent per account/book, across routes.
 * Only our own successful ACK may advance the next request's timestamp baseline.
 * A stale_client response is another writer's state, never permission to overwrite it.
 */
export function createReadingPositionWriter() {
  const writers = new Map<string, Writer>()
  const drain = async (writer: Writer) => {
    writer.running = true
    while (writer.pending) {
      const job = writer.pending
      writer.pending = undefined
      const payload = { ...job.payload }
      const ownAck = Date.parse(writer.acknowledgedAt ?? '')
      const intent = Date.parse(payload.updated_at_client ?? '')
      if (Number.isFinite(ownAck) && Number.isFinite(intent) && ownAck > intent) {
        payload.updated_at_client = writer.acknowledgedAt
      }
      try {
        const response = await job.send(payload)
        if (response.persisted && Number.isFinite(Date.parse(response.updated_at ?? ''))) {
          writer.acknowledgedAt = response.updated_at
        } else if (response.reason === 'stale_client') {
          writer.acknowledgedAt = undefined
        }
        job.resolve(response)
      } catch (error) { job.reject(error) }
    }
    writer.running = false
    writer.idle.splice(0).forEach(resolve => resolve())
  }
  return {
    enqueue(key: string, payload: SaveReadingPositionRequest, send: Send) {
      const writer = writers.get(key) ?? { running: false, idle: [] }
      writers.set(key, writer)
      return new Promise<SaveReadingPositionResponse>((resolve, reject) => {
        writer.pending?.resolve({ success: true, persisted: false })
        writer.pending = { payload: { ...payload }, send, resolve, reject }
        if (!writer.running) void drain(writer)
      })
    },
    pending(key: string) { return writers.get(key)?.running === true },
    wait(key: string): Promise<void> {
      const writer = writers.get(key)
      return writer?.running ? new Promise(resolve => writer.idle.push(resolve)) : Promise.resolve()
    },
  }
}

/** Reader callbacks belong to both a mount and a particular local navigation. */
export function createReaderAnchorGuard() {
  let revision = 0
  let mounted = false
  let localPending = false
  return {
    activate() { mounted = true; revision += 1 },
    dispose() { mounted = false; revision += 1 },
    advance() { revision += 1; localPending = true },
    capture() { return revision },
    current(captured: number) { return mounted && captured === revision },
    canRestore(captured: number) { return mounted && captured === revision && !localPending },
    settled(captured: number) { if (mounted && captured === revision) localPending = false },
  }
}

const cacheWrites = new Map<string, Promise<void>>()
/** IDB's read-before-put helper also needs ordering across Reader lifetimes. */
export function queueReadingAnchorCacheWrite(key: string, write: () => Promise<void>): Promise<void> {
  const queued = (cacheWrites.get(key) ?? Promise.resolve()).catch(() => {}).then(write)
  cacheWrites.set(key, queued)
  void queued.finally(() => { if (cacheWrites.get(key) === queued) cacheWrites.delete(key) }).catch(() => {})
  return queued
}
