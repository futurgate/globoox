// Standalone real React cover-hook regressions; no server/profile/credentials.
import { build } from 'esbuild'
import { chromium } from 'playwright'
import assert from 'node:assert/strict'

const mocks = `
export function abortable(promise,signal){
 if(signal.aborted)return Promise.reject(signal.reason);
 return new Promise((resolve,reject)=>{
  const cleanup=()=>signal.removeEventListener('abort',abort);
  const abort=()=>{cleanup();reject(signal.reason)};
  signal.addEventListener('abort',abort,{once:true});
  promise.then(value=>{cleanup();resolve(value)},error=>{cleanup();reject(error)});
 });
}
export const catalogRequestUrl = path => path;
export const getCatalogCover = (scope,id,version) => {
 const mode=globalThis.__cacheMode;
 if(mode==='blob')return Promise.resolve(new Blob(['cached'],{type:'image/png'}));
 if(mode==='pending')return new Promise(resolve=>globalThis.__cacheCalls.push({scope,id,version,resolve}));
 return Promise.resolve(null);
};
export const putCatalogCover = async ()=>{};
`
const source = `
import React,{act,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {useCatalogCover} from './src/lib/useCatalogCover';
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
globalThis.__cacheCalls=[];globalThis.__network=[];globalThis.__revoked=[];
globalThis.__cacheMode='miss';globalThis.__active=0;globalThis.__peak=0;
const realRevoke=URL.revokeObjectURL.bind(URL);
URL.revokeObjectURL=url=>{globalThis.__revoked.push(url);realRevoke(url)};
globalThis.fetch=(url,options)=>new Promise((resolve,reject)=>{
 globalThis.__active++;globalThis.__peak=Math.max(globalThis.__peak,globalThis.__active);
 const ignoreAbort=globalThis.__ignoreAbort===true;
 let settled=false;
 const settle=()=>{if(settled)return false;settled=true;globalThis.__active--;options.signal.removeEventListener('abort',abort);return true};
 const abort=()=>{if(!ignoreAbort&&settle())reject(new DOMException('Aborted','AbortError'))};
 const call={url,scope:options.headers.scope,signal:options.signal,resolve:label=>{if(settle())resolve({ok:true,headers:new Headers({'content-type':'image/png'}),blob:async()=>new Blob([label],{type:'image/png'})})}};
 globalThis.__network.push(call);options.signal.addEventListener('abort',abort,{once:true});
 if(options.signal.aborted)abort();
});
let update,result={};
function Card({book,context,offline}){result[book.id]=useCatalogCover(book,context,offline);return <img data-book={book.id} src={result[book.id].url||undefined}/>}
function App({initial}){const [props,setProps]=useState(initial);update=setProps;return <div>{props.books.map(book=><Card key={book.id} book={book} context={props.context} offline={props.offline}/>)}</div>}
const root=createRoot(document.getElementById('root'));
window.check={
 ignoreAbort(value){globalThis.__ignoreAbort=value},
 async mount(initial,mode='miss'){globalThis.__cacheMode=mode;await act(async()=>root.render(<App initial={initial}/>))},
 async update(props,mode){if(mode)globalThis.__cacheMode=mode;await act(async()=>update(props))},
 async network(index,label){await act(async()=>globalThis.__network[index].resolve(label))},
 async cache(index){await act(async()=>globalThis.__cacheCalls[index].resolve(new Blob(['cached'],{type:'image/png'})))},
 async flush(){await act(async()=>{})},
 state(){return{result,network:globalThis.__network.map(n=>({url:n.url,scope:n.scope,aborted:n.signal.aborted})),active:globalThis.__active,peak:globalThis.__peak,revoked:globalThis.__revoked,cacheCalls:globalThis.__cacheCalls.length}},
};
`
const bundle = await build({ stdin: { contents: source, resolveDir: process.cwd(), sourcefile: 'catalogCoverHarness.tsx', loader: 'tsx' }, bundle: true, write: false, format: 'iife', platform: 'browser', define: { 'process.env.NODE_ENV': '"development"' }, plugins: [{ name: 'cover-fixture', setup(builder) {
  builder.onResolve({ filter: /^\.\/catalog(Api|Cache)$/ }, args => (/\/src\/lib\/(useCatalogCover|catalogCoverQueue)\.ts$/).test(args.importer) ? { path: 'fixture', namespace: 'mock' } : null)
  builder.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: mocks, loader: 'js' }))
} }] })
const browser = await chromium.launch({ channel: process.env.CATALOG_BROWSER_CHANNEL ?? 'chrome', headless: true })
const context = { scopeKey: 'scope-a', userId: 'user-a', guestId: 'guest', shareToken: null, headers: { scope: 'scope-a' } }
const book = (id, version = 'v1') => ({ id, cover: { url: `/api/v2/books/${id}/cover?version=${version}`, version, width: 200, height: 300 } })
const props = (books = [book('a')], offline = false, scope = context) => ({ books, context: scope, offline })
const run = (page, method, ...args) => page.evaluate(({ method, args }) => window.check[method](...args), { method, args })
async function fixture(initial, mode, ignoreAbort = false) {
  const page = await browser.newPage()
  await page.route('**/*', route => route.abort())
  await page.clock.install()
  await page.setContent('<div id="root"></div>')
  await page.addScriptTag({ content: bundle.outputFiles[0].text })
  await run(page, 'ignoreAbort', ignoreAbort)
  await run(page, 'mount', initial, mode)
  return page
}
const passed = [], failures = []
async function scenario(name, body) {
  try { await body(); passed.push(name) }
  catch (error) { failures.push({ name, message: error.message }) }
}
try {
  await scenario('offline cache hit after 150ms still becomes visible', async () => {
    const page = await fixture(props([book('a')], true), 'pending')
    try {
      await page.clock.runFor(200)
      await run(page, 'cache', 0)
      const state = await run(page, 'state')
      assert.ok(state.result.a.url, 'late valid cached cover was discarded')
      assert.equal(state.network.length, 0)
    } finally { await page.close() }
  })
  await scenario('same cover remains live when entering fallback/Retry', async () => {
    const page = await fixture(props(), 'blob')
    try {
      const first = (await run(page, 'state')).result.a.url
      assert.ok(first)
      await run(page, 'update', props([book('a')], true), 'pending')
      const state = await run(page, 'state')
      assert.equal(state.result.a.url, first)
      assert.ok(!state.revoked.includes(first), 'still-rendered object URL was revoked')
    } finally { await page.close() }
  })
  await scenario('four network slots survive cancellation without a slot leak', async () => {
    const books = Array.from({ length: 7 }, (_, i) => book(String(i)))
    const page = await fixture(props(books), 'miss')
    try {
      let state = await run(page, 'state')
      assert.equal(state.network.length, 4)
      assert.equal(state.peak, 4)
      await run(page, 'update', props(books.slice(4)))
      state = await run(page, 'state')
      assert.equal(state.network.length, 7)
      assert.equal(state.active, 3)
      assert.equal(state.peak, 4)
      for (let i = 4; i < 7; i++) await run(page, 'network', i, String(i))
      state = await run(page, 'state')
      assert.equal(state.active, 0)
      for (let i = 4; i < 7; i++) assert.ok(state.result[String(i)].url)
    } finally { await page.close() }
  })
  await scenario('late previous version and account never replace current cover', async () => {
    // Deliberately let the transport resolve after abort to exercise the hook's
    // stale-result guard, not merely fetch's usual rejection on cancellation.
    const page = await fixture(props(), 'miss', true)
    try {
      const other = { ...context, scopeKey: 'scope-b', userId: 'user-b', headers: { scope: 'scope-b' } }
      await run(page, 'update', props([book('a', 'v2')], false, other))
      assert.equal((await run(page, 'state')).result.a.url, '')
      await run(page, 'network', 1, 'new-account-v2')
      const current = (await run(page, 'state')).result.a.url
      await run(page, 'network', 0, 'expired-account-v1')
      const state = await run(page, 'state')
      assert.equal(state.result.a.url, current)
      assert.equal(state.network[0].aborted, true)
      assert.equal(state.network[1].scope, 'scope-b')
    } finally { await page.close() }
  })
  await scenario('expired offline cache read cannot publish a late blob', async () => {
    const page = await fixture(props([book('a')], true), 'pending')
    try {
      await page.clock.runFor(8001)
      await run(page, 'flush')
      assert.equal((await run(page, 'state')).result.a.loading, false)
      await run(page, 'cache', 0)
      const state = await run(page, 'state')
      assert.equal(state.result.a.url, '')
      assert.equal(state.network.length, 0)
    } finally { await page.close() }
  })
  console.log(JSON.stringify({ fixtureOnly: true, passed, failures }, null, 2))
  assert.equal(failures.length, 0, `${failures.length} cover regressions failed`)
} finally { await browser.close() }
