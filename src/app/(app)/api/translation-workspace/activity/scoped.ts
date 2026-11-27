import { pageSize, readPages, reportingDatabase, WorkspaceError, type WorkspaceSession } from '../access'
import type { WorkspaceBook, WorkspaceTranslation } from '@/lib/translationWorkspaceTypes'

type ReportingDb = NonNullable<ReturnType<typeof reportingDatabase>>
interface AttentionRow {
  id: string; book_id: string; block_id: string | null; language: string | null; step: string | null
  kind: string | null; reason: string | null; created_at: string
}

export async function scopedAttention(db: ReportingDb, session: WorkspaceSession) {
  const rows = await readPages<AttentionRow>(after => {
    let query = db.from('book_attention_queue')
      .select('id,book_id,block_id,language,step,kind,reason,created_at,books!inner(user_id)')
      .eq('books.user_id', session.userId).eq('status', 'open').order('id').limit(pageSize)
    if (after) query = query.gt('id', after)
    return query
  })
  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at)).map(r => ({
    id: r.id, bookId: r.book_id, blockId: r.block_id, language: r.language, step: r.step, kind: r.kind, reason: r.reason, createdAt: r.created_at,
  }))
}

export async function scopedOpenItem(db: ReportingDb, session: WorkspaceSession, bookId: string, id: string) {
  const { data, error } = await db.from('book_attention_queue').select('id,books!inner(user_id)')
    .eq('books.user_id', session.userId).eq('book_id', bookId).eq('id', id).eq('status', 'open').maybeSingle()
  if (error) throw new WorkspaceError(503, 'Не удалось проверить вопрос')
  if (!data) throw new WorkspaceError(404, 'Открытый вопрос не найден')
}

export async function scopedTranslations(db: ReportingDb, session: WorkspaceSession, books: Map<string, WorkspaceBook>) {
  const rows = await readPages<{ id: string; book_id: string; language: string; status: string; updated_at: string }>(after => {
    let query = db.from('fiction_translations').select('id,book_id,language,status,updated_at,books!inner(user_id)')
      .eq('books.user_id', session.userId).order('id').limit(pageSize)
    if (after) query = query.gt('id', after)
    return query
  })
  if (!rows.length) return []
  const chapterCounts = await readPages<{ id: string; chapters: { count: number }[] }>(after => {
    let query = db.from('books').select('id,chapters(count)').eq('user_id', session.userId).order('id').limit(pageSize)
    if (after) query = query.gt('id', after)
    return query
  })
  const totals = new Map(chapterCounts.map(r => [r.id, r.chapters[0]?.count ?? 0]))
  const results = new Map<string, WorkspaceTranslation>()
  for (const row of rows) {
    const book = books.get(row.book_id)
    if (!book) continue
    const key = `${row.book_id}/${row.language}`
    let result = results.get(key)
    if (!result) {
      result = { bookId: book.id, title: book.title, language: row.language, totalChapters: totals.get(book.id) ?? 0,
        doneChapters: 0, errorChapters: 0, state: 'pending', percent: 0, updatedAt: null }
      results.set(key, result)
    }
    if (row.status === 'done') result.doneChapters++
    if (row.status === 'error') result.errorChapters++
    if (row.status === 'translating') result.state = 'partial'
    if (!result.updatedAt || row.updated_at > result.updatedAt) result.updatedAt = row.updated_at
  }
  for (const result of results.values()) {
    if (!result.totalChapters) continue
    result.percent = Math.min(100, Math.round(100 * result.doneChapters / result.totalChapters))
    if (result.doneChapters >= result.totalChapters) result.state = 'complete'
    else if (result.doneChapters || result.errorChapters) result.state = 'partial'
  }
  return [...results.values()].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
}
