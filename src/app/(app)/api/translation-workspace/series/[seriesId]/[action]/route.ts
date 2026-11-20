import { bodyObject, checkId, ownedBooks, reportingDatabase, requireAdmin, requireOwnedSeries, upstream, workspaceRoute, WorkspaceError, type WorkspaceSession } from '../../../access'

export const dynamic = 'force-dynamic'
export const maxDuration = 300
type Context = { params: Promise<{ seriesId: string; action: string }> }

async function seriesDetail(request: Request, session: WorkspaceSession, seriesId: string) {
  await requireOwnedSeries(session, seriesId)
  const [books, result] = await Promise.all([
    ownedBooks(session),
    upstream(request, session, `/api/series/${seriesId}`),
  ])
  if (!result.ok) throw new WorkspaceError(result.status, 'Не удалось получить состав серии')
  const detail = await result.json()
  if (detail?.id !== seriesId || !Array.isArray(detail.volumes)) throw new WorkspaceError(502, 'Не удалось проверить состав серии')
  const own = new Set(books.filter(b => b.seriesId === seriesId).map(b => b.id))
  const volumes = new Set<string>(detail.volumes.map((v: { bookId: string }) => v.bookId))
  const db = reportingDatabase()
  const actual = db ? await db.from('books').select('id', { count: 'exact', head: true }).eq('series_id', seriesId) : null
  if (actual?.error) throw new WorkspaceError(503, 'Не удалось подтвердить принадлежность всех томов')
  if (volumes.size !== detail.volumes.length || [...volumes].some(id => !own.has(id)) || volumes.size !== own.size
    || (actual ? actual.count !== own.size : volumes.size >= 1000)) {
    throw new WorkspaceError(409, 'Не удалось подтвердить принадлежность всех томов')
  }
  // The upstream gate is a process-global metric, not the owner's workload.
  const { id, name, genre, direction, createdAt, recipe } = detail
  return { detail: { id, name, genre, direction, createdAt, recipe, volumes: detail.volumes }, own }
}

export async function GET(request: Request, { params }: Context) {
  return workspaceRoute(request, async session => {
    requireAdmin(session)
    const { seriesId, action } = await params
    if (action !== 'detail') throw new WorkspaceError(404, 'Действие не найдено')
    return Response.json((await seriesDetail(request, session, seriesId)).detail)
  })
}

export async function POST(request: Request, { params }: Context) {
  return workspaceRoute(request, async session => {
    requireAdmin(session)
    const { seriesId, action } = await params
    if (action !== 'run' && action !== 'restart') throw new WorkspaceError(404, 'Действие не найдено')
    const { own } = await seriesDetail(request, session, seriesId)
    const body = await bodyObject(request)
    if (action === 'restart' && !own.has(checkId(body.bookId))) throw new WorkspaceError(404, 'Том не найден')
    const options = action === 'restart' ? { bookId: body.bookId, step: body.step, lang: body.lang, model: body.model }
      : { lang: body.lang, model: body.model }
    return upstream(request, session, `/api/series/${seriesId}/${action}`, options)
  })
}
