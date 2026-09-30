// Actual React hook; only content transport and persistent cache are fixtures.
import { build } from 'esbuild'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

export async function buildChapterContentHarness({ hookSource } = {}) {
  const source = `
    import React,{act} from 'react';
    import {createRoot} from 'react-dom/client';
    import {useChapterContent} from './src/lib/hooks/useChapterContent';
    globalThis.IS_REACT_ACT_ENVIRONMENT=true;
    const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});promise.catch(()=>{});return{promise,resolve,reject}};
    const key=(id,lang)=>JSON.stringify([id,lang]);
    const f=globalThis.__chapterContent={cache:new Map(),calls:[],reads:[],writes:[],batch:deferred(),batchSettled:false,readGate:null,writeGate:null,refreshResults:[],key};
    f.fetch=(id,lang,signal)=>{const request={...deferred(),id,lang,signal};f.calls.push(request);return request.promise};
    f.read=(id,lang)=>{f.reads.push({id,lang});return f.readGate?.promise??Promise.resolve(f.cache.get(key(id,lang))??null)};
    f.write=async(id,lang,blocks)=>{f.writes.push({id,lang,blocks});if(f.writeGate)await f.writeGate.promise;f.cache.set(key(id,lang),{blocks,fresh:true})};
    let snapshot,props={bookId:'book-a',id:'chapter-a',lang:'EN'};const renders=[];
    function Probe(){const value=useChapterContent(props.id,props.lang,props.bookId);snapshot=value;renders.push({bookId:props.bookId,chapterId:props.id,lang:props.lang,blocksChapterId:value.blocksChapterId,blocksBookId:value.blocksBookId,isStale:value.isStale,hasServerSnapshot:value.hasServerSnapshot,loading:value.loading});return <output>{value.blocks.map(b=>b.text).join('|')}</output>}
    const root=createRoot(document.getElementById('root'));
    const render=()=>root.render(<Probe id={props.id} lang={props.lang}/>);
    window.check={
      async mount(options={}){props={...props,...options};if(options.cached)f.cache.set(key(props.id,props.lang),options.cached);if(options.stallRead)f.readGate=deferred();if(options.stallWrite)f.writeGate=deferred();await act(async()=>render())},
      async update(next){props={...props,...next};if(next.stallRead)f.readGate=deferred();await act(async()=>render())},
      async refresh(){await act(async()=>{void snapshot.refreshContent().then(value=>f.refreshResults.push(value))})},
      async reply(index,blocks,error){await act(async()=>error?f.calls[index].reject(new Error(error)):f.calls[index].resolve(blocks))},
      async finishBatch({id=props.id,lang=props.lang,blocks,error}={}){await act(async()=>{if(blocks)f.cache.set(key(id,lang),{blocks,fresh:true});f.batchSettled=true;if(error)f.batch.reject(new Error(error));else f.batch.resolve()})},
      async finishRead(entry){await act(async()=>{const gate=f.readGate;f.readGate=null;gate.resolve(entry)})},
      async finishWrite(){await act(async()=>{const gate=f.writeGate;f.writeGate=null;gate.resolve()})},
      async unmount(){await act(async()=>root.unmount())},
      state(){return{blocks:snapshot.blocks,blocksLang:snapshot.blocksLang,blocksChapterId:snapshot.blocksChapterId,blocksBookId:snapshot.blocksBookId,loading:snapshot.loading,error:snapshot.error,isStale:snapshot.isStale,hasServerSnapshot:snapshot.hasServerSnapshot,renders,
        calls:f.calls.map(c=>({id:c.id,lang:c.lang,aborted:c.signal.aborted})),reads:f.reads,writes:f.writes,batchSettled:f.batchSettled,refreshResults:f.refreshResults}}
    };
  `
  const fixtures = {
    api: `export const fetchContent=(...args)=>globalThis.__chapterContent.fetch(...args);`,
    cache: `const f=()=>globalThis.__chapterContent;
      export const getCachedChapterContent=(...args)=>f().read(...args);
      export const setCachedChapterContent=(...args)=>f().write(...args);
      export const getPendingChapterBatch=()=>f().batch.promise;
      export const isCacheFresh=entry=>entry.fresh;`,
  }
  const mappings = new Map([['@/lib/api', 'api'], ['@/lib/contentCache', 'cache']])
  const bundled = await build({
    stdin: { contents: source, resolveDir: process.cwd(), sourcefile: 'chapterContentHarness.tsx', loader: 'tsx' },
    bundle: true, write: false, platform: 'browser', format: 'iife', define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [{ name: 'chapter-content-fixtures', setup(builder) {
      if (hookSource !== undefined) builder.onLoad({ filter: /\/useChapterContent\.ts$/ }, () => ({ contents: hookSource, loader: 'ts', resolveDir: process.cwd() }))
      builder.onResolve({ filter: /.*/ }, args => mappings.has(args.path) ? { path: mappings.get(args.path), namespace: 'fixture' } : null)
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: fixtures[args.path], loader: 'ts' }))
    } }],
  })
  return bundled.outputFiles[0].text
}

export async function runChapterContentOwnershipCases(browser, bundle) {
  const passed = []
  const block = id => [{ id, position: 0, type: 'paragraph', text: id }]
  const run = (page, method, ...args) => page.evaluate(({ method, args }) => window.check[method](...args), { method, args })
  for (const next of [{ id: 'chapter-b' }, { lang: 'RU' }, { bookId: 'book-b', id: 'chapter-b' }]) {
    const page = await browser.newPage()
    try {
      await page.route('**/*', route => route.abort())
      await page.setContent('<div id="root"></div>')
      await page.addScriptTag({ content: bundle })
      await run(page, 'mount', { cached: { blocks: block('old-chapter-block'), fresh: true } })
      await run(page, 'update', { ...next, stallRead: true })
      let state = await run(page, 'state')
      assert.equal(state.isStale, true, 'the previous snapshot must become stale in the very first render of the new scope')
      assert.equal(state.hasServerSnapshot, false, 'the previous chapter cannot authorize translation or persistence for the destination')
      assert.equal(state.loading, true)
      const destinationRenders = state.renders.filter(r => next.id ? r.chapterId === next.id : r.lang === next.lang)
      assert.ok(destinationRenders.length > 0)
      assert.ok(destinationRenders.every(r => r.isStale && !r.hasServerSnapshot), 'no transient ready render before the cache read finishes')
      await run(page, 'finishRead', null)
      state = await run(page, 'state')
      assert.equal(state.loading, true)
      assert.equal(state.hasServerSnapshot, false)
      await run(page, 'reply', 0, block('destination-block'))
      state = await run(page, 'state')
      assert.equal(state.blocksChapterId, next.id ?? 'chapter-a')
      assert.equal(state.blocksBookId, next.bookId ?? 'book-a')
      assert.equal(state.blocksLang, next.lang ?? 'EN')
      assert.deepEqual(state.blocks, block('destination-block'))
      assert.equal(state.isStale, false)
      assert.equal(state.hasServerSnapshot, true)
      assert.equal(state.loading, false)
      passed.push(`scope transition ${JSON.stringify(next)} rejects old readiness before delayed cache read`)
      await run(page, 'unmount')
    } finally { await page.close() }
  }
  for (const failure of [false, true]) {
    const page = await browser.newPage()
    try {
      await page.route('**/*', route => route.abort())
      await page.setContent('<div id="root"></div>')
      await page.addScriptTag({ content: bundle })
      await run(page, 'mount', { cached: { blocks: block('cached-old-id'), fresh: true } })
      assert.equal((await run(page, 'state')).calls.length, 0)
      await run(page, 'refresh')
      let state = await run(page, 'state')
      assert.equal(state.calls.length, 1, 'manual retry bypasses the fresh cache')
      assert.equal(state.reads.length, 1, 'manual retry does not wait on another IDB read')
      assert.deepEqual(state.blocks, block('cached-old-id'))
      assert.equal(state.loading, false, 'readable same-chapter text remains visible during refresh')
      await run(page, 'reply', 0, failure ? null : block('fresh-server-id'), failure ? 'temporary content failure' : undefined)
      state = await run(page, 'state')
      assert.deepEqual(state.blocks, block(failure ? 'cached-old-id' : 'fresh-server-id'))
      assert.equal(state.isStale, false)
      assert.equal(state.hasServerSnapshot, true)
      assert.equal(state.error, null)
      assert.deepEqual(state.refreshResults, [!failure])
      assert.equal(state.writes.length, failure ? 0 : 1)
      passed.push(`manual content recovery ${failure ? 'preserves readable cache on failure' : 'bypasses fresh cache and replaces obsolete block IDs'}`)
      await run(page, 'unmount')
    } finally { await page.close() }
  }
  return { passed, scope: 'Actual useChapterContent renders, synthetic delayed cache and transport' }
}

export async function runChapterContentCases(browser, bundle, { negativeControl = false } = {}) {
  const passed = []
  const block = text => [{ id: text, position: 0, type: 'paragraph', text }]
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
  const expectReady = (state, text, lang = 'EN') => {
    assert.deepEqual(state.blocks, block(text))
    assert.equal(state.blocksLang, lang)
    assert.equal(state.loading, false)
    assert.equal(state.error, null)
    assert.equal(state.isStale, false)
    assert.equal(state.hasServerSnapshot, true)
  }

  if (negativeControl) {
    await scenario('baseline does not start foreground content until unrelated batch settles', {}, async page => {
      assert.equal((await run(page, 'state')).calls.length, 0)
      await run(page, 'finishBatch')
      assert.equal((await run(page, 'state')).calls.length, 1)
    })
    return { passed, negativeControl }
  }

  await scenario('unresolved batch cannot block foreground content or its display', { stallWrite: true }, async page => {
    let state = await run(page, 'state')
    assert.equal(state.calls.length, 1)
    assert.equal(state.loading, true)
    await run(page, 'reply', 0, block('foreground'))
    state = await run(page, 'state')
    expectReady(state, 'foreground')
    assert.equal(state.batchSettled, false)
    assert.equal(state.writes.length, 1, 'the pending cache write also must not gate display')
    await run(page, 'finishWrite')
  })

  for (const batchResult of ['omits chapter', 'fails', 'finishes late']) {
    await scenario(`foreground result survives a batch that ${batchResult}`, {}, async page => {
      assert.equal((await run(page, 'state')).calls.length, 1)
      await run(page, 'reply', 0, block('foreground'))
      await run(page, 'finishBatch', batchResult === 'fails' ? { error: 'batch failed' }
        : batchResult === 'finishes late' ? { blocks: block('late prefetch') }
          : { id: 'another-chapter', blocks: block('other chapter') })
      const state = await run(page, 'state')
      expectReady(state, 'foreground')
      assert.equal(state.calls.length, 1)
    })
  }

  await scenario('completed fresh prefetch cache needs no foreground request', { cached: { blocks: block('prefetched'), fresh: true } }, async page => {
    const state = await run(page, 'state')
    expectReady(state, 'prefetched')
    assert.equal(state.calls.length, 0)
    assert.equal(state.batchSettled, false)
  })

  await scenario('stale cached content stays readable if foreground revalidation fails', { cached: { blocks: block('cached'), fresh: false } }, async page => {
    expectReady(await run(page, 'state'), 'cached')
    await run(page, 'reply', 0, null, 'content failed')
    expectReady(await run(page, 'state'), 'cached')
  })

  await scenario('cold foreground failure is explicit while prefetch is still pending', {}, async page => {
    await run(page, 'reply', 0, null, 'content failed')
    const state = await run(page, 'state')
    assert.equal(state.error, 'content failed')
    assert.equal(state.loading, false)
    assert.equal(state.batchSettled, false)
    assert.equal(state.calls.length, 1, 'failure must not start automatic retries')
    assert.deepEqual(state.writes, [])
  })

  for (const next of [{ id: 'chapter-b' }, { lang: 'RU' }]) {
    await scenario(`late response cannot replace the new ${next.id ? 'chapter' : 'language'}`, {}, async page => {
      await run(page, 'update', next)
      let state = await run(page, 'state')
      assert.equal(state.calls.length, 2)
      assert.equal(state.calls[0].aborted, true)
      await run(page, 'reply', 1, block('current'))
      await run(page, 'reply', 0, block('obsolete'))
      state = await run(page, 'state')
      expectReady(state, 'current', next.lang ?? 'EN')
      assert.deepEqual(state.writes.map(({ id, lang }) => ({ id, lang })), [{ id: next.id ?? 'chapter-a', lang: next.lang ?? 'EN' }])
    })
  }

  await scenario('late foreground response after unmount cannot write the cache', {}, async page => {
    await run(page, 'unmount')
    await run(page, 'reply', 0, block('obsolete'))
    const state = await run(page, 'state')
    assert.equal(state.calls[0].aborted, true)
    assert.deepEqual(state.writes, [])
  })

  await scenario('old cache read resolving after chapter change cannot start an obsolete request', { stallRead: true }, async page => {
    await run(page, 'update', { id: 'chapter-b' })
    await run(page, 'finishRead', null)
    const state = await run(page, 'state')
    assert.deepEqual(state.calls.map(({ id, lang }) => ({ id, lang })), [{ id: 'chapter-b', lang: 'EN' }])
  })

  return { passed, negativeControl, scope: 'Actual useChapterContent in React; synthetic transport/cache/pending batch, no remote data or layout simulation' }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ channel: process.env.CATALOG_BROWSER_CHANNEL ?? 'chrome', headless: true })
  try { console.log(JSON.stringify(await runChapterContentCases(browser, await buildChapterContentHarness()), null, 2)) }
  finally { await browser.close() }
}
