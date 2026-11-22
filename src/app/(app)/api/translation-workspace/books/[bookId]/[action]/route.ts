import type { BookStagePrompt } from '@/lib/api'
import { bodyObject, checkId, requireAdmin, requireOwnedBook, upstream, workspaceRoute, WorkspaceError } from '../../../access'
import { requireOpenItem } from '../../../activity/feed'
import { reviewBlock } from '../../../reviewBlock'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const reads = new Set([
  'run',
  'translation-estimate', 'download', 'download-translated', 'translate-full-book', 'generate-glossary',
  'reader-check', 'reader-check-journal', 'reader-check-cost-runs', 'revise-full-book',
  'glossary-retranslate', 'revision-diff', 'revise-cost-runs', 'fiction-costs', 'fiction-cost-runs', 'review-block', 'stage-prompts',
])
const writeFields = new Map<string, string[]>([
  ['run', ['lang', 'studioRun']],
  ['generate-glossary', ['lang', 'restart', 'force', 'model', 'seedFromBookId', 'seedStarterGenre', 'studioRun']],
  ['set-glossary', ['lang', 'glossary', 'force', 'expectedUpdatedAt']],
  ['glossary-usages', ['lang', 'kind', 'source', 'expectedUpdatedAt', 'offset']],
  ['glossary-retranslate', ['lang', 'kind', 'source', 'expectedUpdatedAt', 'requestId', 'blocks']],
  ['copy-glossary', ['lang', 'sourceBookId', 'force']],
  ['glossary-freeze', ['lang', 'frozen']],
  ['stop-stage', ['lang', 'stage']],
  ['translate-full-book', ['lang', 'mode', 'useGlossary', 'overwrite', 'model', 'studioRun']],
  ['revise-full-book', ['lang', 'useGlossary', 'overwrite', 'model']],
  ['revise-apply', ['lang', 'blockId', 'action', 'editedText']],
  ['reader-check', ['lang', 'variant', 'model', 'restart']],
  ['reader-check-apply', ['lang', 'itemId', 'action', 'editedText']],
  ['translation-quality', ['targetLang', 'genre']],
  ['resolve-attention', ['id']],
])
const authorReads = new Set(['run', 'translation-estimate', 'download', 'download-translated'])
// The corresponding upstream routes check the current invitation and book ownership.
const editorialReads = new Set(['generate-glossary', 'glossary-retranslate', 'revision-diff', 'reader-check-journal', 'review-block'])
const editorialWrites = new Set(['set-glossary', 'glossary-usages', 'glossary-retranslate', 'revise-apply', 'reader-check-apply'])
type Context = { params: Promise<{ bookId: string; action: string }> }

export async function GET(request: Request, { params }: Context) {
  return workspaceRoute(request, async session => {
    const { bookId, action } = await params
    if (!reads.has(action)) throw new WorkspaceError(404, 'Действие не найдено')
    if (!authorReads.has(action) && !editorialReads.has(action)) requireAdmin(session)
    await requireOwnedBook(session, bookId)
    const query = new URL(request.url).searchParams
    if (action === 'stage-prompts') {
      const search = new URLSearchParams({ bookId, lang: query.get('lang') ?? '' })
      const response = await upstream(request, session, '/api/admin/fiction-book-prompts?' + search)
      if (!response.ok) return response
      const { stages } = await response.json() as { stages: BookStagePrompt[] }
      if (!Array.isArray(stages)) throw new WorkspaceError(502, 'Не удалось получить шаблоны этапов')
      return Response.json(stages.map(({ stage, name, overridden }) => ({ stage, name, overridden })))
    }
    if (action === 'review-block') {
      // This read uses Studio's reporting database, so there is no upstream book route to check the invitation.
      if (session.role === 'author') {
        const access = await upstream(request, session, '/api/studio/translation-access')
        if (!access.ok) return access
        if ((await access.json()).canStartTranslation !== true) throw new WorkspaceError(403, 'Требуется приглашение в Studio')
      }
      return Response.json(await reviewBlock(session, bookId, query))
    }
    const allowed = action === 'run' ? ['lang', 'runId'] : action === 'translation-estimate' ? ['studioTargetLang', 'model', 'input_price', 'output_price', 'chars_per_token']
      : action === 'revision-diff' ? ['lang', 'changedOnly'] : action === 'download' ? [] : ['lang']
    const search = new URLSearchParams()
    for (const field of allowed) {
      const value = query.get(field)
      if (value !== null) search.set(field, value)
    }
    if (action === 'download') search.set('studio', '1')
    const backendAction = action === 'download-translated' && session.role === 'author' ? 'download-owned-translation' : action
    return upstream(request, session, `/api/books/${bookId}/${backendAction}${search.size ? `?${search}` : ''}`)
  })
}

export async function POST(request: Request, { params }: Context) {
  return workspaceRoute(request, async session => {
    const { bookId, action } = await params
    if (action !== 'run' && !editorialWrites.has(action)) requireAdmin(session)
    const fields = writeFields.get(action)
    if (!fields) throw new WorkspaceError(404, 'Действие не найдено')
    await requireOwnedBook(session, bookId)
    const input = await bodyObject(request)
    // The backend verifies the live grant and strictly validates the author command.
    if (action === 'run' && session.role === 'author') return upstream(request, session, `/api/books/${bookId}/run`, input)
    const body = Object.fromEntries(fields.filter(field => Object.hasOwn(input, field)).map(field => [field, input[field]]))
    if (action === 'set-glossary' && session.role === 'author') {
      delete body.force
      if (!Object.hasOwn(body, 'expectedUpdatedAt')) throw new WorkspaceError(400, 'Укажите версию глоссария')
    }
    if (action === 'copy-glossary') await requireOwnedBook(session, checkId(body.sourceBookId, 'Книга-источник не найдена'))
    if (action === 'generate-glossary' && body.seedFromBookId != null) {
      await requireOwnedBook(session, checkId(body.seedFromBookId, 'Книга-источник не найдена'))
    }
    // The upstream handlers bind each revision or journal item to this exact
    // book and language before either writes to the block.
    if (action === 'revise-apply') checkId(body.blockId, 'Фрагмент не найден')
    if (action === 'reader-check-apply') checkId(body.itemId, 'Предложение не найдено')
    if (action === 'translation-quality') return upstream(request, session, '/api/admin/translation-quality', { ...body, bookId })
    if (action === 'resolve-attention') {
      const id = checkId(body.id, 'Открытый вопрос не найден')
      await requireOpenItem(request, session, bookId, id)
      return upstream(request, session, '/api/admin/attention/resolve', { id })
    }
    return upstream(request, session, `/api/books/${bookId}/${action}`, body)
  })
}
