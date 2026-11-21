import { bodyObject, checkId, workspaceRoute } from '../access'
import { assertProjectWrite, ownedProjects, projectName, verifiedAccount } from '../projectData'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return workspaceRoute(request, async session => Response.json({ projects: await ownedProjects(session) }))
}

export async function POST(request: Request) {
  return workspaceRoute(request, async session => {
    verifiedAccount(request, session)
    const body = await bodyObject(request)
    const name = projectName(body.name)
    const requestId = body.requestId === undefined ? undefined : checkId(body.requestId, 'Недопустимый идентификатор создания.')
    const { data, error } = await session.db.rpc('studio_create_project', {
      p_name: name, ...(requestId ? { p_request_id: requestId } : {}),
    })
    return Response.json({ id: assertProjectWrite(error, data), name }, { status: 201 })
  })
}
