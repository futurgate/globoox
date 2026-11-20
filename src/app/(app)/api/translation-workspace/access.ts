import { createClient as createDatabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { requireBackendProxy } from '../_proxy'
import type { WorkspaceBook, WorkspaceSeries } from '@/lib/translationWorkspaceTypes'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const pageSize = 500

export class WorkspaceError extends Error {
  constructor(readonly status: number, message: string) { super(message) }
}

export function checkId(value: unknown, message = 'Объект не найден'): string {
  if (typeof value !== 'string' || !uuid.test(value)) throw new WorkspaceError(404, message)
  return value
}

async function authenticate() {
  const db = await createClient()
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (!user) {
    if (authError && (authError.status ?? 0) >= 500) throw new WorkspaceError(503, 'Сервис входа временно недоступен')
    throw new WorkspaceError(401, 'Требуется вход')
  }
  const { data, error } = await db.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (error) throw new WorkspaceError(503, 'Не удалось проверить права')
  return { db, userId: user.id, role: data?.is_admin === true ? 'admin' as const : 'author' as const }
}
export type WorkspaceSession = Awaited<ReturnType<typeof authenticate>>

export async function workspaceRoute(request: Request, handler: (session: WorkspaceSession) => Promise<Response>) {
  let response: Response
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const origin = request.headers.get('origin')
      if (origin && origin !== new URL(request.url).origin) throw new WorkspaceError(403, 'Недоступный источник запроса')
    }
    response = await handler(await authenticate())
  } catch (error) {
    response = Response.json({ error: error instanceof WorkspaceError ? error.message : 'Данные кабинета временно недоступны' }, {
      status: error instanceof WorkspaceError ? error.status : 503,
    })
  }
  response.headers.set('Cache-Control', 'private, no-store')
  response.headers.set('Vary', 'Cookie')
  return response
}

export function requireAdmin(session: WorkspaceSession) {
  if (session.role !== 'admin') throw new WorkspaceError(403, 'Действие доступно администратору')
}

export async function bodyObject(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new WorkspaceError(415, 'Ожидается JSON')
  let value: unknown
  try { value = await request.json() } catch { throw new WorkspaceError(400, 'Некорректный JSON') }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new WorkspaceError(400, 'Ожидается объект JSON')
  return value as Record<string, unknown>
}

export async function upstream(request: Request, session: WorkspaceSession, path: string, body?: Record<string, unknown>) {
  const url = new URL(path, request.url)
  return requireBackendProxy(new Request(url, body === undefined
    ? { method: 'GET' }
    : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), session.userId)
}

// Page by a unique key. PostgREST installations can enforce a smaller response
// limit than requested, so stop only on an empty result.
export async function readPages<T extends { id: string }>(read: (after: string | null) => PromiseLike<{
  data: T[] | null; error: { code?: string } | null
}>): Promise<T[]> {
  const rows: T[] = []
  let after: string | null = null
  while (true) {
    const { data, error } = await read(after)
    if (error) throw Object.assign(new WorkspaceError(503, 'Не удалось загрузить данные кабинета'), { code: error.code })
    if (!data?.length) return rows
    const next = data[data.length - 1].id
    if (!next || (after && next <= after)) throw new WorkspaceError(503, 'Не удалось получить следующую страницу данных')
    rows.push(...data)
    after = next
  }
}

interface BookRow { id: string; title: string | null; author: string | null; source_language: string | null; processing_status: string | null; series_id?: string | null; volume_number?: number | null }

export async function ownedBooks(session: WorkspaceSession): Promise<WorkspaceBook[]> {
  const load = (withSeries: boolean) => readPages<BookRow>((after) => {
    const columns = withSeries ? 'id,title,author,source_language,processing_status,series_id,volume_number' : 'id,title,author,source_language,processing_status'
    let q = session.db.from('books').select(columns).eq('user_id', session.userId).order('id').limit(pageSize)
    if (after) q = q.gt('id', after)
    return q.returns<BookRow[]>()
  })
  let books
  try { books = await load(true) } catch (error) {
    if (!isSchemaMissing(error)) throw error
    books = await load(false)
  }
  return books.map(b => ({
    id: b.id, title: b.title || 'Без названия', author: b.author,
    sourceLanguage: b.source_language, processingStatus: b.processing_status,
    seriesId: b.series_id ?? null, volumeNumber: b.volume_number ?? null,
  }))
}

function isSchemaMissing(error: unknown) {
  const code = (error as { code?: string } | null)?.code
  return code === '42703' || code === '42P01' || code === 'PGRST204' || code === 'PGRST205'
}

export async function requireOwnedBook(session: WorkspaceSession, id: string) {
  checkId(id)
  const { data, error } = await session.db.from('books').select('id').eq('id', id).eq('user_id', session.userId).maybeSingle()
  if (error) throw new WorkspaceError(503, 'Не удалось проверить владельца книги')
  if (!data) throw new WorkspaceError(404, 'Книга не найдена')
}

// Some installations expose book_series only to the backend. If a server-only
// service credential is configured, constrain every query here by verified user
// ID; it is never sent upstream or used to run book operations on behalf of authors.
export function reportingDatabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return key && url
    ? createDatabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    : null
}

export async function ownedSeries(session: WorkspaceSession, books: WorkspaceBook[]): Promise<WorkspaceSeries[]> {
  const mapped = new Map<string, WorkspaceSeries>()
  for (const { seriesId } of books) {
    if (seriesId) mapped.set(seriesId, { id: seriesId, name: null, genre: null, direction: null, ownerVerified: false })
  }
  const db = reportingDatabase() ?? session.db
  try {
    const rows = await readPages<{ id: string; name: string | null; genre: string | null; direction: string | null }>((after) => {
      let q = db.from('book_series').select('id,name,genre,direction').eq('user_id', session.userId).order('id').limit(pageSize)
      if (after) q = q.gt('id', after)
      return q
    })
    for (const row of rows) mapped.set(row.id, { ...row, ownerVerified: true })
  } catch (error) {
    if (!isSchemaMissing(error) && (error as { code?: string }).code !== '42501') throw error
  }
  return [...mapped.values()]
}

export async function requireOwnedSeries(session: WorkspaceSession, seriesId: string) {
  checkId(seriesId)
  const db = reportingDatabase() ?? session.db
  const { data, error } = await db.from('book_series').select('id').eq('id', seriesId).eq('user_id', session.userId).maybeSingle()
  if (error && error.code !== '42501' && !isSchemaMissing(error)) throw new WorkspaceError(503, 'Не удалось проверить владельца серии')
  if (!data) throw new WorkspaceError(404, 'Серия недоступна для управления')
}
