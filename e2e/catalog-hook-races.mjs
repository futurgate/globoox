// Fresh standalone React browser harness. No server, credentials, network or user profile.
import { build } from 'esbuild'
import { chromium } from 'playwright'
import assert from 'node:assert/strict'

const context = { scopeKey: 'user:account-a::fixture', userId: 'account-a', guestId: 'fixture-guest', shareToken: null, headers: {} }
const book = id => ({ id, title: id, author: null, created_at: '2026-09-01T00:00:00Z', status: 'active', is_own: true, original_language: 'en', available_languages: ['en'], selected_language: null, last_read_at: null, metadata_version: id, reading: null, cover: null })
const manifest = ids => ({ contract_version: 2, scope_key: context.scopeKey, revision: ids.join('-') || 'empty', server_time: '2026-09-25T00:00:00Z', complete: true, order: 'recently_read', activity_version: '0', items: ids.map(book) })
const mocks = `
const calls = globalThis.__calls = {identity:[],fetch:[]};
const pending = kind => new Promise((resolve,reject)=>calls[kind].push({resolve,reject}));
export const getShareToken = () => null;
export const createBook = async () => {}; export const updateBook = async () => {}; export const deleteBook = async () => {};
export const catalogContextHint = () => globalThis.__context;
export const resolveCatalogContext = () => pending('identity');
export const fetchCatalogManifest = () => pending('fetch');
export const getCatalogManifestSync = () => globalThis.__cached;
export const loadCatalogCache = async () => globalThis.__cached;
export const putCatalogManifest = async value => {globalThis.__cached={manifest:value,savedAt:Date.now(),origin:'server'}};
export const flushReadingActivity = async () => '0';
export const getPendingReadingRecency = () => ({});
`
const source = `
import React, {StrictMode,act,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {useCatalog} from './src/lib/useCatalog';
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let changeOptions,result;
const renders=[];
function App({initial}) {const [options,setOptions]=useState(initial);changeOptions=setOptions;result=useCatalog(options);renders.push({ids:result.books.map(b=>b.id),loading:result.loading});return <div>{result.books.map(b=><span key={b.id} data-book={b.id}>{b.title}</span>)}</div>}
const root=createRoot(document.getElementById('root'));
window.check={
 async mount(options,strict=false){await act(async()=>root.render(strict?<StrictMode><App initial={options}/></StrictMode>:<App initial={options}/>))},
 async options(options){await act(async()=>changeOptions(options))},
 async resolve(kind,index,value){await act(async()=>globalThis.__calls[kind][index].resolve(value))},
 async refresh(){await act(async()=>{void result.refresh()})},
 async flush(){await act(async()=>{})},
 state(){return {ids:result.books.map(b=>b.id),loading:result.loading,refreshing:result.refreshing,offline:result.offline,error:result.error?.kind,calls:Object.fromEntries(Object.entries(globalThis.__calls).map(([k,v])=>[k,v.length])),renders}},
};
`
const bundled = await build({ stdin: { contents: source, resolveDir: process.cwd(), sourcefile: 'catalogHarness.tsx', loader: 'tsx' }, bundle: true, write: false, format: 'iife', platform: 'browser', define: { 'process.env.NODE_ENV': '"development"' }, plugins: [{ name: 'catalog-fixture', setup(builder) {
  builder.onResolve({ filter: /^\.\/(api|catalogApi|catalogCache|readingActivity)$/ }, args => args.importer.endsWith('/src/lib/useCatalog.ts') ? { path: 'fixture', namespace: 'mock' } : null)
  builder.onResolve({ filter: /^\.\/api$/ }, args => args.importer.endsWith('/src/lib/catalogApi.ts') ? { path: 'fixture', namespace: 'mock' } : null)
  builder.onResolve({ filter: /^\.\/supabase\/client$/ }, () => ({ path: 'supabase', namespace: 'mock' }))
  builder.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents: args.path === 'supabase' ? 'export const createClient=()=>({});' : mocks, loader: 'js' }))
} }] })
const browser = await chromium.launch({ channel: process.env.CATALOG_BROWSER_CHANNEL ?? 'chrome', headless: true })
const results = []
const options = { userId: context.userId, identityReady: true, legacyScopeKey: context.userId }
async function fixture(initial = options, strict = false) {
  const page = await browser.newPage()
  await page.route('**/*', route => route.abort())
  await page.clock.install()
  await page.setContent('<div id="root"></div>')
  await page.evaluate(({ context, cached }) => { window.__context = context; window.__cached = { manifest: cached, savedAt: 1, origin: 'server' } }, { context, cached: manifest(['cached']) })
  await page.addScriptTag({ content: bundled.outputFiles[0].text })
  await page.evaluate(({ initial, strict }) => window.check.mount(initial, strict), { initial, strict })
  return page
}
const run = (page, method, ...args) => page.evaluate(({ method, args }) => window.check[method](...args), { method, args })
try {
  let page = await fixture()
  assert.deepEqual((await run(page, 'state')).ids, [])
  await run(page, 'resolve', 'identity', 0, context)
  assert.deepEqual((await run(page, 'state')).ids, [])
  await run(page, 'resolve', 'fetch', 0, manifest([]))
  assert.equal((await run(page, 'state')).loading, false)
  assert.deepEqual((await run(page, 'state')).ids, [])
  results.push('memory cache hidden before server; successful empty does not resurrect cache')
  await page.close()

  page = await fixture({ identityReady: false, legacyScopeKey: 'guest' })
  await page.clock.runFor(1900)
  await run(page, 'options', options)
  assert.equal((await run(page, 'state')).calls.identity, 1)
  await page.clock.runFor(600)
  await run(page, 'flush')
  let state = await run(page, 'state')
  assert.equal(state.error, 'timeout')
  assert.deepEqual(state.ids, ['cached'])
  await run(page, 'resolve', 'identity', 0, context)
  assert.equal((await run(page, 'state')).calls.fetch, 0)
  results.push('unknown→known auth retains original deadline; hung identity falls back without late fetch')
  await page.close()

  page = await fixture(options, true)
  state = await run(page, 'state')
  assert.equal(state.calls.identity, 2)
  await run(page, 'resolve', 'identity', 0, context)
  assert.equal((await run(page, 'state')).calls.fetch, 0)
  await run(page, 'resolve', 'identity', 1, context)
  await run(page, 'resolve', 'fetch', 0, manifest(['fresh']))
  assert.deepEqual((await run(page, 'state')).ids, ['fresh'])
  await run(page, 'refresh')
  await run(page, 'resolve', 'identity', 2, context)
  await page.clock.runFor(2500)
  await run(page, 'flush')
  assert.equal((await run(page, 'state')).offline, true)
  await run(page, 'refresh')
  assert.deepEqual((await run(page, 'state')).ids, ['fresh'])
  await run(page, 'resolve', 'fetch', 1, manifest(['expired']))
  assert.deepEqual((await run(page, 'state')).ids, ['fresh'])
  await run(page, 'resolve', 'identity', 3, context)
  await run(page, 'resolve', 'fetch', 2, manifest(['retried']))
  assert.deepEqual((await run(page, 'state')).ids, ['retried'])
  results.push('StrictMode cleanup excludes stale request; retry keeps cards and rejects expired body')
  await page.close()
  console.log(JSON.stringify({ passed: results.length, fixtureOnly: true, results }, null, 2))
} finally { await browser.close() }
