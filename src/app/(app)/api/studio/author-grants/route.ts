import { forwardWorkspaceRequest, requireAdmin, workspaceRoute } from '../../translation-workspace/access'
import { verifiedAccount } from '../../translation-workspace/projectData'

export const dynamic = 'force-dynamic'

function grants(request: Request) {
  return workspaceRoute(request, session => {
    requireAdmin(session)
    if (request.method !== 'GET') verifiedAccount(request, session)
    return forwardWorkspaceRequest(request, session)
  })
}

export { grants as GET, grants as PUT, grants as DELETE }
