#!/usr/bin/env node
/** Local synthetic backend for real Next proxy/browser QA. Never reads .env or sends network requests.
 * node scripts/catalog-fixture-server.mjs [--port 3018] [--mode-file .local/catalog-qa-mode.json]
 * Mode JSON: {mode:"normal|reordered|old-then-new|delay|timeout|empty|auth401|unsupported404",
 *   reset_id:"case-name", delay_ms:1200, order:[6,1,2,3,4,5], broken_cover:3,
 *   cover_delay_ms:0, cover_version:"v1", activity_delay_ms:0, activity_status:200,
 *   reader_delay_ms:0, reader_error:false, mutation_status:200, book_count:18, upload_process_delay_ms:4000, upload_fail:false, upload_dedup:false}
 * Changing reset_id resets in-memory fixture state. GET /__qa returns bounded, token-free evidence.
 * Supabase fixture base URL: http://127.0.0.1:3018, with a synthetic public anon key.
 */
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import path from 'node:path'
import sharp from 'sharp'

const args = process.argv.slice(2)
const option = (name, fallback) => { const index = args.indexOf(name); return index < 0 ? fallback : args[index + 1] }
const port = Number(option('--port', '3018'))
if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local fixture port')
const modeFile = path.resolve(option('--mode-file', '.local/catalog-qa-mode.json'))
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const users = ['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002']
const bookIds = Array.from({ length: 18 }, (_, i) => `10000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`)
const words = ['one', 'two', 'three', 'four', 'five', 'six', ...Array.from({length:12},(_,i)=>`book ${i+7}`)]
const colors = ['#354f52', '#8f442f', '#435d89', '#70516f', '#7e642d', '#3c6b58']
const stamp = '2026-09-01T12:00:00.000Z'
const digest = value => createHash('sha256').update(value).digest('hex')
const pause = ms => new Promise(resolve => setTimeout(resolve, Math.max(0, Math.min(10_000, Number(ms) || 0))))
const covers = await Promise.all(words.map(async (word, index) => sharp(Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360"><rect width="240" height="360" fill="${colors[index % colors.length]}"/><rect x="18" y="18" width="204" height="324" fill="none" stroke="#e8dec2" stroke-width="2"/><text x="120" y="100" text-anchor="middle" font-family="serif" font-size="30" fill="#fff6de">QA</text><text x="120" y="157" text-anchor="middle" font-family="serif" font-size="38" fill="#fff6de">${word.toUpperCase()}</text><path d="M65 225h110M85 235h70" stroke="#e8dec2" stroke-width="2"/><text x="120" y="300" text-anchor="middle" font-family="sans-serif" font-size="15" fill="#fff6de">Synthetic fixture</text></svg>`,
)).webp({ quality: 72 }).toBuffer()))

const chapters = bookIds.flatMap((bookId, bookIndex) => [1, 2].map(index => ({
  id: `20000000-0000-4000-8000-${String((bookIndex + 1) * 100 + index).padStart(12, '0')}`,
  book_id: bookId, index, title: `QA chapter ${index}`, depth: 0, parent_id: null, created_at: stamp,
})))
const blocks = chapters.flatMap((chapter, chapterIndex) => Array.from({ length: 35 }, (_, index) => ({
  id: `30000000-0000-4000-8000-${String((chapterIndex + 1) * 1000 + index + 1).padStart(12, '0')}`,
  chapter_id: chapter.id, position: index + 1, type: index === 0 ? 'heading' : 'paragraph',
  ...(index === 0 ? { level: 1 } : {}),
  text: index === 0 ? chapter.title : `QA reading paragraph ${index}. The quiet library opened its doors beside the river. A reader followed the path through the garden, carrying a small book and a notebook. Each page offered another careful observation of the ordinary world. This is synthetic English text for checking visible pages, forward reading, backward reading, and returning to the catalog.`,
  targetLangReady: true, isTranslated: true, is_pending: false,
})))
for (const chapter of chapters) chapter.first_block_id = blocks.find(block => block.chapter_id === chapter.id).id

let resetId = ''
let requests = []
let acceptedEvents = []
let manifests = []
let unexpected = []
const scopes = new Map()
const positions = new Map()
const mutations = new Map()
const uploads = new Map()
const uploadedBooks = new Map()
const openedAt = new Date().toISOString()
function reset(value) {
  resetId = value; requests = []; acceptedEvents = []; manifests = []; unexpected = []
  scopes.clear(); positions.clear(); mutations.clear(); uploads.clear(); uploadedBooks.clear()
  bookIds.splice(18); words.splice(18); covers.splice(18)
}
async function readMode() {
  let value = {}
  try {
    const raw = await readFile(modeFile, 'utf8')
    if (raw.length > 8192) throw new Error('Fixture mode file exceeds 8KiB')
    value = JSON.parse(raw)
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Fixture mode must be a JSON object')
  } catch (error) { if (error.code !== 'ENOENT') throw error }
  if (String(value.reset_id ?? '') !== resetId) reset(String(value.reset_id ?? ''))
  return value
}
function boundedPush(list, value, limit = 500) { list.push(value); if (list.length > limit) list.splice(0, list.length - limit) }
function json(res, value, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-QA-Synthetic': 'true' })
  res.end(JSON.stringify(value))
}
const error = (res, status, message, code = 'qa_fixture_error') => json(res, { statusCode: status, message, data: { code } }, status)
async function body(req) {
  let result = ''
  for await (const chunk of req) {
    result += chunk
    if (result.length > 65536) throw new Error('Fixture body exceeds 64KiB')
  }
  return result ? JSON.parse(result) : {}
}
function context(req, url) {
  const user = req.headers['x-catalog-user']
  const guest = req.headers['x-catalog-guest']
  if (user !== 'guest' && !users.includes(user)) return null
  if (typeof guest !== 'string' || !UUID.test(guest)) return null
  const actor = user === 'guest' ? `guest:${guest}` : `user:${user}`
  return { user: user === 'guest' ? null : user, key: `${actor}::${digest(url.searchParams.get('share') ?? '')}` }
}
function scopeState(key) {
  let state = scopes.get(key)
  if (!state) {
    if (scopes.size >= 128) throw new Error('Fixture actor budget reached; change reset_id before expanding the run')
    state = { version: 0, events: new Map(), readAt: new Map(), listCount: 0 }; scopes.set(key, state)
  }
  return state
}
function legacyBook(id, own = false) {
  const index = bookIds.indexOf(id)
  return { id, title: `QA ${words[index]}`, author: 'Synthetic Author', cover_url: null,
    original_language: 'en', available_languages: ['en'], selected_language: 'en', status: 'active',
    created_at: new Date(Date.parse(stamp) - index * 86_400_000).toISOString(), is_own: own,
    ...(mutations.get(id) ?? {}) }
}
function manifest(ctx, mode) {
  const state = scopeState(ctx.key)
  state.listCount++
  const supplied = Array.isArray(mode.order) && mode.order.length === 6 && new Set(mode.order).size === 6
    && mode.order.every(number => Number.isInteger(number) && number >= 1 && number <= 6)
  const reversed = mode.mode === 'reordered' || (mode.mode === 'old-then-new' && state.listCount > 1)
  const baseIds = bookIds.slice(0, Math.max(6, Math.min(18, Number(mode.book_count) || 6)))
  let ids = supplied ? mode.order.map(number => bookIds[number - 1]) : reversed ? [...baseIds].reverse() : [...baseIds]
  ids = [...uploadedBooks.entries()].filter(([,owner]) => owner === ctx.user).map(([id]) => id).concat(ids)
  const initialRank = new Map(ids.map((id, index) => [id, index]))
  ids.sort((a, b) => (state.readAt.get(b) ?? 0) - (state.readAt.get(a) ?? 0) || initialRank.get(a) - initialRank.get(b))
  ids = mode.mode === 'empty' ? [] : ids.filter(id => mutations.get(id)?.status !== 'deleted')
  const items = ids.map(id => {
    const index = bookIds.indexOf(id)
    const book = legacyBook(id, !!ctx.user)
    const version = `qa-${String(mode.cover_version ?? 'v1').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32)}-${index + 1}`
    const position = positions.get(id)
    return {
      id, title: book.title, author: book.author, created_at: book.created_at, status: book.status,
      is_own: book.is_own, original_language: 'en', available_languages: ['en'], selected_language: 'en',
      last_read_at: state.readAt.has(id) ? new Date(state.readAt.get(id)).toISOString() : null,
      metadata_version: `qa-meta-${index + 1}`, reading: position ? { block_position: position.block_position, total_blocks: 70, updated_at: position.updated_at } : null,
      cover: { url: `/api/v2/books/${id}/cover?version=${version}`, version, width: 240, height: 360 },
    }
  })
  return { contract_version: 2, scope_key: ctx.key, revision: digest(JSON.stringify(items)), server_time: new Date().toISOString(),
    complete: true, order: 'recently_read', activity_version: String(state.version), items }
}
function syntheticUser(id = users[0]) {
  return { id, aud: 'authenticated', role: 'authenticated', email: `qa-${id === users[0] ? 'a' : 'b'}@example.invalid`,
    created_at: stamp, app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {} }
}
function session(id) {
  const user = syntheticUser(id)
  const expires = Math.floor(Date.now() / 1000) + 3600
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url')
  return { access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: id, aud: 'authenticated', role: 'authenticated', exp: expires, email: user.email })}.synthetic-local-only`,
    token_type: 'bearer', expires_in: 3600, expires_at: expires, refresh_token: 'synthetic-local-refresh', user }
}

const server = http.createServer(async (req, res) => {
  try {
    const origin = req.headers.origin
    if (origin) {
      const parsed = new URL(origin)
      if (!['localhost', '127.0.0.1'].includes(parsed.hostname)) return error(res, 403, 'Fixture origin must be local')
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Access-Control-Allow-Headers', 'authorization,apikey,content-type,x-client-info,x-supabase-api-version,x-catalog-user,x-catalog-guest,prefer')
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
    }
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end() }
    const url = new URL(req.url, `http://127.0.0.1:${port}`)
    const mode = await readMode()
    if (url.pathname === '/__qa') return json(res, { synthetic: true, opened_at: openedAt, reset_id: resetId, mode,
      book_ids: bookIds, chapter_ids: chapters.map(chapter => chapter.id), cover_bytes: covers.map(cover => cover.length),
      requests, accepted_events: acceptedEvents, manifests, unexpected })
    if (url.pathname === '/__qa/session') return json(res, session(url.searchParams.get('user') === 'b' ? users[1] : users[0]))
    const requestRecord = { at: Date.now(), method: req.method, path: url.pathname }
    boundedPush(requests, requestRecord)
    res.on('finish', () => { requestRecord.status = res.statusCode; requestRecord.duration_ms = Date.now() - requestRecord.at })
    res.on('close', () => { if (!res.writableEnded) { requestRecord.aborted = true; requestRecord.duration_ms = Date.now() - requestRecord.at } })

    const bearerUser = () => {
      try {
        const token = String(req.headers.authorization ?? '').replace(/^Bearer /i, '');
        if (!token.endsWith('.synthetic-local-only')) return null;
        const user = JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).sub;
        return users.includes(user) ? user : null;
      } catch { return null; }
    };
    if (url.pathname === '/api/storage/signed-url' && req.method === 'POST') {
      const user = bearerUser(); if (!user) return error(res, 401, 'Synthetic sign-in required');
      const data = await body(req); const token = randomUUID();
      uploads.set(token, { path: data.path, owner: user, complete: false });
      return json(res, { signedUrl: `http://127.0.0.1:${port}/storage/upload/${token}`, token, path: data.path });
    }
    const storageUpload = url.pathname.match(/^\/storage\/upload\/([^/]+)$/);
    if (storageUpload && req.method === 'PUT') {
      const upload = uploads.get(storageUpload[1]); if (!upload) return error(res, 404, 'Unknown upload');
      let bytes = 0; for await (const chunk of req) { bytes += chunk.length; if (bytes > 4 * 1024 * 1024) throw new Error('Synthetic upload limit'); }
      upload.complete = true; requestRecord.bytes = bytes; return json(res, {});
    }
    if (url.pathname === '/api/books/process' && req.method === 'POST') {
      const user = bearerUser(); if (!user) return error(res, 401, 'Synthetic sign-in required');
      const data = await body(req); const upload = [...uploads.values()].find(entry => entry.path === data.file_path && entry.owner === user);
      if (!upload?.complete) return error(res, 400, 'Upload must finish first');
      await pause(mode.upload_process_delay_ms ?? 1500);
      if (mode.upload_fail) return error(res, 422, 'Synthetic EPUB processing failed');
      if (mode.upload_dedup) return json(res, { id: bookIds[0], chapter_count: 2 });
      const id = `10000000-0000-4000-8000-${String(100 + uploadedBooks.size).padStart(12, '0')}`;
      bookIds.push(id); words.push(String(data.file_name).replace(/\.epub$/i, '')); covers.push(covers[0]);
      uploadedBooks.set(id, user); return json(res, { id, chapter_count: 2 });
    }

    if (url.pathname.startsWith('/api/v2/')) {
      const ctx = context(req, url)
      if (!ctx) return error(res, 401, 'Only explicit synthetic fixture identities are accepted')
      requestRecord.scope = ctx.key
      if (mode.mode === 'auth401') return error(res, 401, 'Synthetic expired identity')
      if (mode.mode === 'unsupported404') return error(res, 404, 'Synthetic old deployment')
      if (url.pathname === '/api/v2/library' && req.method === 'GET') {
        const value = manifest(ctx, mode)
        const delay = mode.delay_ms ?? (mode.mode === 'delay' ? 1200 : mode.mode === 'timeout' ? 4000 : 0)
        await pause(delay)
        boundedPush(manifests, { at: Date.now(), scope: ctx.key, ids: value.items.map(item => item.id), activity_version: value.activity_version, delay_ms: delay })
        return json(res, value)
      }
      if (url.pathname === '/api/v2/reading-activity' && req.method === 'POST') {
        const data = await body(req)
        if (!Array.isArray(data.events) || !data.events.length || data.events.length > 32
          || new Set(data.events.map(event => event.event_id)).size !== data.events.length
          || data.events.some(event => !UUID.test(event.event_id) || !bookIds.includes(event.book_id)
            || !Number.isFinite(Date.parse(event.occurred_at)) || !Number.isSafeInteger(event.age_ms) || event.age_ms < 0 || event.age_ms > 30 * 86_400_000)) {
          return error(res, 400, 'Invalid synthetic activity batch')
        }
        if (mode.activity_status && mode.activity_status !== 200) return error(res, mode.activity_status, 'Synthetic activity error', mode.activity_status === 503 ? 'catalog_migration_required' : 'qa_activity_failure')
        const state = scopeState(ctx.key)
        if (state.events.size + data.events.length > 4096) return error(res, 429, 'Fixture event budget reached; reset before expanding the run')
        for (const event of data.events) {
          const previous = state.events.get(event.event_id)
          if (previous && (previous.book_id !== event.book_id || previous.occurred_at !== event.occurred_at)) return error(res, 409, 'Synthetic duplicate payload mismatch')
          if (previous) continue
          const canonical = Date.now() - event.age_ms
          state.events.set(event.event_id, event)
          state.readAt.set(event.book_id, Math.max(state.readAt.get(event.book_id) ?? 0, canonical))
          state.version++
          boundedPush(acceptedEvents, { at: Date.now(), scope: ctx.key, book_id: event.book_id, event_id: event.event_id, age_ms: event.age_ms, canonical_at: new Date(canonical).toISOString(), activity_version: String(state.version) })
        }
        await pause(mode.activity_delay_ms)
        return json(res, { scope_key: ctx.key, activity_version: String(state.version), acknowledged_event_ids: data.events.map(event => event.event_id) })
      }
      const cover = url.pathname.match(/^\/api\/v2\/books\/([^/]+)\/cover$/)
      if (cover && req.method === 'GET') {
        const index = bookIds.indexOf(cover[1])
        if (index < 0) return error(res, 404, 'Synthetic cover not found')
        await pause(mode.cover_delay_ms)
        if (mode.broken_cover === index + 1 || mode.broken_cover === cover[1]) return error(res, 404, 'Deliberate missing synthetic cover')
        res.writeHead(200, { 'Content-Type': 'image/webp', 'Content-Length': covers[index].length, 'Cache-Control': 'private, no-store' })
        return res.end(covers[index])
      }
    }

    if (url.pathname === '/api/sync/status') return json(res, { account_version: null, scopes: { library: null, progress: null, settings: null } })
    if (url.pathname === '/api/translation-limit') return json(res, { allowed: true, count: 0, limit: null, periodEndsAt: null })
    if (url.pathname === '/api/subscription') return json(res, { subscription: null, is_pro: false })
    if (url.pathname === '/api/books' && req.method === 'GET') return json(res, bookIds.map(id => legacyBook(id)))
    const book = url.pathname.match(/^\/api\/books\/([^/]+)(?:\/(.*))?$/)
    if (book && bookIds.includes(book[1])) {
      const id = book[1]
      if (book[2] === 'chapters') { await pause(mode.reader_delay_ms); return json(res, chapters.filter(chapter => chapter.book_id === id)) }
      if (book[2] === 'reading-position') {
        if (req.method === 'PUT') {
          const data = await body(req)
          const saved = { ...data, book_id: id, updated_at: new Date().toISOString(), total_blocks: 70 }
          positions.set(id, saved)
          return json(res, { ...saved, persisted: true })
        }
        return json(res, positions.get(id) ?? { book_id: id, chapter_id: null, block_id: null, block_position: null,
          sentence_index: 0, total_blocks: 70, lang: 'EN', updated_at: null })
      }
      if (!book[2] && req.method === 'PATCH') {
        if (mode.mutation_status && mode.mutation_status !== 200) return error(res, mode.mutation_status, 'Synthetic mutation error')
        const data = await body(req)
        mutations.set(id, { ...(mutations.get(id) ?? {}), ...data })
        return json(res, legacyBook(id, true))
      }
      if (!book[2] && req.method === 'DELETE') { mutations.set(id, { status: 'deleted' }); return json(res, { success: true }) }
      if (!book[2] || book[2] === 'language') return json(res, legacyBook(id))
      if (book[2] === 'reader-metadata/translate') return json(res, { title: legacyBook(id).title, author: 'Synthetic Author', chapterTitles: chapters.filter(chapter => chapter.book_id === id).map(chapter => ({ id: chapter.id, title: chapter.title })) })
    }
    const chapter = url.pathname.match(/^\/api\/chapters\/([^/]+)\/(content|blocks\/text|translate)$/)
    if (chapter && chapters.some(item => item.id === chapter[1])) {
      await pause(mode.reader_delay_ms)
      if (mode.reader_error) return error(res, 503, 'Synthetic chapter unavailable')
      const content = blocks.filter(block => block.chapter_id === chapter[1])
      if (chapter[2] === 'blocks/text') {
        const data = await body(req)
        return json(res, { chapterId: chapter[1], lang: 'EN', ok: content.filter(block => data.blockIds?.includes(block.id)).map(block => ({ blockId: block.id, type: block.type, text: block.text })), missing: [], pending: [] })
      }
      // This is fixed source text. No translation engine, model, or external service is called.
      return json(res, content)
    }
    if (url.pathname === '/api/chapters') {
      await pause(mode.reader_delay_ms)
      const start = blocks.findIndex(block => block.id === url.searchParams.get('block_id'))
      const count = Math.max(1, Math.min(100, Number(url.searchParams.get('batch_size')) || 50))
      if (start < 0) return error(res, 404, 'Unknown synthetic block')
      const owner = chapters.find(chapter => chapter.id === blocks[start].chapter_id).book_id
      const bookChapterIds = new Set(chapters.filter(chapter => chapter.book_id === owner).map(chapter => chapter.id))
      return json(res, blocks.slice(start, start + count).filter(block => bookChapterIds.has(block.chapter_id)))
    }
    if (url.pathname === '/auth/v1/token') return json(res, session(users[0]))
    if (url.pathname === '/auth/v1/user') {
      if (!req.headers.authorization) return error(res, 401, 'No synthetic session')
      return json(res, syntheticUser(users[0]))
    }
    if (url.pathname === '/auth/v1/logout') return json(res, {})
    if (url.pathname === '/auth/v1/settings') return json(res, { external: { email: true }, disable_signup: true })
    if (url.pathname === '/rest/v1/profiles') {
      const profile = { id: users[0], is_admin: false, is_alpha: false, settings: { language: 'en' } }
      return json(res, req.headers.accept?.includes('object+json') ? profile : [profile])
    }
    if (url.pathname.startsWith('/rest/v1/')) return json(res, [])
    if (url.pathname === '/health') return json(res, { ok: true, synthetic: true })
    boundedPush(unexpected, { at: Date.now(), method: req.method, path: url.pathname })
    return error(res, 404, 'Unknown synthetic fixture route')
  } catch (failure) {
    if (!res.headersSent) error(res, 500, failure instanceof Error ? failure.message : 'Synthetic fixture failure')
    else res.end()
  }
})

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Synthetic catalog fixture listening at http://127.0.0.1:${port}; mode file ${modeFile}; covers ${covers.map(cover => cover.length).join(',')} bytes\n`)
})
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)))
