// Actual ReaderView + loading hooks. Transport, layout measurement and chrome are fixtures.
import { build } from 'esbuild'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

export const fixtures = {
  api: `const f=()=>globalThis.__readerLoad;
    export const fetchChapters=()=>f().request('chapters');
    export const fetchContent=()=>f().request('content');
    export const fetchReadingPosition=async()=>({chapter_id:null});
    export const hasPendingReadingPosition=()=>false;
    export const saveReadingPosition=async(...args)=>{f().writes.push({kind:'remote',args});return{persisted:true}};
    export const fetchBlockBatch=async()=>[];
    export const translateBlocksStreaming=async()=>{};
    export const updateBookLanguage=async()=>{};
    export const checkTranslationLimit=async()=>({allowed:true});`,
  store: `export const useAppStore=selector=>selector?selector(globalThis.__readerLoad.store):globalThis.__readerLoad.store;`,
  auth: `export const useAuth=()=>({user:{id:'fixture-user'},isAlpha:true,isAuthenticated:true,loading:false});`,
  cache: `const f=()=>globalThis.__readerLoad;
    export const getCachedChapterContent=async()=>f().cached;
    export const setCachedChapterContent=async(id,lang,blocks)=>{f().cached={blocks,fetchedAt:Date.now()}};
    export const isCacheFresh=()=>f().fresh;
    export const getCachedChapterBlockIds=async()=>[];
    export const getCachedChapterLayout=async()=>null;
    export const getCachedReadingPosition=async()=>null;
    export const getPendingChapterBatch=()=>undefined;
    export const markChapterPending=()=>{};
    export const clearCachedChapterLayouts=async()=>{};
    export const setCachedChapterLayout=async()=>{};
    export const setCachedTranslatedBlockText=async()=>{};
    export const setCachedReadingPosition=async(...args)=>{f().writes.push({kind:'cache',args})};`,
  metadata: `const title=chapter=>chapter.title;export const useReaderMetadataTranslations=({title:bookTitle,author})=>({isBookMetaPending:false,isTocContentPending:false,readerBookTitle:bookTitle,readerBookAuthor:author,getResolvedChapterTitle:title,ensureTocTranslations:async()=>{}});`,
  translation: `const noop=()=>{};const value={getRefCallback:()=>noop,isTranslatingAny:false,abortAll:noop,enqueueBlocks:noop,enqueueBlocksImmediate:noop,pendingBlockIds:new Set(),failedBlockIds:new Set(),refreshRequiredBlockIds:new Set(),retryFailedBlocks:noop,resetFailedBlocks:noop,reconcileBlocks:noop};export const useViewportTranslation=()=>value;`,
  gestures: `export const usePageGestures=()=>({});export const getTapZones=()=>({});`,
  pagination: `export const normalizeBlocks=blocks=>blocks;
    export const computePages=blocks=>({pages:blocks.map(b=>[b.id]),finalBlocks:blocks,fragmentMap:new Map()});
    export const findPageForBlockAndSentence=(pages,blocks,id)=>pages.findIndex(page=>page.includes(id));
    export const findPageForBlock=findPageForBlockAndSentence;
    export const findPageByBlockPosition=(pages,blocks,position)=>Math.max(0,blocks.findIndex(b=>b.position===position));`,
  typograf: `export const applyTypografToBlocks=blocks=>blocks;`,
  analytics: `export const trackReadingSessionStarted=()=>{};export const trackReadingSessionEnded=()=>{};export const trackChapterCompleted=()=>{};export const trackBookFinished=()=>{};export const trackLanguageSwitched=()=>{};export const trackReaderBookOpenReady=()=>{};export const trackReaderChapterNavReady=()=>{};`,
  theme: `export const READER_THEME_CONFIGS={light:{id:'light'}};export const getReaderContentTokens=()=>({});export const getReaderSemanticTokens=()=>({});`,
  themes: `export const getThemeStyle=()=>({});`,
  empty: `export default function Empty(){return null};`,
  wrap: `export default function Wrap({children}){return children};export const ReaderThemeProvider=Wrap;`,
  block: `import React from 'react';export default function Block({block}){return <p data-reader-block={block.id}>{block.text}</p>}`,
  button: `import React from 'react';export const Button=({children,onClick,className,disabled})=><button className={className} onClick={onClick} disabled={disabled}>{children}</button>;`,
  skeleton: `import React from 'react';export const Skeleton=props=><div data-reader-skeleton="true" {...props}/>;`,
  link: `import React from 'react';export default function Link({href,children}){return <a href={href}>{children}</a>};`,
}

export async function buildReaderLoadHarness({ readerSource, hookSource, sourceTransform, fixtureOverrides = {} } = {}) {
  const source = `
    import React,{act} from 'react';import{createRoot}from'react-dom/client';
    import ReaderView from './src/components/Reader/ReaderView';
    globalThis.IS_REACT_ACT_ENVIRONMENT=true;
    const anchor={chapterId:'chapter',blockId:'block-2',blockPosition:42,sentenceIndex:0,updatedAt:'2026-09-29T00:00:00Z'};
    const originalAnchor=JSON.stringify(anchor),calls=[],writes=[];
    const f=globalThis.__readerLoad={cached:null,fresh:true,anchor,writes,now:Date.now(),request:kind=>new Promise((resolve,reject)=>calls.push({kind,resolve,reject}))};
    Date.now=()=>f.now;
    f.store={hasHydrated:true,settings:{readerTheme:'light',language:'en',fontSize:18,lineHeightScale:1,pageLayoutMode:'single'},perBookLanguages:{book:'en'},syncVersions:{},isTranslatingByBook:{},
      setBookLanguage:()=>{},setIsTranslatingForBook:()=>{},getAnchor:()=>f.anchor,setAnchor:(id,value)=>{writes.push({kind:'local',value});f.anchor=value},updateServerProgress:()=>{}};
    globalThis.ResizeObserver=class{observe(){}disconnect(){}};
    Object.defineProperty(HTMLElement.prototype,'clientHeight',{get:()=>800});Object.defineProperty(HTMLElement.prototype,'clientWidth',{get:()=>600});
    HTMLElement.prototype.getBoundingClientRect=()=>({x:0,y:0,top:0,left:0,right:600,bottom:800,width:600,height:800,toJSON(){return this}});
    const chapters=[{id:'chapter',title:'Fixture chapter',index:1,depth:0,first_block_id:null}];
    const blocks=[{id:'block-1',position:1,type:'paragraph',text:'Earlier page',targetLangReady:true},{id:'block-2',position:42,type:'paragraph',text:'Saved reading position',targetLangReady:true}];
    const root=createRoot(document.getElementById('root'));let epoch=0;
    const render=()=>root.render(<ReaderView key={epoch} bookId="book" title="Fixture book" availableLanguages={['en']} originalLanguage="en" serverLanguage="en"/>);
    window.check={
      async mount(){await act(async()=>render())},
      async settle(index,ok){await act(async()=>ok?calls[index].resolve(calls[index].kind==='chapters'?chapters:blocks):calls[index].reject(new Error(calls[index].kind+' failed')))},
      async retry(){await act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Try again').click())},
      async reopen({expireChapters=false,fresh=true}={}){if(expireChapters)f.now+=600001;f.fresh=fresh;epoch++;await act(async()=>render())},
      async flush(){for(let i=0;i<3;i++)await act(async()=>new Promise(resolve=>setTimeout(resolve,180)))},
      async unmount(){await act(async()=>root.unmount())},
      state(){return{alert:document.querySelector('[role="alert"]')?.textContent??null,skeletons:document.querySelectorAll('[data-reader-skeleton]').length,
        visibleBlocks:[...document.querySelectorAll('[data-reader-block]')].filter(node=>!node.closest('[aria-hidden="true"]')).map(node=>node.textContent),
        calls:calls.map(c=>c.kind),writes,anchorUnchanged:JSON.stringify(f.anchor)===originalAnchor,retryButtons:[...document.querySelectorAll('button')].filter(b=>b.textContent==='Try again').length}}
    };
  `
  const mapping = new Map([
    ['@/lib/api', 'api'], ['@/lib/store', 'store'], ['@/lib/hooks/useAuth', 'auth'], ['@/lib/contentCache', 'cache'],
    ['@/lib/hooks/useReaderMetadataTranslations', 'metadata'], ['@/lib/hooks/useViewportTranslation', 'translation'],
    ['@/lib/hooks/usePageGestures', 'gestures'], ['@/lib/paginatorUtils', 'pagination'], ['@/lib/typograf', 'typograf'],
    ['@/lib/posthog', 'analytics'], ['@/lib/readerTheme', 'theme'], ['@/lib/themes', 'themes'], ['next/link', 'link'],
    ['./ReaderActionsMenu', 'empty'], ['./AppleIntelligenceGlow', 'empty'], ['./LanguageSwitch', 'empty'],
    ['./TranslationGlow', 'wrap'], ['./ReaderThemeProvider', 'wrap'], ['./ContentBlockRenderer', 'block'],
    ['@/components/ui/button', 'button'], ['@/components/ui/ios-alert-dialog', 'empty'], ['@/components/ui/ios-icon', 'empty'],
    ['@/components/ui/skeleton', 'skeleton'], ['@/components/TranslationLimitDialog', 'empty'],
  ])
  const bundle = await build({ stdin: { contents: sourceTransform ? sourceTransform(source) : source, resolveDir: process.cwd(), sourcefile: 'readerLoadHarness.tsx', loader: 'tsx' },
    bundle: true, write: false, platform: 'browser', format: 'iife', define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [{ name: 'reader-load-fixtures', setup(builder) {
      if (readerSource !== undefined) builder.onLoad({ filter: /\/Reader\/ReaderView\.tsx$/ }, () => ({ contents: readerSource, loader: 'tsx' }))
      if (hookSource !== undefined) builder.onLoad({ filter: /\/useChapterContent\.ts$/ }, () => ({ contents: hookSource, loader: 'ts' }))
      builder.onResolve({ filter: /.*/ }, args => mapping.has(args.path) ? { path: mapping.get(args.path), namespace: 'fixture' } : null)
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: fixtureOverrides[args.path] ?? fixtures[args.path], loader: 'tsx', resolveDir: process.cwd() }))
    } }],
  })
  return bundle.outputFiles[0].text
}

export async function runReaderLoadCases(browser, bundle, { negativeControl = false } = {}) {
  const passed = []
  const run = (page, method, ...args) => page.evaluate(({ method, args }) => window.check[method](...args), { method, args })
  const unchangedPosition = state => { assert.equal(state.anchorUnchanged, true); assert.deepEqual(state.writes, []) }
  async function scenario(name, body) {
    const page = await browser.newPage()
    try {
      // A real origin supplies browser storage; every request stays intercepted.
      const origin = 'https://reader-load-fixture.test/'
      await page.route('**/*', route => route.request().url() === origin
        ? route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' })
        : route.abort())
      await page.goto(origin)
      await page.addScriptTag({ content: bundle }); await run(page, 'mount'); await body(page); await run(page, 'unmount')
      unchangedPosition(await run(page, 'state')); passed.push(name)
    } finally { await page.close() }
  }
  for (const failed of ['chapters', 'content']) {
    await scenario(negativeControl ? `baseline hides first ${failed} failure behind skeleton` : `first ${failed} failure is visible and explicit retry recovers the saved page`, async page => {
      let state = await run(page, 'state'); assert.ok(state.skeletons > 0); assert.equal(state.alert, null)
      if (failed === 'content') await run(page, 'settle', 0, true)
      const failedIndex = failed === 'chapters' ? 0 : 1
      await run(page, 'settle', failedIndex, false); await run(page, 'flush')
      state = await run(page, 'state')
      if (negativeControl) { assert.equal(state.alert, null); assert.ok(state.skeletons > 0); return }
      assert.ok(state.alert?.includes(failed + ' failed'), 'load failure must be visible instead of an infinite skeleton')
      assert.equal(state.skeletons, 0); assert.equal(state.retryButtons, 1); unchangedPosition(state)
      assert.equal(state.calls.length, failedIndex + 1, 'errors must not automatically retry')
      await run(page, 'retry'); state = await run(page, 'state')
      assert.equal(state.alert, null); assert.ok(state.skeletons > 0); unchangedPosition(state)
      let next = failedIndex + 1
      if (failed === 'chapters') { await run(page, 'settle', next++, true) }
      await run(page, 'settle', next, true); await run(page, 'flush')
      state = await run(page, 'state'); assert.equal(state.alert, null); assert.equal(state.skeletons, 0)
      assert.deepEqual(state.visibleBlocks, ['Saved reading position']); unchangedPosition(state)
    })
  }
  if (!negativeControl) {
    await scenario('normal initial loading has no error or automatic retries and becomes readable', async page => {
      await run(page, 'flush'); let state = await run(page, 'state')
      assert.equal(state.alert, null); assert.equal(state.retryButtons, 0); assert.deepEqual(state.calls, ['chapters'])
      await run(page, 'settle', 0, true); await run(page, 'settle', 1, true); await run(page, 'flush')
      state = await run(page, 'state'); assert.deepEqual(state.visibleBlocks, ['Saved reading position']); assert.equal(state.skeletons, 0)
    })
    for (const background of ['chapters', 'content']) {
      await scenario(`already readable cached pages survive a background ${background} failure`, async page => {
        await run(page, 'settle', 0, true); await run(page, 'settle', 1, true); await run(page, 'flush')
        await run(page, 'reopen', { expireChapters: background === 'chapters', fresh: background !== 'content' }); await run(page, 'flush')
        let state = await run(page, 'state'); assert.deepEqual(state.visibleBlocks, ['Saved reading position'])
        assert.equal(state.calls[2], background); await run(page, 'settle', 2, false); await run(page, 'flush')
        state = await run(page, 'state'); assert.deepEqual(state.visibleBlocks, ['Saved reading position'])
        assert.equal(state.skeletons, 0); assert.equal(state.alert, null); unchangedPosition(state)
      })
    }
  }
  return { passed, negativeControl, scope: 'Actual ReaderView, useChapters, useChapterContent and anchor guard; mocked transport/cache/pagination geometry/chrome' }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ channel: process.env.CATALOG_BROWSER_CHANNEL ?? 'chrome', headless: true })
  try { console.log(JSON.stringify(await runReaderLoadCases(browser, await buildReaderLoadHarness()), null, 2)) }
  finally { await browser.close() }
}
