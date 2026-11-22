import { expect, test, type Page, type Route } from '@playwright/test';
import type { ServerPrompt } from '../src/lib/api';
import type { PersonalPrompt } from '../src/lib/translationPromptVariants';

const settings = (process.env.E2E_BASE_URL ?? 'http://localhost:3000') + '/studio/settings';
function template(name: string, group: ServerPrompt['group'], content: string): ServerPrompt {
  return { name, group, label: name, content, shipped: content, overridden: false, updatedAt: null };
}
const glossary = template('generate_fiction_glossary_ru_en.txt', 'glossary', 'Terms from {SOURCE_TEXT}');
const alice = 'admin-a', bob = 'admin-b';
type Library = Record<string, PersonalPrompt[]>;

async function intercept(page: Page, owner: string, library: Library, prompts: ServerPrompt[] = [glossary]) {
  await page.route('**/api/translation-workspace', route => route.fulfill({ json: { userId: owner, role:'admin', series:[], books:[] } }));
  await page.route('**/api/admin/models', route => route.fulfill({ json: { models:['test-model'] } }));
  await page.route('**/api/admin/prompts*', route => {
    expect(route.request().method()).toBe('GET'); // The studio cannot change the global default.
    return route.fulfill({ json:{prompts} });
  });
  await page.route('**/api/admin/personal-prompts**', async route => {
    const req = route.request(), method = req.method(), variants = library[owner] ??= [];
    if (method === 'GET') return route.fulfill({ json:{variants} });
    const body = req.postDataJSON();
    expect(req.headers()['x-workspace-account']).toBe(owner);
    expect(body.ownerId).toBeUndefined();
    const id = method === 'POST' ? body.id : new URL(req.url()).pathname.split('/').pop();
    let item = variants.find(v => v.id === id);
    if (method === 'POST' && !item) {
      item = {id, template:body.template, label:body.label, content:body.content, active:body.activate, revision:1, deletedAt:null};
      variants.push(item!);
    } else if (method === 'PATCH' && item) {
      if (body.revision !== item.revision) return route.fulfill({ status:409,json:{message:'Конфликт версий'} });
      if (body.label !== undefined) item.label = body.label;
      if (body.content !== undefined) item.content = body.content;
      if (body.active !== undefined) item.active = body.active;
      if (body.deleted !== undefined) { item.deletedAt = body.deleted ? new Date().toISOString() : null; item.active = false; }
      item.revision++;
    }
    expect(item).toBeTruthy();
    if (item!.active) {
      for (const other of variants.filter(v => v.id !== id && v.template === item!.template && v.active)) { other.active = false; other.revision++; }
    }
    return route.fulfill({json:{variant:item}});
  });
}

test('copy uses the current text, reports clipboard states and resets without changing the draft', async ({ page }) => {
  const writes: string[] = [];
  let complete: () => void;
  let deny: () => void;
  await page.exposeFunction('writeTestClipboard', (text: string) => {
    writes.push(text);
    return new Promise<void>((resolve, reject) => {
      complete = resolve;
      deny = () => reject(new Error('Permission denied'));
    });
  });
  await page.addInitScript(() => {
    const bridge = window as unknown as {writeTestClipboard: (text: string) => Promise<void>};
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: (text: string) => bridge.writeTestClipboard(text) } });
  });
  await intercept(page, alice, {});
  await page.goto(settings + '/templates/' + glossary.name);
  const templateField = page.getByRole('textbox', { name: 'Текст шаблона' });
  const copy = templateField.locator('..').getByRole('button');
  await expect(templateField).toHaveJSProperty('readOnly', true);
  await copy.click();
  await expect.poll(() => writes).toEqual([glossary.content]);
  await expect(copy).toHaveAccessibleName('Копирование…');
  await expect(copy).toBeDisabled();
  complete!();
  await expect(copy).toHaveAccessibleName('Скопировано');
  await expect(copy).toHaveAccessibleName('Скопировать');

  await page.getByRole('link', { name: 'Изменить для себя' }).click();
  const draft = '  Моя правка\n{SOURCE_TEXT}\n';
  await templateField.fill(draft);
  await copy.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => writes.at(-1)).toBe(draft);
  deny!();
  await expect(copy).toHaveAccessibleName(/Не удалось скопировать/);
  await expect(copy).toHaveAccessibleName('Скопировать');
  await expect(templateField).toHaveValue(draft);
  await templateField.fill('');
  await expect(copy).toBeDisabled();
});

async function archive(page: Page) {
  await page.getByRole('button', {name:'Действия с шаблоном'}).click();
  await page.getByRole('button', {name:'Скрыть', exact:true}).click();
  await page.getByRole('dialog').getByRole('button', {name:'Скрыть',exact:true}).click();
  await expect(page).toHaveURL(settings);
}

test('an account prompt works on a second device, survives deletion and restores inactive', async ({ page, browser }) => {
  const library: Library = {};
  await intercept(page,alice,library);
  await page.goto(settings);
  await page.getByRole('link', {name:/Базовый шаблон/}).click();
  await expect(page.getByLabel('Текст шаблона')).toHaveJSProperty('readOnly',true);
  await page.getByRole('link',{name:'Изменить для себя'}).click();
  await page.getByLabel('Название варианта').fill('Имена и места');
  await page.getByLabel('Текст шаблона').fill('Names from {SOURCE_TEXT}');
  await expect(page.getByLabel('Использовать в моих переводах')).toBeChecked();
  await page.getByRole('button',{name:'Сохранить вариант'}).click();
  await expect(page).toHaveURL(/variant=[a-f\d-]{36}$/);
  const link = page.url();
  expect(library[alice][0]).toMatchObject({active:true, content:'Names from {SOURCE_TEXT}'});

  const other = await browser.newContext();
  const second = await other.newPage();
  await intercept(second,alice,library);
  await second.goto(link);
  await expect(second.getByLabel('Название варианта')).toHaveValue('Имена и места');
  await second.getByLabel('Текст шаблона').fill('People from {SOURCE_TEXT}');
  await second.getByRole('button',{name:'Сохранить вариант'}).click();
  await expect(second.getByRole('status').filter({hasText:'Сохранено в аккаунте.'})).toBeVisible();
  await page.getByLabel('Текст шаблона').fill('Stale {SOURCE_TEXT}');
  await page.getByRole('button',{name:'Сохранить вариант'}).click();
  await expect(page.getByText('Конфликт версий')).toBeVisible();
  await expect(page.getByLabel('Текст шаблона')).toHaveValue('Stale {SOURCE_TEXT}');
  await page.getByRole('button',{name:'Загрузить сохранённый текст'}).click();
  await expect(page.getByLabel('Текст шаблона')).toHaveValue('People from {SOURCE_TEXT}');
  await archive(page);
  await expect(page.getByRole('link',{name:/Имена и места/})).toHaveCount(0);
  await expect(page.getByRole('link',{name:/Базовый шаблон/})).toContainText('Используется');
  await page.getByLabel('Показать удалённые').check();
  await page.getByRole('link',{name:/Имена и места.*Удалён/}).click();
  await expect(page.getByLabel('Текст шаблона')).toHaveJSProperty('readOnly',true);
  await page.getByRole('button',{name:'Действия с шаблоном'}).click();
  await page.getByRole('button',{name:'Восстановить',exact:true}).click();
  await expect(page.getByLabel('Использовать в моих переводах')).not.toBeChecked();
  await page.getByLabel('Использовать в моих переводах').check();
  await page.getByRole('button',{name:'Сохранить вариант'}).click();
  await expect(page.getByRole('status').filter({hasText:'Сохранено в аккаунте.'})).toBeVisible();
  await page.goto(settings + '/templates/' + glossary.name);
  await page.getByRole('button',{name:'Использовать базовый в моих переводах'}).click();
  await expect(page.getByRole('status')).toHaveText('Для ваших переводов выбран базовый шаблон.');
  expect(library[alice][0].active).toBe(false);

  const third = await other.newPage();
  await intercept(third,bob,library);
  await third.goto(link);
  await expect(third.getByText(/В этом аккаунте нет такого варианта/)).toBeVisible();
  await other.close();
});

test('an FR → RU preview uses the account translation prompt and the unsaved revision', async ({ page }) => {
  const revision = template('revise_fiction_x_ru.txt','revise','Original {DRAFT_NUMBERED}');
  const translate = template('translate_fiction_x_ru.txt','translate','Translate [N] {SOURCE_TEXT}');
  const personalText = 'Account translator [N] {SOURCE_TEXT}';
  await intercept(page,alice,{[alice]:[{id:'account-translation',template:translate.name,label:'Мой перевод',content:personalText,active:true,deletedAt:null,revision:1}]},[translate,revision]);
  await page.route('**/api/admin/fiction-flow-playground', async route => {
    expect(route.request().postDataJSON()).toMatchObject({sourceLanguage:'FR',targetLanguage:'RU',
      prompts:{translate:personalText, revision:'Edited {DRAFT_NUMBERED}'},enabled:{glossary:false,translate:true,revision:true,readerCheck:false,correction:false}});
    return route.fulfill({contentType:'application/x-ndjson',body:JSON.stringify({type:'done',results:[{ok:true,revision:{finalText:'Пример'}}]})+'\n'});
  });
  await page.goto(settings + '/templates/' + revision.name + '?variant=new');
  await page.getByLabel('Текст шаблона').fill('Edited {DRAFT_NUMBERED}');
  await page.getByRole('button',{name:/Направление/}).click();
  await page.getByRole('option',{name:'FR → RU'}).click();
  await page.getByLabel('Фрагмент оригинала').fill('Quelques mots.');
  await page.getByRole('button',{name:'Запустить пробу'}).click();
  await expect(page.getByText(/"finalText": "Пример"/)).toBeVisible();
});

test('a legacy draft is imported explicitly and keeps its account, link, and inactive state', async ({page}) => {
  const library: Library = {};
  await intercept(page,alice,library);
  await page.goto(settings);
  await expect(page.getByRole('link',{name:/Базовый шаблон/})).toBeVisible();
  const id = '687e212c-9eda-48b7-a69e-49cbe32c6a1c';
  await page.evaluate(async ({id, name, owner}) => {
    const db = await new Promise<IDBDatabase>((resolve,reject) => {
      const req = indexedDB.open('globoox-translation-prompt-variants',1);
      req.onupgradeneeded = () => req.result.createObjectStore('variants',{keyPath:['ownerId','id']}).createIndex('owner','ownerId');
      req.onerror = () => reject(req.error); req.onsuccess = () => resolve(req.result);
    });
    await new Promise<void>((resolve,reject) => {
      const tx = db.transaction('variants','readwrite');
      tx.objectStore('variants').put({id,ownerId:owner,label:'Старый черновик',template:name,content:'My terms {SOURCE_TEXT}',revision:1});
      tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error);
    });
    db.close();
  },{id,name:glossary.name,owner:alice});
  await page.reload();
  await page.getByRole('link',{name:/Старый черновик/}).click();
  expect(library[alice]).toHaveLength(0);
  await expect(page.getByLabel('Использовать в моих переводах')).not.toBeChecked();
  await page.getByRole('button',{name:'Сохранить в аккаунт'}).click();
  await expect(page.getByRole('heading',{name:'Личный вариант'})).toBeVisible();
  expect(library[alice]).toMatchObject([{id,active:false}]);
  await archive(page);
  await page.reload();
  await expect(page.getByRole('link',{name:/Базовый шаблон/})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Черновики на этом устройстве'})).toHaveCount(0);
  expect(library[alice]).toHaveLength(1);
});

test('the default remains readable if the personal prompt server is unavailable', async ({page}) => {
  await intercept(page,alice,{});
  await page.route('**/api/admin/personal-prompts**',(route:Route) => route.fulfill({status:503,json:{message:'temporarily unavailable'}}));
  await page.goto(settings);
  await expect(page.getByText('Сервер личных шаблонов сейчас недоступен.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Добавить вариант'})).toBeDisabled();
  await page.getByRole('link',{name:/Базовый шаблон/}).click();
  await expect(page.getByLabel('Текст шаблона')).toHaveValue(glossary.content);
  await expect(page.getByLabel('Текст шаблона')).toHaveJSProperty('readOnly',true);
  await expect(page.getByRole('link',{name:'Изменить для себя'})).toHaveCount(0);
});

test('the glossary of a book opens the selected account variant for its stage', async ({page}) => {
  const active: PersonalPrompt = { id:'8a13b697-99db-4eae-ba67-a0491d1fbab8',template:glossary.name,label:'Перевод имён',content:'Names {SOURCE_TEXT}',active:true,revision:2,deletedAt:null };
  await intercept(page,alice,{[alice]:[active]});
  const id = '5c16d3d8-7ea0-4c1c-8b00-527bbc11f217';
  await page.route('**/api/translation-workspace',route => route.fulfill({json:{userId:alice,role:'admin',series:[],books:[{id,title:'Моя книга',sourceLanguage:'RU',processingStatus:'ready',seriesId:null}]}}));
  await page.route('**/api/translation-workspace/books/**',route => {
    expect(route.request().method()).toBe('GET');
    return route.fulfill({json:route.request().url().includes('/stage-prompts?')
      ? [{stage:'glossary',name:glossary.name,overridden:false}]
      : {state:'idle',frozen:false,glossary:null}});
  });
  await page.route('**/api/studio/recipe-settings?**', route => {
    expect(new URL(route.request().url()).searchParams.get('scopeId')).toBe(id);
    return route.fulfill({ json: { effective: { glossaryPromptId: active.id } } });
  });
  await page.goto(settings.replace('/settings','/books/'+id+'/translations/EN/glossary'));
  await page.getByText('Шаблон глоссария',{exact:true}).click();
  const link = page.getByRole('link',{name:'Глоссарий',exact:true}).filter({hasNot:page.locator('svg')});
  await expect(page.getByText('Перевод имён',{exact:true})).toBeVisible();
  const selected = link.and(page.locator('[href*="variant="]'));
  await expect(selected).toHaveAttribute('href', '/studio/settings/templates/' + glossary.name + '?variant=' + active.id);
  await selected.click();
  await expect(page.getByLabel('Название варианта')).toHaveValue(active.label);
  await expect(page.getByLabel('Использовать в моих переводах')).toBeChecked();
});
