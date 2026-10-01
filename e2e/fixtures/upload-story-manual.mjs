// Loopback-only visual controls for the exact actual-page fixture. Never contacts an API.
import { createServer } from 'node:http'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

export async function serveUploadStory({ bundle, account, books, item }) {
  const initial = { account, server: { [account]: books } }
  const controls = `
const parsed=${JSON.stringify(item)};
const original=${JSON.stringify(books)};
const cover={url:'/api/v2/books/manual-upload/cover?version=fixture',version:'fixture',width:240,height:360};
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360"><rect width="240" height="360" fill="#244943"/><rect x="14" y="14" width="212" height="332" fill="none" stroke="#eadbc1"/><text x="120" y="105" fill="#eadbc1" text-anchor="middle" font-family="serif" font-size="25">THE SYNTHETIC</text><text x="120" y="142" fill="#eadbc1" text-anchor="middle" font-family="serif" font-size="34">LIBRARY</text><text x="120" y="295" fill="#eadbc1" text-anchor="middle" font-family="serif" font-size="18">Fixture Author</text></svg>';
const status=document.getElementById('fixture-status');
let current={...parsed,title:'',author:null,cover:null,metadata_ready:false,processing_status:'processing'};
let queued=false;
const wait=async predicate=>{const started=Date.now();while(!predicate()){if(Date.now()-started>7000)throw Error('Start an upload first, or wait for the previous stage');await new Promise(resolve=>setTimeout(resolve,30))}return predicate()};
const nextCall=kind=>wait(()=>window.calls[kind].find(call=>!call.settled&&!call.signal?.aborted));
async function prepare(){
 if(queued||!window.calls.signed.length)return;
 (await nextCall('signed')).resolve({signedUrl:'https://fixture.invalid/upload'});
 (await nextCall('storage')).resolve({});
 (await nextCall('process')).resolve({jobId:'manual-job',bookId:parsed.id});
 await nextCall('job');queued=true;
}
async function stage(phase){
 await prepare();
 current={...current,...(phase==='metadata'?{title:parsed.title,author:parsed.author,metadata_ready:true}:phase==='cover'?{title:parsed.title,author:parsed.author,metadata_ready:true,cover}:{}),processing_status:phase==='ready'?'ready':phase==='error'?'error':'processing'};
 window.check.server([current,...original]);
 if(queued){
  const call=await nextCall('job');
  call.resolve(phase==='ready'?{state:'completed',progress:100,order_confirmed:true,book:current,result:{bookId:current.id,chapterCount:3}}:phase==='error'?{state:'failed',failReason:'Synthetic parse failure',book:current}:{state:'active',progress:phase==='cover'?60:20,book:current});
  if(phase==='ready'||phase==='error')queued=false;
 }else await window.check.revalidate();
 if(phase==='cover') (await nextCall('cover')).resolve(svg);
 status.textContent='Synthetic stage: '+phase;
}
async function start(){
 const previousRequests=window.calls.signed.length;
 const upload=[...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='Upload book');upload.click();
 const input=await wait(()=>document.querySelector('input[type=file]'));
 const data=new DataTransfer();data.items.add(new File(['PK fixture only'],'filename-is-not-the-title.epub',{type:'application/epub+zip'}));input.files=data.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 const submit=await wait(()=>[...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='Upload'&&!button.disabled));
 current={...parsed,title:'',author:null,cover:null,metadata_ready:false,processing_status:'processing'};
 submit.click();await wait(()=>window.calls.signed.length>previousRequests);status.textContent='Upload started. Filename is only in the modal; card metadata is unknown.';
}
for(const button of document.querySelectorAll('[data-fixture-action]'))button.addEventListener('click',async()=>{
 const action=button.dataset.fixtureAction;button.disabled=true;
 try{
  if(action==='start')await start();
  else if(action==='reset'){localStorage.clear();sessionStorage.clear();location.reload()}
  else if(action==='reload'){window.check.server([{...parsed,title:'',author:null,metadata_ready:false,processing_status:'processing'},...original]);location.reload()}
  else await stage(action);
 }catch(error){status.textContent=error.message}finally{button.disabled=false}
});
`
  const server = createServer(async (request, response) => {
    if (request.url === '/fixture.js') { response.writeHead(200, { 'content-type': 'text/javascript' }); response.end(bundle); return }
    if (request.url === '/fixture.css') {
      const dir = path.resolve('.next/static')
      const files = await readdir(dir, { recursive: true }).catch(() => [])
      const styles = await Promise.all(files.filter(file => file.endsWith('.css')).map(file => readFile(path.join(dir, file), 'utf8')))
      response.writeHead(200, { 'content-type': 'text/css' }); response.end(styles.join('\n')); return
    }
    if (request.url !== '/' && request.url !== '/my-books') { response.writeHead(404); response.end(); return }
    response.writeHead(200, { 'content-type': 'text/html' })
    response.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><title>Upload story — synthetic fixture</title></head><body><div id="root"></div>
      <section style="position:fixed;bottom:8px;left:8px;right:8px;z-index:99999;background:#fff;color:#17261e;border:1px solid #84988d;border-radius:12px;padding:10px;box-shadow:0 5px 24px #0003;font:13px system-ui" aria-label="Synthetic fixture controls">
      <strong>Local fixture only · no real upload, model or database</strong><div style="display:flex;flex-wrap:wrap;gap:8px;margin:8px 0">
      ${[['start', 'Start synthetic upload'], ['metadata', 'Metadata'], ['cover', 'Cover'], ['ready', 'Ready'], ['error', 'Error'], ['reload', 'Reload processing'], ['reset', 'Reset fixture']].map(([action, label]) => `<button data-fixture-action="${action}" style="padding:6px 10px;border:1px solid #84988d;border-radius:6px;background:#f5f7f6">${label}</button>`).join('')}
      </div><p id="fixture-status">Start, then Metadata → Cover → Ready. Modal can be closed at any stage.</p></section>
      <script>window.initial=${JSON.stringify(initial)}</script><script type="module">await import('/fixture.js');${controls}</script></body></html>`)
  })
  await new Promise(resolve => server.listen(3137, '127.0.0.1', resolve))
  console.log('Synthetic actual-page upload fixture: http://127.0.0.1:3137/my-books')
}
