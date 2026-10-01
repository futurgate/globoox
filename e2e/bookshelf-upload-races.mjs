// Component integration in a fresh browser: real modal and shelf placeholder, synthetic transport only.
import { build } from 'esbuild'
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const fixture = `
import React from 'react';
export const getSignedUploadUrl=(bucket,path,signal)=>window.pending('signed',{path},signal);
export const uploadToStorage=(url,file,type,signal)=>window.pending('storage',{name:file.name},signal);
export const processBook=(path,name,size,signal)=>window.pending('process',{path,name,size},signal);
export {waitForBookJob} from './src/lib/api';
export const trackApiRequest=()=>{};export const trackTranslateStreamClient=()=>{};export const setCachedBookMeta=()=>{};
export const trackBookUploadStarted=()=>{};export const trackBookUploaded=()=>{};export const trackBookUploadFailed=()=>{};
export const captureException=()=>{};export const addBreadcrumb=()=>{};
export const IOSAction=({children,onClick,disabled})=><button onClick={onClick} disabled={disabled}>{children}</button>;
export const IOSActionStack=({children})=><div>{children}</div>;
export const Skeleton=({children,...props})=><div {...props}>{children}</div>;
export const Card=({children})=><div>{children}</div>;export const CardContent=Card;export const CardTitle=Card;export const CardDescription=Card;export const Badge=Card;
export const useAuth=()=>({isAuthenticated:false});
export default function Dialog({open,onOpenChange,title,children}){return open===undefined?<div>{children}</div>:open?<div role="dialog" aria-label={title}><button onClick={()=>onOpenChange(false)}>Close dialog</button>{children}</div>:null}
`
const source = `
import React,{act,useState} from 'react';import {createRoot} from 'react-dom/client';
import UploadBookModal from './src/components/UploadBookModal';
import UploadBookPlaceholder from './src/components/Store/UploadBookPlaceholder';
import {applyUploadEvent} from './src/lib/bookshelfUploads';
window.IS_REACT_ACT_ENVIRONMENT=true;window.calls={signed:[],storage:[],process:[],job:[]};window.events=[];
window.pending=(kind,data,signal)=>new Promise((resolve,reject)=>{const abort=()=>reject(new Error('aborted'));signal?.addEventListener('abort',abort,{once:true});window.calls[kind].push({data,resolve:value=>{signal?.removeEventListener('abort',abort);resolve(value)},reject:error=>{signal?.removeEventListener('abort',abort);reject(new Error(error))},signal});});
window.fetch=(url,init)=>window.pending('job',{url:String(url)},init?.signal).then(value=>new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}}));
function App(){const[open,setOpen]=useState(true);const[uploads,setUploads]=useState([]);return <><button onClick={()=>setOpen(true)}>Open upload</button><div id="shelf">{uploads.map(upload=><div key={upload.attemptId} data-attempt={upload.attemptId}>{upload.phase==='complete'?<article>Ready {upload.bookId}</article>:<UploadBookPlaceholder upload={upload} onDismiss={()=>setUploads(items=>items.filter(item=>item.attemptId!==upload.attemptId))} onRefresh={()=>{}}/>}</div>)}</div><UploadBookModal isOpen={open} onClose={()=>setOpen(false)} onUploadEvent={event=>{window.events.push(event);setUploads(items=>applyUploadEvent(items,event));}}/></>}
const root=createRoot(document.getElementById('root'));await act(async()=>root.render(<App/>));
window.check={async flush(){await act(async()=>{})},async resolve(kind,index,value){await act(async()=>window.calls[kind][index].resolve(value))},async reject(kind,index,error){await act(async()=>window.calls[kind][index].reject(error))},async unmount(){await act(async()=>root.unmount())},state(){return {events:window.events,calls:Object.fromEntries(Object.entries(window.calls).map(([k,v])=>[k,v.map(x=>({data:x.data,aborted:x.signal?.aborted}))]))}}};
`
const bundle=await build({stdin:{contents:source,resolveDir:process.cwd(),sourcefile:'uploadHarness.tsx',loader:'tsx'},bundle:true,write:false,format:'esm',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'upload-fixture',setup(builder){
 builder.onResolve({filter:/^(@\/lib\/(api|posthog|hooks\/useAuth)|@sentry\/nextjs|@\/components\/ui\/|next\/(image|link)|\.\/BookActionsMenu$)/},()=>({path:'fixture',namespace:'mock'}));
 builder.onResolve({filter:/^\.\/(posthog|contentCache)$/},args=>args.importer.endsWith('/src/lib/api.ts')?({path:'fixture',namespace:'mock'}):null);
 builder.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:fixture,loader:'tsx',resolveDir:process.cwd()}));
}}]});
const browser=await chromium.launch({channel:process.env.CATALOG_BROWSER_CHANNEL??'chrome',headless:true});
const passed=[];
async function create(){const page=await browser.newPage();await page.clock.install();await page.route('**/*',route=>route.request().url()==='http://127.0.0.1:39999/'?route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}):route.abort());await page.goto('http://127.0.0.1:39999/');await page.addScriptTag({type:'module',content:bundle.outputFiles[0].text});await page.getByRole('dialog').waitFor();return page;}
async function upload(page,name){await page.locator('input[type=file]').setInputFiles({name,mimeType:'application/epub+zip',buffer:Buffer.from('PK synthetic')});await page.getByRole('button',{name:'Upload',exact:true}).click();}
const resolve=(page,kind,index,value)=>page.evaluate(({kind,index,value})=>window.check.resolve(kind,index,value),{kind,index,value});
const state=page=>page.evaluate(()=>window.check.state());
try {
 let page=await create();await upload(page,'first.epub');
 await page.getByRole('article',{name:'Book upload'}).waitFor();
 assert.equal((await state(page)).calls.storage.length,0);assert.equal((await state(page)).calls.signed.length,1);
 const attempt=await page.locator('#shelf > div').getAttribute('data-attempt');
 await resolve(page,'signed',0,{signedUrl:'http://synthetic/upload'});await resolve(page,'storage',0,null);
 await page.getByText('Processing book…',{exact:true}).first().waitFor();
 await page.getByRole('button',{name:'Close dialog'}).click();
 assert.equal(await page.getByRole('article',{name:'Book upload'}).count(),1);
 await page.getByRole('button',{name:'Open upload'}).click();await upload(page,'second.epub');
 await resolve(page,'process',0,{id:'book-first',chapter_count:1});
 assert.equal(await page.getByRole('dialog').count(),1);assert.equal(await page.getByText('Ready book-first',{exact:true}).count(),1);
 assert.equal(await page.locator(`[data-attempt="${attempt}"]`).count(),1);
 assert.equal((await state(page)).calls.process.length,1);
 passed.push('placeholder before first network response; processing under modal; closed modal preserves card; old completion does not close new dialog; stable entry without delay');
 await resolve(page,'signed',1,{signedUrl:'http://synthetic/second'});await resolve(page,'storage',1,null);await resolve(page,'process',1,{id:'book-first'});
 assert.equal(await page.getByText('Ready book-first',{exact:true}).count(),1);assert.equal(await page.getByRole('dialog').count(),0);
 passed.push('duplicate completion produces one book and closes only its own dialog');await page.close();
 page=await create();await upload(page,'failed.epub');
 await resolve(page,'signed',0,{signedUrl:'http://synthetic/failed'});await resolve(page,'storage',0,null);
 await page.getByRole('button',{name:'Close dialog'}).click();await page.getByRole('button',{name:'Open upload'}).click();
 await page.evaluate(()=>window.check.reject('process',0,'Synthetic processing failure'));
 assert.equal(await page.getByRole('dialog').count(),1);assert.equal(await page.getByText('Upload failed',{exact:true}).count(),1);
 assert.equal(await page.getByText('Synthetic processing failure',{exact:true}).count(),1);
 assert.equal((await state(page)).calls.process.length,1);
 await page.getByRole('button',{name:'Dismiss',exact:true}).click();assert.equal(await page.locator('#shelf > div').count(),0);
 passed.push('processing failure stays on its card, leaves reopened dialog intact, never retries process automatically, and can be dismissed');await page.close();
 page=await create();await upload(page,'aborted.epub');await page.evaluate(()=>window.check.unmount());
 assert.equal((await state(page)).calls.signed[0].aborted,true);assert.equal((await state(page)).calls.storage.length,0);assert.equal((await state(page)).events.at(-1).phase,'error');
 passed.push('page unmount cancels its operation before further upload/process calls');await page.close();
 page=await create();await upload(page,'queued-first.epub');
 await resolve(page,'signed',0,{signedUrl:'http://synthetic/queue'});await resolve(page,'storage',0,null);await resolve(page,'process',0,{jobId:'queued-first',bookId:'pending-first'});
 const queuedAttempt=await page.locator('#shelf > div').getAttribute('data-attempt');
 assert.equal((await state(page)).calls.job.length,1);assert.equal(await page.getByText('Ready pending-first',{exact:true}).count(),0);
 await resolve(page,'job',0,{state:'active',progress:25});
 await page.getByRole('button',{name:'Close dialog'}).click();await page.getByRole('button',{name:'Open upload'}).click();await upload(page,'queued-second.epub');
 await page.clock.runFor(2000);await page.evaluate(()=>window.check.flush());
 await resolve(page,'job',1,{state:'completed',progress:100,result:{bookId:'canonical-final',chapterCount:3}});
 assert.equal(await page.getByRole('dialog').count(),1);assert.equal(await page.getByText('Ready canonical-final',{exact:true}).count(),1);
 assert.equal(await page.locator(`[data-attempt="${queuedAttempt}"]`).count(),1);assert.equal((await state(page)).events.find(x=>x.phase==='complete').bookId,'canonical-final');
 await resolve(page,'signed',1,{signedUrl:'http://synthetic/second'});await resolve(page,'storage',1,null);await resolve(page,'process',1,{id:'canonical-final'});
 assert.equal(await page.getByText('Ready canonical-final',{exact:true}).count(),1);assert.equal(await page.getByRole('dialog').count(),0);
 passed.push('queued completion keeps its attempt, uses final canonical ID, does not close a newer upload dialog, and deduplicates a later sync completion');await page.close();
 page=await create();await upload(page,'queue-failed.epub');
 await resolve(page,'signed',0,{signedUrl:'http://synthetic/failed-job'});await resolve(page,'storage',0,null);await resolve(page,'process',0,{jobId:'failed-job',bookId:'pending-failed'});
 await page.getByRole('button',{name:'Close dialog'}).click();await page.getByRole('button',{name:'Open upload'}).click();
 await resolve(page,'job',0,{state:'failed',progress:30,failReason:'Synthetic queued failure'});
 assert.equal(await page.getByText('Synthetic queued failure',{exact:true}).count(),1);assert.equal(await page.getByRole('dialog').count(),1);
 await page.clock.runFor(10000);assert.equal((await state(page)).calls.job.length,1);assert.equal((await state(page)).calls.process.length,1);
 passed.push('queued failure stays on its placeholder, leaves a reopened dialog intact, and never repeats process or polling');await page.close();
 page=await create();await upload(page,'queue-aborted.epub');
 await resolve(page,'signed',0,{signedUrl:'http://synthetic/aborted-job'});await resolve(page,'storage',0,null);await resolve(page,'process',0,{jobId:'aborted-job',bookId:'pending-aborted'});
 await page.evaluate(()=>window.check.unmount());assert.equal((await state(page)).calls.job[0].aborted,true);assert.equal((await state(page)).events.at(-1).phase,'error');
 await page.clock.runFor(10000);assert.equal((await state(page)).calls.job.length,1);
 passed.push('unmount aborts an in-flight job status request and clears later polling');await page.close();
 page=await create();await upload(page,'queue-timeout.epub');
 await resolve(page,'signed',0,{signedUrl:'http://synthetic/timeout-job'});await resolve(page,'storage',0,null);await resolve(page,'process',0,{jobId:'timeout-job',bookId:'pending-timeout'});
 await page.clock.runFor(300000);await page.evaluate(()=>window.check.flush());
 assert.equal((await state(page)).calls.job[0].aborted,true);assert.equal((await state(page)).events.at(-1).phase,'error');
 assert.ok((await state(page)).events.at(-1).error.includes('timed out'));assert.equal((await state(page)).calls.process.length,1);
 passed.push('hung job status reaches one five-minute deadline, aborts, and changes the placeholder to an error');await page.close();
 console.log(JSON.stringify({fixtureOnly:true,passed},null,2));
} finally {await browser.close();}
