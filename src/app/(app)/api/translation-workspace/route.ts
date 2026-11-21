import type { WorkspaceData } from '@/lib/translationWorkspaceTypes'
import { ownedBooks, ownedSeries, workspaceRoute } from './access'

import { projectCatalog } from './projectData'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return workspaceRoute(request, async session => {
    const books = await ownedBooks(session)
    const [series, projects] = await Promise.all([ownedSeries(session, books), projectCatalog(session, books)])
    return Response.json({ userId: session.userId, role: session.role, series, ...projects } satisfies WorkspaceData)
  })
}
