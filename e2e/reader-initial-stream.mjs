// Actual Reader/content/translation hooks: stale cache revalidation must not
// abort and duplicate a paid translation that is already running for the same IDs.
import { chromium } from 'playwright'
import { buildReaderLoadHarness, fixtures } from './reader-load-errors.mjs'
import assert from 'node:assert/strict'

const bundle = await buildReaderLoadHarness({ fixtureOverrides: {
  api: fixtures.api.replace("export const fetchContent=()=>f().request('content');", "export const fetchContent=()=>f().request('content').then(blocks=>blocks.map(block=>({...block,targetLangReady:false,isTranslated:false,is_pending:true})));")
    .replace('export const translateBlocksStreaming=async()=>{};', `export const translateBlocksStreaming=(chapter,lang,ids,anchor,direction,onBlock,signal)=>new Promise(resolve=>globalThis.__translationRequests.push({chapter,lang,ids,onBlock,signal,resolve}));export const fetchBlockTexts=async(chapter,lang,ids)=>({ok:[],missing:ids,pending:[]});`),
  translation: `export {useViewportTranslation} from './src/lib/hooks/useViewportTranslation';`,
  pagination: fixtures.pagination.replace('pages:blocks.map(b=>[b.id])', 'pages:[blocks.map(b=>b.id)]'),
  analytics: fixtures.analytics + 'export const trackTranslationBatch=()=>{};export const trackTranslationSessionSummary=()=>{};export const trackBookTranslationStarted=()=>{};',
} })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage()
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }))
  await page.goto('https://initial-stream-fixture.test/')
  await page.addScriptTag({ content: bundle })
  await page.evaluate(() => {
    globalThis.__translationRequests = []
    const f = globalThis.__readerLoad
    f.store.perBookLanguages.book = 'es'
    f.fresh = false
    f.cached = { blocks: [
      { id: 'block-1', position: 1, type: 'paragraph', text: 'Original first', targetLangReady: false, is_pending: true },
      { id: 'block-2', position: 42, type: 'paragraph', text: 'Original second', targetLangReady: false, is_pending: true },
    ], fetchedAt: Date.now() - 5000 }
  })
  const run = (method, ...args) => page.evaluate(({ method, args }) => window.check[method](...args), { method, args })
  const requests = () => page.evaluate(() => globalThis.__translationRequests.map(r => ({ chapter: r.chapter, lang: r.lang, ids: r.ids, aborted: r.signal.aborted })))
  await run('mount'); await run('settle', 0, true); await run('flush')
  const before = await requests()
  assert.equal(before.length, 1)
  assert.deepEqual(before[0].ids, ['block-1', 'block-2'])
  await run('settle', 1, true); await run('flush')
  const after = await requests()
  assert.deepEqual(after, before, 'same-ID source snapshot must keep the existing stream, without abort or duplicate')
  await page.evaluate(() => {
    const request = globalThis.__translationRequests[0]
    for (const blockId of request.ids) request.onBlock({ blockId, status: 'ok', cache: 'miss', translatedText: 'Spanish ' + blockId })
    request.resolve()
  })
  await run('flush')
  const state = await run('state')
  assert.deepEqual(state.visibleBlocks, ['Spanish block-1', 'Spanish block-2'])
  assert.equal((await requests()).length, 1)
  console.log(JSON.stringify({ passed: ['same-chapter cache revalidation preserves the initial stream and renders its result'], before, after, transport: 'synthetic; actual ReaderView, useChapterContent and useViewportTranslation' }, null, 2))
} finally { await browser.close() }
