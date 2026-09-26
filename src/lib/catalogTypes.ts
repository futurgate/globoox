import type { ApiBook } from './api'

export interface CatalogContext {
  scopeKey: string
  userId: string | null
  guestId: string
  shareToken: string | null
  headers: Record<string, string>
}

export interface CatalogItem {
  id: string
  title: string
  author: string | null
  created_at: string
  status: string
  is_own: boolean
  original_language: string | null
  available_languages: string[]
  selected_language: string | null
  last_read_at: string | null
  metadata_version: string
  reading: { block_position: number | null; total_blocks: number | null; updated_at: string | null } | null
  cover: { url: string; version: string; width: number | null; height: number | null } | null
}

export interface CatalogManifest {
  contract_version: 2
  scope_key: string
  revision: string
  server_time: string
  complete: true
  order: 'recently_read'
  activity_version: string
  items: CatalogItem[]
}

export type CatalogErrorKind = 'network' | 'timeout' | 'auth' | 'deployment' | 'invalid-response' | 'mutation' | 'activity'
export class CatalogError extends Error {
  constructor(public readonly kind: CatalogErrorKind, message: string, public readonly status?: number) {
    super(message)
    this.name = 'CatalogError'
  }
}

export function catalogItemToApiBook(item: CatalogItem): ApiBook {
  return {
    id: item.id, title: item.title, author: item.author, cover_url: item.cover?.url ?? null,
    created_at: item.created_at, status: item.status, is_own: item.is_own,
    original_language: item.original_language, available_languages: item.available_languages,
    selected_language: item.selected_language,
  }
}

export function isActivityVersion(value: unknown): value is string {
  return typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value)
}

export function compareActivityVersions(a: string, b: string): number {
  if (!isActivityVersion(a) || !isActivityVersion(b)) throw new CatalogError('invalid-response', 'Invalid activity version')
  return a.length === b.length ? (a === b ? 0 : a > b ? 1 : -1) : a.length > b.length ? 1 : -1
}

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const string = (v: unknown): v is string => typeof v === 'string'
const nonempty = (v: unknown): v is string => string(v) && v.length > 0
const nullableString = (v: unknown) => v === null || string(v)
const timestamp = (v: unknown) => string(v) && Number.isFinite(Date.parse(v))
const nullableTimestamp = (v: unknown) => v === null || timestamp(v)
const integer = (v: unknown) => v === null || (typeof v === 'number' && Number.isSafeInteger(v) && v >= 0)

export function isCatalogItem(value: unknown): value is CatalogItem {
  if (!record(value)) return false
  const v = value
  if (!nonempty(v.id) || !string(v.title) || !nullableString(v.author) || !timestamp(v.created_at)
    || !nonempty(v.status) || typeof v.is_own !== 'boolean' || !nullableString(v.original_language)
    || !Array.isArray(v.available_languages) || !v.available_languages.every(string)
    || !nullableString(v.selected_language) || !nullableTimestamp(v.last_read_at) || !nonempty(v.metadata_version)
    || 'cover_url' in v) return false
  if (v.reading !== null && (!record(v.reading) || !integer(v.reading.block_position)
    || !integer(v.reading.total_blocks) || !nullableTimestamp(v.reading.updated_at))) return false
  if (v.cover !== null && (!record(v.cover) || !nonempty(v.cover.url)
    || !v.cover.url.startsWith('/api/v2/') || v.cover.url.startsWith('//')
    || !nonempty(v.cover.version) || !integer(v.cover.width) || !integer(v.cover.height))) return false
  return true
}

export function validateCatalogManifest(value: unknown, scopeKey: string, minActivityVersion = '0'): CatalogManifest {
  if (!record(value) || value.contract_version !== 2 || value.complete !== true || value.order !== 'recently_read'
    || !nonempty(value.revision) || !timestamp(value.server_time) || !isActivityVersion(value.activity_version)
    || !Array.isArray(value.items) || !value.items.every(isCatalogItem)
    || new Set(value.items.map(item => item.id)).size !== value.items.length) {
    throw new CatalogError('invalid-response', 'The server returned an invalid library index')
  }
  if (value.scope_key !== scopeKey) throw new CatalogError('auth', 'Library identity does not match this session')
  if (compareActivityVersions(value.activity_version, minActivityVersion) < 0) {
    throw new CatalogError('invalid-response', 'Library does not include acknowledged reading activity')
  }
  return value as unknown as CatalogManifest
}
