import { expect, test, type Page } from '@playwright/test';
import type { WorkspaceData } from '../src/lib/translationWorkspaceTypes';

const origin = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const collection = origin + '/studio/projects';
const workspace = '**/api/translation-workspace';

function catalog(): WorkspaceData {
  return {
    userId: 'owner', role: 'admin',
    projects: [{ id: 'north', name: 'Хроники Севера', sourceSeriesId: 's' }, { id: 'short', name: 'Сборник' }],
    series: [{ id: 's', name: 'Северная трилогия', genre: 'litrpg', direction: 'RU->EN', ownerVerified: true }],
    books: [{ id: 'first', title: 'Первый снег', author: null, processingStatus: 'error', sourceLanguage: 'RU', volumeNumber: 1, seriesId: 's', projectId: 'north' }],
  };
}

async function serve(page: Page, data: WorkspaceData) {
  await page.route(workspace, route => route.fulfill({ json: data }));
  await page.route(workspace + '/series/s/detail', route => route.fulfill({ json: { id: 's', volumes: [] } }));
  await page.route(workspace + '/projects/books/*', route => {
    expect(route.request().headers()['x-workspace-account']).toBe('owner');
    const book = data.books.find(item => route.request().url().endsWith('/' + item.id))!;
    const { action, projectId } = route.request().postDataJSON();
    if (action === 'move') book.projectId = projectId;
    book.projectArchived = action === 'archive';
    return route.fulfill({ json: { ok: true } });
  });
}

test('a project owns its book list; moving a volume preserves its series and stable URL', async ({ page }) => {
  const data = catalog();
  await serve(page, data);
  await page.goto(collection);
  await page.getByRole('link', { name: /Хроники Севера.*1 книга/ }).click();
  await page.getByText('Прежние серии проекта').click();
  await expect(page.getByRole('link', { name: 'Северная трилогия', exact: true })).toHaveAttribute('href', '/studio/series/s');
  await page.getByRole('button', { name: 'Действия с книгой «Первый снег»' }).click();
  await page.getByRole('button', { name: 'Переместить', exact: true }).click();
  await page.getByRole('button', { name: /Проект назначения/ }).click();
  await page.getByRole('option', { name: 'Сборник' }).click();
  await page.getByRole('button', { name: 'Подтвердить перенос' }).click();
  await expect(page.getByText('В проекте пока нет книг.')).toBeVisible();
  await page.goto(collection + '/short');
  await page.getByRole('link', { name: /Первый снег/ }).click();
  await expect(page).toHaveURL(origin + '/studio/books/first/translations/EN');
  await expect(page.getByRole('navigation', { name: 'На уровень выше' }).getByRole('link', { name: 'Сборник' })).toBeVisible();
  await page.goBack();
  await page.getByRole('button', { name: 'Действия с книгой «Первый снег»' }).click();
  await page.getByRole('button', { name: 'В архив', exact: true }).click();
  await expect(page.getByRole('link', { name: /Первый снег/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Архив книг' }).click();
  await page.getByRole('button', { name: 'Действия с книгой «Первый снег»' }).click();
  await page.getByRole('button', { name: 'Восстановить' }).click();
  await page.getByRole('button', { name: 'К очереди' }).click();
  await page.getByText('Прежние серии проекта').click();
  await page.getByRole('link', { name: 'Северная трилогия', exact: true }).click();
  await expect(page).toHaveURL(origin + '/studio/series/s');
  await expect(page.getByRole('link', { name: /Первый снег/ })).toBeVisible();
});

test('create and rename an empty project, then add an existing book without a duplicate', async ({ page }) => {
  const data = catalog();
  await serve(page, data);
  await page.route(workspace + '/projects', route => {
    const { name, requestId } = route.request().postDataJSON();
    expect(requestId).toMatch(/^[0-9a-f-]{36}$/);
    const added = { id: requestId, name };
    data.projects!.push(added);
    return route.fulfill({ json: added, status: 201 });
  });
  await page.route(workspace + '/projects/*', route => {
    const project = data.projects!.find(p => route.request().url().endsWith('/' + p.id))!;
    project.name = route.request().postDataJSON().name;
    return route.fulfill({ json: project });
  });
  await page.goto(collection);
  await page.getByRole('button', { name: 'Новый проект' }).click();
  await page.getByLabel('Название проекта').fill('Рассказы');
  await page.getByRole('button', { name: 'Создать проект' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Рассказы');
  const projectMenu = page.locator('#studio-page-actions').getByRole('button', { name: 'Действия с проектом' });
  await projectMenu.focus();
  await page.keyboard.press('Enter');
  await expect(projectMenu).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Переименовать' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(projectMenu).toBeFocused();
  await projectMenu.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.getByLabel('Название проекта').fill('Мои рассказы');
  await page.getByRole('button', { name: 'Сохранить' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Мои рассказы');
  await page.getByRole('button', { name: 'Добавить из проекта' }).click();
  await page.getByRole('button', { name: /Книга из другого проекта/ }).click();
  await page.getByRole('option', { name: /Первый снег/ }).click();
  await page.getByRole('button', { name: 'Переместить в этот проект' }).click();
  await expect(page.getByRole('link', { name: /Первый снег/ })).toHaveCount(1);
  expect(data.books).toHaveLength(1);
});

for (const existing of [true, false]) {
  test('single EPUB opens its book after import ' + (existing ? 'into a selected project' : 'into an automatic project'), async ({ page }) => {
    const data = catalog();
    await serve(page, data);
    await page.route('**/api/storage/signed-url', route => {
      const { path } = route.request().postDataJSON();
      expect(path).toMatch(/^studio-owner-.*\.epub$/);
      return route.fulfill({ json: { signedUrl: origin + '/test-storage/book' } });
    });
    await page.route('**/test-storage/book', route => route.fulfill({ status: 200, body: '' }));
    await page.route('**/api/books/process', route => {
      const body = route.request().postDataJSON();
      expect(body.studio).toBe(true);
      expect(body.project_id).toBe(existing ? 'short' : undefined);
      const projectId = existing ? 'short' : 'new';
      if (!existing) data.projects!.push({ id: projectId, name: 'Новая книга' });
      data.books.push({ ...data.books[0], projectId, id: 'imported', title: 'Новая книга', seriesId: null, volumeNumber: null });
      return route.fulfill({ json: { id: 'imported' } });
    });
    await page.goto(collection + (existing ? '/short/upload' : '/new'));
    await page.locator('input[type=file]').setInputFiles({
      name: 'new.epub', mimeType: 'application/epub+zip', buffer: Buffer.from([80, 75, 3, 4]),
    });
    await page.getByRole('button', { name: 'Загрузить', exact: true }).click();
    await expect(page).toHaveURL(origin + '/studio/books/imported');
    await expect(page.getByRole('navigation', { name: 'На уровень выше' }).getByRole('link', { name: existing ? 'Сборник' : 'Новая книга' })).toBeVisible();
  });
}

test('a ZIP creates one project and keeps the separate series overview reachable', async ({ page }) => {
  const data = catalog();
  await serve(page, data);
  await page.route('**/api/storage/signed-url', route => route.fulfill({ json: { signedUrl: origin + '/test-storage/series' } }));
  await page.route('**/test-storage/series', route => route.fulfill({ status: 200, body: '' }));
  await page.route(workspace + '/series/import', route => {
    expect(route.request().postDataJSON().name).toBe('Новый цикл');
    data.projects!.push({ id: 'cycle', name: 'Новый цикл', sourceSeriesId: 'cycle-series' });
    data.series.push({ ...data.series[0], id: 'cycle-series', name: 'Новый цикл' });
    data.books.push({ ...data.books[0], projectId: 'cycle', seriesId: 'cycle-series', id: 'cycle-one', title: 'Том первый' });
    return route.fulfill({ json: { seriesId: 'cycle-series', books: [{ bookId: 'cycle-one', fileName: '1.epub', volumeNumber: 1 }], failures: [] } });
  });
  await page.goto(collection + '/new');
  await page.getByRole('button', { name: /Что загрузить/ }).click();
  await page.getByRole('option', { name: 'Серию в ZIP' }).click();
  await page.getByLabel('Название серии').fill('Новый цикл');
  await page.locator('input[type=file]').setInputFiles({ name: 'cycle.zip', mimeType: 'application/zip', buffer: Buffer.from([80, 75, 3, 4]) });
  await page.getByRole('button', { name: 'Загрузить', exact: true }).click();
  await page.getByRole('link', { name: 'Открыть проект' }).click();
  await expect(page).toHaveURL(collection + '/cycle');
  await expect(page.getByRole('link', { name: /Том первый/ })).toHaveAttribute('href', '/studio/books/cycle-one/translations/EN');
  await page.getByText('Прежние серии проекта').click();
  await expect(page.getByRole('link', { name: 'Новый цикл', exact: true })).toHaveAttribute('href', '/studio/series/cycle-series');
});

test('the project order is the launch order; deselected predecessors only prepare a glossary', async ({ page }) => {
  const data = catalog();
  data.projects![0].orderRevision = 4;
  Object.assign(data.books[0], { processingStatus:'ready', projectPosition:1 });
  data.books.push({ ...data.books[0], id:'second', title:'Второй снег', projectPosition:2 });
  await serve(page,data);
  let submitted = 0;
  const idle = {status:'idle',runId:null,done:null,total:null};
  await page.route('**/api/studio/project-progress?**',route => route.fulfill({json:{
    books:data.books.map(book => ({bookId:book.id,glossary:idle,translate:idle})),
  }}));
  await page.route('**/api/studio/project-run',route => {
    submitted++;
    const {requestId,...body} = route.request().postDataJSON();
    expect(requestId).toMatch(/^[a-f0-9-]{36}$/);
    expect(body).toEqual({projectId:'north',lang:'EN',operation:'translate',bookIds:['second'],order:['first','second']});
    return route.fulfill({json:{groupId:'group',projectId:'north',lang:'EN',runs:[]}});
  });
  await page.goto(collection + '/north');
  await page.getByRole('button',{name:'Действия с книгой «Первый снег»'}).click();
  await expect(page.getByRole('button',{name:'Начать серию'})).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Перевести проект'}).click();
  await page.getByRole('checkbox',{name:/Первый снег/}).uncheck();
  await expect(page.getByText('Только глоссарий для следующих книг')).toBeVisible();
  expect(submitted).toBe(0);
  await page.getByRole('button',{name:'Подтвердить запуск'}).click();
  await expect(page.getByText(/Запуск принят/)).toBeVisible();
  expect(submitted).toBe(1);
});

test('the keyboard grip saves order with the revision that was shown', async ({ page }) => {
  const data = catalog();
  data.projects![0].orderRevision = 2;
  Object.assign(data.books[0], { projectPosition:1 });
  data.books.push({ ...data.books[0], id:'second', title:'Второй снег', projectPosition:2 });
  await serve(page,data);
  await page.route('**/api/studio/project-progress?**',route => route.fulfill({json:{books:[]}}));
  await page.route(workspace+'/projects/north',route => {
    expect(route.request().postDataJSON()).toEqual({action:'reorder',bookIds:['second','first'],expectedRevision:2});
    data.books[0].projectPosition = 2;
    data.books[1].projectPosition = 1;
    data.projects![0].orderRevision = 3;
    return route.fulfill({json:{id:'north',orderRevision:3}});
  });
  await page.goto(collection+'/north');
  await page.getByRole('button',{name:'Изменить порядок'}).click();
  await page.getByRole('button',{name:'Переместить «Второй снег», позиция 2'}).press('ArrowUp');
  await page.getByRole('button',{name:'Выйти из режима'}).click();
  await page.getByRole('button',{name:'Продолжить редактирование'}).click();
  await page.getByRole('button',{name:'Сохранить порядок'}).click();
  await expect(page.getByText('Порядок книг сохранён.')).toBeVisible();
  await expect(page.getByRole('link',{name:'1. Второй снег'})).toBeVisible();
});
