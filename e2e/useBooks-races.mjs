// Run from the repository root: node e2e/useBooks-races.mjs
// Isolated React hook test: no app/backend session or persistent browser profile is used.
import { build } from 'esbuild'
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const cwd = process.cwd()
const mockSource = `
const calls = { stream: [], json: [], disk: [], update: [], delete: [], persist: [], create: [] };
globalThis.__calls = calls;
function pending(kind, fields = {}) { return new Promise((resolve,reject) => calls[kind].push({...fields, resolve,reject})); }
export const fetchBooks = status => pending('json',{status});
export const fetchBooksStreaming = (status,onBatch,signal) => pending('stream',{status,onBatch,signal});
export const getCachedBooksList = scope => pending('disk',{scope});
export const updateBook = (id,data) => pending('update',{id,data});
export const deleteBook = id => pending('delete',{id});
export const createBook = data => pending('create',{data});
export const setCachedBooksList = async (scope,status,books) => { calls.persist.push({scope,books}); };
export const setCachedBookMeta = async () => {};
export const clearCachedBookMeta = async () => {};
export const clearCachedBookMetaEntry = async () => {};
export const clearCachedBooksList = async () => {};
`
const source = `
import React,{act,useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {useBooks} from './src/lib/useBooks';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let result, setOptions;
const observations = [], renderObservations = [], errors = [];
function App({initialOptions}) {
 const [options,changeOptions] = useState(initialOptions); setOptions = changeOptions;
 result = useBooks(options);
 renderObservations.push({scope: options.scopeKey, ids:result.books.map(b=>b.id),loading:result.loading});
 useEffect(()=>{observations.push(result.books)},[result.books]);
 return null;
}
const root = createRoot(document.getElementById('root'));
window.check = {
 async mount(options){await act(async()=>{root.render(<App initialOptions={options}/>)});},
 async options(options){await act(async()=>{setOptions(options)});},
 async resolve(kind,index,data){await act(async()=>{globalThis.__calls[kind][index].resolve(data)});},
 async reject(kind,index,message){await act(async()=>{globalThis.__calls[kind][index].reject(new Error(message))});},
 async batch(index,books){await act(async()=>{globalThis.__calls.stream[index].onBatch(books,true)});},
 async refresh(){await act(async()=>{void result.refresh(true)});},
 async mutate(method,id){await act(async()=>{void result[method](id).catch(e=>errors.push(e.message))});},
 async flush(){await act(async()=>{});},
 snapshot(){return {books:result.books, loading:result.loading,error:result.error, histories:observations.length,renders:renderObservations,errors,
 calls:Object.fromEntries(Object.entries(globalThis.__calls).map(([key,list])=>[key,list.length])),
 statuses:{stream:globalThis.__calls.stream.map(v=>v.status),json:globalThis.__calls.json.map(v=>v.status)}}}
};
`
const bundled=await build({stdin:{contents:source,resolveDir:cwd,sourcefile:'useBooksHarness.tsx',loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'mock-network',setup(build){build.onResolve({filter:/^\.\/(api|contentCache)$/},args=>args.importer.endsWith('/src/lib/useBooks.ts')?{path:'useBooksMocks',namespace:'mock'}:null);build.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:mockSource,loader:'js'}));}}]})
const browser=await chromium.launch({channel: process.env.USE_BOOKS_BROWSER_CHANNEL ?? 'chrome', headless:true})
const book=(id,status='active')=>({id,title:id,author:null,cover_url:null,original_language:'EN',available_languages:['EN'],status,created_at:'2026-01-01'})
const results=[]
async function fixture(options){const page=await browser.newPage();await page.setContent('<div id="root"></div>');await page.addScriptTag({content:bundled.outputFiles[0].text});await page.evaluate(options=>window.check.mount(options),options);return page}
async function run(page,method,...args){return page.evaluate(({method,args})=>window.check[method](...args),{method,args})}
const state=page=>run(page,'snapshot')
try {
 let p=await fixture({scopeKey:'guest',enabled:false});let s=await state(p);assert.equal(s.loading,true);assert.deepEqual(s.books,[]);assert.equal(s.calls.disk,0);assert.equal(s.calls.stream,0);results.push('disabled: no guest disk/network/paint');await p.close();
 p=await fixture({scopeKey:'guest'});await run(p,'batch',0,[book('fresh')]);s=await state(p);assert.equal(s.loading,false);assert.equal(s.books[0].id,'fresh');await run(p,'resolve','disk',0,{books:[book('stale')],fetchedAt:1});assert.equal((await state(p)).books[0].id,'fresh');await run(p,'resolve','stream',0,[]);results.push('first batch immediate; late IDB cannot override');await p.close();
 p=await fixture({scopeKey:'guest'});await run(p,'resolve','disk',0,{books:[book('one'),book('two'),book('three')],fetchedAt:1});await run(p,'batch',0,[book('one')]);assert.deepEqual((await state(p)).books.map(b=>b.id),['one','two','three']);await run(p,'batch',0,[book('two')]);await run(p,'resolve','stream',0,[]);assert.deepEqual((await state(p)).books.map(b=>b.id),['one','two']);results.push('full disk snapshot retained during partial stream; final removes absent books');await p.close();
 p=await fixture({scopeKey:'account-a',isAuthenticated:true});await run(p,'batch',0,[book('same')]);await run(p,'resolve','stream',0,[]);const before=(await state(p)).histories;await p.waitForTimeout(1250);assert.equal((await state(p)).calls.json,1);await run(p,'resolve','json',0,[book('same')]);assert.equal((await state(p)).histories,before);assert.equal((await state(p)).loading,false);results.push('auth 1200ms retry retained; identical payload retains books identity');await p.close();
 p=await fixture({scopeKey:'account-a',isAuthenticated:true});await run(p,'batch',0,[book('private-a')]);await run(p,'options',{scopeKey:'account-b',isAuthenticated:true});s=await state(p);assert.equal(s.loading,true);assert.deepEqual(s.books,[]);await run(p,'reject','stream',0,'old failure');s=await state(p);assert.equal(s.loading,true);assert.equal(s.error,null);assert.ok(s.renders.filter(r=>r.scope==='account-b').every(r=>!r.ids.includes('private-a')));await run(p,'batch',1,[book('private-b')]);await run(p,'options',{scopeKey:'account-a',isAuthenticated:true});await run(p,'batch',0,[book('stale-a')]);assert.deepEqual((await state(p)).books,[]);results.push('A→B→A excludes old data, loading and errors without one-render account leak');await p.close();
 p=await fixture({scopeKey:'guest'});await run(p,'batch',0,[book('one'),book('two')]);await run(p,'resolve','stream',0,[]);await run(p,'refresh');await run(p,'mutate','hideBook','one');await run(p,'resolve','json',0,[book('one'),book('two')]);assert.equal((await state(p)).books[0].status,'hidden');await run(p,'resolve','update',0,book('one','hidden'));assert.equal((await state(p)).calls.json,2);await run(p,'resolve','json',1,[book('one','hidden'),book('two')]);results.push('archive invalidates stale GET and reconciles after mutation');await p.close();
 p=await fixture({scopeKey:'guest'});await run(p,'batch',0,[book('one'),book('two')]);await run(p,'resolve','stream',0,[]);await run(p,'mutate','hideBook','one');await run(p,'mutate','removeBook','two');await run(p,'resolve','delete',0,{});await run(p,'reject','update',0,'archive failed');s=await state(p);assert.deepEqual(s.books.map(b=>b.id),['one']);assert.equal(s.books[0].status,'active');assert.equal(s.error,'archive failed');results.push('targeted archive rollback preserves concurrent successful deletion');await p.close();
 p=await fixture({scopeKey:'share:sample'});assert.deepEqual((await state(p)).statuses.stream,['active']);await run(p,'batch',0,[book('shared')]);await run(p,'resolve','stream',0,[]);await p.waitForTimeout(1250);assert.equal((await state(p)).calls.json,0);results.push('shared guest uses active list and does not trigger authenticated retry');await p.close();
 console.log(JSON.stringify({passed:results.length,results},null,2));
} finally {await browser.close()}
