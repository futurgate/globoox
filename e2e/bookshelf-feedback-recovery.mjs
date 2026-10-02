// Actual MyBooks/controller/cards/modal/Sonner recovery integration. All transport is synthetic; no backend/model calls.
import { build } from 'esbuild'
import { chromium } from 'playwright'
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const accountA = '00000000-0000-4000-8000-000000000001'
const manual = false
const screenshots = process.argv.includes('--screenshots')
const screenshotDir='.local/verification/bookshelf-feedback-mobile'
let visualCss=''
if(screenshots){
 const files=await readdir('.next/static',{recursive:true});
 const styles=await Promise.all(files.filter(file=>file.endsWith('.css')).map(file=>readFile('.next/static/'+file,'utf8')));
 visualCss=styles.filter(css=>css.includes('--app-shell-bg')).join('\n')+'\n'+await readFile('src/components/ui/app-toaster.css','utf8');
 if(!visualCss.includes('--app-shell-bg'))throw Error('Build CSS is required for visual capture');
 await mkdir(screenshotDir,{recursive:true});
}
const accountB = '00000000-0000-4000-8000-000000000002'
const item = (id, extra = {}) => ({ id, title: id, author: 'Fixture author', created_at: '2026-09-01T00:00:00Z', status: 'active', is_own: true,
  original_language: 'en', available_languages: ['en'], selected_language: null, last_read_at: '2026-09-01T00:00:00Z',
  metadata_version: id, reading: null, cover: null, processing_status: 'ready', metadata_ready: true, ...extra })
const original = [item('old-a', { title: 'A old book' }), item('old-z', { title: 'Z old book' }), item('archived', { status: 'hidden' })]
const mocks = {
  auth: `import {useSyncExternalStore} from 'react'; export const useAuth=()=>useSyncExternalStore(window.authSubscribe,()=>window.auth);`,
  supabase: `export const createClient=()=>({auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),getSession:async()=>({data:{session:window.auth.user?{user:window.auth.user,access_token:'synthetic-only'}:null}})}});`,
  store: `export const useAppStore=fn=>fn({progress:{}});`,
  analytics: `export const trackApiRequest=()=>{};export const trackTranslateStreamClient=()=>{};export const trackBookOpened=()=>{};export const trackBookUploadStarted=()=>{};export const trackBookUploaded=()=>{};export const trackBookUploadFailed=()=>{};`,
  sentry: `export const captureException=()=>{};export const addBreadcrumb=()=>{};`,
  activity: `export const flushReadingActivity=async()=> '0';export const getPendingReadingRecency=()=>({});`,
  navigation: `export const useSearchParams=()=>new URLSearchParams(location.search);export const usePathname=()=>location.pathname;const router={prefetch:()=>{}};export const useRouter=()=>router;`,
  link: `import React from 'react';export default function Link({children,...props}){return <a {...props}>{children}</a>}`,
  image: `import React from 'react';export default function Image({fill,unoptimized,priority,...props}){return <img {...props}/>} `,
  empty: `export default function Empty(){return null}`,
  dialog: `import React from 'react';export default function Dialog({open,onOpenChange,title,children}){return open?<div role="dialog" aria-label={title}><button onClick={()=>onOpenChange(false)}>Close dialog</button>{children}</div>:null}`,
  alert: `import React from 'react';export default function Alert({open,onConfirm,onOpenChange,title,description}){return open?<div role="dialog" aria-label={title}>{description}<button onClick={onConfirm}>Confirm delete</button><button onClick={()=>onOpenChange(false)}>Cancel</button></div>:null}`,
  wrapper: `import React from 'react';export default function Wrapper({children}){return <div>{children}</div>}`,
  actions: `import React from 'react';export const IOSAction=({children,onClick,disabled})=><button onClick={onClick} disabled={disabled}>{children}</button>;export const IOSActionStack=({children})=><div>{children}</div>;`,
}
const source = `
import React,{act} from 'react';import {createRoot} from 'react-dom/client';
import MyBooks from './src/app/(app)/my-books/page';
import AppToaster from './src/components/ui/app-toaster';import Header from './src/components/ui/Header';import {toast} from 'sonner';
import {catalogContextHint} from './src/lib/catalogApi';
import {invalidateCatalogConfirmation} from './src/lib/catalogFreshness';
window.IS_REACT_ACT_ENVIRONMENT=true;
const listeners=new Set();window.authSubscribe=fn=>{listeners.add(fn);return()=>listeners.delete(fn)};
const authFor=id=>({user:id?{id}:null,isAuthenticated:!!id,loading:false,isAdmin:false});
window.auth=authFor(sessionStorage.getItem('fixture:account')||window.initial.account);
let server=JSON.parse(localStorage.getItem('fixture:server')||'null')||window.initial.server;
const persist=()=>localStorage.setItem('fixture:server',JSON.stringify(server));persist();
window.calls={library:[],signed:[],storage:[],process:[],job:[],cover:[],mutation:[]};let mutationMode='success';let holdIndex=window.initial.holdIndex||false;
const manifest=(books,userId)=>({contract_version:2,scope_key:catalogContextHint(userId).scopeKey,revision:'server-'+JSON.stringify(books),server_time:new Date().toISOString(),complete:true,order:'recently_read',activity_version:'0',items:books});
const json=value=>new Response(JSON.stringify(value),{status:value?.httpStatus??200,headers:{'content-type':'application/json'}});
window.fetch=(input,init={})=>{
 const url=String(input);const headers=new Headers(init.headers);const user=headers.get('X-Catalog-User')||window.auth.user?.id||'guest';
  if((init.method==='DELETE'||init.method==='PATCH')&&url.startsWith('/api/books/')){
    const id=url.split('/').at(-1);const patch=init.method==='PATCH'?JSON.parse(init.body):null;
    window.calls.mutation.push({url,user,method:init.method,body:patch,settled:true});
    if(mutationMode==='success'||mutationMode==='lost'){
      server[user]=init.method==='DELETE'?(server[user]||[]).filter(book=>book.id!==id):(server[user]||[]).map(book=>book.id===id?{...book,...patch}:book);persist();
    }
    return mutationMode==='success'?Promise.resolve(json({success:true})):Promise.reject(new TypeError('Synthetic lost mutation response'));
  }
  const kind=url.startsWith('/api/v2/library')?'library':url.startsWith('/api/storage/signed-url')?'signed':url.startsWith('https://fixture.invalid/')?'storage':url.startsWith('/api/books/process')?'process':url.startsWith('/api/jobs/')?'job':url.includes('/cover')?'cover':null;
 if(!kind)throw Error('Unexpected synthetic transport '+url);
 return new Promise((resolve,reject)=>{const call={url,user,body:typeof init.body==='string'?JSON.parse(init.body):null,signal:init.signal,settled:false};
  const abort=()=>{call.aborted=true;reject(new DOMException('Aborted','AbortError'))};init.signal?.addEventListener('abort',abort,{once:true});
  call.resolve=value=>{call.settled=true;init.signal?.removeEventListener('abort',abort);resolve(kind==='cover'?new Response(value,{headers:{'content-type':'image/svg+xml'}}):json(value))};
  call.reject=message=>{call.settled=true;init.signal?.removeEventListener('abort',abort);reject(Error(message))};window.calls[kind].push(call);
  if(kind==='library'&&!holdIndex)call.resolve(manifest(server[user]||[],user));
 });
};
let root=createRoot(document.getElementById('root'));await act(async()=>root.render(<><MyBooks/>{window.initial.visual&&<Header/>}<AppToaster/></>));
window.check={
 async flush(){await act(async()=>{})},
 async resolve(kind,index,value){await act(async()=>window.calls[kind][index].resolve(value))},
 async reject(kind,index,error){await act(async()=>window.calls[kind][index].reject(error))},
 hold(value=true){holdIndex=value},
 mutationMode(mode){mutationMode=mode},
 captureActions(){window.staleActions=toast.getToasts().map(entry=>entry.action?.onClick).filter(Boolean)},
 invokeStaleActions(){window.staleActions.forEach(action=>action())},
 server(books,user=window.auth.user?.id||'guest'){server[user]=books;persist()},
 async index(index,books){const call=window.calls.library[index];await act(async()=>call.resolve(manifest(books,call.user)))},
 async revalidate(){await act(async()=>document.dispatchEvent(new Event('visibilitychange')))},
 async remount(){await act(async()=>root.unmount());root=createRoot(document.getElementById('root'));await act(async()=>root.render(<><MyBooks/>{window.initial.visual&&<Header/>}<AppToaster/></>))},
 async switchAccount(id){await act(async()=>{window.auth=authFor(id);sessionStorage.setItem('fixture:account',id||'');listeners.forEach(fn=>fn())})},
 invalidate(){invalidateCatalogConfirmation(catalogContextHint(window.auth.user?.id||null).scopeKey)},
 state(){return {toasts:toast.getToasts().map(entry=>({id:entry.id,title:entry.title})),calls:Object.fromEntries(Object.entries(window.calls).map(([k,v])=>[k,v.map(c=>({url:c.url,user:c.user,method:c.method,body:c.body,aborted:c.aborted||c.signal?.aborted,settled:c.settled}))])),ids:[...document.querySelectorAll('[data-book-id]')].map(n=>n.dataset.bookId)}}
};
`
const bundled = await build({ stdin: { contents: source, resolveDir: process.cwd(), sourcefile: 'uploadStoryHarness.tsx', loader: 'tsx' }, bundle: true, write: false, loader: { '.css': 'empty' }, format: 'esm', platform: 'browser', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' }, plugins: [{ name: 'upload-story-fixtures', setup(builder) {
  builder.onResolve({ filter: /.*/ }, args => {
    const p = args.path
    const key = p.endsWith('/hooks/useAuth') ? 'auth' : /(?:^\.\/|@\/lib\/)supabase\/client$/.test(p) ? 'supabase'
      : p === '@/lib/store' ? 'store' : /(?:^\.\/|@\/lib\/)posthog$/.test(p) ? 'analytics'
      : p === '@sentry/nextjs' ? 'sentry' : p === './readingActivity' ? 'activity'
      : p === 'next/navigation' ? 'navigation' : p === 'next/link' ? 'link' : p === 'next/image' ? 'image'
      : p === '@/components/GoogleOneTap' ? 'empty'
      : /\/ui\/(ios-flow-dialog|ios-bottom-drawer)$/.test(p) ? 'dialog' : p === '@/components/ui/ios-alert-dialog' ? 'alert'
      : p === '@/components/ui/ios-dialog-footer' ? 'wrapper' : p === '@/components/ui/ios-action-group' ? 'actions' : null
    return key && !(manual && ['dialog', 'alert', 'wrapper', 'actions'].includes(key)) ? { path: key, namespace: 'fixture' } : null
  })
  builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: mocks[args.path], loader: 'tsx', resolveDir: process.cwd() }))
  if (process.env.UPLOAD_PAGE_SOURCE_FILE) builder.onLoad({ filter: /\/my-books\/page\.tsx$/ }, async () => ({ contents: await readFile(process.env.UPLOAD_PAGE_SOURCE_FILE, 'utf8'), loader: 'tsx' }))

} }] })
const browser = await chromium.launch({ channel: process.env.CATALOG_BROWSER_CHANNEL ?? 'chrome', headless: true })
const results = [];let currentPage;
const deadline=setTimeout(()=>{console.error('Recovery fixture exceeded its 85-second total budget');void browser.close()},85_000);
const testcase=async(name,execute)=>{try{await execute();results.push({name,status:'PASS'});console.error('PASS',name)}catch(error){results.push({name,status:'FAIL',error:String(error)});console.error('FAIL',name,String(error));if(currentPage&&!currentPage.isClosed())console.error('DOM',String(await currentPage.locator('body').innerText()).slice(0,3500))}finally{if(currentPage&&!currentPage.isClosed())await currentPage.close();currentPage=null}};
const run = (page, method, ...args) => page.evaluate(({ method, args }) => window.check[method](...args), { method, args })
const state = page => run(page, 'state')
async function fixture(books = original, holdIndex = false, visualMode = null) {
  const page = await browser.newPage({ viewport: visualMode ? { width:390,height:844 } : { width: 1000, height: 900 }, deviceScaleFactor:1 })
  page.setDefaultTimeout(4500);currentPage=page
  page.on('pageerror', error => console.error('fixture pageerror:', error.message))
  await page.clock.install()
  await page.route('**/*', route => route.request().url() === 'http://127.0.0.1:39999/my-books' ? route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${visualMode?visualCss:''}</style></head><body><div id="root"></div><script>${visualMode?`localStorage.setItem('globoox-app-theme',JSON.stringify({state:{mode:${JSON.stringify(visualMode)},palette:'globoox'},version:0}));`:''}window.initial=${JSON.stringify({ visual:!!visualMode,holdIndex, account: accountA, server: { [accountA]: books, [accountB]: [item('account-b-only')] } })}</script><script type="module">${bundled.outputFiles[0].text}</script></body></html>` }) : route.abort())
  await page.goto('http://127.0.0.1:39999/my-books')
  await page.waitForFunction(() => !!window.check && window.calls.library.length > 0)
  if (!holdIndex) await page.locator('[data-book-id], a[href="/reader/old-a"]').first().waitFor()
  return page
}
async function begin(page, name = 'not-a-book-title.epub') {
  await page.evaluate(()=>window.scrollTo(0,0));await page.clock.runFor(80);await run(page,'flush');
  await page.getByRole('button', { name: 'Upload book', exact: true }).click()
  await page.locator('input[type=file]').setInputFiles({ name, mimeType: 'application/epub+zip', buffer: Buffer.from('PK synthetic') })
  await page.getByRole('button', { name: 'Upload', exact: true }).click()
  await page.waitForFunction(() => window.calls.signed.length > 0)
}
async function queued(page, pendingId = 'pending') {
  await run(page, 'resolve', 'signed', 0, { signedUrl: 'https://fixture.invalid/upload' })
  await run(page, 'resolve', 'storage', 0, {})
  await run(page, 'resolve', 'process', 0, { jobId: 'job-one', bookId: pendingId })
  await page.waitForFunction(() => window.calls.job.length === 1)
}
async function poll(page) { await page.clock.runFor(2000); await run(page, 'flush') }
const cover = { url: '/api/v2/books/pending/cover?version=v1', version: 'v1', width: null, height: null }
const image = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="18"><rect width="12" height="18" fill="green"/></svg>'

const toasts=page=>page.locator('[data-sonner-toast]:not([data-removed="true"])');
const settled=async page=>{await page.clock.runFor(80);await run(page,'flush')};
const closeUpload=page=>page.getByRole('button',{name:'Close dialog',exact:true}).click();
const bookCard=(page,id)=>page.locator(`[data-book-id="${id}"]`);
async function archive(page,id='old-a'){
 const card=bookCard(page,id);await card.hover();await card.getByRole('button',{name:'Book actions',exact:true}).click();await settled(page);await card.getByRole('button',{name:'Archive',exact:true}).click();await settled(page);
}
async function retryMutation(page){await page.getByRole('button',{name:'Retry',exact:true}).first().click();await settled(page)}
try {
 await testcase('polling network unknown → dashed card → same-job Check status → ready without POST',async()=>{
  const page=await fixture();await begin(page);await queued(page);
  const pending=item('pending',{title:'Parsed pending',processing_status:'processing'});
  await run(page,'server',[pending,...original]);await run(page,'resolve','job',0,{state:'active',progress:50,book:pending});await closeUpload(page);await poll(page);
  await run(page,'reject','job',1,'Synthetic disconnected poll');await settled(page);
  const card=bookCard(page,'pending');assert.equal(await card.getByText('Status unavailable',{exact:true}).count(),1);
  assert.equal(await card.locator('.border-dashed.bg-transparent').count(),1);
  assert.equal(await card.locator('a[href^="/reader/"]').count(),0);
  const postsBefore=(await state(page)).calls.process.length;await card.getByRole('button',{name:'Check status',exact:true}).click();
  await page.waitForFunction(()=>window.calls.job.length===3);
  assert.equal((await state(page)).calls.job[2].url,'/api/jobs/job-one');
  const ready={...pending,processing_status:'ready'};await run(page,'server',[ready,...original]);await run(page,'resolve','job',2,{state:'completed',book:ready,order_confirmed:true,result:{bookId:'pending',chapterCount:2}});await settled(page);
  assert.equal((await state(page)).calls.process.length,postsBefore);assert.equal((await state(page)).calls.storage.length,1);
  assert.equal(await card.locator('a[href="/reader/pending"]').count()>0,true);
  assert.equal(await toasts(page).getByText('Book ready',{exact:true}).count(),1);
 });
 await testcase('ready/orderfalse preserves actual cover, Reader links and separate library warning',async()=>{
  const page=await fixture();await begin(page);await queued(page);
  const ready=item('pending',{title:'Ready with cover',cover});await run(page,'resolve','job',0,{state:'active',book:ready,progress:99});
  await page.waitForFunction(()=>window.calls.cover.length===1);await run(page,'resolve','cover',0,image);
  await bookCard(page,'pending').locator('img').waitFor();await closeUpload(page);await run(page,'hold',true);await poll(page);
  await run(page,'resolve','job',1,{state:'completed',book:ready,order_confirmed:false,result:{bookId:'pending',chapterCount:1}});
  await page.waitForFunction(()=>window.calls.library.some(c=>!c.settled));const index=(await state(page)).calls.library.findIndex(c=>!c.settled);await run(page,'reject','library',index,'Synthetic index unavailable');await settled(page);
  const card=bookCard(page,'pending');assert.equal(await card.locator('img').count(),1);assert.equal(await card.locator('a[href="/reader/pending"]').count()>0,true);
  assert.equal(await card.getByRole('button',{name:'Upload again',exact:true}).count(),0);
  assert.equal(await card.getByRole('button',{name:'Refresh bookshelf',exact:true}).count(),0);
  assert.equal(await card.getByText('Book ready. Unable to update the bookshelf.',{exact:true}).count(),0);
  assert.equal(await toasts(page).count(),0);
  assert.equal(await page.getByRole('button',{name:'Try again',exact:true}).count(),1);
 });
 await testcase('unknown process receipt offers honest refresh before explicit reupload; no pretend status endpoint',async()=>{
  const page=await fixture();await begin(page);await run(page,'resolve','signed',0,{signedUrl:'https://fixture.invalid/upload'});await run(page,'resolve','storage',0,{});
  await run(page,'reject','process',0,'Synthetic process reply lost');await settled(page);
  const dialog=page.getByRole('dialog',{name:'Upload Book'});assert.equal(await dialog.getByText(/The earlier upload may still appear/).count(),1);
  assert.equal(await dialog.getByRole('button',{name:'Check status',exact:true}).count(),0);assert.equal(await dialog.getByRole('button',{name:'Upload again',exact:true}).isDisabled(),true);
  await dialog.getByRole('button',{name:'Refresh library',exact:true}).click();await settled(page);
  assert.equal(await dialog.getByRole('button',{name:'Upload again',exact:true}).isEnabled(),true);
  assert.equal((await state(page)).calls.process.length,1);assert.equal((await state(page)).calls.job.length,0);
  await dialog.getByRole('button',{name:'Upload again',exact:true}).click();assert.equal(await dialog.locator('input[type=file]').count(),1);
  assert.equal((await state(page)).calls.process.length,1);
 });
 await testcase('lost archive response → Retry reconciles server state and does not repeat the applied mutation',async()=>{
  const page=await fixture();await run(page,'mutationMode','lost');await archive(page);
  assert.equal((await state(page)).calls.mutation.length,1);assert.equal(await bookCard(page,'old-a').count(),1);
  assert.equal(await toasts(page).getByText('Unable to archive this book',{exact:true}).count(),1);
  assert.equal(await page.locator('main [role="status"]').filter({hasText:'Unable to archive'}).count(),0);
  await retryMutation(page);assert.equal((await state(page)).calls.mutation.length,1);assert.equal(await bookCard(page,'old-a').count(),0);
  assert.equal(await page.getByText('Unable to archive “A old book”.',{exact:true}).count(),0);
 });
 await testcase('failed archive response → Retry checks then repeats the original archive action',async()=>{
  const page=await fixture();await run(page,'mutationMode','rejected');await archive(page);assert.equal((await state(page)).calls.mutation.length,1);
  await run(page,'mutationMode','success');await retryMutation(page);
  const mutations=(await state(page)).calls.mutation;assert.equal(mutations.length,2);assert.equal(mutations[1].method,'PATCH');assert.deepEqual(mutations[1].body,{status:'hidden'});
  assert.equal(await bookCard(page,'old-a').count(),0);
 });
 await testcase('account switch clears shown notification and captured stale action cannot request previous job',async()=>{
  const page=await fixture();await begin(page);await queued(page);await closeUpload(page);await run(page,'reject','job',0,'Synthetic failed status');await settled(page);
  assert.equal(await toasts(page).getByText('Unable to confirm book readiness',{exact:true}).count(),1);
  await run(page,'captureActions');const before=(await state(page)).calls.job.length;
  await run(page,'switchAccount',accountB);await page.clock.runFor(500);await run(page,'flush');
  assert.equal(await toasts(page).count(),0);assert.equal(await bookCard(page,'account-b-only').count(),1);
  await run(page,'invokeStaleActions');await settled(page);assert.equal((await state(page)).calls.job.length,before);
  assert.equal(await page.getByRole('dialog').count(),0);assert.equal(await page.locator('[data-upload-attempt]').count(),0);
 });
 await testcase('closed-modal completion toasts once; existing membership is distinguished from global canonical dedup',async()=>{
  const page=await fixture();await begin(page);await queued(page);await closeUpload(page);
  await run(page,'resolve','job',0,{state:'completed',book:original[0],result:{bookId:'old-a',chapterCount:3},order_confirmed:true});await settled(page);
  assert.equal(await toasts(page).getByText('Book already in your library',{exact:true}).count(),1);assert.equal(await bookCard(page,'old-a').count(),1);
  assert.equal(await toasts(page).getByText('Reading progress is safe',{exact:true}).count(),1);
  assert.equal(await toasts(page).locator('[data-close-button]').count(),0);
  await run(page,'revalidate');await settled(page);assert.equal(await toasts(page).count(),1);
  await begin(page,'new-membership.epub');
  await run(page,'resolve','signed',1,{signedUrl:'https://fixture.invalid/second'});await run(page,'resolve','storage',1,{});await run(page,'resolve','process',1,{jobId:'job-second',bookId:'global-canonical'});await closeUpload(page);
  const fresh=item('global-canonical',{title:'Global canonical not previously owned'});await run(page,'server',[fresh,...original]);await run(page,'resolve','job',1,{state:'completed',book:fresh,result:{bookId:fresh.id,chapterCount:2},order_confirmed:true});await settled(page);
  assert.equal(await toasts(page).getByText('Book ready',{exact:true}).count(),1);assert.equal(await toasts(page).getByText('Book already in your library',{exact:true}).count(),0);
  await run(page,'revalidate');await settled(page);assert.equal(await toasts(page).count(),1);
 });
 await testcase('manual refresh while another upload is pending does not claim the bookshelf was updated',async()=>{
  const page=await fixture();await begin(page,'first.epub');await queued(page);await closeUpload(page);
  await begin(page,'second.epub');await closeUpload(page);
  const first=item('pending',{title:'First ready'});await run(page,'resolve','job',0,{state:'completed',book:first,result:{bookId:'pending',chapterCount:2},order_confirmed:false});await settled(page);
  const before=(await state(page)).calls.library.length;await page.getByRole('button',{name:'Try again',exact:true}).click();await settled(page);
  assert.equal((await state(page)).calls.library.length,before);assert.equal(await toasts(page).getByText('Bookshelf updated',{exact:true}).count(),0);
  assert.equal((await state(page)).calls.signed.length,2);assert.equal((await state(page)).calls.process.length,1);
 });
 await testcase('direct card Check status promotes prior parsed metadata when completion has only ID and manifest is unavailable',async()=>{
  const page=await fixture();await begin(page);await queued(page);
  const pending=item('pending',{title:'Metadata retained across retry',processing_status:'processing'});
  await run(page,'server',[pending,...original]);await run(page,'resolve','job',0,{state:'active',progress:55,book:pending});await closeUpload(page);await poll(page);
  await run(page,'reject','job',1,'Synthetic lost status');await settled(page);
  const card=bookCard(page,'pending');await card.getByRole('button',{name:'Check status',exact:true}).click();await page.waitForFunction(()=>window.calls.job.length===3);
  await run(page,'hold',true);await run(page,'resolve','job',2,{state:'completed',result:{bookId:'pending',chapterCount:2},order_confirmed:true});
  await page.waitForFunction(()=>window.calls.library.some(c=>!c.settled));const index=(await state(page)).calls.library.findIndex(c=>!c.settled);await run(page,'reject','library',index,'Synthetic index unavailable');await settled(page);
  assert.equal(await card.getAttribute('data-processing-status'),'ready');
  assert.equal(await card.locator('a[href="/reader/pending"]').count()>0,true);
  assert.equal(await card.getByText('Metadata retained across retry',{exact:true}).count()>0,true);
 });
 await testcase('same-ID retry compatibility: picker cancellation is inert; one card from start through reload',async()=>{
  const failed=item('failed-retry',{title:'Parsed before failure',processing_status:'error'});
  const page=await fixture([failed,...original]);const card=bookCard(page,failed.id);
  await card.getByRole('button',{name:'Upload again',exact:true}).click();await closeUpload(page);
  assert.equal(await card.getAttribute('data-processing-status'),'error');assert.equal((await state(page)).calls.signed.length,0);
  await card.getByRole('button',{name:'Upload again',exact:true}).click();
  await page.locator('input[type=file]').setInputFiles({name:'same-book.epub',mimeType:'application/epub+zip',buffer:Buffer.from('PK synthetic')});
  await page.getByRole('button',{name:'Upload',exact:true}).click();await page.waitForFunction(()=>window.calls.signed.length===1);
  assert.equal(await card.count(),1);assert.equal(await page.locator('[data-upload-attempt]').count(),1);
  assert.equal(await card.getAttribute('data-processing-status'),'pending');assert.equal(await card.getByLabel('Loading title',{exact:true}).count(),1);
  assert.deepEqual((await state(page)).ids.filter(id=>id===failed.id||id.startsWith('upload-')),[failed.id]);
  await run(page,'resolve','signed',0,{signedUrl:'https://fixture.invalid/retry'});await run(page,'resolve','storage',0,{});
  assert.equal((await state(page)).calls.process[0].body.retry_book_id,failed.id);
  await run(page,'resolve','process',0,{jobId:'same-book-retry',bookId:failed.id});await closeUpload(page);
  const ready={...failed,processing_status:'ready'};await run(page,'server',[ready,...original]);
  await run(page,'resolve','job',0,{state:'completed',book:ready,result:{bookId:failed.id,chapterCount:2},order_confirmed:true});await settled(page);
  assert.equal(await card.count(),1);assert.equal(await card.getAttribute('data-processing-status'),'ready');
  assert.equal(await toasts(page).getByText('Book ready',{exact:true}).count(),1);
  await run(page,'invalidate');await page.reload();await bookCard(page,failed.id).locator('a[href="/reader/failed-retry"]').first().waitFor();
  assert.equal(await bookCard(page,failed.id).count(),1);assert.equal(await page.locator('[data-upload-problem]').count(),0);
 });
 for(const canonicalDuplicate of [false,true])await testcase(`registered replacement gets new ID in one slot and ${canonicalDuplicate?'canonical dedup':'ready replacement'} survives reload`,async()=>{
  const failed=item('failed-replaced',{title:'Old failed title',processing_status:'error'});
  const page=await fixture([failed,...original]);await bookCard(page,failed.id).getByRole('button',{name:'Upload again',exact:true}).click();
  await page.locator('input[type=file]').setInputFiles({name:'transport-only-not-title.epub',mimeType:'application/epub+zip',buffer:Buffer.from('PK synthetic')});
  await page.getByRole('button',{name:'Upload',exact:true}).click();await page.waitForFunction(()=>window.calls.signed.length===1);
  await page.evaluate(()=>{window.retrySlot=document.querySelector('[data-upload-attempt]')});
  assert.equal(await bookCard(page,failed.id).count(),1);assert.equal(await page.locator('[data-upload-attempt]').count(),1);
  await run(page,'resolve','signed',0,{signedUrl:'https://fixture.invalid/replacement'});await run(page,'resolve','storage',0,{});
  assert.equal((await state(page)).calls.process[0].body.retry_book_id,failed.id);
  const pending=item('replacement-pending',{title:'',author:null,metadata_ready:false,processing_status:'processing'});
  await run(page,'server',[pending,...original]);await run(page,'resolve','process',0,{jobId:'replacement-job',bookId:pending.id});await closeUpload(page);await settled(page);
  const replacement=bookCard(page,pending.id);assert.equal(await replacement.count(),1);assert.equal(await bookCard(page,failed.id).count(),0);
  assert.equal(await page.locator('[data-upload-attempt]').count(),1);
  assert.equal(await page.evaluate(()=>window.retrySlot===document.querySelector('[data-upload-attempt]')),true,'Replacement must retain its existing grid slot');
  assert.equal(await replacement.getByLabel('Loading title',{exact:true}).count(),1);
  assert.equal((await replacement.innerText()).includes('transport-only-not-title.epub'),false);
  assert.equal((await replacement.innerText()).includes('Old failed title'),false);
  const ready=canonicalDuplicate?original[0]:{...pending,title:'New parsed work',author:'Parsed author',metadata_ready:true,processing_status:'ready'};
  await run(page,'server',canonicalDuplicate?original:[ready,...original]);
  await run(page,'resolve','job',0,{state:'completed',book:ready,result:{bookId:ready.id,chapterCount:2},order_confirmed:true});await settled(page);
  assert.equal(await bookCard(page,ready.id).count(),1);assert.equal(await bookCard(page,failed.id).count(),0);
  if(canonicalDuplicate)assert.equal(await replacement.count(),0);
  assert.equal((await state(page)).ids.length,canonicalDuplicate?2:3);
  await run(page,'invalidate');await page.reload();await bookCard(page,ready.id).locator(`a[href="/reader/${ready.id}"]`).first().waitFor();
  assert.equal(await bookCard(page,failed.id).count(),0);assert.equal(await bookCard(page,ready.id).count(),1);
  assert.equal(await page.locator('[data-upload-problem]').count(),0);
 });
 await testcase('409 retry refusal retains original ID and requires a fresh successful reconciliation before another explicit retry',async()=>{
  const failed=item('retry-conflict',{title:'Failed conflict target',processing_status:'error'});
  const page=await fixture([failed,...original]);await bookCard(page,failed.id).getByRole('button',{name:'Upload again',exact:true}).click();
  await page.locator('input[type=file]').setInputFiles({name:'conflict.epub',mimeType:'application/epub+zip',buffer:Buffer.from('PK synthetic')});await page.getByRole('button',{name:'Upload',exact:true}).click();
  await run(page,'resolve','signed',0,{signedUrl:'https://fixture.invalid/conflict'});await run(page,'resolve','storage',0,{});
  await run(page,'resolve','process',0,{httpStatus:409,error:'Retry target changed. Refresh your library.'});await closeUpload(page);await settled(page);
  assert.equal(await bookCard(page,failed.id).count(),1);assert.equal((await state(page)).calls.job.length,0);
  await bookCard(page,failed.id).getByRole('button',{name:'Review upload',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Upload Book'});await run(page,'hold',true);await dialog.getByRole('button',{name:'Refresh library',exact:true}).click();
  await page.waitForFunction(()=>window.calls.library.some(c=>!c.settled));const index=(await state(page)).calls.library.findIndex(c=>!c.settled);
  await run(page,'reject','library',index,'Synthetic fresh check failed');await settled(page);
  assert.equal(await dialog.getByRole('button',{name:'Upload again',exact:true}).isDisabled(),true);assert.equal((await state(page)).calls.process.length,1);
  await run(page,'hold',false);await dialog.getByRole('button',{name:'Refresh library',exact:true}).click();await settled(page);
  await dialog.getByRole('button',{name:'Upload again',exact:true}).click();
  await dialog.locator('input[type=file]').setInputFiles({name:'conflict-retry.epub',mimeType:'application/epub+zip',buffer:Buffer.from('PK synthetic')});await dialog.getByRole('button',{name:'Upload',exact:true}).click();
  await run(page,'resolve','signed',1,{signedUrl:'https://fixture.invalid/conflict-again'});await run(page,'resolve','storage',1,{});
  assert.equal((await state(page)).calls.process[1].body.retry_book_id,failed.id);
  assert.equal(await page.locator('[data-upload-attempt]').count(),1);assert.equal(await bookCard(page,failed.id).count(),1);
 });
 await testcase('same manual status failure reappears after the previous toast expired without another upload',async()=>{
  const page=await fixture();await begin(page);await queued(page);await closeUpload(page);
  await run(page,'reject','job',0,'Synthetic repeated status failure');await settled(page);
  assert.equal(await toasts(page).getByText('Unable to confirm book readiness',{exact:true}).count(),1);
  await page.mouse.move(0,0);await page.clock.runFor(11000);await run(page,'flush');
  assert.equal(await toasts(page).count(),0);
  await page.locator('[data-upload-attempt]').getByRole('button',{name:'Check status',exact:true}).click();
  await page.waitForFunction(()=>window.calls.job.length===2);await run(page,'reject','job',1,'Synthetic repeated status failure');await settled(page);
  assert.equal(await toasts(page).getByText('Unable to confirm book readiness',{exact:true}).count(),1);
  assert.equal((await state(page)).calls.process.length,1);assert.equal((await state(page)).calls.storage.length,1);
 });
 await testcase('403 offers access-specific toast and Refresh action, not a same-job polling loop',async()=>{
  const page=await fixture();await begin(page);await queued(page);await closeUpload(page);
  await run(page,'resolve','job',0,{httpStatus:403,message:'Forbidden'});await settled(page);
  assert.equal(await toasts(page).getByText('You do not have access to this book',{exact:true}).count(),1);
  assert.equal(await toasts(page).getByRole('button',{name:'Check status',exact:true}).count(),0);
  const before=(await state(page)).calls.library.length;await toasts(page).getByRole('button',{name:'Refresh',exact:true}).click();await settled(page);
  assert.ok((await state(page)).calls.library.length>before);assert.equal((await state(page)).calls.job.length,1);
 });
 await testcase('lost receipt action says Review upload and opens reconciliation before any reupload',async()=>{
  const page=await fixture();await begin(page);await run(page,'resolve','signed',0,{signedUrl:'https://fixture.invalid/receipt'});await run(page,'resolve','storage',0,{});await closeUpload(page);
  await run(page,'reject','process',0,'Synthetic lost receipt');await settled(page);
  await toasts(page).getByRole('button',{name:'Review upload',exact:true}).click();await settled(page);
  const dialog=page.getByRole('dialog',{name:'Upload Book'});assert.equal(await dialog.count(),1);
  assert.equal(await dialog.getByRole('button',{name:'Upload again',exact:true}).isDisabled(),true);
  assert.equal(await dialog.getByText(/The earlier upload may still appear/).count(),1);
  assert.equal((await state(page)).calls.process.length,1);assert.equal((await state(page)).calls.job.length,0);
 });
 for(const overlay of ['delete','sort'])await testcase(`background upload failure waits for ${overlay} dialog and is shown after closing`,async()=>{
  const page=await fixture();if(overlay==='sort')await page.setViewportSize({width:390,height:844});
  await begin(page);await queued(page);await closeUpload(page);
  if(overlay==='delete'){
   const card=bookCard(page,'old-a');await card.hover();await card.getByRole('button',{name:'Book actions',exact:true}).click();await settled(page);
   await card.getByRole('button',{name:'Delete',exact:true}).click();
  }else await page.getByRole('button',{name:'Sort',exact:true}).click();
  await page.getByRole('dialog').waitFor();await run(page,'reject','job',0,'Synthetic delayed error');await settled(page);
  assert.equal(await toasts(page).count(),0);
  await page.getByRole('dialog').getByRole('button',{name:overlay==='delete'?'Cancel':'Close dialog',exact:true}).click();await settled(page);
  assert.equal(await toasts(page).getByText('Unable to confirm book readiness',{exact:true}).count(),1);
  assert.equal((await state(page)).calls.process.length,1);
 });
 await testcase('completion before the initial manifest uses neutral Book available without guessing duplicate membership',async()=>{
  const page=await fixture(original,true);await begin(page);await queued(page);await closeUpload(page);
  await run(page,'resolve','job',0,{state:'completed',book:original[0],result:{bookId:'old-a',chapterCount:1},order_confirmed:true});await settled(page);
  assert.equal(await toasts(page).getByText('Book available',{exact:true}).count(),1);
  assert.equal(await toasts(page).getByText('Book ready',{exact:true}).count(),0);
  assert.equal(await toasts(page).getByText('Book already in your library',{exact:true}).count(),0);
 });
 for(const recoveredState of ['error','ready','processing','missing'])await testcase(`lost retry receipt reconciles ${recoveredState} target before allowing another file`,async()=>{
  const failed=item('retry-receipt',{title:'Failed retry target',processing_status:'error'});
  const page=await fixture([failed,...original]);await bookCard(page,failed.id).getByRole('button',{name:'Upload again',exact:true}).click();
  await page.locator('input[type=file]').setInputFiles({name:'retry.epub',mimeType:'application/epub+zip',buffer:Buffer.from('PK synthetic')});
  await page.getByRole('button',{name:'Upload',exact:true}).click();
  await run(page,'resolve','signed',0,{signedUrl:'https://fixture.invalid/lost-retry'});await run(page,'resolve','storage',0,{});await closeUpload(page);
  await run(page,'reject','process',0,'Synthetic retry receipt lost');await settled(page);
  await bookCard(page,failed.id).getByRole('button',{name:'Review upload',exact:true}).click();
  await run(page,'server',recoveredState==='missing'?original:[{...failed,processing_status:recoveredState},...original]);
  const dialog=page.getByRole('dialog',{name:'Upload Book'});await dialog.getByRole('button',{name:'Refresh library',exact:true}).click();await settled(page);
  if(recoveredState==='ready'||recoveredState==='processing'){
   assert.equal(await dialog.getByRole('button',{name:'Upload again',exact:true}).count(),0);
   await dialog.getByRole('button',{name:'Back to library',exact:true}).click();
   assert.equal((await state(page)).calls.process.length,1);
  }else{
   await dialog.getByRole('button',{name:'Upload again',exact:true}).click();
   await dialog.locator('input[type=file]').setInputFiles({name:'retry-again.epub',mimeType:'application/epub+zip',buffer:Buffer.from('PK synthetic')});
   await dialog.getByRole('button',{name:'Upload',exact:true}).click();
   assert.equal(await page.locator('[data-upload-attempt]').count(),1,'Prior local attempt must be replaced, not duplicated');
   await run(page,'resolve','signed',1,{signedUrl:'https://fixture.invalid/lost-retry-again'});await run(page,'resolve','storage',1,{});
   assert.equal((await state(page)).calls.process[1].body.retry_book_id,recoveredState==='error'?failed.id:undefined);
  }
 });
 await testcase('accepted ready index retires a status warning deferred behind Sort before it can be announced',async()=>{
  const page=await fixture();await page.setViewportSize({width:390,height:844});await begin(page);await queued(page);await closeUpload(page);
  const pending=item('pending',{title:'Recovered while sorting',processing_status:'processing'});await run(page,'server',[pending,...original]);
  await run(page,'resolve','job',0,{state:'active',book:pending,progress:50});await page.getByRole('button',{name:'Sort',exact:true}).click();await poll(page);
  await run(page,'reject','job',1,'Synthetic deferred stale failure');await settled(page);assert.equal(await toasts(page).count(),0);
  await run(page,'server',[{...pending,processing_status:'ready'},...original]);await run(page,'invalidate');await run(page,'revalidate');await settled(page);
  await bookCard(page,'pending').locator('a[href="/reader/pending"]').first().waitFor();
  await page.getByRole('dialog').getByRole('button',{name:'Close dialog',exact:true}).click();await settled(page);
  assert.equal(await toasts(page).getByText('Unable to confirm book readiness',{exact:true}).count(),0);
  assert.equal(await bookCard(page,'pending').locator('[data-upload-problem]').count(),0);
 });
 await testcase('failed receipt reconciliation never enables explicit reupload from stale cached books',async()=>{
  const page=await fixture();await begin(page);await run(page,'resolve','signed',0,{signedUrl:'https://fixture.invalid/reconcile-failure'});await run(page,'resolve','storage',0,{});
  await run(page,'reject','process',0,'Synthetic lost process response');await settled(page);
  const dialog=page.getByRole('dialog',{name:'Upload Book'});await run(page,'hold',true);
  await dialog.getByRole('button',{name:'Refresh library',exact:true}).click();
  await page.waitForFunction(()=>window.calls.library.some(c=>!c.settled));const index=(await state(page)).calls.library.findIndex(c=>!c.settled);
  await run(page,'reject','library',index,'Synthetic reconciliation unavailable');await settled(page);
  assert.equal(await dialog.getByRole('button',{name:'Upload again',exact:true}).isDisabled(),true);
  assert.equal(await dialog.getByRole('button',{name:'Back to library',exact:true}).count(),0);
  assert.equal((await state(page)).calls.process.length,1);
 });
 await testcase('retry ready receipt without DTO remains readable if the following manifest fails',async()=>{
  const failed=item('retry-no-dto',{title:'Existing failed metadata',processing_status:'error'});
  const page=await fixture([failed,...original]);await bookCard(page,failed.id).getByRole('button',{name:'Upload again',exact:true}).click();
  await page.locator('input[type=file]').setInputFiles({name:'retry-no-dto.epub',mimeType:'application/epub+zip',buffer:Buffer.from('PK synthetic')});await page.getByRole('button',{name:'Upload',exact:true}).click();
  await queued(page,failed.id);await closeUpload(page);await run(page,'hold',true);
  await run(page,'resolve','job',0,{state:'completed',book:null,result:{bookId:failed.id,chapterCount:2},order_confirmed:true});
  await page.waitForFunction(()=>window.calls.library.some(c=>!c.settled));const index=(await state(page)).calls.library.findIndex(c=>!c.settled);
  await run(page,'reject','library',index,'Synthetic manifest unavailable after ready');await settled(page);
  assert.equal(await bookCard(page,failed.id).getAttribute('data-processing-status'),'ready');
  assert.equal(await bookCard(page,failed.id).locator('a[href="/reader/retry-no-dto"]').count()>0,true);
  assert.equal(await bookCard(page,failed.id).locator('[data-upload-problem]').count(),0);
 });
 if(screenshots)for(const mode of ['light','dark'])for(const scenario of ['unknown','ready-order'])await testcase(`mobile screenshot ${scenario} ${mode} 390x844`,async()=>{
  const page=await fixture(original,false,mode);await begin(page);await queued(page);
  const preview=item('pending',{title:scenario==='unknown'?'A Book in Progress':'The Synthetic Library',author:'Sample Author',last_read_at:'2026-10-01T12:00:00Z',processing_status:scenario==='unknown'?'processing':'ready',...(scenario==='ready-order'?{cover}: {})});
  await run(page,'server',[preview,...original]);await run(page,'resolve','job',0,{state:'active',progress:90,book:preview});
  if(scenario==='ready-order'){
   await page.waitForFunction(()=>window.calls.cover.length===1);
   await run(page,'resolve','cover',0,'<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360"><rect width="240" height="360" fill="#244943"/><rect x="14" y="14" width="212" height="332" fill="none" stroke="#eadbc1"/><text x="120" y="105" fill="#eadbc1" text-anchor="middle" font-family="serif" font-size="25">THE SYNTHETIC</text><text x="120" y="142" fill="#eadbc1" text-anchor="middle" font-family="serif" font-size="34">LIBRARY</text><text x="120" y="295" fill="#eadbc1" text-anchor="middle" font-family="serif" font-size="18">Sample Author</text></svg>');
   await bookCard(page,'pending').locator('img').waitFor();
  }
  await closeUpload(page);await page.evaluate(()=>window.scrollTo(0,0));await poll(page);
  if(scenario==='unknown')await run(page,'reject','job',1,'Synthetic connection lost');
  else{
   await run(page,'hold',true);await run(page,'resolve','job',1,{state:'completed',book:preview,result:{bookId:'pending',chapterCount:2},order_confirmed:false});
   await page.waitForFunction(()=>window.calls.library.some(c=>!c.settled));const index=(await state(page)).calls.library.findIndex(c=>!c.settled);await run(page,'reject','library',index,'Synthetic library unavailable');
  }
  await page.clock.runFor(500);await run(page,'flush');await page.evaluate(()=>window.scrollTo(0,0));await settled(page);
  await page.screenshot({path:`${screenshotDir}/${scenario}-${mode}-390.png`,animations:'disabled'});
  const metrics=await page.evaluate(()=>{
   const rect=node=>{if(!node)return null;const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
   const toast=document.querySelector('[data-sonner-toast]:not([data-removed="true"])');const problem=document.querySelector('[data-book-id="pending"] .border-dashed');
   return {viewport:{width:innerWidth,height:innerHeight},scrollWidth:document.documentElement.scrollWidth,theme:document.documentElement.dataset.themeMode,toast:rect(toast),navigation:rect(document.querySelector('nav')),problem:rect(problem),problemStyle:problem?{background:getComputedStyle(problem).backgroundColor,border:getComputedStyle(problem).borderStyle}:null};
  });
  await writeFile(`${screenshotDir}/${scenario}-${mode}-390.json`,JSON.stringify(metrics,null,2)+'\n');
  assert.equal(metrics.scrollWidth<=390,true,'Horizontal page overflow');
  if(scenario==='unknown'){
   assert.equal(!!metrics.toast,true,'Status recovery toast must be visible in capture');
   assert.equal(metrics.toast.right<=390&&metrics.toast.x>=0,true,'Toast overflows viewport');
   assert.equal(metrics.toast.bottom<=metrics.navigation.y,true,'Toast overlaps bottom navigation');
  }else assert.equal(metrics.toast,null,'Order failure uses only the page banner');
 });
 console.log(JSON.stringify({fixtureOnly:true,actualPage:true,actualSonner:true,results},null,2));
 if(results.some(result=>result.status==='FAIL'))process.exitCode=1;
} finally {clearTimeout(deadline);await browser.close()}
