import { sha256 } from 'js-sha256'
import { getShareToken } from './api'
import { createClient } from './supabase/client'
import { CatalogError, validateCatalogManifest, type CatalogContext, type CatalogManifest } from './catalogTypes'

export { CatalogError, catalogItemToApiBook } from './catalogTypes'
export type { CatalogContext } from './catalogTypes'
const GUEST_KEY = 'globoox:catalog-guest-id'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
let memoryGuestId: string | undefined

export function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
  return new Promise((resolve, reject) => {
    const onAbort = () => { cleanup(); reject(signal.reason ?? new DOMException('Aborted', 'AbortError')) }
    const cleanup = () => signal.removeEventListener('abort', onAbort)
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(value => { cleanup(); resolve(value) }, error => { cleanup(); reject(error) })
  })
}

export function getCatalogGuestId(): string {
  try {
    const saved = globalThis.localStorage?.getItem(GUEST_KEY)
    if (saved && uuid.test(saved)) return (memoryGuestId = saved)
  } catch { /* memory identity supports this session when storage is denied */ }
  memoryGuestId ??= crypto.randomUUID()
  try { globalThis.localStorage?.setItem(GUEST_KEY, memoryGuestId) } catch { /* best effort */ }
  return memoryGuestId
}

function currentShareToken(): string | null {
  return getShareToken()
}

/** An exact local cache locator, not proof that the server accepted the session. */
export function catalogContextHint(userId: string | null): CatalogContext {
  const guestId = getCatalogGuestId()
  const shareToken = currentShareToken()
  const actor = userId ? `user:${userId}` : `guest:${guestId}`
  return {
    scopeKey: `${actor}::${sha256(shareToken ?? '')}`, userId, guestId, shareToken,
    headers: { 'X-Catalog-User': userId ?? 'guest', 'X-Catalog-Guest': guestId },
  }
}

export async function resolveCatalogContext(signal: AbortSignal, expectedUserId?: string | null): Promise<CatalogContext> {
  try {
    const result = await abortable(createClient().auth.getSession(), signal)
    if (result.error) throw new CatalogError('auth', 'Unable to confirm the current session')
    const session = result.data.session
    const userId = session?.user?.id ?? null
    if (userId && !uuid.test(userId)) throw new CatalogError('auth', 'Invalid session identity')
    if (expectedUserId !== undefined && userId !== expectedUserId) throw new CatalogError('auth', 'Session changed; sign in again')
    const context = catalogContextHint(userId)
    if (session?.access_token) context.headers.Authorization = `Bearer ${session.access_token}`
    return context
  } catch (error) {
    if (signal.aborted) throw signal.reason ?? error
    if (error instanceof CatalogError) throw error
    throw new CatalogError('network', 'Unable to connect while confirming your session')
  }
}

export function catalogRequestUrl(path: string, context: CatalogContext): string {
  const url = new URL(path, 'http://catalog.local')
  if (url.origin !== 'http://catalog.local' || !url.pathname.startsWith('/api/v2/')) {
    throw new CatalogError('invalid-response', 'Invalid catalog resource URL')
  }
  if (context.shareToken) url.searchParams.set('share', context.shareToken)
  return `${url.pathname}${url.search}`
}

export function catalogHttpError(status: number): CatalogError {
  if (status === 401 || status === 403) return new CatalogError('auth', 'Library access could not be confirmed', status)
  if (status === 404 || status === 405) return new CatalogError('deployment', 'This server does not support the new library yet', status)
  if (status >= 500 || status === 408 || status === 429) return new CatalogError('network', 'The library server is unavailable', status)
  return new CatalogError('invalid-response', 'The library request was rejected', status)
}

export async function fetchCatalogManifest(context: CatalogContext, signal: AbortSignal, minActivityVersion = '0'): Promise<CatalogManifest> {
  const url = catalogRequestUrl(`/api/v2/library?min_activity_version=${encodeURIComponent(minActivityVersion)}`, context)
  try {
    const response = await abortable(fetch(url, { headers: context.headers, signal, cache: 'no-store', credentials: 'same-origin' }), signal)
    if (!response.ok) {
      if (response.status === 503) {
        const body = await abortable(response.json().catch(() => null), signal)
        const code = body?.code ?? body?.data?.code
        if (code === 'catalog_not_configured' || code === 'catalog_migration_required' || code === 'migration_required') {
          throw new CatalogError('deployment', 'The library service is not configured', 503)
        }
      }
      throw catalogHttpError(response.status)
    }
    if (!response.headers.get('content-type')?.includes('application/json')) throw new CatalogError('deployment', 'The library endpoint returned an unsupported format')
    // Body consumption belongs to the same deadline as auth, activity and headers.
    const text = await abortable(response.text(), signal)
    if (text.length > 2 * 1024 * 1024) throw new CatalogError('invalid-response', 'Library index exceeds its supported size')
    let value: unknown
    try { value = JSON.parse(text) } catch { throw new CatalogError('invalid-response', 'The library index is incomplete') }
    return validateCatalogManifest(value, context.scopeKey, minActivityVersion)
  } catch (error) {
    if (signal.aborted) throw signal.reason ?? error
    if (error instanceof CatalogError) throw error
    throw new CatalogError('network', 'Unable to contact the library server')
  }
}
