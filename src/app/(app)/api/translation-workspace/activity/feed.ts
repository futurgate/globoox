import type { WorkspaceAttention, WorkspaceBook, WorkspaceTranslation } from '@/lib/translationWorkspaceTypes'
import { reportingDatabase, upstream, WorkspaceError, type WorkspaceSession } from '../access'
import { scopedAttention, scopedOpenItem, scopedTranslations } from './scoped'

type FeedRow = Record<string, unknown>

async function collection(request: Request, session: WorkspaceSession, path: string, key: string): Promise<FeedRow[] | null> {
  const result = await upstream(request, session, path)
  if (!result.ok) return null
  const data: unknown = await result.json().catch(() => null)
  const rows = data && typeof data === 'object' ? (data as Record<string, unknown>)[key] : null
  return Array.isArray(rows) ? rows.filter((row): row is FeedRow => row !== null && typeof row === 'object') : null
}

const optionalText = (value: unknown) => typeof value === 'string' ? value : null

export async function attentionRows(request: Request, session: WorkspaceSession) {
  const db = reportingDatabase()
  if (db) {
    try { return { rows: await scopedAttention(db, session), complete: true } } catch { /* installed API may still supply the feed */ }
  }
  const rows = await collection(request, session, '/api/admin/attention?limit=500', 'items')
  return { rows, complete: rows !== null && rows.length < 500 }
}

export function ownAttention(rows: FeedRow[], books: Map<string, WorkspaceBook>): WorkspaceAttention[] {
  return rows.flatMap(row => {
    const book = typeof row.bookId === 'string' && books.get(row.bookId)
    if (!book || typeof row.id !== 'string') return []
    return [{
      id: row.id, bookId: book.id, bookTitle: book.title, blockId: optionalText(row.blockId), language: optionalText(row.language),
      step: optionalText(row.step), kind: optionalText(row.kind),
      reason: optionalText(row.reason), createdAt: optionalText(row.createdAt),
    }]
  })
}

export async function translationRows(request: Request, session: WorkspaceSession, books: Map<string, WorkspaceBook>): Promise<WorkspaceTranslation[] | null> {
  const db = reportingDatabase()
  if (db) {
    try { return await scopedTranslations(db, session, books) } catch { /* fall back to the installed fiction history */ }
  }
  const rows = await collection(request, session, '/api/books/fiction-translations', 'entries')
  return rows?.flatMap(row => {
    const book = typeof row.bookId === 'string' && books.get(row.bookId)
    if (!book || typeof row.language !== 'string') return []
    return [{
      bookId: book.id, title: book.title, language: row.language,
      totalChapters: Number(row.totalChapters) || 0, doneChapters: Number(row.doneChapters) || 0,
      errorChapters: Number(row.errorChapters) || 0, percent: Number(row.percent) || 0,
      state: optionalText(row.state) ?? 'pending', updatedAt: optionalText(row.updatedAt),
    }]
  }) ?? null
}

export async function requireOpenItem(request: Request, session: WorkspaceSession, bookId: string, id: string) {
  const db = reportingDatabase()
  if (db) return scopedOpenItem(db, session, bookId, id)
  const { rows } = await attentionRows(request, session)
  if (!rows) throw new WorkspaceError(503, 'Список вопросов недоступен')
  if (!rows.some(row => row.id === id && row.bookId === bookId)) throw new WorkspaceError(404, 'Открытый вопрос не найден')
}
