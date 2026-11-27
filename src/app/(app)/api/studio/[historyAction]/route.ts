import { forwardWorkspaceRequest, workspaceRoute, WorkspaceError } from '../../translation-workspace/access'

export const dynamic = 'force-dynamic'
export const maxDuration = 300
const historyReads = new Set(['project-runs', 'workspace-runs', 'run-timeline', 'run-artifact', 'project-progress', 'glossary-sources'])

export async function GET(request: Request, { params }: { params: Promise<{ historyAction: string }> }) {
  const { historyAction } = await params
  return workspaceRoute(request, session => {
    if (!historyReads.has(historyAction)) throw new WorkspaceError(404, 'Действие не найдено')
    return forwardWorkspaceRequest(request, session)
  })
}
