#!/usr/bin/env node
/**
 * Deterministic library browser regressions. Requires a running local Next server.
 *   node scripts/test-library-loading.mjs --base-url http://127.0.0.1:3000
 *   ... --scenario local-recency --output /tmp/globoox-library-regression
 *
 * Fresh contexts only. All API/auth/analytics traffic is intercepted. The fake
 * session is exposed only to document.cookie: it is NEVER sent to the server.
 * No .env files, credentials, existing browser profiles, or real user data read.
 * The reader-return cases restore the state a reader saves; they do not claim
 * to exercise the reader UI or real authentication/backend authorization.
 */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), all[index + 1]?.startsWith('--') ? true : (all[index + 1] ?? true)]);
  return pairs;
}, []));
const base = new URL(String(args['base-url'] ?? 'http://127.0.0.1:3000'));
assert(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname), 'Refusing non-local target');
const output = path.resolve(String(args.output ?? '/tmp/globoox-library-regression'));
const userId = '00000000-0000-4000-8000-000000000001';
const otherUserId = '00000000-0000-4000-8000-000000000002';
const ids = Array.from({ length: 6 }, (_, i) => `10000000-0000-4000-8000-00000000000${i + 1}`);
const stamp = (day) => `2026-09-${String(day).padStart(2, '0')}T12:00:00.000Z`;
const books = ids.map((id, i) => ({ id, title: `Fixture ${String.fromCharCode(65 + i)}`, author: 'Synthetic Author', cover_url: null, original_language: 'en', available_languages: ['en'], status: 'active', created_at: stamp(6 - i), is_own: true }));
const remoteTimes = Object.fromEntries(ids.map((id, i) => [id, stamp(i === 1 ? 12 : 8 - i)]));
const waveRemoteTimes = Object.fromEntries(ids.map((id, i) => [id, stamp([14, 15, 13, 12, 11, 10][i])]));
const localTimes = Object.fromEntries(ids.map((id, i) => [id, stamp(9 - i)]));
const fixtureBook = (id, title) => ({ ...books[0], id, title });
const fixtureEpoch = (await readFile(new URL('../src/components/SyncCheckClient.tsx', import.meta.url), 'utf8')).match(/const CACHE_EPOCH = '([^']+)'/)?.[1];
assert(fixtureEpoch, 'Cache epoch not found; update harness fixture');

const scenarios = [
  { name: 'guest-first-batch', authenticated: false, cached: false, stream: true, tailDelay: 1300, duration: 2900 },
  { name: 'warm-identical-revalidation', authenticated: true, cached: true, snapshot: true, remoteTimes, positionIdbDelay: 180, duration: 3400 },
  { name: 'coherent-progress-wave', authenticated: true, cached: true, snapshot: true, remoteTimes: waveRemoteTimes, positionDelay: { [ids[1]]: 850 }, duration: 3400 },
  { name: 'same-library-navigation', authenticated: true, cached: true, snapshot: true, remoteTimes: waveRemoteTimes, positionDelay: { [ids[1]]: 1200 }, selfNavigation: true, duration: 3400 },
  { name: 'local-recency', authenticated: true, cached: true, snapshot: true, remoteTimes, localRecent: true, duration: 3400 },
  { name: 'legacy-local-recency', authenticated: true, cached: true, snapshot: true, remoteTimes, localRecent: true, legacyLocal: true, duration: 3400 },
  { name: 'foreign-local-recency', authenticated: true, cached: true, snapshot: true, remoteTimes, localRecent: true, foreignRecency: true, duration: 3400 },
  { name: 'scope-separation', authenticated: true, cached: false, foreignCache: true, profileDelay: 350, duration: 3100 },
  { name: 'archive-delete', authenticated: true, cached: true, snapshot: true, remoteTimes: localTimes, mutations: true, duration: 2300 },
];
const selected = scenarios.filter((s) => !args.scenario || String(args.scenario).split(',').includes(s.name));
assert(selected.length, `Unknown scenario: ${args.scenario}`);

// This is public compiled configuration, not an environment file or credential.
// Only the public project storage-key NAME is retained, never key/token values.
async function discoverAuthStorageKey() {
  if (args['auth-storage-key']) return String(args['auth-storage-key']);
  const html = await (await fetch(new URL('/my-books', base))).text();
  const sources = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => new URL(m[1].replaceAll('&amp;', '&'), base));
  for (const source of sources) {
    if (source.origin !== base.origin) continue;
    const script = await (await fetch(source)).text();
    const match = script.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/);
    if (match) return `sb-${match[1]}-auth-token`;
  }
  throw new Error('Public auth storage key not found; provide --auth-storage-key sb-PROJECT-auth-token');
}

function browserFixture(config) {
  const state = { events: [], order: [], mutations: [], books: structuredClone(config.books), active: true };
  window.__libraryQA = state;
  const mark = (kind, data = {}) => state.events.push({ t: performance.now(), kind, ...data });
  mark('fixture-initial-progress', { progress: JSON.parse(localStorage.getItem('globoox-preview-storage') ?? '{}').state?.progress ?? {}, now: new Date().toISOString() });
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json', 'x-authenticated': String(config.authenticated) } });
  // Delay only readonly position result delivery, not transactions that write in
  // onsuccess. This exposes the real snapshot→live→snapshot regression reliably
  // instead of relying on an unusually slow machine to paint the intermediate state.
  if (config.positionIdbDelay) {
    const get = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get = function (...args) {
      const request = get.apply(this, args);
      if (this.name !== 'reading_positions' || this.transaction.mode !== 'readonly') return request;
      return new Proxy(request, {
        get(target, key) { const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value; },
        set(target, key, value) {
          if (key === 'onsuccess' && typeof value === 'function') target.onsuccess = (event) => setTimeout(() => value.call(target, event), config.positionIdbDelay);
          else Reflect.set(target, key, value, target);
          return true;
        },
      });
    };
  }
  const nativeFetch = window.fetch.bind(window);
  let listRequests = 0;
  window.fetch = async (input, options = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return nativeFetch(input, options);
    const method = (options.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    mark('request', { path: url.pathname, method });
    if (url.pathname === '/api/sync/status') return json({ account_version: null, scopes: { library: null, progress: null, settings: null } });
    if (url.pathname === '/api/books' && method === 'GET') {
      const requestNumber = ++listRequests;
      if (config.stream && url.searchParams.get('stream') === '1') {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({ async start(controller) {
          await delay(90);
          controller.enqueue(encoder.encode(JSON.stringify({ type: 'books', items: state.books.slice(0, 3) }) + '\n'));
          mark('head-sent');
          await delay(config.tailDelay);
          controller.enqueue(encoder.encode(JSON.stringify({ type: 'books', items: state.books.slice(3) }) + '\n'));
          mark('tail-sent');
          controller.close();
        } });
        return new Response(stream, { headers: { 'content-type': 'application/x-ndjson', 'x-authenticated': String(config.authenticated) } });
      }
      await delay(requestNumber > 1 ? 180 : 360);
      mark('list-returned', { number: requestNumber });
      return json(state.books);
    }
    const position = url.pathname.match(/^\/api\/books\/([^/]+)\/reading-position$/);
    if (position) {
      const id = position[1];
      await delay(config.positionDelay?.[id] ?? 120);
      mark('position-returned', { id });
      return json({ book_id: id, chapter_id: `${id}-chapter`, block_id: `${id}-block`, block_position: 20, total_blocks: 100, lang: 'en', updated_at: config.remoteTimes?.[id] ?? null });
    }
    const book = url.pathname.match(/^\/api\/books\/([^/]+)$/);
    if (book && method === 'PATCH') {
      const body = JSON.parse(options.body ?? '{}');
      state.books = state.books.map((entry) => entry.id === book[1] ? { ...entry, ...body } : entry);
      state.mutations.push({ method, id: book[1], body });
      return json(state.books.find((entry) => entry.id === book[1]));
    }
    if (book && method === 'DELETE') {
      state.books = state.books.filter((entry) => entry.id !== book[1]);
      state.mutations.push({ method, id: book[1] });
      return json({ success: true });
    }
    mark('unexpected-api', { path: url.pathname, method });
    return json({ fixture_error: 'Unexpected local API route' }, 404);
  };

  if (config.authenticated) {
    const encode = (value) => btoa(JSON.stringify(value)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
    const expires = Math.floor(Date.now() / 1000) + 3600;
    const user = { id: config.userId, aud: 'authenticated', role: 'authenticated', email: 'library-fixture@example.invalid', created_at: '2025-01-01T00:00:00Z', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {} };
    const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: config.userId, aud: 'authenticated', role: 'authenticated', exp: expires, email: user.email })}.synthetic-not-a-signature`;
    const session = { access_token: token, refresh_token: 'synthetic-refresh-token', expires_in: 3600, expires_at: expires, token_type: 'bearer', user };
    let virtualCookie = `${config.authStorageKey}=base64-${encode(session)}`;
    const cookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get() { const ordinary = cookie.get.call(document); return [ordinary, virtualCookie].filter(Boolean).join('; '); },
      set(value) {
        if (value.startsWith(`${config.authStorageKey}=`)) virtualCookie = value.split(';')[0];
        else cookie.set.call(document, value);
      },
    });
  }

  const nodes = new WeakMap();
  let nextNode = 1;
  let signature = '';
  const observe = () => {
    if (!state.active) return;
    const seen = new Set();
    const cards = [];
    for (const link of document.querySelectorAll('a[href^="/reader/"]')) {
      const id = link.getAttribute('href').split('/')[2];
      if (seen.has(id)) continue;
      seen.add(id);
      const card = link.closest('div.w-full.relative') ?? link;
      if (!nodes.has(card)) nodes.set(card, nextNode++);
      const rect = card.getBoundingClientRect();
      const progress = Number.parseFloat(card.querySelector('div.h-full.bg-primary')?.style.width ?? '0');
      cards.push({ id, node: nodes.get(card), x: rect.x, y: rect.y, width: rect.width, height: rect.height, progress });
    }
    const row = { t: performance.now(), ids: cards.map((c) => c.id), cards, skeletons: document.querySelectorAll('section .animate-pulse').length };
    const next = JSON.stringify({ cards, skeletons: row.skeletons });
    if (signature !== next) { state.order.push(row); signature = next; }
    requestAnimationFrame(observe);
  };
  requestAnimationFrame(observe);
}

async function seed(page, scenario) {
  await page.evaluate(async (config) => {
    localStorage.setItem('globoox-preview-cache-epoch', config.epoch);
    localStorage.setItem('globoox:library_sort', 'recently_opened');
    const localProgress = config.localRecent ? {
      [config.ids[0]]: { lastRead: config.localLatest, ...(config.legacyLocal ? {} : { localLastReadAt: config.localLatest, localLastReadScope: config.foreignRecency ? config.otherUserId : config.userId, serverUpdatedAt: config.localTimes[config.ids[0]], serverProgressScope: config.foreignRecency ? config.otherUserId : config.userId }), blockPosition: 10, totalBlocks: 100 },
    } : {};
    localStorage.setItem('globoox-preview-storage', JSON.stringify({ state: { settings: { fontSize: 16, theme: 'light', language: 'en' }, perBookLanguages: {}, progress: localProgress, readingAnchors: {}, syncVersions: { library: null, progress: null, settings: null } }, version: 0 }));
    const db = await new Promise((resolve, reject) => {
      const open = indexedDB.open('globoox-cache', 9);
      open.onerror = () => reject(open.error);
      open.onupgradeneeded = () => {
        const definitions = {
          chapter_content: ['key', { by_fetchedAt: 'fetchedAt' }],
          chapter_skeleton: ['chapterId', { by_fetchedAt: 'fetchedAt' }],
          block_text: ['key', { by_chapter_lang: ['chapterId', 'lang'], by_fetchedAt: 'fetchedAt' }],
          chapter_layout: ['key', { by_book_chapter: ['bookId', 'chapterId'], by_fetchedAt: 'fetchedAt' }],
          books_list: ['key', { by_scope: 'scope', by_fetchedAt: 'fetchedAt' }],
          book_meta: ['key', { by_scope: 'scope', by_bookId: 'bookId', by_fetchedAt: 'fetchedAt' }],
          reading_positions: ['key', { by_scope: 'scope', by_updatedAt: 'updatedAt' }],
          toc_titles: ['key', { by_scope_book_lang: ['scope', 'bookId', 'lang'], by_fetchedAt: 'fetchedAt' }],
          book_translations: ['key', { by_scope_book_lang: ['scope', 'bookId', 'lang'], by_fetchedAt: 'fetchedAt' }],
          reader_metadata_bundles: ['key', { by_scope_book_lang: ['scope', 'bookId', 'lang'], by_fetchedAt: 'fetchedAt' }],
        };
        for (const [name, [keyPath, indexes]] of Object.entries(definitions)) {
          const store = open.result.createObjectStore(name, { keyPath });
          for (const [index, key] of Object.entries(indexes)) store.createIndex(index, key);
        }
      };
      open.onsuccess = () => resolve(open.result);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['books_list', 'reading_positions'], 'readwrite');
      const list = tx.objectStore('books_list');
      const fetchedAt = Date.now() - 600_000;
      const scope = config.authenticated ? config.userId : 'guest';
      if (config.cached) list.put({ key: `${scope}::all`, scope, status: 'all', books: config.books, fetchedAt });
      if (config.snapshot) {
        list.put({ key: `${scope}::__library_view__::recently_opened`, scope, view: 'recently_opened', order: config.ids, effectiveLastReadByBookId: config.localTimes, computedAt: fetchedAt, fetchedAt });
        for (const book of config.books) {
          const updatedAt = config.localTimes[book.id];
          tx.objectStore('reading_positions').put({ key: `${scope}::${book.id}`, scope, bookId: book.id, fetchedAt, updatedAt, position: { book_id: book.id, chapter_id: `${book.id}-chapter`, block_id: `${book.id}-block`, block_position: 10, total_blocks: 100, lang: 'en', updated_at: updatedAt } });
        }
      }
      if (config.foreignCache) {
        list.put({ key: 'guest::all', scope: 'guest', status: 'all', books: [config.guestBook], fetchedAt });
        list.put({ key: `${config.otherUserId}::all`, scope: config.otherUserId, status: 'all', books: [config.otherBook], fetchedAt });
      }
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, { ...scenario, books, ids, localTimes, localLatest: stamp(16), userId, otherUserId, guestBook: fixtureBook('guest-only', 'Wrong Guest Scope'), otherBook: fixtureBook('other-user-only', 'Wrong Account Scope'), epoch: fixtureEpoch });
}

function checkTimeline(result, scenario) {
  const nonempty = result.order.filter((row) => row.ids.length);
  assert(nonempty.length, 'No library cards ever appeared');
  const orders = nonempty.map((row) => row.ids.join(',')).filter((value, index, array) => index === 0 || value !== array[index - 1]);
  const seen = new Set();
  for (const order of orders) { assert(!seen.has(order), `Order oscillated back to an earlier value: ${orders.join(' -> ')}`); seen.add(order); }
  const first = result.order.findIndex((row) => row.ids.length);
  assert(!result.order.slice(first).some((row) => !row.ids.length), 'Visible library returned to empty/skeleton');
  assert(!result.order.some((row) => row.ids.includes('guest-only') || row.ids.includes('other-user-only')), 'Foreign-scope book was displayed');
  const last = nonempty.at(-1).ids;
  assert.equal(last.length, 6, 'Expected all six fixture books after settling');
  if (scenario.stream) {
    const tail = result.events.find((event) => event.kind === 'tail-sent');
    assert(tail, 'Tail was not delivered');
    assert(nonempty[0].t < tail.t - 300, 'First batch was held until the tail');
    assert.equal(nonempty[0].ids.length, 3, 'Expected first three books before the tail');
  }
  if (scenario.name === 'warm-identical-revalidation') {
    assert.equal(last[0], ids[1], 'Latest server read did not lead');
    assert(orders.length <= 2, 'Identical list response caused extra ordering transitions');
    const firstReturn = result.events.find((event) => event.kind === 'list-returned');
    const retry = firstReturn && result.events.find((event) => event.kind === 'request' && event.path === '/api/books' && event.method === 'GET' && event.t >= firstReturn.t + 1000);
    assert(retry, 'Authenticated stabilization retry was not exercised after the initial response');
    assert(result.events.some((event) => event.kind === 'list-returned' && event.t > retry.t), 'Authenticated retry did not finish within the observation window');
  }
  if (scenario.name === 'coherent-progress-wave' || scenario.selfNavigation) {
    assert.equal(last[0], ids[1], 'Latest server read did not lead');
    assert(orders.length <= 2, 'Progress wave published intermediate sort orders');
    assert(nonempty.at(-1).cards.every((card) => card.progress === 20), 'Final remote progress was not shown for all cards');
    for (const row of nonempty) {
      if (row.cards.some((card) => card.progress === 20)) assert(row.cards.every((card) => card.progress === 20), 'Remote progress was published partially before the complete wave');
    }
  }
  if (scenario.selfNavigation) {
    const click = result.events.find((event) => event.kind === 'same-library-navigation');
    const returned = result.events.find((event) => event.kind === 'position-returned' && event.id === ids[1]);
    assert(click && returned && click.t < returned.t, 'Same-library navigation did not run while progress was pending');
  }
  if (scenario.localRecent) assert.equal(last[0], scenario.foreignRecency ? ids[1] : ids[0], scenario.foreignRecency ? 'Another account’s local recency leaked into the current library' : 'Older server timestamp overrode the latest local read');
  assert(!result.events.some((event) => event.kind === 'unexpected-api'), 'Fixture missed an API route; do not treat this run as app evidence');
  return { orderTransitions: orders, firstCardsAt: nonempty[0].t, observations: result.order.length };
}

async function exerciseMutations(page) {
  const card = () => page.locator('div.w-full.relative').filter({ has: page.locator(`a[href="/reader/${ids[0]}"]`) }).first();
  await card().hover();
  await card().getByRole('button').first().click();
  await page.getByRole('button', { name: 'Archive', exact: true }).click();
  await page.waitForFunction((id) => !document.querySelector(`a[href="/reader/${id}"]`), ids[0]);
  await page.getByRole('button', { name: 'Archived', exact: true }).click();
  await card().waitFor();
  await card().hover();
  await card().getByRole('button').first().click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('dialog', { name: 'Delete Book?' }).getByRole('button', { name: 'Delete', exact: true }).click();
  await page.waitForFunction((id) => !document.querySelector(`a[href="/reader/${id}"]`), ids[0]);
  await page.getByRole('dialog', { name: 'Delete Book?' }).waitFor({ state: 'hidden' });
  const mutations = await page.evaluate(() => window.__libraryQA.mutations);
  assert(mutations.some((m) => m.method === 'PATCH' && m.id === ids[0] && m.body.status === 'hidden'), 'Archive was not sent to fixture');
  assert(mutations.some((m) => m.method === 'DELETE' && m.id === ids[0]), 'Delete was not sent to fixture');
  return mutations;
}

await mkdir(output, { recursive: true });
const authStorageKey = selected.some((s) => s.authenticated) ? await discoverAuthStorageKey() : '';
const browser = await chromium.launch({ headless: true, ...(args.channel ? { channel: String(args.channel) } : {}) });
const summary = [];
try {
  for (const scenario of selected) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
    const errors = [];
    const config = { ...scenario, books, userId, authStorageKey };
    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS' };
      if (url.origin === base.origin && url.pathname === '/__library-fixture__/blank') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Isolated fixture setup</title>' });
      if (url.origin === base.origin && !url.pathname.startsWith('/api/')) return route.continue();
      if (url.pathname.startsWith('/rest/v1/profiles')) {
        if (scenario.profileDelay) await new Promise((resolve) => setTimeout(resolve, scenario.profileDelay));
        return route.fulfill({ headers: cors, contentType: 'application/json', body: JSON.stringify({ id: userId, is_admin: false, is_alpha: false }) });
      }
      if (url.pathname.startsWith('/auth/v1/')) return route.fulfill({ headers: cors, contentType: 'application/json', body: JSON.stringify({ id: userId, email: 'library-fixture@example.invalid', role: 'authenticated', app_metadata: {}, user_metadata: {} }) });
      // Unknown APIs never reach the actual app proxy or any external provider.
      return route.fulfill({ headers: cors, contentType: 'application/json', body: '{}' });
    });
    await context.addInitScript(browserFixture, config);
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    const report = { scenario: scenario.name, passed: false };
    try {
      await page.goto(new URL('/__library-fixture__/blank', base).href);
      await seed(page, scenario);
      await page.goto(new URL('/my-books', base).href, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.waitForSelector('a[href^="/reader/"]', { timeout: 20_000 });
      if (scenario.selfNavigation) {
        await page.waitForFunction((id) => window.__libraryQA.events.some((event) => event.kind === 'request' && event.path === `/api/books/${id}/reading-position`), ids[1]);
        assert(!await page.evaluate((id) => window.__libraryQA.events.some((event) => event.kind === 'position-returned' && event.id === id), ids[1]), 'Delayed position already returned before navigation');
        await page.getByRole('link', { name: 'My Books', exact: true }).click();
        await page.evaluate(() => window.__libraryQA.events.push({ t: performance.now(), kind: 'same-library-navigation' }));
      }
      await page.screenshot({ path: path.join(output, `${scenario.name}-first.png`), fullPage: true });
      await page.waitForTimeout(scenario.duration);
      const evidence = await page.evaluate(() => ({ order: window.__libraryQA.order, events: window.__libraryQA.events, persistedProgress: JSON.parse(localStorage.getItem('globoox-preview-storage') ?? '{}').state?.progress ?? {} }));
      await writeFile(path.join(output, `${scenario.name}-timeline.json`), JSON.stringify({ ...evidence, errors }, null, 2));
      Object.assign(report, checkTimeline(evidence, scenario));
      assert.equal(errors.length, 0, `Browser exceptions: ${errors.join('; ')}`);
      if (scenario.mutations) {
        report.mutations = await exerciseMutations(page);
        const interactionEvidence = await page.evaluate(() => ({ order: window.__libraryQA.order, events: window.__libraryQA.events, mutations: window.__libraryQA.mutations }));
        await writeFile(path.join(output, `${scenario.name}-interactions.json`), JSON.stringify({ ...interactionEvidence, errors }, null, 2));
        assert(!interactionEvidence.events.some((event) => event.kind === 'unexpected-api'), 'Fixture missed a mutation API route');
        assert.equal(errors.length, 0, `Browser exceptions after mutations: ${errors.join('; ')}`);
      }
      await page.screenshot({ path: path.join(output, `${scenario.name}-final.png`), fullPage: true });
      report.passed = true;
    } catch (error) {
      report.error = error.message;
      report.errors = errors;
      await page.screenshot({ path: path.join(output, `${scenario.name}-failure.png`), fullPage: true }).catch(() => {});
      const evidence = await page.evaluate(() => window.__libraryQA ?? null).catch(() => null);
      await writeFile(path.join(output, `${scenario.name}-failure.json`), JSON.stringify({ evidence, errors }, null, 2));
    } finally {
      summary.push(report);
      console.log(JSON.stringify(report));
      await context.close();
    }
  }
} finally {
  await browser.close();
  await writeFile(path.join(output, 'summary.json'), JSON.stringify({ baseUrl: base.origin, fixtureOnly: true, readerReturnIsRestoredState: true, results: summary }, null, 2));
}
if (summary.some((result) => !result.passed)) process.exitCode = 1;
