import { forwardWorkspaceRequest, workspaceRoute } from '../../translation-workspace/access'
import { verifiedAccount } from '../../translation-workspace/projectData'

export const dynamic = 'force-dynamic'

function languages(request: Request) {
  return workspaceRoute(request, session => {
    verifiedAccount(request, session)
    return forwardWorkspaceRequest(request, session)
  })
}

export { languages as GET, languages as PATCH }
