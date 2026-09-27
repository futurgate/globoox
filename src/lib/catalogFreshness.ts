import { compareActivityVersions, isActivityVersion, type CatalogManifest } from './catalogTypes'

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

function freshReceipt(scope: string, now: number): Confirmation | null {
  const receipt = read(scope, true)
  if (!receipt || read(scope)?.token !== receipt.token
    || typeof receipt.checkedAt !== 'number' || !Number.isFinite(receipt.checkedAt)
    || typeof receipt.revision !== 'string' || !receipt.revision
    || !isActivityVersion(receipt.activityVersion)) return null
  const age = now - receipt.checkedAt
  if (age < 0 || age >= CATALOG_COOLDOWN_MS) { invalidateCatalogConfirmation(scope); return null }
  // Read-only/denied storage cannot safely invalidate a receipt on the next edit.
  try {
    const key = prefix + 'probe:' + scope
    globalThis.localStorage.setItem(key, receipt.token)
    globalThis.localStorage.removeItem(key)
    return read(scope)?.token === receipt.token ? receipt : null
  } catch { disabled.add(scope); return null }
}

/** A cheap eligibility check only: an absent/expired receipt cannot justify waiting for disk. */
export function hasFreshCatalogReceipt(scope: string, minActivityVersion = '0', now = Date.now()): boolean {
  const receipt = freshReceipt(scope, now)
  return !!receipt && compareActivityVersions(receipt.activityVersion!, minActivityVersion) >= 0
}

/** Completeness is validated separately. This receipt never certifies cover availability. */
export function hasFreshCatalogConfirmation(manifest: CatalogManifest, now = Date.now()): boolean {
  const receipt = freshReceipt(manifest.scope_key, now)
  return !!receipt && receipt.revision === manifest.revision && receipt.activityVersion === manifest.activity_version
}
