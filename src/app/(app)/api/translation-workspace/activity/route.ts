import type { WorkspaceActivity } from '@/lib/translationWorkspaceTypes'
import { ownedBooks, requireAdmin, workspaceRoute } from '../access'
import { attentionRows, ownAttention, translationRows } from './feed'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return workspaceRoute(request, async session => {
    requireAdmin(session)
    const books = new Map((await ownedBooks(session)).map(book => [book.id, book]))
    if (!books.size) return Response.json({ attention: [], translations: [], attentionAvailable: true, attentionComplete: true, translationsAvailable: true } satisfies WorkspaceActivity)
    const [attention, translations] = await Promise.all([
      attentionRows(request, session), translationRows(request, session, books),
    ])
    return Response.json({
      attention: ownAttention(attention.rows ?? [], books), translations: translations ?? [],
      attentionAvailable: attention.rows !== null, attentionComplete: attention.complete,
      translationsAvailable: translations !== null,
    } satisfies WorkspaceActivity)
  })
}
