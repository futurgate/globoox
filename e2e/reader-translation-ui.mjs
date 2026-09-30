// Actual ReaderView and content hook. Translation failures/layout are fixtures;
// queue recovery itself is exercised by translation-recovery.mjs.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { buildReaderLoadHarness, fixtures } from './reader-load-errors.mjs'

const translation = `
import {useState} from 'react';
const noop=()=>{};
export function useViewportTranslation(options){
 const [failed,setFailed]=useState(new Set(['block-2']));
 const f=globalThis.__translationUi;
 const resetFailedBlocks=ids=>{f.resets.push(ids);setFailed(new Set())};
 return {getRefCallback:()=>noop,isTranslatingAny:false,abortAll:noop,enqueueBlocks:noop,enqueueBlocksImmediate:noop,pendingBlockIds:new Set(),reconcileBlocks:noop,
 failedBlockIds:failed,refreshRequiredBlockIds:f.permanent?failed:new Set(),resetFailedBlocks,
 retryFailedBlocks:ids=>{f.retries.push(ids);setFailed(new Set());options.onBlocksTranslated(options.blocks.filter(b=>ids.includes(b.id)).map(b=>({...b,text:'Recovered visible translation',targetLangReady:true,isTranslated:true,is_pending:false})))} }
}
`
const bundle=await buildReaderLoadHarness({fixtureOverrides:{translation}})
const actualHookBundle=await buildReaderLoadHarness({fixtureOverrides:{
 translation:`export {useViewportTranslation} from './src/lib/hooks/useViewportTranslation';`,
 api:fixtures.api
  .replace("export const fetchContent=()=>f().request('content');",`export const fetchContent=()=>f().request('content').then(blocks=>blocks.map(block=>block.id==='block-2'?{...block,id:globalThis.__translationUi.replaceIds?'fresh-block-2':block.id,targetLangReady:false,isTranslated:false,is_pending:true}:block));`)
  .replace('export const translateBlocksStreaming=async()=>{};',`export const translateBlocksStreaming=async(chapter,lang,ids,anchor,direction,onBlock)=>{
    const ui=globalThis.__translationUi;ui.requests.push({chapter,ids});
    for(const blockId of ids)onBlock(ui.recovered?{blockId,status:'ok',cache:'miss',translatedText:'Fresh recovered translation'}:{blockId,status:'error',cache:'miss',translatedText:'',reason:'blocks_not_found',retryable:false});
  };export const fetchBlockTexts=async(chapter,lang,ids)=>({ok:[],missing:ids,pending:[]});`),
 analytics:fixtures.analytics+'export const trackTranslationBatch=()=>{};export const trackTranslationSessionSummary=()=>{};export const trackBookTranslationStarted=()=>{};',
 cache:fixtures.cache.replace("export const setCachedChapterContent=async(id,lang,blocks)=>{f().cached={blocks,fetchedAt:Date.now()}};",`export const setCachedChapterContent=async(id,lang,blocks)=>{
   f().cached={blocks,fetchedAt:Date.now()};
   if(globalThis.__translationUi.deferSave)await new Promise(resolve=>globalThis.__translationUi.releaseSave=resolve);
 };`),
}})
const browser=await chromium.launch({channel:'chrome',headless:true})
const passed=[]
const run=(page,method,...args)=>page.evaluate(({method,args})=>window.check[method](...args),{method,args})
async function scenario(name,permanent,body,compiled=bundle){
 // Shared layout fixture gives every element the same rectangle and omits CSS;
 // dispatch semantic button clicks here, not a claim about production hit testing.
 const page=await browser.newPage()
 try{
  await page.route('**/*',route=>route.fulfill({status:200,contentType:'text/html',body:'<div id="root"></div>'}))
  await page.goto('https://reader-retry-ui.test/');await page.addScriptTag({content:compiled})
  await page.evaluate(permanent=>{
   globalThis.__translationUi={permanent,retries:[],resets:[],requests:[],recovered:false,replaceIds:false}
   const f=globalThis.__readerLoad;f.store.perBookLanguages.book='fr';
   f.cached={blocks:[{id:'block-1',position:1,type:'paragraph',text:'Already translated first page',targetLangReady:true},
    {id:'block-2',position:42,type:'paragraph',text:'Untranslated visible fallback',targetLangReady:false,is_pending:true}],fetchedAt:Date.now()}
  },permanent)
  await run(page,'mount');await run(page,'settle',0,true);await run(page,'flush');await body(page);passed.push(name)
 }finally{await page.close()}
}
try{
 await scenario('exhausted visible translation offers Retry and preserves the current page',false,async page=>{
  let state=await run(page,'state');assert.ok(state.alert.includes('Some text could not be translated.'));assert.equal(state.retryButtons,1);assert.deepEqual(state.calls,['chapters'])
  await run(page,'retry');await run(page,'flush');state=await run(page,'state')
  assert.equal(state.alert,null);assert.deepEqual(state.visibleBlocks,['Recovered visible translation']);assert.deepEqual(state.calls,['chapters']);assert.equal(state.anchorUnchanged,true)
  const fixture=await page.evaluate(()=>globalThis.__translationUi);assert.deepEqual(fixture.retries,[['block-2']])
 })
 await scenario('permanent stale IDs offer a single targeted chapter reload',true,async page=>{
  await page.getByRole('button',{name:'Reload chapter'}).evaluate(button=>button.click());let state=await run(page,'state')
  assert.deepEqual(state.calls,['chapters','content']);assert.deepEqual(state.visibleBlocks,['Untranslated visible fallback'])
  assert.equal(await page.getByRole('button',{name:'Reload chapter'}).isDisabled(),true)
  await run(page,'settle',1,true);await run(page,'flush');state=await run(page,'state')
  assert.equal(state.alert,null);assert.deepEqual(state.visibleBlocks,['Saved reading position']);assert.equal(state.anchorUnchanged,true)
  const fixture=await page.evaluate(()=>globalThis.__translationUi);assert.deepEqual(fixture.retries,[]);assert.deepEqual(fixture.resets,[['block-2']])
 })
 await scenario('failed targeted refresh leaves the page and manual action available',true,async page=>{
  await page.getByRole('button',{name:'Reload chapter'}).evaluate(button=>button.click());await run(page,'settle',1,false);await run(page,'flush')
  const state=await run(page,'state');assert.deepEqual(state.visibleBlocks,['Untranslated visible fallback']);assert.ok(state.alert.includes('Some text could not be translated.'));assert.equal(state.anchorUnchanged,true)
  assert.equal(await page.getByRole('button',{name:'Reload chapter'}).isEnabled(),true)
  const fixture=await page.evaluate(()=>globalThis.__translationUi);assert.deepEqual(fixture.resets,[])
 })
 for(const replaceIds of [false,true]){
  await scenario(`actual queue resumes after fresh chapter content with ${replaceIds?'new':'same'} missing IDs`,true,async page=>{
   let fixture=await page.evaluate(()=>globalThis.__translationUi)
   assert.deepEqual(fixture.requests,[{chapter:'chapter',ids:['block-2']}])
   await page.evaluate(replaceIds=>{globalThis.__translationUi.recovered=true;globalThis.__translationUi.replaceIds=replaceIds;globalThis.__translationUi.deferSave=true},replaceIds)
   await page.getByRole('button',{name:'Reload chapter'}).evaluate(button=>button.click())
   await run(page,'settle',1,true);await run(page,'flush')
   // Let the refreshed snapshot commit while its IDB write is still pending.
   // Clearing failed IDs only after this write used to leave the queue idle.
   await page.evaluate(()=>globalThis.__translationUi.releaseSave());await run(page,'flush')
   fixture=await page.evaluate(()=>globalThis.__translationUi)
   assert.deepEqual(fixture.requests,[{chapter:'chapter',ids:['block-2']},{chapter:'chapter',ids:[replaceIds?'fresh-block-2':'block-2']}])
   const state=await run(page,'state');assert.equal(state.alert,null);assert.deepEqual(state.visibleBlocks,['Fresh recovered translation']);assert.deepEqual(state.calls,['chapters','content'])
  },actualHookBundle)
 }
 console.log(JSON.stringify({passed,transport:'synthetic; actual ReaderView/content hook, fixture translation state and pagination geometry'},null,2))
}finally{await browser.close()}
