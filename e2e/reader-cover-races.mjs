// Actual Reader page, cover hook, queue and request framing; synthetic transport only.
import { build } from 'esbuild'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const fixtures = {
  reader: `import React from 'react'; export default function Reader(props) {
    globalThis.__readerProps=props;
    return <main data-reader={props.bookId}><img data-reader-cover src={props.coverUrl||undefined}/></main>;
  }`,
  link: `import React from 'react'; export default function Link(props){return <a {...props}/>}`,
  api: `export const getShareToken=()=>globalThis.__readerFixture.share;`,
  auth: `export const useAuth=()=>({user:globalThis.__readerFixture.user?{id:globalThis.__readerFixture.user}:null,isAuthenticated:!!globalThis.__readerFixture.user,loading:false});`,
  session: `export const createClient=()=>({auth:{getSession:async()=>({error:null,data:{session:globalThis.__readerFixture.user?{user:{id:globalThis.__readerFixture.user},access_token:'fixture-'+globalThis.__readerFixture.user}:null}})}});`,
  cache: `
    export const getCatalogBook=async(scope,id)=>globalThis.__readerFixture.metadata==='memory'?globalThis.__makeBook(id):null;
    // Retained to let this suite prove the previous Reader implementation fails.
    export const getCachedCatalogBook=async(scope,id)=>{const b=await getCatalogBook(scope,id);return b?{...b,cover_url:b.cover?.url??null}:null};
    export const loadCatalogCache=async context=>globalThis.__readerFixture.metadata==='legacy'?{manifest:globalThis.__makeManifest(context)}:null;
    export const putCatalogManifest=async()=>{};
    export const getCatalogCover=async(scope,id,version)=>globalThis.__readerFixture.cachedCover?new Blob(['cached:'+scope+':'+version],{type:'image/png'}):null;
    export const putCatalogCover=async(scope,id,version,blob)=>{globalThis.__savedCovers.push({scope,id,version})};
  `,
  activity: `export const flushReadingActivity=async()=> '0';`,
  store: `export const useAppStore=selector=>selector({settings:{readerTheme:'light'}});`,
  theme: `export const READER_THEME_CONFIGS={light:{}};export const getReaderUiColors=()=>({});`,
  themes: `export const isThemeId=()=>true;export const getThemeStyle=()=>({});`,
}

export async function buildReaderCoverHarness({ readerPageSource } = {}) {
  const source = `
    import React,{act,Suspense} from 'react';
    import {createRoot} from 'react-dom/client';
    import ReaderPage from './src/app/(app)/reader/[id]/page';
    import {catalogContextHint} from './src/lib/catalogApi';
    globalThis.IS_REACT_ACT_ENVIRONMENT=true;
    globalThis.__readerFixture={user:null,share:null,metadata:'memory',version:'v1',cachedCover:false};
    globalThis.__savedCovers=[];
    const requests=[],created=[],revoked=[];
    URL.createObjectURL=blob=>{const url='blob:reader-fixture-'+(created.length+1);created.push({url,blob});return url};
    URL.revokeObjectURL=url=>revoked.push(url);
    globalThis.__makeBook=id=>({id,title:'Fixture book',author:'Author',created_at:'2026-09-01T00:00:00Z',status:'active',is_own:true,
      original_language:'en',available_languages:['en','fr'],selected_language:'fr',last_read_at:null,metadata_version:'meta-v1',reading:null,
      cover:{url:'/api/v2/books/'+id+'/cover?version='+globalThis.__readerFixture.version,version:globalThis.__readerFixture.version,width:200,height:300}});
    let id='book';
    globalThis.__makeManifest=context=>({contract_version:2,scope_key:context.scopeKey,revision:'fixture',server_time:'2026-09-25T00:00:00Z',
      complete:true,order:'recently_read',activity_version:'0',items:[globalThis.__makeBook(id)]});
    globalThis.fetch=(url,options)=>{
      if(url.startsWith('/api/v2/library'))return Promise.resolve(new Response(JSON.stringify(globalThis.__makeManifest(catalogContextHint(globalThis.__readerFixture.user))),{headers:{'content-type':'application/json'}}));
      // Deliberately ignore transport cancellation so late results exercise ownership guards.
      return new Promise(resolve=>requests.push({url,options,resolve:label=>resolve(new Response(new Blob([label],{type:'image/png'}),{headers:{'content-type':'image/png'}}))}));
    };
    const root=createRoot(document.getElementById('root'));
    let params=Promise.resolve({id});
    const render=()=>root.render(<Suspense fallback={<p>Loading</p>}><ReaderPage params={params}/></Suspense>);
    window.check={
      async mount(options){Object.assign(globalThis.__readerFixture,options);await act(async()=>{await params;render()})},
      async update(options,nextId=id){Object.assign(globalThis.__readerFixture,options);if(nextId!==id){id=nextId;params=Promise.resolve({id})}await act(async()=>{await params;render()})},
      async network(index,label){await act(async()=>requests[index].resolve(label))},
      async unmount(){await act(async()=>root.unmount())},
      async state(){return {src:document.querySelector('[data-reader-cover]')?.getAttribute('src')??null,reader:!!document.querySelector('[data-reader]'),
        requests:requests.map(r=>({url:r.url,headers:r.options.headers,aborted:r.options.signal.aborted})),
        created:await Promise.all(created.map(async r=>({url:r.url,body:await r.blob.text()}))),revoked,
        saved:globalThis.__savedCovers,scope:globalThis.__readerProps?.catalogContext?.scopeKey,
        title:globalThis.__readerProps?.title,languages:globalThis.__readerProps?.availableLanguages,selected:globalThis.__readerProps?.serverLanguage}},
    };
  `
  const mapping = new Map([
    ['@/components/Reader/ReaderView', 'reader'], ['next/link', 'link'],
    ['@/lib/api', 'api'], ['./api', 'api'], ['@/lib/hooks/useAuth', 'auth'],
    ['./supabase/client', 'session'], ['@/lib/catalogCache', 'cache'], ['./catalogCache', 'cache'],
    ['@/lib/readingActivity', 'activity'], ['@/lib/store', 'store'],
    ['@/lib/readerTheme', 'theme'], ['@/lib/themes', 'themes'],
  ])
  const result = await build({ stdin: { contents: source, resolveDir: process.cwd(), sourcefile: 'readerCoverHarness.tsx', loader: 'tsx' },
    bundle: true, write: false, format: 'iife', platform: 'browser', define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [{ name: 'reader-fixtures', setup(builder) {
      if (readerPageSource !== undefined) builder.onLoad({ filter: /\/reader\/\[id\]\/page\.tsx$/ }, () => ({ contents: readerPageSource, loader: 'tsx' }))
      builder.onResolve({ filter: /.*/ }, args => mapping.has(args.path) ? { path: mapping.get(args.path), namespace: 'fixture' } : null)
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: fixtures[args.path], loader: 'tsx', resolveDir: process.cwd() }))
    } }],
  })
  return result.outputFiles[0].text
}

export async function runReaderCoverCases(browser, bundle) {
  const a = '00000000-0000-4000-8000-000000000001'
  const b = '00000000-0000-4000-8000-000000000002'
  const passed = []
  const run = (page, method, ...args) => page.evaluate(({ method, args }) => window.check[method](...args), { method, args })
  async function scenario(name, options, body) {
    const page = await browser.newPage()
    try {
      await page.route('**/*', route => route.abort())
      await page.setContent('<div id="root"></div>')
      await page.addScriptTag({ content: bundle })
      await run(page, 'mount', options)
      await body(page)
      await run(page, 'unmount')
      passed.push(name)
    } finally { await page.close() }
  }
  for (const metadata of ['memory', 'legacy', 'network']) {
    await scenario(`${metadata} metadata retains cover version and supplies an authenticated blob to Reader`, { user: a, metadata }, async page => {
      let state = await run(page, 'state')
      assert.equal(state.reader, true)
      assert.equal(state.src, null, 'protected API URL must never become a bare image src')
      assert.equal(state.requests.length, 1)
      assert.equal(state.requests[0].headers['X-Catalog-User'], a)
      assert.equal(state.requests[0].headers.Authorization, 'Bearer fixture-' + a)
      assert.match(state.requests[0].url, /version=v1/)
      await run(page, 'network', 0, 'cover-' + metadata)
      state = await run(page, 'state')
      assert.match(state.src, /^blob:/)
      assert.equal(state.created[0].body, 'cover-' + metadata)
      assert.equal(state.saved[0].scope, state.scope)
      assert.equal(state.saved[0].version, 'v1')
      assert.equal(state.title, 'Fixture book')
      assert.deepEqual(state.languages, ['en', 'fr'])
      assert.equal(state.selected, 'fr')
    })
  }
  await scenario('warm scoped cover cache renders without HTTP and revokes on unmount', { user: a, cachedCover: true }, async page => {
    const before = await run(page, 'state')
    assert.match(before.src, /^blob:/)
    assert.equal(before.requests.length, 0)
    assert.ok(before.created[0].body.includes(before.scope))
    await run(page, 'unmount')
    assert.deepEqual((await run(page, 'state')).revoked, [before.src])
  })
  await scenario('guest share cover carries share token and explicit guest identity', { user: null, share: 'fixture share/token' }, async page => {
    const before = await run(page, 'state')
    assert.equal(before.requests[0].headers['X-Catalog-User'], 'guest')
    assert.ok(before.requests[0].headers['X-Catalog-Guest'])
    assert.equal(new URL(before.requests[0].url, 'http://fixture').searchParams.get('share'), 'fixture share/token')
    await run(page, 'network', 0, 'shared-cover')
    assert.match((await run(page, 'state')).src, /^blob:/)
  })
  await scenario('account switch aborts old cover and ignores its late response', { user: a }, async page => {
    await run(page, 'update', { user: b, version: 'v2' })
    let state = await run(page, 'state')
    assert.equal(state.src, null)
    assert.equal(state.requests[0].aborted, true)
    assert.equal(state.requests[1].headers['X-Catalog-User'], b)
    await run(page, 'network', 1, 'current-b-v2')
    const current = (await run(page, 'state')).src
    await run(page, 'network', 0, 'expired-a-v1')
    state = await run(page, 'state')
    assert.equal(state.src, current)
    assert.deepEqual(state.created.map(r => r.body), ['current-b-v2'])
  })
  await scenario('account switch removes and revokes an already displayed previous cover', { user: a }, async page => {
    await run(page, 'network', 0, 'old-account')
    const previous = (await run(page, 'state')).src
    await run(page, 'update', { user: b })
    const current = await run(page, 'state')
    assert.equal(current.src, null)
    assert.deepEqual(current.revoked, [previous])
  })
  await scenario('share change for the same account and book disposes the old scope', { user: a, share: 'first-share' }, async page => {
    await run(page, 'network', 0, 'first-share-cover')
    const previous = (await run(page, 'state')).src
    await run(page, 'update', { share: 'second-share' })
    let state = await run(page, 'state')
    assert.equal(state.src, null)
    assert.deepEqual(state.revoked, [previous])
    assert.equal(new URL(state.requests[1].url, 'http://fixture').searchParams.get('share'), 'second-share')
    await run(page, 'network', 1, 'second-share-cover')
    state = await run(page, 'state')
    assert.notEqual(state.src, previous)
    assert.equal(state.created[1].body, 'second-share-cover')
  })
  await scenario('unmount aborts in-flight cover and cannot create a late object URL', { user: a }, async page => {
    await run(page, 'unmount')
    assert.equal((await run(page, 'state')).requests[0].aborted, true)
    await run(page, 'network', 0, 'too-late')
    assert.deepEqual((await run(page, 'state')).created, [])
  })
  return { passed, transport: 'synthetic', components: 'Actual Reader page, useCatalogCover, catalogCoverQueue and catalogApi; ReaderView layout is stubbed' }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ channel: process.env.CATALOG_BROWSER_CHANNEL ?? 'chrome', headless: true })
  try { console.log(JSON.stringify(await runReaderCoverCases(browser, await buildReaderCoverHarness()), null, 2)) }
  finally { await browser.close() }
}
