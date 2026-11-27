import { bodyObject, checkId, requireAdmin, upstream, workspaceRoute, WorkspaceError } from '../../access'

export const maxDuration = 300

export async function POST(request: Request) {
  return workspaceRoute(request, async session => {
    requireAdmin(session)
    const { zip_path, name, genre, file_name } = await bodyObject(request)
    const prefix = `series-${session.userId}-`
    if (typeof zip_path !== 'string' || !zip_path.startsWith(prefix) || !zip_path.endsWith('.zip')) {
      throw new WorkspaceError(400, 'Недопустимый путь загрузки')
    }
    checkId(zip_path.slice(prefix.length, -4), 'Файл загрузки не найден')
    return upstream(request, session, '/api/series/process', { zip_path, name, genre, file_name })
  })
}
