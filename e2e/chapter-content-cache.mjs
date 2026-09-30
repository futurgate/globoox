// Runs the actual content cache against native IndexedDB in a synthetic local origin.
import { build } from 'esbuild'

export async function buildChapterCacheHarness({ cacheSource, negativeControl = false } = {}) {
  const source = `
    import {setCachedChapterContent as save,getCachedChapterContent as load,setCachedTranslatedBlockText as translate,clearEntireContentCache as clear,isCacheFresh} from './src/lib/contentCache';
    const DB='globoox-content-prefetch-fixture',fill={fillMissing:true};
    const block=(id,text,ready=true)=>({id,position:id==='b'?1:0,type:'paragraph',text,targetLangReady:ready,isTranslated:ready,is_pending:!ready});
    let now=1000;const realNow=Date.now;Date.now=()=>now;
    const equal=(actual,expected,message)=>{if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error(message+' Actual='+JSON.stringify(actual)+' Expected='+JSON.stringify(expected))};
    const assert=(condition,message)=>{if(!condition)throw Error(message)};
    async function snapshot(){
      return new Promise((resolve,reject)=>{
        const opening=indexedDB.open(DB,9);opening.onerror=()=>reject(opening.error);
        opening.onsuccess=()=>{const db=opening.result,tx=db.transaction(['chapter_skeleton','block_text'],'readonly');
          const skeletons=tx.objectStore('chapter_skeleton').getAll(),texts=tx.objectStore('block_text').getAll();
          tx.oncomplete=()=>{db.close();resolve({skeletons:skeletons.result,texts:texts.result})};tx.onerror=()=>{db.close();reject(tx.error)};
        };
      });
    }
    async function run(){
      const result={environment:'native IndexedDB; synthetic localhost database only',negativeControl:${negativeControl},passed:[],observations:[]};
      const test=async(name,body)=>{await clear();now=1000;await body();result.passed.push(name)};
      try{
        if(${negativeControl}){
          await test('unguarded late background overwrites ready text and renews freshness',async()=>{
            await save('chapter','EN',[block('a','new foreground')]);const before=await snapshot();
            now=2000;await save('chapter','EN',[block('a','old batch')],fill);const after=await snapshot();
            equal((await load('chapter','EN')).blocks[0].text,'old batch','baseline must reproduce persisted overwrite');
            equal(after.skeletons[0].fetchedAt,2000,'baseline renewed freshness');
            result.observations.push({before,after});
          });
          return result;
        }
        await test('foreground then late prefetch preserves entire skeleton, ready text and freshness',async()=>{
          await save('chapter','EN',[block('a','new foreground')]);const before=await snapshot();
          now=2000;await save('chapter','EN',[{...block('a','old batch'),position:9}],fill);
          equal(await snapshot(),before,'late batch must not change existing records');
          now=601001;assert(!isCacheFresh(await load('chapter','EN')),'late prefetch must not extend foreground TTL');
        });
        await test('prefetch then foreground preserves normal authoritative replacement',async()=>{
          await save('chapter','EN',[block('a','old batch')],fill);now=2000;
          await save('chapter','EN',[{...block('a','new foreground'),position:9}]);
          const stored=await snapshot();equal(stored.skeletons[0].blocks[0].position,9,'foreground replaced skeleton');
          equal(stored.skeletons[0].fetchedAt,2000,'foreground renewed its freshness');
          equal((await load('chapter','EN')).blocks[0].text,'new foreground','foreground replaced text');
        });
        for(const first of ['foreground','prefetch']){
          await test('concurrent overlapping transactions finish correctly when '+first+' starts first',async()=>{
            const foreground=()=>save('chapter','EN',[block('a','foreground')]);
            const prefetch=()=>save('chapter','EN',[block('a','prefetch')],fill);
            await Promise.all(first==='foreground'?[foreground(),prefetch()]:[prefetch(),foreground()]);
            equal((await load('chapter','EN')).blocks[0].text,'foreground','serialized readwrite transactions preserve foreground');
          });
        }
        await test('prefetch fills missing block text and language without replacing existing values',async()=>{
          await save('chapter','EN',[block('a','English A'),block('b','untranslated B',false)]);
          const before=await snapshot();now=2000;
          await save('chapter','en',[block('a','obsolete A'),block('b','English B')],fill);
          await save('chapter','RU',[block('a','Russian A'),block('b','Russian B')],fill);
          equal((await snapshot()).skeletons,before.skeletons,'warming another language must not replace shared skeleton/freshness');
          equal((await load('chapter','EN')).blocks.map(b=>b.text),['English A','English B'],'fill only missing English text');
          equal((await load('chapter','ru')).blocks.map(b=>b.text),['Russian A','Russian B'],'fill requested normalized language');
        });
        await test('untranslated late prefetch cannot remove ready text or regress derived ready flags',async()=>{
          await save('chapter','EN',[block('a','ready')]);const before=await snapshot();now=2000;
          await save('chapter','EN',[block('a','untranslated',false)],fill);
          equal(await snapshot(),before,'pending response writes nothing over ready cache');
          const cached=await load('chapter','EN');assert(!cached.hasPending&&cached.blocks[0].targetLangReady&&!cached.blocks[0].is_pending,'ready flags retained');
        });
        await test('streamed translation still replaces text and survives late prefetch',async()=>{
          await save('chapter','RU',[block('a','not translated',false)],fill);now=2000;
          await translate('chapter','ru',block('a','streamed translation'));const before=await snapshot();now=3000;
          await save('chapter','RU',[block('a','older ready translation')],fill);
          equal(await snapshot(),before,'late prefetch cannot replace streamed translation or freshness');
          now=4000;await translate('chapter','RU',block('a','updated translation'));
          equal((await load('chapter','RU')).blocks[0].text,'updated translation','streamed replacement remains unchanged');
        });
        await test('malformed background value is best-effort and rolls back all writes',async()=>{
          await save('chapter','EN',[block('a','fallback A',false),block('b','fallback B',false)]);const before=await snapshot();
          await save('chapter','EN',[block('a','valid missing text'),block('b',()=>{})],fill);
          equal(await snapshot(),before,'DataCloneError must not leave partial cache changes');
          await save('chapter','EN',[block('a','recovered A'),block('b','recovered B')],fill);
          equal((await load('chapter','EN')).blocks.map(b=>b.text),['recovered A','recovered B'],'later valid writes work after failure');
        });
        await test('native transaction abort is best-effort, atomic, and allows a later retry',async()=>{
          await save('chapter','EN',[block('a','fallback A',false),block('b','fallback B',false)]);const before=await snapshot();
          const original=IDBObjectStore.prototype.put;let aborted=false;
          IDBObjectStore.prototype.put=function(...args){const request=original.apply(this,args);if(!aborted&&this.name==='block_text'){aborted=true;const tx=this.transaction;request.addEventListener('success',()=>tx.abort(),{once:true})}return request};
          try{await save('chapter','EN',[block('a','A'),block('b','B')],fill)}finally{IDBObjectStore.prototype.put=original}
          assert(aborted,'test must abort a real write transaction');equal(await snapshot(),before,'aborted transaction leaves no partial text');
          await save('chapter','EN',[block('a','A'),block('b','B')],fill);
          equal((await load('chapter','EN')).blocks.map(b=>b.text),['A','B'],'storage recovers after transaction abort');
        });
        return result;
      }finally{Date.now=realNow;await clear()}
    }
    const button=document.getElementById('run'),output=document.getElementById('result');
    button.addEventListener('click',async()=>{button.disabled=true;output.textContent='Running native IndexedDB tests';
      try{const result=await run();output.textContent=JSON.stringify({success:true,...result},null,2)}
      catch(error){output.textContent=JSON.stringify({success:false,error:String(error),stack:error.stack},null,2)}
      finally{button.disabled=false}
    });
  `
  const bundled = await build({
    stdin: { contents: source, resolveDir: process.cwd(), sourcefile: 'chapterCacheHarness.js', loader: 'js' },
    bundle: true, write: false, platform: 'browser', format: 'iife',
    plugins: [{ name: 'isolated-native-cache', setup(builder) {
      builder.onLoad({ filter: /\/contentCache\.ts$/ }, async args => {
        const { readFile } = await import('node:fs/promises')
        const actual = cacheSource ?? await readFile(args.path, 'utf8')
        return { contents: actual.replace("const DB_NAME = 'globoox-cache'", "const DB_NAME = 'globoox-content-prefetch-fixture'"), loader: 'ts', resolveDir: process.cwd() }
      })
    } }],
  })
  return bundled.outputFiles[0].text
}
