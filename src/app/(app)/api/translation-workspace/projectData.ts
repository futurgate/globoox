import type { WorkspaceBook, WorkspaceProject } from '@/lib/translationWorkspaceTypes'
import { isSchemaMissing, pageSize, readPages, WorkspaceError, type WorkspaceSession } from './access'

interface ProjectRow {
  id: string
  name: string
  source_series_id: string | null
  source_book_id: string | null
}

interface MembershipRow {
  id: string
  project_id: string
  archived_at: string | null
}

export function verifiedAccount(request: Request, session: WorkspaceSession) {
  if (request.headers.get('X-Workspace-Account') !== session.userId) {
    throw new WorkspaceError(409, 'Аккаунт изменился. Обновите страницу.')
  }
}

export function projectName(value: unknown, entity: 'проекта' | 'серии' = 'проекта'): string {
  if (typeof value !== 'string' || !value.trim() || [...value.trim()].length > 200) {
    throw new WorkspaceError(400, 'Название ' + entity + ' должно содержать от 1 до 200 символов.')
  }
  return value.trim()
}

export async function ownedProjects(session: WorkspaceSession): Promise<WorkspaceProject[]> {
  const rows = await readPages<ProjectRow>(after => {
    let q = session.db.from('studio_projects').select('id,name,source_series_id,source_book_id')
      .eq('user_id', session.userId).order('id').limit(pageSize)
    if (after) q = q.gt('id', after)
    return q
  })
  return rows.map(r => ({ id: r.id, name: r.name, sourceSeriesId: r.source_series_id, sourceBookId: r.source_book_id }))
}

export async function projectCatalog(session: WorkspaceSession, books: WorkspaceBook[], projectId?: string) {
  try {
    const [projects, members] = await Promise.all([
      ownedProjects(session),
      readPages<MembershipRow>(after => {
        let q = session.db.from('studio_project_books').select('id:book_id,project_id,archived_at')
          .eq('user_id', session.userId).order('book_id').limit(pageSize)
        if (projectId) q = q.eq('project_id', projectId)
        if (after) q = q.gt('book_id', after)
        return q
      }),
    ])
    const byBook = new Map(members.map(m => [m.id, m]))
    const scopedBooks = projectId ? books.filter(b => byBook.has(b.id)) : books
    return {
      projects,
      books: scopedBooks.map(b => {
        const member = byBook.get(b.id)
        return { ...b, projectId: member?.project_id ?? null, projectArchived: Boolean(member?.archived_at) }
      }),
    }
  } catch (error) {
    if (projectId || !isSchemaMissing(error)) throw error
    return { books }
  }
}

export function assertProjectWrite(error: { code?: string } | null, id: unknown): string {
  if (!error && typeof id === 'string' && id) return id
  if (error?.code === 'P0002' || error?.code === '42501') throw new WorkspaceError(404, 'Книга или проект недоступны.')
  if (error?.code === '22023') throw new WorkspaceError(400, 'Проверьте параметры проекта.')
  if (error?.code === '23503' || error?.code === '40001' || error?.code === '55000') {
    throw new WorkspaceError(409, 'Проект изменился. Обновите страницу.')
  }
  throw new WorkspaceError(503, 'Не удалось подтвердить изменение проекта. Обновите каталог.')
}
