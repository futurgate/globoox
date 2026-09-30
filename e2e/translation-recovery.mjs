// Actual translation hook; all API/cache/analytics effects are synthetic.
import { build } from 'esbuild'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { readFile } from 'node:fs/promises'

const source = `
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {useViewportTranslation} from './src/lib/hooks/useViewportTranslation';
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const requests=[],checks=[],saved=[],updates=[];let checkMode='missing';
let options={bookId:'book',chapterId:'chapter',lang:'FR',accountScopeKey:'account-a',sourceLanguage:'EN',canTranslate:true,
  blocks:['a','b'].map((id,i)=>({id,type:'paragraph',text:'Original '+id,position:i,targetLangReady:false,is_pending:true}))};
globalThis.__translate=(chapter,lang,ids,anchor,direction,onBlock,signal,onDone)=>new Promise((resolve,reject)=>requests.push({chapter,lang,ids,onBlock,signal,onDone,resolve,reject}));
globalThis.__texts=(chapter,lang,ids,signal)=>{
 const record={chapter,lang,ids,signal};checks.push(record);
 if(checkMode==='hold')return new Promise(resolve=>record.resolve=resolve);
 return Promise.resolve({ok:[],missing:checkMode==='pending'?[]:ids,pending:checkMode==='pending'?ids:[]});
};
globalThis.__save=async(chapter,lang,block)=>saved.push({chapter,lang,id:block.id,text:block.text});
const root=createRoot(document.getElementById('root'));
let hook;
function Harness(){hook=useViewportTranslation({...options,onBlocksTranslated:blocks=>{updates.push(...blocks.map(b=>b.id));options.blocks=options.blocks.map(b=>blocks.find(n=>n.id===b.id)??b);render()}});return <p>Fixture</p>}
const render=()=>root.render(<Harness/>);
window.check={
 async mount(){await act(async()=>render())},
 async context(patch){options={...options,...patch};await act(async()=>render())},
 async enqueue(ids=['a','b'],immediate=false){await act(async()=>immediate?hook.enqueueBlocksImmediate(ids):hook.enqueueBlocks(ids))},
 async finish(index,results=[],error=false){await act(async()=>{const r=requests[index];for(const result of results)r.onBlock(result);if(error)r.reject(new Error('Synthetic transport failure'));else r.resolve()})},
 async block(index,result){await act(async()=>requests[index].onBlock(result))},
 async settle(){await act(async()=>{})},
 async retry(ids){await act(async()=>hook.retryFailedBlocks(ids))},
 async checkMode(value){checkMode=value},
 async finishCheck(index,ids){await act(async()=>checks[index].resolve({ok:ids.map(blockId=>({blockId,type:'paragraph',text:'Recovered '+blockId})),missing:[],pending:[]}))},
 async reconcile(ids){await act(async()=>hook.reconcileBlocks(ids))},
 async unmount(){await act(async()=>root.unmount())},
 state(){return {requests:requests.map(r=>({chapter:r.chapter,lang:r.lang,ids:r.ids,aborted:r.signal?.aborted??false})),checks:checks.map(c=>({ids:c.ids,aborted:c.signal?.aborted??false})),saved,updates,
   failed:[...(hook.failedBlockIds??[])],pending:[...hook.pendingBlockIds],translating:hook.isTranslatingAny,blocks:options.blocks}},
};
`
const stubs = {
  api: 'export const translateBlocksStreaming=(...args)=>globalThis.__translate(...args); export const fetchBlockTexts=(...args)=>globalThis.__texts(...args);',
  cache: 'export const setCachedTranslatedBlockText=(...args)=>globalThis.__save(...args);',
  analytics: 'export const trackTranslationBatch=()=>{};export const trackTranslationSessionSummary=()=>{};export const trackBookTranslationStarted=()=>{};',
}
const mapping = new Map([['@/lib/api','api'],['@/lib/contentCache','cache'],['@/lib/posthog','analytics']])
const result = await build({stdin:{contents:source,resolveDir:process.cwd(),sourcefile:'translationRecoveryHarness.tsx',loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',define:{'process.env.NODE_ENV':'"development"'},plugins:[{
  name:'translation-fixtures',setup(builder){
    if (process.env.TRANSLATION_HOOK_SOURCE_FILE) builder.onLoad({filter:/\/hooks\/useViewportTranslation\.ts$/},async()=>({
      contents:await readFile(process.env.TRANSLATION_HOOK_SOURCE_FILE,'utf8'),loader:'ts',
    }))
    builder.onResolve({filter:/.*/},args=>mapping.has(args.path)?{path:mapping.get(args.path),namespace:'fixture'}:null)
    builder.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:stubs[args.path],loader:'js'}))
  },
}]})
const browser = await chromium.launch({channel:'chrome',headless:true})
const passed=[],failed=[]
const run=(page,method,...args)=>page.evaluate(({method,args})=>window.check[method](...args),{method,args})
const advance=async(page,ms)=>{await page.clock.runFor(ms);await run(page,'settle')}
const ok=id=>({blockId:id,status:'ok',cache:'miss',translatedText:'Translated '+id})
const error=(id,extra={})=>({blockId:id,status:'error',cache:'miss',translatedText:'',...extra})
async function scenario(name,body){
  if (process.env.TRANSLATION_CASE && !new RegExp(process.env.TRANSLATION_CASE).test(name)) return
  const page=await browser.newPage()
  try{
    await page.route('**/*',route=>route.fulfill({status:200,contentType:'text/html',body:'<div id="root"></div>'}))
    await page.goto('https://translation-fixture.test/')
    await page.clock.install()
    await page.addScriptTag({content:result.outputFiles[0].text})
    await run(page,'mount');await body(page);passed.push(name)
  }catch(error){failed.push({name,message:error.message})}finally{await page.close()}
}
await scenario('foreign chapter block IDs cannot enter the current chapter request',async page=>{
  await run(page,'enqueue',['a','next-chapter-block','previous-chapter-block']);const state=await run(page,'state')
  assert.deepEqual(state.requests[0].ids,['a'])
})
await scenario('error remains retryable and success is never retransmitted',async page=>{
  await run(page,'enqueue');await run(page,'finish',0,[ok('a'),error('b')]);await advance(page,33001)
  const state=await run(page,'state');assert.equal(state.requests.length,2);assert.deepEqual(state.requests[1].ids,['b']);assert.deepEqual(state.saved.map(x=>x.id),['a'])
  await run(page,'finish',1,[ok('b')]);assert.deepEqual((await run(page,'state')).updates,['a','b'])
})
await scenario('partial stream retries only missing IDs',async page=>{
  await run(page,'enqueue');await run(page,'finish',0,[ok('a')]);await advance(page,33001)
  assert.deepEqual((await run(page,'state')).requests.map(r=>r.ids),[['a','b'],['b']])
})
await scenario('transport error has bounded retries and manual recovery',async page=>{
  await run(page,'enqueue',['a']);await run(page,'finish',0,[],true)
  for(let attempt=1;attempt<=3;attempt++){await advance(page,33001);assert.equal((await run(page,'state')).requests.length,attempt+1);await run(page,'finish',attempt,[error('a')])}
  await advance(page,60000);let state=await run(page,'state');assert.equal(state.requests.length,4);assert.deepEqual(state.failed,['a']);assert.equal(state.translating,false)
  await run(page,'enqueue',['a']);assert.equal((await run(page,'state')).requests.length,4)
  await run(page,'retry',['a']);await run(page,'retry',['a']);assert.equal((await run(page,'state')).requests.length,5)
  await run(page,'finish',4,[ok('a')]);state=await run(page,'state');assert.deepEqual(state.failed,[]);assert.deepEqual(state.updates,['a'])
})
await scenario('permanent missing IDs do not auto retry',async page=>{
  await run(page,'enqueue',['a']);await run(page,'finish',0,[error('a',{reason:'blocks_not_found',retryable:false})]);await advance(page,120000)
  const state=await run(page,'state');assert.equal(state.requests.length,1);assert.deepEqual(state.failed,['a']);assert.equal(state.checks.length,0)
})
for(const [name,patch] of [['chapter',{chapterId:'other'}],['language',{lang:'DE'}],['account',{accountScopeKey:'account-b'}],['book',{bookId:'other'}]]){
  await scenario('late stream cannot write after '+name+' change',async page=>{
    await run(page,'enqueue',['a']);await run(page,'context',patch);await run(page,'enqueue',['a']);await run(page,'finish',0,[ok('a')])
    let state=await run(page,'state');assert.deepEqual(state.saved,[]);assert.deepEqual(state.updates,[]);assert.deepEqual(state.pending,['a']);assert.equal(state.translating,true)
    await run(page,'finish',1,[ok('a')]);state=await run(page,'state');assert.equal(state.saved.length,1)
  })
}
await scenario('unmount aborts and rejects late stream/cache writes',async page=>{
  await run(page,'enqueue',['a']);await run(page,'unmount');await run(page,'finish',0,[ok('a')]);const state=await run(page,'state')
  assert.equal(state.requests[0].aborted,true);assert.deepEqual(state.saved,[]);assert.deepEqual(state.updates,[])
})
await scenario('unrequested IDs and empty successes cannot corrupt readiness',async page=>{
  await run(page,'enqueue',['a']);await run(page,'finish',0,[ok('b'),{...ok('a'),translatedText:''}]);await advance(page,33001)
  const state=await run(page,'state');assert.deepEqual(state.saved,[]);assert.deepEqual(state.requests[1].ids,['a'])
})
await scenario('late old batch completion cannot release a newer high-priority request',async page=>{
  await run(page,'enqueue',['a']);await run(page,'enqueue',['b'],true);await run(page,'finish',0,[ok('a')])
  let state=await run(page,'state');assert.equal(state.requests[0].aborted,true);assert.equal(state.translating,true);assert.ok(state.pending.includes('b'));assert.deepEqual(state.saved,[])
  await run(page,'finish',1,[ok('b')]);state=await run(page,'state');assert.deepEqual(state.updates,['b'])
})
await scenario('late reconcile from an old account cannot write cache or UI',async page=>{
  await run(page,'checkMode','hold');await run(page,'reconcile',['a']);await advance(page,121);await run(page,'context',{accountScopeKey:'account-b'})
  await run(page,'finishCheck',0,['a']);const state=await run(page,'state');assert.equal(state.checks[0].aborted,true);assert.deepEqual(state.saved,[]);assert.deepEqual(state.updates,[])
})
await scenario('stalled stream deadline recovers only unfinished blocks',async page=>{
  await run(page,'enqueue');await run(page,'block',0,ok('a'));await advance(page,60001)
  assert.equal((await run(page,'state')).requests[0].aborted,true);await advance(page,33001)
  const state=await run(page,'state');assert.deepEqual(state.requests[1].ids,['b']);assert.deepEqual(state.saved.map(x=>x.id),['a'])
})
await scenario('server pending has a finite recovery window without extra model requests',async page=>{
  await run(page,'checkMode','pending');await run(page,'enqueue',['a']);await run(page,'finish',0,[error('a')]);await advance(page,123000)
  let state=await run(page,'state');assert.equal(state.requests.length,1);assert.deepEqual(state.failed,['a']);const count=state.checks.length
  await advance(page,60000);state=await run(page,'state');assert.equal(state.checks.length,count)
})
await scenario('status reads time out, abort and cannot overlap without bounds',async page=>{
  await run(page,'checkMode','hold');await run(page,'enqueue',['a']);await run(page,'finish',0,[error('a')]);await advance(page,36000)
  const state=await run(page,'state');assert.equal(state.requests.length,2);assert.ok(state.checks.length<=4);assert.ok(state.checks.slice(0,-1).every(check=>check.aborted))
})
const sourceBlock=(id,ready=false)=>({id,type:'paragraph',position:1,text:ready?'Fresh accepted translation':'Original '+id,targetLangReady:ready,is_pending:!ready})
await scenario('temporary readiness gate keeps a same-ID stream and accepts its completion',async page=>{
  await run(page,'enqueue');await run(page,'context',{canTranslate:false,sourceBlocks:[sourceBlock('a'),sourceBlock('b')]})
  assert.equal((await run(page,'state')).requests[0].aborted,false)
  await run(page,'finish',0,[ok('a'),ok('b')]);await run(page,'context',{canTranslate:true});await run(page,'enqueue')
  const state=await run(page,'state');assert.equal(state.requests.length,1);assert.deepEqual(state.updates,['a','b'])
})
await scenario('replacement source rejects removed IDs before display binding',async page=>{
  await run(page,'enqueue',['a']);await run(page,'context',{canTranslate:false,sourceBlocks:[sourceBlock('fresh')]})
  await run(page,'finish',0,[ok('a')]);let state=await run(page,'state');assert.deepEqual(state.saved,[]);assert.deepEqual(state.updates,[])
  await run(page,'context',{canTranslate:true,blocks:[sourceBlock('fresh')]});await run(page,'enqueue',['fresh']);state=await run(page,'state')
  assert.deepEqual(state.requests.map(request=>request.ids),[['a'],['fresh']])
})
await scenario('a fresh ready snapshot wins over a late stream response',async page=>{
  await run(page,'enqueue',['a']);await run(page,'context',{canTranslate:false,sourceBlocks:[sourceBlock('a',true)]})
  await run(page,'finish',0,[ok('a')]);await run(page,'context',{canTranslate:true,blocks:[sourceBlock('a',true)]});await run(page,'enqueue',['a'])
  const state=await run(page,'state');assert.equal(state.requests.length,1);assert.deepEqual(state.saved,[]);assert.deepEqual(state.updates,[]);assert.equal(state.blocks[0].text,'Fresh accepted translation')
})
await scenario('temporary readiness changes preserve failed-work cooldown',async page=>{
  await run(page,'enqueue',['a']);await run(page,'finish',0,[error('a')]);await run(page,'context',{canTranslate:false,sourceBlocks:[sourceBlock('a')]})
  await run(page,'context',{canTranslate:true});await run(page,'enqueue',['a']);assert.equal((await run(page,'state')).requests.length,1)
  await advance(page,33001);assert.equal((await run(page,'state')).requests.length,2)
})
await scenario('fresh ready or removed IDs clear obsolete failure without regeneration',async page=>{
  await run(page,'enqueue');await run(page,'finish',0,[error('a',{retryable:false}),error('b',{retryable:false})])
  assert.deepEqual((await run(page,'state')).failed,['a','b'])
  await run(page,'context',{canTranslate:false,sourceBlocks:[sourceBlock('a',true)]})
  const state=await run(page,'state');assert.deepEqual(state.failed,[]);assert.deepEqual(state.pending,[]);assert.equal(state.requests.length,1)
})
await browser.close()
console.log(JSON.stringify({passed,failed,transport:'synthetic; no DB or LLM'},null,2))
if(failed.length) process.exitCode=1
