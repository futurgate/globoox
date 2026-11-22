import { forwardWorkspaceRequest, requireOwnedBook, workspaceRoute } from '../../../translation-workspace/access'

export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ id: string }> }

async function cover(request: Request, { params }: Context) {
  const { id } = await params
  return workspaceRoute(request, async session => {
    await requireOwnedBook(session, id)
    return forwardWorkspaceRequest(request, session)
  })
}

export { cover as GET, cover as PUT, cover as DELETE }
