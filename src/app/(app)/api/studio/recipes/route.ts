import { forwardWorkspaceRequest, requireAdmin, workspaceRoute } from '../../translation-workspace/access'

export const dynamic = 'force-dynamic'

export function GET(request: Request) {
  return workspaceRoute(request, session => {
    requireAdmin(session)
    return forwardWorkspaceRequest(request, session)
  })
}
