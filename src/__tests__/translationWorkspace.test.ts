import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as createProject } from '../app/(app)/api/translation-workspace/projects/route'
import { GET as readProject, PATCH as renameProject } from '../app/(app)/api/translation-workspace/projects/[projectId]/route'
import { PATCH as updateMembership } from '../app/(app)/api/translation-workspace/projects/books/[bookId]/route'
import { GET as catalog } from '../app/(app)/api/translation-workspace/route'
import { GET as bookGet, POST as bookPost } from '../app/(app)/api/translation-workspace/books/[bookId]/[action]/route'
import { GET as activity } from '../app/(app)/api/translation-workspace/activity/route'
import { POST as seriesPost } from '../app/(app)/api/translation-workspace/series/[seriesId]/[action]/route'
import { GET as listPersonalPrompts } from '../app/(app)/api/admin/personal-prompts/route'
import { PATCH as changePersonalPrompt } from '../app/(app)/api/admin/personal-prompts/[id]/route'
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
const projectRpc = vi.fn()
const getUser = vi.fn()
let actor: string | null
const get = () => new Request(base)
const post = (body: unknown) => new Request(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const context = (bookId: string, action: string) => ({ params: Promise.resolve({ bookId, action }) })

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
  actor = owner
  tables = {
    studio_projects: [{ id: item, user_id: owner, name: 'Проект' }, { id: another, user_id: foreign, name: 'Other' }],
    studio_project_books: [
      { id: book, book_id: book, project_id: item, user_id: owner, archived_at: null },
      { id: foreign, book_id: foreign, project_id: another, user_id: foreign, archived_at: null },
    ],
    books: [owned, other], profiles: [{ id: owner, is_admin: true }],
    book_series: [{ id: series, user_id: owner, name: 'Own series' }, { id: another, user_id: foreign, name: 'Private' }],
  }
  tables.studio_owned_series = tables.book_series
  const client = {
    rpc: projectRpc.mockResolvedValue({ data: item, error: null }),
    auth: { getUser: getUser.mockImplementation(async (token?: string) => ({
      data: { user: token ? (token === 'fixture-user-token' ? { id: owner } : null) : actor ? { id: actor } : null },
      error: null,
    })) },
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

  it('uses the verified browser token when there is no cookie session, including RLS and book operations', async () => {
    actor = null
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://fixture.example')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'fixture-anon')
    const req = () => new Request(base, { headers: { Authorization: 'Bearer fixture-user-token' } })
    const res = await catalog(req())
    expect(res.status).toBe(200)
    expect(res.headers.get('vary')).toContain('Authorization')
    const result = await res.json()
    expect(result.userId).toBe(owner)
    expect(result.books.map((b: { id: string }) => b.id)).toEqual([book])
    expect(getUser).toHaveBeenCalledWith('fixture-user-token')
    expect(reportingClient).toHaveBeenCalledWith('https://fixture.example', 'fixture-anon',
      expect.objectContaining({ global: { headers: { Authorization: 'Bearer fixture-user-token' } } }))
    expect((await bookGet(req(), context(foreign, 'download'))).status).toBe(404)
    expect((await bookGet(req(), context(book, 'download'))).status).toBe(200)
    expect(new URL(proxy.mock.calls[0][0].url).search).toBe('?studio=1')
    expect(proxy.mock.calls[0].slice(1)).toEqual([owner, { userId: owner, token: 'fixture-user-token' }])
  })

  it('rejects an invalid bearer and prefers a verified cookie over a different browser token', async () => {
    const req = (token: string) => new Request(base, { headers: { Authorization: 'Bearer ' + token } })
    actor = null
    expect((await catalog(req('expired-token'))).status).toBe(401)
    expect(reportingClient).not.toHaveBeenCalled()
    actor = foreign
    const res = await catalog(req('fixture-user-token'))
    expect((await res.json()).userId).toBe(foreign)
    expect(getUser).not.toHaveBeenCalledWith('fixture-user-token')
  })

  it('binds personal template changes to the verified admin and never caches the catalog', async () => {
    const url = 'https://dev.example/api/admin/personal-prompts'
    const mutation = (origin: string) => new Request(url + '/' + item, {
      method: 'PATCH', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ deleted: true, revision: 1 }),
    })
    tables.profiles[0].is_admin = false
    expect((await listPersonalPrompts(new Request(url))).status).toBe(403)
    tables.profiles[0].is_admin = true
    expect((await changePersonalPrompt(mutation('https://elsewhere.example'))).status).toBe(403)
    const stale = mutation('https://dev.example')
    stale.headers.set('X-Workspace-Account', foreign)
    expect((await changePersonalPrompt(stale)).status).toBe(409)
    expect(proxy).not.toHaveBeenCalled()
    const op = mutation('https://dev.example')
    op.headers.set('X-Workspace-Account', owner)
    const response = await changePersonalPrompt(op)
    expect(response.status).toBe(200)
    expect(proxy).toHaveBeenCalledWith(op, owner)
    expect(response.headers.get('Cache-Control')).toContain('private, no-store')
  })

  it('shows only owned books and series, including pages below the requested size', async () => {
    tables.books.push({ ...owned, id: another, series_id: null })
    const data = await (await catalog(get())).json()
    expect(data.books.map((b: {id: string}) => b.id)).toEqual([book, another])
    expect(data.series.map((s: {id: string}) => s.id)).toEqual([series])
    expect(data.userId).toBe(owner)
    expect(data.role).toBe('admin')
  })

  it.each(['author', 'admin'])('keeps reader-library membership separate from %s project ownership', async role => {
    tables.profiles[0].is_admin = role === 'admin'
    // The reader library includes a global title, an adopted foreign title, and a
    // collection containing both the user's own upload and another user's book.
    tables.books.push({ id: another, title: 'Public catalog', user_id: null })
    tables.user_book_preferences = [{ user_id: owner, book_id: foreign }, { user_id: owner, book_id: another }]
    tables.share_links = [{ id: item, active: true }]
    tables.share_link_books = [{ share_link_id: item, book_id: book }, { share_link_id: item, book_id: foreign }]

    const data = await (await catalog(get())).json()
    expect(data.role).toBe(role)
    expect(data.books.map((row: {id: string}) => row.id)).toEqual([book])
    for (const id of [foreign, another]) {
      expect((await bookGet(get(), context(id, 'download'))).status).toBe(404)
      if (role === 'admin') expect((await bookPost(post({}), context(id, 'translate-full-book'))).status).toBe(404)
    }
    expect(proxy).not.toHaveBeenCalled()
    expect((await bookGet(get(), context(book, 'download'))).status).toBe(200)
  })

  it('separates project membership from series membership and scopes archived books', async () => {
    tables.studio_project_books[0].archived_at = '2026-11-21'
    tables.profiles[0].is_admin = false
    const data = await (await catalog(get())).json()
    expect(data.projects.map((p: {id: string}) => p.id)).toEqual([item])
    expect(data.books[0]).toMatchObject({ id: book, seriesId: series, projectId: item, projectArchived: true })
    const detail = (projectId: string) => readProject(get(), { params: Promise.resolve({ projectId }) })
    expect((await (await detail(item)).json()).books.map((b: {id: string}) => b.id)).toEqual([book])
    expect((await detail(another)).status).toBe(404)
  })

  it('creates and renames personal projects under the signed-in account', async () => {
    tables.profiles[0].is_admin = false
    const req = post({ name: '  Мой проект  ', userId: foreign, requestId: item })
    req.headers.set('X-Workspace-Account', owner)
    expect((await createProject(req)).status).toBe(201)
    expect(projectRpc).toHaveBeenCalledWith('studio_create_project', { p_name: 'Мой проект', p_request_id: item })
    const rename = post({ name: 'Новое имя' })
    rename.headers.set('X-Workspace-Account', owner)
    expect((await renameProject(rename, { params: Promise.resolve({ projectId: item }) })).status).toBe(200)
    expect(projectRpc).toHaveBeenCalledWith('studio_rename_project', { p_project_id: item, p_name: 'Новое имя' })
  })

  it('keeps an archived project and its active book readable without archiving the book', async () => {
    Object.assign(tables.studio_projects[0], { archived_at: '2026-11-23', order_revision: 4 })
    Object.assign(tables.studio_project_books[0], { position: 3 })
    const data = await (await catalog(get())).json()
    expect(data.projects[0]).toMatchObject({ id: item, archived: true, orderRevision: 4 })
    expect(data.books[0]).toMatchObject({ projectId: item, projectArchived: false, projectPosition: 3 })
  })

  it('archives and restores the project, and saves order only against an observed revision', async () => {
    const write = (body: unknown, account = owner) => {
      const req = post(body)
      req.headers.set('X-Workspace-Account', account)
      return renameProject(req, { params: Promise.resolve({ projectId: item }) })
    }
    expect((await write({ action: 'archive' }, foreign)).status).toBe(409)
    expect((await write({ action: 'reorder', bookIds: [book, book], expectedRevision: 1 })).status).toBe(400)
    expect(projectRpc).not.toHaveBeenCalled()
    for (const action of ['archive','restore']) {
      expect((await write({ action })).status).toBe(200)
      expect(projectRpc).toHaveBeenLastCalledWith('studio_archive_project', { p_project_id: item, p_archived: action === 'archive' })
    }
    const order = { action: 'reorder', bookIds: [book], expectedRevision: 1 }
    projectRpc.mockResolvedValueOnce({ data: 2, error: null })
    expect(await (await write(order)).json()).toEqual({ id: item, orderRevision: 2 })
    expect(projectRpc).toHaveBeenLastCalledWith('studio_reorder_project', { p_project_id: item, p_book_ids: [book], p_expected_revision: 1 })
    projectRpc.mockResolvedValueOnce({ data: null, error: { code: '40001' } })
    expect((await write(order)).status).toBe(409)
  })

  it('uses scoped RPCs for moves, archive and restore and rejects stale account mutations', async () => {
    const write = (body: unknown, account: string) => {
      const req = post(body)
      req.headers.set('X-Workspace-Account', account)
      return updateMembership(req, { params: Promise.resolve({ bookId: book }) })
    }
    expect((await write({ action: 'move', projectId: item }, foreign)).status).toBe(409)
    expect((await write({ action: 'erase' }, owner)).status).toBe(400)
    expect(projectRpc).not.toHaveBeenCalled()
    for (const action of ['move', 'archive', 'restore']) {
      expect((await write(action === 'move' ? { action, projectId: item } : { action }, owner)).status).toBe(200)
      expect(projectRpc).toHaveBeenCalledWith('studio_manage_project_book', {
        p_book_id: book, p_action: action, p_project_id: action === 'move' ? item : null,
      })
    }
    projectRpc.mockResolvedValueOnce({ data: null, error: { code: 'P0002' } })
    expect((await write({ action: 'move', projectId: foreign }, owner)).status).toBe(404)
  })

  it.each(['admin', 'author'])('appends to an owned series for %s using the expected last volume', async role => {
    tables.profiles[0].is_admin = role === 'admin'
    const append = (previousBookId?: string | null) => {
      const req = post({ action: 'append-to-series', seriesId: series, previousBookId })
      req.headers.set('X-Workspace-Account', owner)
      return updateMembership(req, { params: Promise.resolve({ bookId: book }) })
    }
    expect((await append()).status).toBe(400)
    for (const previous of [null, another]) {
      projectRpc.mockResolvedValueOnce({ data: previous ? 2 : 1, error: null })
      const res = await append(previous)
      expect(await res.json()).toEqual({ ok: true, volumeNumber: previous ? 2 : 1 })
      expect(projectRpc).toHaveBeenCalledWith('studio_append_series_book', {
        p_book_id: book, p_series_id: series, p_after_book_id: previous,
      })
    }
    projectRpc.mockResolvedValueOnce({ data: null, error: { code: '40001' } })
    expect((await append(another)).status).toBe(409)
    projectRpc.mockResolvedValueOnce({ data: null, error: { code: '55000' } })
    expect((await append(another)).status).toBe(409)
    projectRpc.mockResolvedValueOnce({ data: null, error: { code: 'P0002' } })
    expect((await append(another)).status).toBe(404)
    expect(proxy).not.toHaveBeenCalled()
  })

  it.each(['admin', 'author'])('creates a series from two owned books for %s without starting paid work', async role => {
    tables.profiles[0].is_admin = role === 'admin'
    const start = (overrides: Record<string, unknown> = {}) => {
      const req = post({ action: 'start-series', firstBookId: another, name: '  Два тома ', genre: 'litrpg', requestId: item, ...overrides })
      req.headers.set('X-Workspace-Account', owner)
      return updateMembership(req, { params: Promise.resolve({ bookId: book }) })
    }
    expect((await start({ firstBookId: book })).status).toBe(400)
    expect((await start({ genre: 'arbitrary' })).status).toBe(400)
    expect((await start({ requestId: null })).status).toBe(400)
    expect(projectRpc).not.toHaveBeenCalled()
    expect(await (await start()).json()).toEqual({ ok: true, seriesId: item, volumeNumber: 2 })
    expect(projectRpc).toHaveBeenCalledWith('studio_create_series_from_books', {
      p_first_book_id: another, p_second_book_id: book, p_name: 'Два тома', p_genre: 'litrpg', p_request_id: item,
    })
    projectRpc.mockResolvedValueOnce({ data: null, error: { code: 'P0002' } })
    expect((await start({ firstBookId: foreign })).status).toBe(404)
    projectRpc.mockResolvedValueOnce({ data: null, error: { code: '40001' } })
    expect((await start()).status).toBe(409)
    expect(proxy).not.toHaveBeenCalled()
  })

  it('reads the dedicated series view for an author with no service-role key', async () => {
    tables.profiles[0].is_admin = false
    tables.book_series = []
    const data = await (await catalog(get())).json()
    expect(data.series).toEqual([expect.objectContaining({ id: series, name: 'Own series', ownerVerified: true })])
    expect(reportingClient).not.toHaveBeenCalled()
  })

  it('rejects direct access to another book and glossary seeds even for admins', async () => {
    expect((await bookGet(get(), context(foreign, 'download-translated'))).status).toBe(404)
    expect((await bookPost(post({ sourceBookId: foreign }), context(book, 'copy-glossary'))).status).toBe(404)
    expect((await bookPost(post({ seedFromBookId: foreign }), context(book, 'generate-glossary'))).status).toBe(404)
    expect(proxy).not.toHaveBeenCalled()
  })

  it('links only the verified owner to the names of the current stage templates', async () => {
    const req = new Request(base + '?lang=EN&bookId=' + foreign)
    expect((await bookGet(req, context(foreign, 'stage-prompts'))).status).toBe(404)
    tables.profiles[0].is_admin = false
    expect((await bookGet(req, context(book, 'stage-prompts'))).status).toBe(403)
    expect(proxy).not.toHaveBeenCalled()

    tables.profiles[0].is_admin = true
    const template = { name: 'generate_fiction_glossary_ru_en.txt', stage: 'glossary', overridden: true }
    proxy.mockResolvedValueOnce(Response.json({ stages: [{ ...template, content: 'effective', shipped: 'original' }] }))
    const result = await bookGet(req, context(book, 'stage-prompts'))
    expect(await result.json()).toEqual([template])
    const url = new URL(proxy.mock.calls[0][0].url)
    expect(url.pathname).toBe('/api/admin/fiction-book-prompts')
    expect(Object.fromEntries(url.searchParams)).toEqual({ bookId: book, lang: 'EN' })
  })

  it('forwards a supported author estimate while keeping admin operations restricted', async () => {
    tables.profiles[0].is_admin = false
    expect((await bookGet(get(), context(foreign, 'download-translated'))).status).toBe(404)
    expect((await bookPost(post({}), context(book, 'translate-full-book'))).status).toBe(403)
    expect(proxy).not.toHaveBeenCalled()
    expect((await bookGet(get(), context(book, 'download-translated'))).status).toBe(200)
    const estimateRequest = new Request(base + '?studioTargetLang=EN&ownerId=foreign&lang=EN')
    expect((await bookGet(estimateRequest, context(book, 'translation-estimate'))).status).toBe(200)
    expect(new URL(proxy.mock.calls[1][0].url).search).toBe('?studioTargetLang=EN')
    expect(proxy.mock.calls.map(([req, userId]) => [new URL(req.url).pathname, userId])).toEqual([
      [`/api/books/${book}/download-owned-translation`, owner],
      [`/api/books/${book}/translation-estimate`, owner],
    ])
  })

  it('keeps editorial updates in the owned book and forwards the reviewed version without author overrides', async () => {
    tables.profiles[0].is_admin = false
    const body = { lang: 'EN', glossary: {}, expectedUpdatedAt: 'v1', model: 'other', force: true }
    expect((await bookPost(post(body), context(foreign, 'set-glossary'))).status).toBe(404)
    expect((await bookPost(post(body), context(foreign, 'glossary-usages'))).status).toBe(404)
    expect((await bookPost(post(body), context(foreign, 'glossary-retranslate'))).status).toBe(404)
    expect((await bookPost(post({ lang: 'EN', glossary: {} }), context(book, 'set-glossary'))).status).toBe(400)
    expect(proxy).not.toHaveBeenCalled()
    expect((await bookPost(post(body), context(book, 'set-glossary'))).status).toBe(200)
    expect(await proxy.mock.calls[0][0].json()).toEqual({ lang: 'EN', glossary: {}, expectedUpdatedAt: 'v1' })
  })

  it('checks an active invitation for local editorial block reads', async () => {
    tables.profiles[0].is_admin = false
    proxy.mockResolvedValueOnce(Response.json({ canStartTranslation: false }))
    expect((await bookGet(new Request(base + '?lang=EN&blockId=' + item), context(book, 'review-block'))).status).toBe(403)
    expect(new URL(proxy.mock.calls[0][0].url).pathname).toBe('/api/studio/translation-access')
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
    proxy.mockResolvedValueOnce(Response.json({ canStartTranslation: true }))
    expect((await read(item)).status).toBe(200)
    expect(proxy.mock.calls.every(([request]) => new URL(request.url).pathname === '/api/studio/translation-access')).toBe(true)
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
