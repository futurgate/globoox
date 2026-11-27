import { bodyObject, checkId, ownedBooks, workspaceRoute, WorkspaceError } from '../../access'
import { assertProjectWrite, projectCatalog, projectName, projectWriteFailure, verifiedAccount } from '../../projectData'

type Context = { params: Promise<{ projectId: string }> }

export async function GET(request: Request, context: Context) {
  return workspaceRoute(request, async session => {
    const id = checkId((await context.params).projectId)
    const result = await projectCatalog(session, await ownedBooks(session), id)
    const project = result.projects?.find(p => p.id === id)
    if (!project) throw new WorkspaceError(404, 'Проект не найден.')
    return Response.json({ project, books: result.books })
  })
}

export async function PATCH(request: Request, context: Context) {
  return workspaceRoute(request, async session => {
    verifiedAccount(request, session)
    const id = checkId((await context.params).projectId)
    const body = await bodyObject(request)
    if (body.action === 'archive' || body.action === 'restore') {
      const archived = body.action === 'archive'
      const { data, error } = await session.db.rpc('studio_archive_project', { p_project_id: id, p_archived: archived })
      return Response.json({ id: assertProjectWrite(error, data), archived })
    }
    if (body.action === 'reorder') {
      const { bookIds, expectedRevision } = body
      if (!Array.isArray(bookIds) || typeof expectedRevision !== 'number' ||
          !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
        throw new WorkspaceError(400, 'Передайте сохранённую версию и полный порядок книг.')
      }
      const ids = bookIds.map(bookId => checkId(bookId).toLowerCase())
      if (new Set(ids).size !== ids.length) throw new WorkspaceError(400, 'Книга повторяется в очереди.')
      const { data, error } = await session.db.rpc('studio_reorder_project', {
        p_project_id: id, p_expected_revision: expectedRevision, p_book_ids: ids,
      })
      if (error || !Number.isSafeInteger(data) || data < 0) projectWriteFailure(error)
      return Response.json({ id, orderRevision: data })
    }
    if (body.action !== undefined) throw new WorkspaceError(400, 'Неизвестное действие с проектом.')
    const name = projectName(body.name)
    const { data, error } = await session.db.rpc('studio_rename_project', { p_project_id: id, p_name: name })
    return Response.json({ id: assertProjectWrite(error, data), name })
  })
}
