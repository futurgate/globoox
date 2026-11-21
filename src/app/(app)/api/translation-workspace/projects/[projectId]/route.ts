import { bodyObject, checkId, ownedBooks, workspaceRoute, WorkspaceError } from '../../access'
import { assertProjectWrite, projectCatalog, projectName, verifiedAccount } from '../../projectData'

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
    const name = projectName((await bodyObject(request)).name)
    const { data, error } = await session.db.rpc('studio_rename_project', { p_project_id: id, p_name: name })
    return Response.json({ id: assertProjectWrite(error, data), name })
  })
}
