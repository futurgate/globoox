import type { WorkspaceReviewBlock } from '@/lib/translationWorkspaceTypes'
import { checkId, reportingDatabase, WorkspaceError, type WorkspaceSession } from './access'

interface BlockRow {
  id: string
  original_text: string
  translations: Record<string, string | null> | null
  position: number | null
  chapters: { title: string | null; chapter_number: number | null }
}

export async function reviewBlock(session: WorkspaceSession, bookId: string, query: URLSearchParams): Promise<WorkspaceReviewBlock> {
  const id = checkId(query.get('blockId'), 'Фрагмент не найден')
  const lang = query.get('lang')?.toUpperCase()
  if (!lang || !/^[A-Z]{2,3}$/.test(lang)) throw new WorkspaceError(400, 'Укажите язык перевода')
  const db = reportingDatabase() ?? session.db
  const { data, error } = await db.from('content_blocks')
    .select('id,original_text,translations,position,chapters!inner(book_id,title,chapter_number,books!inner(user_id))')
    .eq('id', id).eq('chapters.book_id', bookId).eq('chapters.books.user_id', session.userId)
    .maybeSingle<BlockRow>()
  if (error) throw new WorkspaceError(503, 'Не удалось прочитать фрагмент книги')
  if (!data) throw new WorkspaceError(404, 'Фрагмент не найден')
  const translation = data.translations?.[lang] ?? data.translations?.[lang.toLowerCase()]
  return {
    id: data.id, original: data.original_text, translated: typeof translation === 'string' ? translation : null,
    chapterTitle: data.chapters.title, chapterNumber: data.chapters.chapter_number, position: data.position,
  }
}
