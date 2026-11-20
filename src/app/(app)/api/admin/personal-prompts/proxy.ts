import { requireBackendProxy } from '../../_proxy'
import { requireAdmin, workspaceRoute, WorkspaceError } from '../../translation-workspace/access'

// Bind both the permission check and the upstream request to the same account.
export function personalPromptProxy(request: Request) {
  return workspaceRoute(request, async session => {
    requireAdmin(session)
    const displayedAccount = request.headers.get('X-Workspace-Account')
    if (displayedAccount !== null && displayedAccount !== session.userId) {
      throw new WorkspaceError(409, 'Аккаунт изменился. Откройте настройки заново.')
    }
    return requireBackendProxy(request, session.userId)
  })
}
