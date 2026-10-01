// Actual MyBooks page, catalog controller/cache/FIFO and upload modal; synthetic HTTP only.
import { build } from 'esbuild'
import { chromium } from 'playwright'
import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import assert from 'node:assert/strict'

const accountA = '00000000-0000-4000-8000-000000000001'
const manual = process.argv.includes('--manual')
const accountB = '00000000-0000-4000-8000-000000000002'
const item = (id, extra = {}) => ({ id, title: id, author: 'Fixture author', created_at: '2026-09-01T00:00:00Z', status: 'active', is_own: true,
  original_language: 'en', available_languages: ['en'], selected_language: null, last_read_at: '2026-09-01T00:00:00Z',
  metadata_version: id, reading: null, cover: null, processing_status: 'ready', metadata_ready: true, ...extra })
const original = [item('old-a', { title: 'A old book' }), item('old-z', { title: 'Z old book' }), item('archived', { status: 'hidden' })]
const mocks = {
  auth: `import {useSyncExternalStore} from 'react'; export const useAuth=()=>useSyncExternalStore(window.authSubscribe,()=>window.auth);`,
  supabase: `export const createClient=()=>({auth:{getSession:async()=>({data:{session:window.auth.user?{user:window.auth.user,access_token:'synthetic-only'}:null}})}});`,
  store: `export const useAppStore=fn=>fn({progress:{}});`,
  analytics: `export const trackApiRequest=()=>{};export const trackTranslateStreamClient=()=>{};export const trackBookOpened=()=>{};export const trackBookUploadStarted=()=>{};export const trackBookUploaded=()=>{};export const trackBookUploadFailed=()=>{};`,
  sentry: `export const captureException=()=>{};export const addBreadcrumb=()=>{};`,
  activity: `export const flushReadingActivity=async()=> '0';export const getPendingReadingRecency=()=>({});`,
  navigation: `export const useSearchParams=()=>new URLSearchParams(location.search);`,
  link: `import React from 'react';export default function Link({children,...props}){return <a {...props}>{children}</a>}`,
  image: `import React from 'react';export default function Image({fill,unoptimized,priority,...props}){return <img {...props}/>} `,
  empty: `export default function Empty(){return null}`,
  dialog: `import React from 'react';export default function Dialog({open,onOpenChange,title,children}){return open?<div role="dialog" aria-label={title}><button onClick={()=>onOpenChange(false)}>Close dialog</button>{children}</div>:null}`,
  alert: `import React from 'react';export default function Alert({open,onConfirm,onOpenChange,title,description}){return open?<div role="dialog" aria-label={title}>{description}<button onClick={onConfirm}>Confirm delete</button><button onClick={()=>onOpenChange(false)}>Cancel</button></div>:null}`,
  wrapper: `import React from 'react';export default function Wrapper({children}){return <div>{children}</div>}`,
  actions: `import React from 'react';export const IOSAction=({children,onClick,disabled})=><button onClick={onClick} disabled={disabled}>{children}</button>;export const IOSActionStack=({children})=><div>{children}</div>;`,
}
const source = `
import React,{act} from 'react';import {createRoot} from 'react-dom/client';
import MyBooks from './src/app/(app)/my-books/page';
import {catalogContextHint} from './src/lib/catalogApi';
import {invalidateCatalogConfirmation} from './src/lib/catalogFreshness';
window.IS_REACT_ACT_ENVIRONMENT=true;
const listeners=new Set();window.authSubscribe=fn=>{listeners.add(fn);return()=>listeners.delete(fn)};
const authFor=id=>({user:id?{id}:null,isAuthenticated:!!id,loading:false,isAdmin:false});
window.auth=authFor(sessionStorage.getItem('fixture:account')||window.initial.account);
let server=JSON.parse(localStorage.getItem('fixture:server')||'null')||window.initial.server;
const persist=()=>localStorage.setItem('fixture:server',JSON.stringify(server));persist();
window.calls={library:[],signed:[],storage:[],process:[],job:[],cover:[]};let holdIndex=window.initial.holdIndex||false;
const manifest=(books,userId)=>({contract_version:2,scope_key:catalogContextHint(userId).scopeKey,revision:'server-'+JSON.stringify(books),server_time:new Date().toISOString(),complete:true,order:'recently_read',activity_version:'0',items:books});
const json=value=>new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}});
window.fetch=(input,init={})=>{
 const url=String(input);const headers=new Headers(init.headers);const user=headers.get('X-Catalog-User')||window.auth.user?.id||'guest';
  if(init.method==='DELETE'&&url.startsWith('/api/books/')){const id=url.split('/').at(-1);server[user]=(server[user]||[]).filter(book=>book.id!==id);persist();return Promise.resolve(json({success:true}))}
  if(init.method==='PATCH'&&url.startsWith('/api/books/')){const id=url.split('/').at(-1),patch=JSON.parse(init.body);server[user]=(server[user]||[]).map(book=>book.id===id?{...book,...patch}:book);persist();return Promise.resolve(json({success:true}))}
  const kind=url.startsWith('/api/v2/library')?'library':url.startsWith('/api/storage/signed-url')?'signed':url.startsWith('https://fixture.invalid/')?'storage':url.startsWith('/api/books/process')?'process':url.startsWith('/api/jobs/')?'job':url.includes('/cover')?'cover':null;
 if(!kind)throw Error('Unexpected synthetic transport '+url);
 return new Promise((resolve,reject)=>{const call={url,user,body:typeof init.body==='string'?JSON.parse(init.body):null,signal:init.signal,settled:false};
  const abort=()=>{call.aborted=true;reject(new DOMException('Aborted','AbortError'))};init.signal?.addEventListener('abort',abort,{once:true});
  call.resolve=value=>{call.settled=true;init.signal?.removeEventListener('abort',abort);resolve(kind==='cover'?new Response(value,{headers:{'content-type':'image/svg+xml'}}):json(value))};
  call.reject=message=>{call.settled=true;init.signal?.removeEventListener('abort',abort);reject(Error(message))};window.calls[kind].push(call);
  if(kind==='library'&&!holdIndex)call.resolve(manifest(server[user]||[],user));
 });
};
let root=createRoot(document.getElementById('root'));await act(async()=>root.render(<MyBooks/>));
window.check={
 async flush(){await act(async()=>{})},
 async resolve(kind,index,value){await act(async()=>window.calls[kind][index].resolve(value))},
 async reject(kind,index,error){await act(async()=>window.calls[kind][index].reject(error))},
 hold(value=true){holdIndex=value},
 server(books,user=window.auth.user?.id||'guest'){server[user]=books;persist()},
 async index(index,books){const call=window.calls.library[index];await act(async()=>call.resolve(manifest(books,call.user)))},
 async revalidate(){await act(async()=>document.dispatchEvent(new Event('visibilitychange')))},
 async remount(){await act(async()=>root.unmount());root=createRoot(document.getElementById('root'));await act(async()=>root.render(<MyBooks/>))},
 async switchAccount(id){await act(async()=>{window.auth=authFor(id);sessionStorage.setItem('fixture:account',id||'');listeners.forEach(fn=>fn())})},
 invalidate(){invalidateCatalogConfirmation(catalogContextHint(window.auth.user?.id||null).scopeKey)},
 state(){return {calls:Object.fromEntries(Object.entries(window.calls).map(([k,v])=>[k,v.map(c=>({url:c.url,user:c.user,aborted:c.aborted||c.signal?.aborted,settled:c.settled}))])),ids:[...document.querySelectorAll('[data-book-id]')].map(n=>n.dataset.bookId)}}
};
`
const bundled = await build({ stdin: { contents: source, resolveDir: process.cwd(), sourcefile: 'uploadStoryHarness.tsx', loader: 'tsx' }, bundle: true, write: false, format: 'esm', platform: 'browser', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' }, plugins: [{ name: 'upload-story-fixtures', setup(builder) {
  builder.onResolve({ filter: /.*/ }, args => {
    const p = args.path
    const key = p.endsWith('/hooks/useAuth') ? 'auth' : /(?:^\.\/|@\/lib\/)supabase\/client$/.test(p) ? 'supabase'
      : p === '@/lib/store' ? 'store' : /(?:^\.\/|@\/lib\/)posthog$/.test(p) ? 'analytics'
      : p === '@sentry/nextjs' ? 'sentry' : p === './readingActivity' ? 'activity'
      : p === 'next/navigation' ? 'navigation' : p === 'next/link' ? 'link' : p === 'next/image' ? 'image'
      : p === '@/components/GoogleOneTap' ? 'empty'
      : /\/ui\/(ios-flow-dialog|ios-bottom-drawer)$/.test(p) ? 'dialog' : p === '@/components/ui/ios-alert-dialog' ? 'alert'
      : p === '@/components/ui/ios-dialog-footer' ? 'wrapper' : p === '@/components/ui/ios-action-group' ? 'actions' : null
    return key && !(manual && ['dialog', 'alert', 'wrapper', 'actions'].includes(key)) ? { path: key, namespace: 'fixture' } : null
  })
  builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: mocks[args.path], loader: 'tsx', resolveDir: process.cwd() }))
  if (process.env.UPLOAD_PAGE_SOURCE_FILE) builder.onLoad({ filter: /\/my-books\/page\.tsx$/ }, async () => ({ contents: await readFile(process.env.UPLOAD_PAGE_SOURCE_FILE, 'utf8'), loader: 'tsx' }))
  if (process.env.UPLOAD_BASELINE_REF) builder.onLoad({ filter: /\/src\/.*\.tsx?$/ }, args => ({
    contents: execFileSync('git', ['show', `${process.env.UPLOAD_BASELINE_REF}:${path.relative(process.cwd(), args.path)}`], { encoding: 'utf8' }),
    loader: args.path.endsWith('tsx') ? 'tsx' : 'ts',
  }))
} }] })
if (manual) {
  const { serveUploadStory } = await import('./fixtures/upload-story-manual.mjs')
  await serveUploadStory({ bundle: bundled.outputFiles[0].text, account: accountA, books: original, item: item('manual-upload', {
    title: 'The Synthetic Library', author: 'Fixture Author', last_read_at: '2026-10-01T00:00:00Z',
  }) })
  await new Promise(() => {})
}
const browser = await chromium.launch({ channel: process.env.CATALOG_BROWSER_CHANNEL ?? 'chrome', headless: true })
const results = []
const run = (page, method, ...args) => page.evaluate(({ method, args }) => window.check[method](...args), { method, args })
const state = page => run(page, 'state')
async function fixture(books = original, holdIndex = false) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } })
  page.on('pageerror', error => console.error('fixture pageerror:', error.message))
  await page.clock.install()
  await page.route('**/*', route => route.request().url() === 'http://127.0.0.1:39999/my-books' ? route.fulfill({ contentType: 'text/html', body: `<div id="root"></div><script>window.initial=${JSON.stringify({ holdIndex, account: accountA, server: { [accountA]: books, [accountB]: [item('account-b-only')] } })}</script><script type="module">${bundled.outputFiles[0].text}</script>` }) : route.abort())
  await page.goto('http://127.0.0.1:39999/my-books')
  await page.waitForFunction(() => !!window.check && window.calls.library.length > 0)
  if (!holdIndex) await page.locator('[data-book-id], a[href="/reader/old-a"]').first().waitFor()
  return page
}
async function begin(page, name = 'not-a-book-title.epub') {
  await page.getByRole('button', { name: 'Upload book', exact: true }).click()
  await page.locator('input[type=file]').setInputFiles({ name, mimeType: 'application/epub+zip', buffer: Buffer.from('PK synthetic') })
  await page.getByRole('button', { name: 'Upload', exact: true }).click()
  await page.waitForFunction(() => window.calls.signed.length > 0)
}
async function queued(page, pendingId = 'pending') {
  await run(page, 'resolve', 'signed', 0, { signedUrl: 'https://fixture.invalid/upload' })
  await run(page, 'resolve', 'storage', 0, {})
  await run(page, 'resolve', 'process', 0, { jobId: 'job-one', bookId: pendingId })
  await page.waitForFunction(() => window.calls.job.length === 1)
}
async function poll(page) { await page.clock.runFor(2000); await run(page, 'flush') }
const cover = { url: '/api/v2/books/pending/cover?version=v1', version: 'v1', width: null, height: null }
const image = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="18"><rect width="12" height="18" fill="green"/></svg>'
try {
  let page = await fixture()
  await begin(page)
  const uploadCard = page.locator('[data-upload-attempt]').first()
  assert.equal(await uploadCard.getByLabel('Loading title', { exact: true }).count(), 1, 'Unparsed upload must render a title skeleton, never the filename')
  assert.equal(await uploadCard.getByLabel('Loading author', { exact: true }).count(), 1)
  assert.equal((await uploadCard.innerText()).includes('not-a-book-title.epub'), false)
  assert.equal(await uploadCard.locator('a').count(), 0)
  const attempt = await uploadCard.getAttribute('data-upload-attempt')
  await page.evaluate(() => { window.initialCard = document.querySelector('[data-upload-attempt]') })
  await queued(page)
  const parsed = item('pending', { title: 'M parsed book', author: null, processing_status: 'processing', last_read_at: '2026-10-01T00:00:00Z' })
  await run(page, 'resolve', 'job', 0, { state: 'active', progress: 20, book: parsed })
  assert.equal(await page.locator(`[data-upload-attempt="${attempt}"]`).getByText('M parsed book', { exact: true }).count(), 1)
  assert.equal(await uploadCard.getByText('Unknown author', { exact: true }).count(), 1)
  assert.equal(await uploadCard.locator('a').count(), 0)
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await poll(page)
  await run(page, 'resolve', 'job', 1, { state: 'active', progress: 50, book: { ...parsed, cover } })
  await page.waitForFunction(() => window.calls.cover.length === 1)
  await run(page, 'resolve', 'cover', 0, image)
  await uploadCard.locator('img').waitFor()
  assert.equal(await page.evaluate(() => window.initialCard === document.querySelector('[data-upload-attempt]')), true)
  await run(page, 'hold', true)
  await poll(page)
  const ready = { ...parsed, processing_status: 'ready', cover }
  await run(page, 'resolve', 'job', 2, { state: 'completed', progress: 100, order_confirmed: true, book: ready, result: { bookId: ready.id, chapterCount: 2 } })
  await uploadCard.locator('a').first().waitFor()
  assert.equal(await page.evaluate(() => window.initialCard === document.querySelector('[data-upload-attempt]')), true)
  assert.equal((await state(page)).calls.library.at(-1).settled, false)
  assert.deepEqual((await state(page)).ids, ['pending', 'old-a', 'old-z'])
  results.push('actual page: immediate title/author skeleton, metadata then cover in the same card, modal close continues, completion opens before the index returns')
  const newer = { ...original[0], last_read_at: '2026-10-02T00:00:00Z' }
  const serverOrder = [newer, ready, original[1], original[2]]
  await run(page, 'server', serverOrder)
  await run(page, 'index', (await state(page)).calls.library.length - 1, serverOrder)
  assert.deepEqual((await state(page)).ids, ['old-a', 'pending', 'old-z'])
  await run(page, 'hold', false)
  await run(page, 'remount')
  await page.locator('[data-book-id="pending"] a').first().waitFor()
  assert.deepEqual((await state(page)).ids, ['old-a', 'pending', 'old-z'])
  await page.reload()
  await page.locator('[data-book-id="pending"] a').first().waitFor()
  assert.deepEqual((await state(page)).ids, ['old-a', 'pending', 'old-z'])
  assert.equal(await page.locator('[data-upload-attempt]').count(), 0)
  results.push('later reading can overtake the completed upload; server order survives SPA remount and document reload')
  await page.getByRole('button', { name: 'Archived', exact: true }).click()
  assert.deepEqual((await state(page)).ids, ['archived'])
  await page.getByRole('button', { name: 'All', exact: true }).click()
  assert.equal((await state(page)).ids.length, 4)
  await page.getByRole('button', { name: 'Sort', exact: true }).click()
  await page.getByRole('button', { name: 'Title Z → A', exact: true }).click()
  assert.deepEqual((await state(page)).ids, ['old-z', 'pending', 'archived', 'old-a'])
  results.push('completed uploads respect Archived/All and alphabetical sorting')
  await page.close()

  page = await fixture()
  await begin(page)
  await queued(page)
  await run(page, 'resolve', 'job', 0, { state: 'active', progress: 50, book: { ...parsed, cover } })
  await page.waitForFunction(() => window.calls.cover.length === 1)
  await poll(page)
  assert.equal((await state(page)).calls.job.length, 2)
  await run(page, 'switchAccount', accountB)
  await page.locator('[data-book-id="account-b-only"]').waitFor()
  await run(page, 'resolve', 'cover', 0, image)
  await run(page, 'resolve', 'job', 1, { state: 'completed', order_confirmed: true, book: ready, result: { bookId: ready.id, chapterCount: 2 } })
  await page.clock.runFor(10000)
  await run(page, 'flush')
  assert.deepEqual((await state(page)).ids, ['account-b-only'])
  assert.equal(await page.locator('[data-upload-attempt]').count(), 0)
  assert.equal((await state(page)).calls.job.length, 2)
  assert.equal((await state(page)).calls.job[1].aborted, true)
  assert.equal((await state(page)).calls.cover[0].aborted, true)
  results.push('account switch aborts operation ownership and rejects a late cover without leaking the prior account card')
  await page.close()

  page = await fixture([item('pending', { title: '', author: null, metadata_ready: false, processing_status: 'processing' }), ...original])
  assert.equal(await page.locator('[data-book-id="pending"] a').count(), 0)
  await begin(page)
  await queued(page)
  assert.equal(await page.locator('[data-book-id="pending"]').count(), 1)
  await run(page, 'resolve', 'job', 0, { state: 'active', progress: 10, book: parsed })
  assert.equal(await page.locator('[data-book-id="pending"]').count(), 1)
  await run(page, 'hold', true)
  await poll(page)
  const canonical = { ...original[0], title: 'Canonical existing', last_read_at: '2026-10-01T00:00:00Z' }
  await run(page, 'resolve', 'job', 1, { state: 'completed', order_confirmed: true, book: canonical, result: { bookId: canonical.id, chapterCount: 1 } })
  assert.equal(await page.locator('[data-book-id="pending"]').count(), 0)
  assert.equal(await page.locator('[data-book-id="old-a"]').count(), 1)
  assert.deepEqual((await state(page)).ids, ['old-a', 'old-z'])
  results.push('server pending row and local attempt deduplicate; final canonical existing ID replaces the pending row exactly once')
  await page.close()

  page = await fixture()
  await begin(page)
  await queued(page)
  await run(page, 'hold', true)
  await run(page, 'resolve', 'job', 0, { state: 'completed', order_confirmed: true, book: item('untitled', { title: null, author: null }), result: { bookId: 'untitled', chapterCount: 1 } })
  await page.locator('[data-book-id="untitled"] a').first().waitFor()
  const untitled = page.locator('[data-book-id="untitled"]')
  assert.equal(await untitled.getByLabel('Loading title').count(), 0)
  assert.equal(await untitled.getByLabel('Loading cover').count(), 0)
  assert.ok((await untitled.innerText()).includes('Untitled book'))
  assert.equal((await state(page)).calls.cover.length, 0)
  results.push('final absent title/author/cover leave normal Untitled/Unknown author/fallback, never an endless skeleton')
  await page.close()

  page = await fixture()
  await begin(page)
  await queued(page)
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await run(page, 'resolve', 'job', 0, { state: 'failed', failReason: 'Synthetic parse failure' })
  await page.getByText('Upload failed', { exact: true }).waitFor()
  const failedLocal = page.locator('[data-upload-attempt]')
  assert.equal(await failedLocal.getByLabel('Loading title', { exact: true }).count(), 0, 'Failed unparsed local upload must stop the title skeleton')
  assert.equal(await failedLocal.getByLabel('Loading author', { exact: true }).count(), 0)
  assert.equal(await failedLocal.locator('a').count(), 0)
  assert.ok((await failedLocal.innerText()).includes('Untitled book'))
  assert.ok((await failedLocal.innerText()).includes('Unknown author'))
  await page.clock.runFor(10000)
  assert.equal((await state(page)).calls.process.length, 1)
  assert.equal((await state(page)).calls.job.length, 1)
  await page.getByRole('button', { name: 'Upload again', exact: true }).click()
  assert.equal(await page.getByRole('dialog').count(), 1)
  assert.equal((await state(page)).calls.process.length, 1)
  results.push('failed upload remains visible and opens an explicit new upload; no automatic process/poll retry')
  await page.close()

  page = await fixture()
  await begin(page)
  await run(page, 'resolve', 'signed', 0, { signedUrl: 'https://fixture.invalid/upload' })
  await run(page, 'resolve', 'storage', 0, {})
  await run(page, 'hold', true)
  const synchronous = item('sync', { title: 'Sync parsed', last_read_at: '2026-10-01T00:00:00Z' })
  await run(page, 'resolve', 'process', 0, { id: 'sync', chapter_count: 2, book: synchronous, order_confirmed: true })
  await page.locator('[data-book-id="sync"] a').first().waitFor()
  assert.equal((await state(page)).calls.job.length, 0)
  assert.equal((await state(page)).calls.library.at(-1).settled, false)
  results.push('sync complete consumes full book DTO immediately without polling or waiting for the index')
  await page.close()

  page = await fixture()
  await begin(page)
  await queued(page)
  await run(page, 'hold', true)
  await run(page, 'resolve', 'job', 0, { state: 'completed', order_confirmed: false, book: original[0], result: { bookId: 'old-a', chapterCount: 2 } })
  await page.locator('[data-book-id="old-a"] a').first().waitFor()
  assert.equal(await page.locator('[data-book-id="old-a"]').count(), 1)
  await run(page, 'reject', 'library', (await state(page)).calls.library.length - 1, 'Synthetic index unavailable')
  assert.equal(await page.locator('[data-book-id="old-a"] a').count(), 2)
  assert.ok((await page.locator('[data-book-id="old-a"]').innerText()).includes('Upload failed'))
  results.push('order confirmation failure remains visible but never downgrades an already ready canonical book, including an unavailable index')
  await run(page, 'hold', false)
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await page.waitForFunction(() => !document.body.innerText.includes('Upload failed'))
  assert.equal(await page.locator('[data-book-id="old-a"] a').count(), 2)
  results.push('successful authoritative index recovery clears an earlier upload warning without removing the ready book')
  await page.close()

  page = await fixture([item('failed-server', { title: '', author: null, metadata_ready: false, processing_status: 'error' }), ...original])
  await page.reload()
  const failed = page.locator('[data-book-id="failed-server"]')
  await failed.waitFor()
  assert.equal(await failed.locator('a').count(), 0)
  assert.equal(await failed.getByLabel('Loading title', { exact: true }).count(), 0, 'Failed unparsed server book must stop the title skeleton after reload')
  assert.equal(await failed.getByLabel('Loading author', { exact: true }).count(), 0)
  assert.equal(await failed.getByLabel('Loading cover', { exact: true }).count(), 0)
  assert.ok((await failed.innerText()).includes('Untitled book'))
  await failed.getByRole('button', { name: 'Book actions' }).click({ force: true })
  await page.clock.runFor(30)
  assert.equal(await failed.getByRole('button', { name: 'Archive', exact: true }).count(), 0)
  await failed.getByRole('button', { name: 'Delete', exact: true }).click({ force: true })
  assert.equal(await page.getByRole('dialog', { name: 'Delete Book?' }).getByText('Untitled book', { exact: true }).count(), 1, 'Failed unparsed book deletion must identify the book with a neutral title')
  await page.getByRole('button', { name: 'Confirm delete' }).click()
  await failed.waitFor({ state: 'detached' })
  results.push('failed server row stays nonreadable after reload and offers Delete plus Upload again, without Archive')
  await page.close()

  page = await fixture([item('resumed', { title: '', author: null, metadata_ready: false, processing_status: 'processing' }), ...original])
  await page.reload()
  await page.locator('[data-book-id="resumed"]').waitFor()
  await run(page, 'server', [item('resumed', { title: 'Parsed after reload', processing_status: 'processing' }), ...original])
  await poll(page)
  await page.getByText('Parsed after reload', { exact: true }).waitFor()
  assert.equal(await page.locator('[data-book-id="resumed"] a').count(), 0)
  await run(page, 'server', [item('resumed', { title: 'Ready after reload' }), ...original])
  await poll(page)
  await page.locator('[data-book-id="resumed"] a').first().waitFor()
  const indexCount = (await state(page)).calls.library.length
  await page.clock.runFor(10000)
  assert.equal((await state(page)).calls.library.length, indexCount)
  assert.equal((await state(page)).calls.process.length, 0)
  assert.equal((await state(page)).calls.job.length, 0)
  results.push('reload resumes only bounded index checks; parsed metadata then readiness arrives without a job ID or reprocessing, and polling stops when ready')
  await page.close()

  page = await fixture([item('resumed', { processing_status: 'processing' }), ...original])
  // Jump to the deadline without starving real IndexedDB transactions behind 150 fake network timers.
  await page.clock.fastForward(300001)
  await run(page, 'flush')
  await poll(page)
  await page.getByRole('button', { name: 'Refresh status' }).waitFor()
  const bounded = (await state(page)).calls.library.length
  assert.ok(bounded <= 151)
  await page.clock.runFor(20000)
  assert.equal((await state(page)).calls.library.length, bounded)
  await run(page, 'server', [item('resumed', { processing_status: 'error' }), ...original])
  await page.getByRole('button', { name: 'Refresh status' }).click()
  await page.locator('[data-book-id="resumed"]').getByText('Upload failed', { exact: true }).waitFor()
  assert.equal((await state(page)).calls.process.length, 0)
  results.push('pending reload polling ends after five minutes; explicit status retry can reveal terminal failure without resubmitting the upload')
  await page.close()

  page = await fixture(original, true)
  await begin(page)
  await queued(page)
  await run(page, 'resolve', 'job', 0, { state: 'active', progress: 20, book: { ...parsed, cover } })
  assert.equal((await state(page)).calls.library[0].aborted, false)
  await run(page, 'index', 0, original)
  await page.locator('[data-book-id="old-a"]').waitFor()
  await page.waitForFunction(() => window.calls.cover.length === 1)
  await run(page, 'resolve', 'cover', 0, image)
  await page.locator('[data-book-id="pending"] img').waitFor()
  assert.equal(await page.locator('[data-book-id="pending"]').count(), 1)
  results.push('starting upload during a delayed first index does not cancel the existing library; queued metadata and cover bind when its scope arrives')
  await page.close()

  page = await fixture()
  await begin(page)
  await queued(page)
  await run(page, 'resolve', 'job', 0, { state: 'active', progress: 80, book: original[0] })
  await page.getByRole('button', { name: 'Close dialog' }).click()
  const existing = page.locator('[data-book-id="old-a"]')
  await existing.getByRole('button', { name: 'Book actions' }).click({ force: true })
  await page.clock.runFor(30)
  await existing.getByRole('button', { name: 'Delete', exact: true }).click({ force: true })
  await page.getByRole('button', { name: 'Confirm delete' }).click()
  await existing.waitFor({ state: 'detached' })
  await poll(page)
  await run(page, 'resolve', 'job', 1, { state: 'completed', order_confirmed: true, book: original[0], result: { bookId: 'old-a', chapterCount: 2 } })
  assert.equal(await page.locator('[data-book-id="old-a"]').count(), 0)
  await run(page, 'remount')
  await page.locator('[data-book-id="old-z"]').waitFor()
  assert.equal(await page.locator('[data-book-id="old-a"]').count(), 0)
  results.push('deleting the canonical book retires its attempt authority; late completion cannot reinsert it into the page or cached remount')
  await page.close()

  page = await fixture()
  await begin(page)
  await queued(page)
  await run(page, 'resolve', 'job', 0, { state: 'active', progress: 80, book: original[0] })
  await page.getByRole('button', { name: 'Close dialog' }).click()
  const archivedDuringUpload = page.locator('[data-book-id="old-a"]')
  await archivedDuringUpload.getByRole('button', { name: 'Book actions' }).click({ force: true })
  await page.clock.runFor(30)
  await archivedDuringUpload.getByRole('button', { name: 'Archive', exact: true }).click({ force: true })
  await archivedDuringUpload.waitFor({ state: 'detached' })
  await page.getByRole('button', { name: 'Archived', exact: true }).click()
  await archivedDuringUpload.waitFor()
  await poll(page)
  await run(page, 'resolve', 'job', 1, { state: 'completed', order_confirmed: true, book: original[0], result: { bookId: 'old-a', chapterCount: 2 } })
  assert.equal(await archivedDuringUpload.count(), 1)
  await page.getByRole('button', { name: 'Visible', exact: true }).click()
  assert.equal(await archivedDuringUpload.count(), 0)
  results.push('archiving a canonical duplicate retires its attempt authority; a late completed DTO cannot undo the acknowledged archive')
  await page.close()

  page = await fixture()
  await begin(page)
  await run(page, 'resolve', 'signed', 0, { signedUrl: 'https://fixture.invalid/upload' })
  await run(page, 'resolve', 'storage', 0, {})
  await run(page, 'hold', true)
  await run(page, 'resolve', 'process', 0, { id: 'legacy', chapter_count: 1 })
  const legacy = item('legacy', { title: 'Legacy completed' })
  await run(page, 'index', (await state(page)).calls.library.length - 1, [original[0], legacy, original[1]])
  assert.deepEqual((await state(page)).ids, ['old-a', 'legacy', 'old-z'])
  assert.equal(await page.locator('[data-book-id="legacy"] a').count(), 2)
  results.push('legacy completion waits for missing metadata once, then follows canonical server order instead of retaining its temporary top position')
  await page.close()
  console.log(JSON.stringify({ fixtureOnly: true, actualMyBooksPage: true, passed: results.length, results }, null, 2))
} finally { await browser.close() }
