import { checkId, ownedBooks, readPages, reportingDatabase, upstream, workspaceRoute, WorkspaceError } from '../../../access'
import { projectCatalog } from '../../../projectData'

type Row = { id: string; book_id: string; language: string; status: string }
export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  return workspaceRoute(request, async session => {
    const projectId = checkId((await params).projectId)
    const catalog = await projectCatalog(session, await ownedBooks(session), projectId)
    if (!catalog.projects?.some(p => p.id === projectId)) throw new WorkspaceError(404, 'Проект не найден')
    if (session.role === 'author') {
      const grant = await upstream(request, session, '/api/studio/translation-access')
      if (!grant.ok) return grant
      if ((await grant.json()).canStartTranslation !== true) throw new WorkspaceError(403, 'Требуется приглашение в Studio')
    }
    const ids = catalog.books.filter(b => b.projectId === projectId && !b.projectArchived).map(b => b.id)
    const db = reportingDatabase() ?? session.db
    const versions = []
    for (let i = 0; i < ids.length; i += 100) {
      const rows = await readPages<Row>(after => {
        let query = db.from('book_glossaries').select('id,book_id,language,status,books!inner(user_id)')
          .in('book_id', ids.slice(i, i + 100)).eq('books.user_id', session.userId).order('id').limit(500)
        if (after) query = query.gt('id', after)
        return query
      })
      versions.push(...rows.map(row => ({ bookId: row.book_id, lang: row.language.toUpperCase(), state: row.status })))
    }
    return Response.json({ versions })
  })
}
