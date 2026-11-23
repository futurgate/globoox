import { expect, test } from '@playwright/test';

test('project glossary previews only, defaults manual edits off and retries the same explicit run', async ({ page }) => {
  const project = '10000000-0000-4000-8000-000000000001';
  const book = '20000000-0000-4000-8000-000000000001';
  const block = '30000000-0000-4000-8000-000000000001';
  const lang = 'EN';
  const version = '2026-11-22T12:00:00Z';
  const docs = { named_entities: [{entity:'Двор', preferred_target:'Courtyard'}] };
  const cases = [
    {bookId:book, bookTitle:'Второй том', chapterId:'ch', chapterTitle:'Глава 2', blockId:block, original:'Во дворе', translation:'In the court', manual:false, fingerprint:'a'.repeat(64)},
    {bookId:book, bookTitle:'Второй том', chapterId:'ch', chapterTitle:'Глава 2', blockId:'manual', original:'Двор пуст', translation:'The court is empty', manual:true, fingerprint:'b'.repeat(64)},
  ];
  const sent: Array<{requestId:string;blocks:Array<{blockId:string;fingerprint:string}>}> = [];
  await page.route('**/api/**', async route => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path === '/api/translation-workspace') return route.fulfill({json:{userId:'owner',role:'author',projects:[{id:project,name:'Серия'}],series:[],
      books:[{id:book,title:'Второй том',projectId:project,sourceLanguage:'RU',volumeNumber:2,processingStatus:'ready'}]}});
    if (path.endsWith('/translation-access')) return route.fulfill({json:{canStartTranslation:true}});
    if (path.endsWith('/project-glossary')) return route.fulfill({json:new URL(req.url()).searchParams.has('source') ?
      {bookId:book,updatedAt:version} : {revision:'project-revision',archived:false,glossary:docs,
        books:[{bookId:book,title:'Второй том',coverage:'included',runId:null}]}});
    if (path.endsWith('/languages')) return route.fulfill({json:{languages:[]}});
    if (path.endsWith('/glossary-usages')) return route.fulfill({json:{total:2,nextOffset:null,updatedAt:version,previousTarget:'Court',items:cases}});
    if (path.endsWith('/glossary-retranslate') && req.method() === 'GET') return route.fulfill({json:{runs:[]}});
    if (path.endsWith('/glossary-retranslate') && req.method() === 'POST') {
      const body = req.postDataJSON();
      sent.push(body);
      if (sent.length === 1) return route.fulfill({status:503,json:{message:'Временно нет связи.'}});
      return route.fulfill({json:{requestId:body.requestId,items:[{...body.blocks[0],status:'applied'}]}});
    }
    throw new Error('Unexpected route: ' + path);
  });
  await page.goto((process.env.E2E_BASE_URL ?? 'http://localhost:3000') + '/studio/projects/' + project);
  await page.getByRole('link',{name:'Глоссарий',exact:true}).click();
  await page.getByRole('button',{name:'Найти употребления в проекте · Двор'}).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Court', {exact:true})).toBeVisible();
  await expect(dialog.getByRole('checkbox').nth(0)).toBeChecked();
  await expect(dialog.getByRole('checkbox').nth(1)).not.toBeChecked();
  expect(sent).toHaveLength(0);
  await dialog.getByRole('button',{name:'Обновить абзацы · 1'}).click();
  await expect(dialog.getByRole('alert')).toHaveText('Временно нет связи.');
  await dialog.getByRole('button',{name:'Проверить и продолжить этот запуск'}).click();
  await expect(dialog.getByText('Обновлён · 1')).toBeVisible();
  expect(sent).toHaveLength(2);
  expect(sent[0].blocks).toEqual([{blockId:block,fingerprint:cases[0].fingerprint}]);
  expect(sent[1]).toEqual(sent[0]);
});
