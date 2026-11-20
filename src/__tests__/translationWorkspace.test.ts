import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET as catalog } from '../app/(app)/api/translation-workspace/route'
import { GET as bookGet, POST as bookPost } from '../app/(app)/api/translation-workspace/books/[bookId]/[action]/route'
import { GET as activity } from '../app/(app)/api/translation-workspace/activity/route'
import { POST as seriesPost } from '../app/(app)/api/translation-workspace/series/[seriesId]/[action]/route'
import { POST as importSeries } from '../app/(app)/api/translation-workspace/series/import/route'

const { createClient, reportingClient, proxy } = vi.hoisted(() => ({ createClient: vi.fn(), reportingClient: vi.fn(), proxy: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient }))
vi.mock('@supabase/supabase-js', () => ({ createClient: reportingClient }))
vi.mock('../app/(app)/api/_proxy', () => ({ requireBackendProxy: proxy }))

const owner = '00000000-0000-4000-a000-000000000001'
const book = '00000000-0000-4000-a000-000000000002'
const foreign = '00000000-0000-4000-a000-000000000003'
const series = '00000000-0000-4000-a000-000000000004'
const item = '00000000-0000-4000-a000-000000000005'
const another = '00000000-0000-4000-a000-000000000006'
const base = 'https://dev.example/api/translation-workspace'
const owned = { id: book, user_id: owner, title: 'Owned', series_id: series, volume_number: 1 }
const other = { id: foreign, user_id: foreign, title: 'Other', series_id: another }
let tables: Record<string, Record<string, unknown>[]>
let actor: string | null
const get = () => new Request(base)
const post = (body: unknown) => new Request(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const context = (bookId: string, action: string) => ({ params: Promise.resolve({ bookId, action }) })

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
  actor = owner
  tables = {
    books: [owned, other], profiles: [{ id: owner, is_admin: true }],
    book_series: [{ id: series, user_id: owner, name: 'Own series' }, { id: another, user_id: foreign, name: 'Private' }],
  }
  const client = {
    auth: { getUser: async () => ({ data: { user: actor ? { id: actor } : null }, error: null }) },
    from(table: string) {
      let records = tables[table]
      const result = () => ({ data: records.slice(0, 1), error: null }) // deployment limit below requested page size
      const query = {
        select() { return query }, order() { return query }, limit() { return query }, returns() { return query },
        eq(key: string, val: unknown) { records = records.filter(r => r[key] === val); return query },
        gt(key: string, val: string) { records = records.filter(r => String(r[key]) > val); return query },
        maybeSingle: async () => ({ data: records[0] ?? null, error: null }),
        then(resolve: (value: ReturnType<typeof result>) => unknown) { return Promise.resolve(result()).then(resolve) },
      }
      return query
    },
  }
  createClient.mockResolvedValue(client)
  reportingClient.mockReturnValue(client)
  proxy.mockImplementation(async () => Response.json({ ok: true }))
})

describe('live translation workspace boundaries', () => {
  it('requires a verified session and prevents caching', async () => {
    actor = null
    const res = await catalog(get())
    expect(res.status).toBe(401)
    expect(res.headers.get('Cache-Control')).toContain('no-store')
    expect(proxy).not.toHaveBeenCalled()
  })

  it('shows only owned books and series, including pages below the requested size', async () => {
    tables.books.push({ ...owned, id: another, series_id: null })
    const data = await (await catalog(get())).json()
    expect(data.books.map((b: {id: string}) => b.id)).toEqual([book, another])
    expect(data.series.map((s: {id: string}) => s.id)).toEqual([series])
    expect(data.userId).toBe(owner)
    expect(data.role).toBe('admin')
  })

  it('rejects direct access to another book and glossary seeds even for admins', async () => {
    expect((await bookGet(get(), context(foreign, 'download-translated'))).status).toBe(404)
    expect((await bookPost(post({ sourceBookId: foreign }), context(book, 'copy-glossary'))).status).toBe(404)
    expect((await bookPost(post({ seedFromBookId: foreign }), context(book, 'generate-glossary'))).status).toBe(404)
    expect(proxy).not.toHaveBeenCalled()
  })

  it('forwards a supported author estimate while keeping admin operations restricted', async () => {
    tables.profiles[0].is_admin = false
    expect((await bookGet(get(), context(book, 'download-translated'))).status).toBe(403)
    expect((await bookPost(post({}), context(book, 'translate-full-book'))).status).toBe(403)
    expect((await bookGet(get(), context(book, 'translation-estimate'))).status).toBe(200)
    expect(proxy).toHaveBeenCalledTimes(1)
    expect(proxy.mock.calls[0][1]).toBe(owner)
  })

  it('uses the verified book for a QA action', async () => {
    expect((await bookPost(post({ bookId: foreign, targetLang: 'EN' }), context(book, 'translation-quality'))).status).toBe(200)
    const forwarded = proxy.mock.calls[0][0] as Request
    expect(new URL(forwarded.url).pathname).toBe('/api/admin/translation-quality')
    expect((await forwarded.json()).bookId).toBe(book)
  })

  it('returns only a review block from the requested owned book, in the selected language', async () => {
    const row = { id: item, 'chapters.book_id': book, 'chapters.books.user_id': owner, position: 0,
      original_text: 'Текст', translations: { en: 'Text', FR: 'Texte' }, chapters: { title: 'Глава', chapter_number: 1 } }
    tables.content_blocks = [
      row, { ...row, id: another, 'chapters.book_id': foreign, 'chapters.books.user_id': foreign },
    ]
    const read = (blockId: string, lang = 'EN') => bookGet(new Request(`${base}?blockId=${blockId}&lang=${lang}`), context(book, 'review-block'))
    expect(await (await read(item)).json()).toEqual({ id: item, original: 'Текст', translated: 'Text', chapterTitle: 'Глава', chapterNumber: 1, position: 0 })
    expect((await (await read(item, 'ES')).json()).translated).toBeNull()
    expect((await read(another)).status).toBe(404)
    expect((await read(series)).status).toBe(404)
    tables.profiles[0].is_admin = false
    expect((await read(item)).status).toBe(403)
    expect(proxy).not.toHaveBeenCalled()
  })

  it('excludes unrelated attention and translation jobs and prevents cross-book resolution', async () => {
    proxy.mockImplementation(async (r: Request) => new URL(r.url).pathname === '/api/admin/attention'
      ? Response.json({ items: [{ id: item, bookId: foreign }, { id: another, bookId: book, blockId: item }] })
      : Response.json({ entries: [{ bookId: foreign, language: 'EN' }, { bookId: book, language: 'FR' }] }))
    const res = await (await activity(get())).json()
    expect(res.attention.map((r: {id: string}) => r.id)).toEqual([another])
    expect(res.attention[0].blockId).toBe(item)
    expect(res.translations.map((r: {bookId: string}) => r.bookId)).toEqual([book])
    expect((await bookPost(post({ id: item }), context(book, 'resolve-attention'))).status).toBe(404)
  })

  it('reads all personal activity pages when server-side reporting is configured', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'local-test-credential')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://local.example')
    tables.books[0].chapters = [{ count: 4 }]
    const row = { 'books.user_id': owner, book_id: book, language: 'EN', updated_at: '2026-11-20' }
    tables.fiction_translations = [
      { ...row, id: book, status: 'done' }, { ...row, id: series, status: 'error' },
      { ...row, id: item, 'books.user_id': foreign, book_id: foreign, status: 'done' },
    ]
    tables.book_attention_queue = [
      { ...row, id: item, block_id: another, status: 'open', created_at: '2026-11-20', reason: 'Review' },
      { ...row, id: another, 'books.user_id': foreign, book_id: foreign, status: 'open', created_at: '2026-11-20' },
    ]
    const data = await (await activity(get())).json()
    expect(data.attentionComplete).toBe(true)
    expect(data.attention).toHaveLength(1)
    expect(data.attention[0]).toMatchObject({ id: item, bookId: book, blockId: another })
    expect(data.translations).toHaveLength(1)
    expect(data.translations[0]).toMatchObject({ bookId: book, totalChapters: 4, doneChapters: 1, errorChapters: 1, percent: 25 })
    expect(proxy).not.toHaveBeenCalled()
  })

  it('requires the series row itself and every volume to belong to the actor', async () => {
    const ctx = { params: Promise.resolve({ seriesId: series, action: 'run' }) }
    tables.book_series[0].user_id = foreign
    expect((await seriesPost(post({}), ctx)).status).toBe(404)
    expect(proxy).not.toHaveBeenCalled()
    tables.book_series[0].user_id = owner
    proxy.mockResolvedValue(Response.json({ id: series, volumes: [{ bookId: book }, { bookId: foreign }] }))
    expect((await seriesPost(post({}), ctx)).status).toBe(409)
    expect(proxy).toHaveBeenCalledTimes(1)
  })

  it('restricts ZIP import to paths assigned to this upload owner', async () => {
    expect((await importSeries(post({ zip_path: `series-${foreign}-${item}.zip` }))).status).toBe(400)
    expect(proxy).not.toHaveBeenCalled()
    expect((await importSeries(post({ zip_path: `series-${owner}-${item}.zip` }))).status).toBe(200)
  })
})
