import type { WorkspaceData } from '@/lib/translationWorkspaceTypes'
import { ownedBooks, ownedSeries, workspaceRoute } from './access'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return workspaceRoute(request, async session => {
    const books = await ownedBooks(session)
    return Response.json({ userId: session.userId, role: session.role, books, series: await ownedSeries(session, books) } satisfies WorkspaceData)
  })
}
