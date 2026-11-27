import { forwardWorkspaceRequest, workspaceRoute } from '../../translation-workspace/access'
import { verifiedAccount } from '../../translation-workspace/projectData'

export const dynamic = 'force-dynamic'

export function GET(request: Request) {
  return workspaceRoute(request, session => forwardWorkspaceRequest(request, session))
}

export function PUT(request: Request) {
  return workspaceRoute(request, session => {
    verifiedAccount(request, session)
    return forwardWorkspaceRequest(request, session)
  })
}
