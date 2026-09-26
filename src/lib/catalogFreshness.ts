import type { CatalogManifest } from './catalogTypes'

export const CATALOG_COOLDOWN_MS = 10_000
const prefix = 'globoox:catalog-confirmation:v2:'
interface Confirmation { token: string; checkedAt?: number; revision?: string; activityVersion?: string }
const disabled = new Set<string>()
const token = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}:${Math.random()}`

function read(scope: string, receipt = false): Confirmation | null {
  if (disabled.has(scope)) return null
  try {
    const raw = globalThis.localStorage?.getItem(prefix + (receipt ? 'receipt:' : '') + scope)
    if (!raw) return null
    const value = JSON.parse(raw)
    return value && typeof value.token === 'string' ? value : null
  } catch { return null }
}
function write(scope: string, value: Confirmation, receipt = false): boolean {
  try {
    const storage = globalThis.localStorage
    if (!storage) return false
    const key = prefix + (receipt ? 'receipt:' : '') + scope
    storage.setItem(key, JSON.stringify(value))
    return storage.getItem(key) === JSON.stringify(value)
  } catch { disabled.add(scope); return false }
}

/** A local edit invalidates even an already-acknowledged, otherwise complete index. */
export function invalidateCatalogConfirmation(scope: string) {
  write(scope, { token: token() })
}

export function beginCatalogValidation(scope: string) {
  let entry = read(scope)
  if (!entry) {
    entry = { token: token() }
    if (!write(scope, entry)) return null
  }
  return { token: entry.token, startedAt: Date.now() }
}

export function confirmCatalog(manifest: CatalogManifest, validation: ReturnType<typeof beginCatalogValidation>) {
  if (!validation || read(manifest.scope_key)?.token !== validation.token) return
  const now = Date.now()
  if (now < validation.startedAt) return
  // Receipt and invalidation epoch use different keys: a concurrent tab's edit
  // cannot be overwritten by this request finishing later.
  write(manifest.scope_key, {
    token: validation.token, checkedAt: validation.startedAt,
    revision: manifest.revision, activityVersion: manifest.activity_version,
  }, true)
}

/** Completeness is validated separately. This receipt never certifies cover availability. */
export function hasFreshCatalogConfirmation(manifest: CatalogManifest, now = Date.now()): boolean {
  const receipt = read(manifest.scope_key, true)
  if (!receipt || read(manifest.scope_key)?.token !== receipt.token
    || typeof receipt.checkedAt !== 'number' || !Number.isFinite(receipt.checkedAt)) return false
  const age = now - receipt.checkedAt
  if (age < 0 || age >= CATALOG_COOLDOWN_MS) { invalidateCatalogConfirmation(manifest.scope_key); return false }
  if (receipt.revision !== manifest.revision
    || receipt.activityVersion !== manifest.activity_version) return false
  // Read-only/denied storage cannot safely invalidate a receipt on the next edit.
  try {
    const key = prefix + 'probe:' + manifest.scope_key
    globalThis.localStorage.setItem(key, receipt.token)
    globalThis.localStorage.removeItem(key)
    return read(manifest.scope_key)?.token === receipt.token
  } catch { disabled.add(manifest.scope_key); return false }
}
