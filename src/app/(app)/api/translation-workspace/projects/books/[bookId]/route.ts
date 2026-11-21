import { bodyObject, checkId, workspaceRoute, WorkspaceError } from '../../../access'
import { assertProjectWrite, projectName, verifiedAccount } from '../../../projectData'

function checkSeriesWrite(error: { code?: string } | null) {
  if (!error) return
  if (error.code === '40001') throw new WorkspaceError(409, 'Состав серии изменился. Обновите список томов.')
  if (error.code === '55000') throw new WorkspaceError(409, 'Дождитесь окончания импорта серии.')
  if (error.code === '22023') throw new WorkspaceError(400, 'Проверьте параметры серии и порядок томов.')
  if (error.code === 'P0002' || error.code === '42501') throw new WorkspaceError(404, 'Книга или серия недоступны.')
  throw new WorkspaceError(503, 'Не удалось подтвердить изменение серии. Обновите список.')
}

export async function PATCH(request: Request, context: { params: Promise<{ bookId: string }> }) {
  return workspaceRoute(request, async session => {
    verifiedAccount(request, session)
    const bookId = checkId((await context.params).bookId)
    const body = await bodyObject(request)
    const { action, projectId, seriesId, previousBookId } = body
    if (action === 'start-series') {
      const firstBookId = checkId(body.firstBookId, 'Первая книга не найдена.')
      if (firstBookId.toLowerCase() === bookId.toLowerCase()) throw new WorkspaceError(400, 'Выберите две разные книги.')
      const name = projectName(body.name, 'серии')
      if (typeof body.genre !== 'string' || !['litrpg', 'nonfiction', 'other'].includes(body.genre)) {
        throw new WorkspaceError(400, 'Выберите жанр серии.')
      }
      if (!body.requestId) throw new WorkspaceError(400, 'Не указан идентификатор создания серии.')
      const requestId = checkId(body.requestId, 'Недопустимый идентификатор создания серии.')
      const { data, error } = await session.db.rpc('studio_create_series_from_books', {
        p_first_book_id: firstBookId, p_second_book_id: bookId, p_name: name, p_genre: body.genre, p_request_id: requestId,
      })
      checkSeriesWrite(error)
      if (typeof data !== 'string' || data.toLowerCase() !== requestId.toLowerCase()) {
        throw new WorkspaceError(503, 'Не удалось подтвердить создание серии. Обновите список.')
      }
      return Response.json({ ok: true, seriesId: data, volumeNumber: 2 })
    }
    if (action === 'append-to-series') {
      if (previousBookId === undefined) throw new WorkspaceError(400, 'Обновите список томов серии.')
      const series = checkId(seriesId, 'Серия не найдена.')
      const previous = previousBookId === null ? null : checkId(previousBookId, 'Предыдущий том не найден.')
      const { data, error } = await session.db.rpc('studio_append_series_book', {
        p_book_id: bookId, p_series_id: series, p_after_book_id: previous,
      })
      checkSeriesWrite(error)
      if (!Number.isSafeInteger(data) || data < 1) throw new WorkspaceError(503, 'Не удалось подтвердить добавление тома. Обновите список.')
      return Response.json({ ok: true, volumeNumber: data })
    }
    if (action !== 'move' && action !== 'archive' && action !== 'restore') {
      throw new WorkspaceError(400, 'Неизвестное действие с книгой.')
    }
    if (action !== 'move' && projectId !== undefined) throw new WorkspaceError(400, 'Укажите только действие.')
    const target = action === 'move' ? checkId(projectId, 'Проект не найден.') : null
    const { data, error } = await session.db.rpc('studio_manage_project_book', {
      p_book_id: bookId, p_action: action, p_project_id: target,
    })
    assertProjectWrite(error, data)
    return Response.json({ ok: true })
  })
}
