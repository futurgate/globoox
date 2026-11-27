import { createClient as createDatabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { requireBackendProxy, type ProxyIdentity } from '../_proxy'
import { requestBearer } from '@/lib/supabase/requestBearer'
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

async function authenticate(request: Request) {
  let db = await createClient()
  let auth = await db.auth.getUser()
  let verifiedBearer: ProxyIdentity | undefined
  const token = requestBearer(request)
  if (!auth.data.user && token) {
    auth = await db.auth.getUser(token)
    if (auth.data.user) {
      verifiedBearer = { userId: auth.data.user.id, token }
      // RLS and auth.uid() in project RPCs must use the same verified user.
      db = createDatabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: 'Bearer ' + token } },
      })
    }
  }
  const user = auth.data.user
  if (!user) {
    if ((auth.error?.status ?? 0) >= 500) throw new WorkspaceError(503, 'Сервис входа временно недоступен')
    throw new WorkspaceError(401, 'Требуется вход')
  }
  const { data, error } = await db.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (error) throw new WorkspaceError(503, 'Не удалось проверить права')
  return { db, userId: user.id, verifiedBearer, role: data?.is_admin === true ? 'admin' as const : 'author' as const }
}
export type WorkspaceSession = Awaited<ReturnType<typeof authenticate>>

export async function workspaceRoute(request: Request, handler: (session: WorkspaceSession) => Promise<Response>) {
  let response: Response
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const origin = request.headers.get('origin')
      if (origin && origin !== new URL(request.url).origin) throw new WorkspaceError(403, 'Недоступный источник запроса')
    }
    response = await handler(await authenticate(request))
  } catch (error) {
    response = Response.json({ error: error instanceof WorkspaceError ? error.message : 'Данные кабинета временно недоступны' }, {
      status: error instanceof WorkspaceError ? error.status : 503,
    })
  }
  response.headers.set('Cache-Control', 'private, no-store')
  response.headers.set('Vary', 'Cookie, Authorization')
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
  const outgoing = new Request(url, body === undefined
    ? { method: 'GET' }
    : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return forwardWorkspaceRequest(outgoing, session)
}

export function forwardWorkspaceRequest(request: Request, session: WorkspaceSession) {
  return session.verifiedBearer
    ? requireBackendProxy(request, session.userId, session.verifiedBearer)
    : requireBackendProxy(request, session.userId)
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

export function isSchemaMissing(error: unknown) {
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

async function readOwnedSeries<T>(session: WorkspaceSession, read: (db: WorkspaceSession['db'], relation: string) => Promise<T>) {
  const reporting = reportingDatabase()
  if (reporting) return read(reporting, 'book_series')
  try { return await read(session.db, 'studio_owned_series') } catch (error) {
    if (!isSchemaMissing(error)) throw error
    return read(session.db, 'book_series')
  }
}

export async function ownedSeries(session: WorkspaceSession, books: WorkspaceBook[]): Promise<WorkspaceSeries[]> {
  const mapped = new Map<string, WorkspaceSeries>()
  for (const { seriesId } of books) {
    if (seriesId) mapped.set(seriesId, { id: seriesId, name: null, genre: null, direction: null, ownerVerified: false })
  }
  type SeriesRow = Pick<WorkspaceSeries, 'id' | 'name' | 'genre' | 'direction'>
  try {
    const rows = await readOwnedSeries(session, (db, relation) => readPages<SeriesRow>(after => {
      let q = db.from(relation).select('id,name,genre,direction').eq('user_id', session.userId).order('id').limit(pageSize)
      if (after) q = q.gt('id', after)
      return q
    }))
    for (const row of rows) mapped.set(row.id, { ...row, ownerVerified: true })
  } catch (error) {
    if (!isSchemaMissing(error) && (error as { code?: string }).code !== '42501') throw error
  }
  return [...mapped.values()]
}

export async function requireOwnedSeries(session: WorkspaceSession, seriesId: string) {
  checkId(seriesId)
  let row
  try {
    row = await readOwnedSeries(session, async (db, relation) => {
      const { data, error } = await db.from(relation).select('id').eq('id', seriesId).eq('user_id', session.userId).maybeSingle()
      if (error) throw error
      return data
    })
  } catch (error) {
    if (!isSchemaMissing(error) && (error as { code?: string }).code !== '42501') {
      throw new WorkspaceError(503, 'Не удалось проверить владельца серии')
    }
  }
  if (!row) throw new WorkspaceError(404, 'Серия недоступна для управления')
}
