import { defaultCatalog } from '../src/lib/studioLanguages';
import { expect, test, type Page } from '@playwright/test';

const bookId = '10000000-0000-4000-8000-000000000001';
const base = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const path = '/studio/books/' + bookId + '/translations/EN/glossary';
const row = { entity: 'Двор', preferred_target: 'Court', forms:['Двора'], type: 'place', provenance:'chapter-2' };
const conflict = { kind:'named_entity', source:'Двор', existing_target:'Court', proposed_target:'Courtyard' };
async function fixture(page: Page, invited = true) {
  const data = {
    revision:'2026-11-20T10:00:00Z', writes:0, reads:0,
    doc:{ named_entities:[row], prose_style_profile: {register:'formal'}, conflicts:[conflict] },
  };
  await page.route('**/api/**', async route => {
    const req = route.request();
    const url = new URL(req.url()).pathname;
    if (req.method() === 'GET' && url === '/api/studio/languages') return route.fulfill({json: defaultCatalog});
    if (url === '/api/translation-workspace') return route.fulfill({ json: {userId:'owner',role:'author',series:[],books:[
      {id:bookId,title:'Собственная книга',sourceLanguage:'RU',processingStatus:'ready'},
    ]} });
    if (url.endsWith('/translation-access')) return route.fulfill({json:{canStartTranslation:invited}});
    if (url.endsWith('/glossary-decisions')) return route.fulfill({json:{items:[{
      bookId, title:'Собственная книга', lang:'EN', kind:'named_entity', source:row.entity,
      existing:row.preferred_target, proposed:conflict.proposed_target, chapterIndex:0,
    }]}});
    if (url.endsWith('/generate-glossary')) {
      data.reads++;
      expect(req.method()).toBe('GET');
      return route.fulfill({json:{ state:'done',frozen:false,glossary:data.doc,updatedAt:data.revision }});
    }
    if (url.endsWith('/set-glossary')) {
      const body = req.postDataJSON();
      if (body.expectedUpdatedAt !== data.revision) return route.fulfill({status:409,json:{message:'Версия изменилась.'}});
      data.writes++;
      data.doc = body.glossary;
      data.revision = '2026-11-20T12:00:00Z';
      return route.fulfill({json:{state:'done',frozen:false,glossary:data.doc,updatedAt:data.revision}});
    }
    throw new Error('Unexpected request ' + url);
  });
  return data;
}

test('an invited owner uses one glossary draft across both views and in the full dialog', async ({page}) => {
  const data = await fixture(page);
  await page.goto(base + path);
  const target = page.getByRole('textbox',{name:'Перевод · Двор',exact:true});
  await target.fill('Royal Court');
  await page.getByRole('button',{name:'JSON',exact:true}).click();
  const json = page.getByRole('textbox',{name:'JSON глоссария'});
  const raw = await json.inputValue();
  expect(JSON.parse(raw).named_entities[0].preferred_target).toBe('Royal Court');
  await json.fill(raw + ']');
  await page.getByRole('button',{name:'Таблица',exact:true}).click();
  await expect(page.getByRole('alert').filter({hasText:'Ошибка синтаксиса JSON'})).toContainText('Показана последняя корректная версия');
  await expect(target).toHaveJSProperty('readOnly',true);
  await expect(page.getByRole('button',{name:'Сохранить',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Исправить JSON'}).click();
  await expect(json).toBeFocused();
  await json.fill(raw);
  await page.getByRole('button',{name:'Таблица',exact:true}).click();
  await page.getByRole('button',{name:'Развернуть'}).click();
  await target.fill('King’s Court');
  await page.getByRole('button',{name:'Закрыть глоссарий'}).click();
  await page.getByRole('button',{name:'Продолжить редактирование',exact:true}).click();
  await expect(target).toHaveValue('King’s Court');
  await page.getByRole('button',{name:'Закрыть глоссарий'}).click();
  await page.getByRole('button',{name:'Выйти без сохранения',exact:true}).click();
  await expect(target).toHaveValue('Royal Court');
  await page.getByRole('button',{name:'Сохранить',exact:true}).click();
  await expect(page.getByText('Изменения глоссария сохранены.')).toBeVisible();
  expect(data.writes).toBe(1);
  expect(data.doc.named_entities[0]).toEqual({...row,preferred_target:'Royal Court'});
  expect(data.doc.prose_style_profile).toEqual({register:'formal'});
});

test('a stale save preserves the draft until reset and shows the latest saved value', async ({page}) => {
  const data = await fixture(page);
  await page.goto(base + path);
  const target = page.getByRole('textbox',{name:'Перевод · Двор',exact:true});
  await target.fill('My draft');
  data.revision = '2026-11-21T12:00:00Z';
  data.doc = {...data.doc, named_entities:[{...row,preferred_target:'Other session'}]};
  await page.getByRole('button',{name:'Сохранить',exact:true}).click();
  await expect(page.getByText(/Есть более новая сохранённая версия/)).toBeVisible();
  await expect(target).toHaveValue('My draft');
  await page.getByRole('button',{name:'Сбросить изменения',exact:true}).click();
  await expect(target).toHaveValue('Other session');
  expect(data.writes).toBe(0);
});

test('decisions open the exact term and resolve it in the table', async ({page}) => {
  const data = await fixture(page);
  await page.goto(base + '/studio/decisions');
  await page.getByRole('link',{name:'Выбрать перевод'}).click();
  await expect(page.getByRole('textbox',{name:'Перевод · Двор',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Выбрать «Courtyard»'}).click();
  await page.getByRole('button',{name:'Сохранить',exact:true}).click();
  await expect.poll(() => data.writes).toBe(1);
  expect(data.doc.conflicts).toEqual([]);
});

test('a reader without an invitation does not load the glossary', async ({page}) => {
  const data = await fixture(page,false);
  await page.goto(base + path);
  await expect(page.getByText('Редактирование своих книг доступно приглашённым авторам. Доступ выдаёт администратор.')).toBeVisible();
  expect(data.reads).toBe(0);
});

test('on mobile the table scrolls inside the page and unsaved actions stay visible', async ({page}) => {
  await page.setViewportSize({width:390,height:780});
  await fixture(page);
  await page.goto(base + path);
  const target = page.getByRole('textbox',{name:'Перевод · Двор',exact:true});
  await target.fill('Изменённый перевод');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByRole('button',{name:'Сохранить',exact:true})).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole('button',{name:'Сбросить изменения',exact:true}).click();
  await expect(target).toHaveValue('Court');
});
