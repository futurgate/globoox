import type { CatalogContext, CatalogItem, CatalogManifest } from '../lib/catalogTypes'

export const context: CatalogContext = {
  scopeKey: `user:00000000-0000-4000-8000-000000000001::${'a'.repeat(64)}`,
  userId: '00000000-0000-4000-8000-000000000001', guestId: '00000000-0000-4000-8000-000000000099',
  shareToken: null, headers: {},
}
export const item = (id: string): CatalogItem => ({
  id, title: id, author: null, created_at: '2026-09-01T12:00:00Z', status: 'active', is_own: true,
  original_language: 'en', available_languages: ['en'], selected_language: null,
  last_read_at: null, metadata_version: `meta-${id}`, reading: null, cover: null,
})
export const manifest = (ids = ['a', 'b'], scope = context.scopeKey, version = '0'): CatalogManifest => ({
  contract_version: 2, scope_key: scope, revision: `revision-${ids.join('-')}-${version}`,
  server_time: '2026-09-25T12:00:00Z', complete: true, order: 'recently_read', activity_version: version,
  items: ids.map(item),
})
export function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
export const microtasks = async () => { for (let i = 0; i < 12; i++) await Promise.resolve() }
