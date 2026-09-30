// Actual ReaderView + content/chapter hooks; synthetic transport, layout and UI chrome.
import assert from 'node:assert/strict'
import { buildReaderLoadHarness } from './reader-load-errors.mjs'

export function buildReaderPositionHarness({ readerSource, hookSource } = {}) {
  return buildReaderLoadHarness({ readerSource, hookSource,
    sourceTransform(source) {
      return source
        .replace("chapterId:'chapter',blockId:'block-2',blockPosition:42", "chapterId:'chapter-b',blockId:'b-1',blockPosition:0")
        .replace("request:kind=>new Promise((resolve,reject)=>calls.push({kind,resolve,reject}))", "cache:new Map(),request:(kind,id)=>new Promise((resolve,reject)=>calls.push({kind,id,resolve,reject}))")
        .replace("const chapters=[{id:'chapter',title:'Fixture chapter',index:1,depth:0,first_block_id:null}];", "const chapters=['a','b'].map((c,i)=>({id:'chapter-'+c,title:'Chapter '+c,index:i+1,depth:0,first_block_id:null}));")
        .replace("const blocks=[{id:'block-1',position:1,type:'paragraph',text:'Earlier page',targetLangReady:true},{id:'block-2',position:42,type:'paragraph',text:'Saved reading position',targetLangReady:true}];", "const blocks=id=>[1,2,3].map((n)=>({id:id.slice(-1)+'-'+n,chapter_id:id,position:n-1,type:'paragraph',text:id+' page '+n,targetLangReady:true}));")
        .replace("calls[index].kind==='chapters'?chapters:blocks", "calls[index].kind==='chapters'?chapters:blocks(calls[index].id)")
        .replace("async mount(){", "async prev(){await act(async()=>f.gestures.onPrev())}, async next(){await act(async()=>f.gestures.onNext())}, async toc(index){await act(async()=>f.toc(index))}, async mount(){")
        .replace("calls:calls.map(c=>c.kind),writes,", "calls:calls.map(c=>({kind:c.kind,id:c.id})),anchor:f.anchor,writes,")
    },
    fixtureOverrides: {
      api: `const f=()=>globalThis.__readerLoad;
        export const fetchChapters=()=>f().request('chapters');
        export const fetchContent=id=>f().request('content',id);
        export const fetchReadingPosition=async()=>({chapter_id:null});
        export const hasPendingReadingPosition=()=>false;
        export const saveReadingPosition=async(...args)=>{f().writes.push({kind:'remote',args});return{persisted:true}};
        export const fetchBlockBatch=async()=>[];export const translateBlocksStreaming=async()=>{};
        export const updateBookLanguage=async()=>{};export const checkTranslationLimit=async()=>({allowed:true});`,
      cache: `const f=()=>globalThis.__readerLoad;
        export const getCachedChapterContent=async id=>f().cache.get(id)??null;
        export const setCachedChapterContent=async(id,lang,blocks)=>{f().cache.set(id,{blocks,fetchedAt:Date.now()})};
        export const isCacheFresh=()=>true;
        export const getCachedChapterBlockIds=async()=>[];export const getCachedChapterLayout=async()=>null;
        export const getCachedReadingPosition=async()=>null;export const getPendingChapterBatch=()=>undefined;
        export const markChapterPending=()=>{};export const clearCachedChapterLayouts=async()=>{};
        export const setCachedChapterLayout=async()=>{};export const setCachedTranslatedBlockText=async()=>{};
        export const setCachedReadingPosition=async(...args)=>{f().writes.push({kind:'cache',args})};`,
      gestures: `export const usePageGestures=options=>{globalThis.__readerLoad.gestures=options;return{}};export const getTapZones=()=>({});`,
      empty: `export default function Empty(props){if(props.onSelectChapter)globalThis.__readerLoad.toc=props.onSelectChapter;return null};`,
      translation: `const noop=()=>{};const value={getRefCallback:()=>noop,isTranslatingAny:false,abortAll:noop,enqueueBlocks:noop,enqueueBlocksImmediate:noop,pendingBlockIds:new Set(),failedBlockIds:new Set(),refreshRequiredBlockIds:new Set(),retryFailedBlocks:noop,resetFailedBlocks:noop,reconcileBlocks:noop};export const useViewportTranslation=()=>value;`,
    },
  })
}

export async function runReaderPositionCases(browser, bundle) {
  const page = await browser.newPage()
  const run = (method, ...args) => page.evaluate(({ method, args }) => window.check[method](...args), { method, args })
  const observations = []
  try {
    await page.route('**/*', route => route.abort())
    await page.setContent('<div id="root"></div>')
    await page.addScriptTag({ content: bundle })
    await run('mount')
    await run('settle', 0, true)
    let state = await run('state')
    for (let i = 1; i < state.calls.length; i++) await run('settle', i, true)
    await run('flush')
    state = await run('state')
    assert.ok(state.visibleBlocks.includes('chapter-b page 1'))
    await run('prev')
    state = await run('state')
    observations.push({ phase: 'previous chapter before response', state })
    const destinationCall = state.calls.findIndex(call => call.kind === 'content' && call.id === 'chapter-a')
    if (destinationCall >= 0) await run('settle', destinationCall, true)
    await run('flush')
    state = await run('state')
    observations.push({ phase: 'previous chapter settled', state })
    assert.ok(state.visibleBlocks.includes('chapter-a page 3'), 'LAST_PAGE sentinel must restore the actual last page of the destination chapter')
    assert.equal(state.anchor.chapterId, 'chapter-a')
    assert.equal(state.anchor.blockId, 'a-3')
    for (const write of state.writes.filter(w => w.kind === 'remote')) {
      const payload = write.args[1]
      assert.ok(payload.block_id.startsWith(payload.chapter_id.slice(-1) + '-'), 'a chapter can never be saved with another chapter’s block')
    }
    await run('reopen')
    await run('flush')
    state = await run('state')
    assert.ok(state.visibleBlocks.includes('chapter-a page 3'), 'backward destination survives a new Reader lifetime')
    observations.push({ phase: 'reopened previous chapter', state })
    await run('toc', 1)
    await run('flush')
    state = await run('state')
    observations.push({ phase: 'TOC current chapter beginning', state })
    assert.ok(state.visibleBlocks.includes('chapter-a page 1'), 'selecting the current chapter jumps to its first page')
    assert.equal(state.anchor.blockId, 'a-1', 'same-chapter TOC jump must persist its destination instead of the old last-page anchor')
    await run('reopen')
    await run('flush')
    assert.ok((await run('state')).visibleBlocks.includes('chapter-a page 1'), 'same-chapter TOC destination survives reopen')
    await run('unmount')
    return { passed: ['previous chapter LAST_PAGE persists its own last block and survives reopen', 'all remote saves retain chapter/block ownership', 'same-chapter TOC persists and restores the destination'], observations }
  } catch (error) { error.observations = observations; throw error }
  finally { await page.close() }
}
