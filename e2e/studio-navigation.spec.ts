import { expect, test, type Page } from '@playwright/test';

const origin = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const studio = origin + '/studio';
const catalog = '/api/translation-workspace';

function workspace(userId: string, title: string) {
  return {
    userId, role: 'author', series: [],
    books: [{ id: 'book', title, author: null, sourceLanguage: 'RU', processingStatus: 'error', seriesId: null, volumeNumber: null }],
  };
}

test('direct book entry, breadcrumbs, sidebar and history share one catalog and shell', async ({ page }) => {
  let catalogRequests = 0;
  let documentRequests = 0;
  const title = 'Северный архив';
  page.on('request', request => {
    if (request.resourceType() === 'document' && request.frame() === page.mainFrame()) documentRequests++;
  });
  await page.route('**' + catalog, route => {
    catalogRequests++;
    return route.fulfill({ json: workspace('first-owner', title) });
  });
  await page.goto(studio + '/books/book');
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toHaveText(title);
  const sidebar = page.locator('.pt-sidebar');
  const originalSidebar = await sidebar.elementHandle();
  expect(originalSidebar).toBeTruthy();
  const checkShell = async () => {
    expect(await sidebar.evaluate((node, original) => node === original, originalSidebar)).toBe(true);
    expect(documentRequests).toBe(1);
    expect(catalogRequests).toBe(1);
  };

  await page.getByRole('navigation', { name: 'Путь навигации' }).getByRole('link', { name: 'Мои проекты' }).click();
  await expect(heading).toHaveText('Мои проекты');
  await checkShell();

  await sidebar.getByRole('link', { name: 'Требуют решения' }).click();
  await expect(heading).toHaveText('Требуют решения');
  await expect(sidebar.getByRole('link', { name: 'Требуют решения' })).toHaveAttribute('aria-current', 'page');
  await checkShell();

  await page.goBack();
  await expect(heading).toHaveText('Мои проекты');
  await page.goBack();
  await expect(heading).toHaveText(title);
  await page.goForward();
  await expect(heading).toHaveText('Мои проекты');
  await page.getByRole('link', { name: new RegExp(title) }).click();
  await expect(heading).toHaveText(title);
  await checkShell();
});

test('returning to projects restores its filter and preserves unrelated URL parameters', async ({ page }) => {
  let catalogRequests = 0;
  const data = workspace('first-owner', 'Северный архив');
  data.books.push({ ...data.books[0], id: 'other', title: 'Берег ветров' });
  await page.route('**' + catalog, route => {
    catalogRequests++;
    return route.fulfill({ json: data });
  });
  await page.goto(studio + '/projects?from=library');
  const search = page.getByRole('searchbox');
  await search.pressSequentially('архив');
  await expect(search).toHaveValue('архив');
  await expect(page.getByRole('link', { name: /Берег ветров/ })).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('from')).toBe('library');
  const filteredUrl = page.url();
  await page.getByRole('link', { name: /Северный архив/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Северный архив');
  await page.goBack();
  await expect(page).toHaveURL(filteredUrl);
  await expect(search).toHaveValue('архив');
  await search.fill('');
  await expect(page).toHaveURL(studio + '/projects?from=library');
  await expect(page.getByRole('link', { name: /Берег ветров/ })).toBeVisible();
  expect(catalogRequests).toBe(1);
});

test('sign-in preserves the deep link and its parameters', async ({ page }) => {
  const target = '/studio/settings/templates/glossary?variant=new&from=library';
  await page.route('**' + catalog, route => route.fulfill({ status: 401 }));
  await page.goto(origin + target);
  const login = page.getByRole('link', { name: 'Войти в Globoox' });
  await expect(login).toHaveAttribute('href', '/auth?next=' + encodeURIComponent(target));
});

async function notifyAccount(page: Page, id?: string) {
  await page.evaluate(id => {
    const name = document.documentElement.dataset.testAuthChannel;
    if (!name) throw new Error('Missing Supabase auth channel');
    const peer = new BroadcastChannel(name);
    peer.postMessage(id ? { event: 'SIGNED_IN', session: { user: { id } } } : { event: 'SIGNED_OUT', session: null });
    peer.close();
  }, id);
}

test('an account switch clears the old catalog before loading its replacement', async ({ page }) => {
  // Exercise the same cross-tab notification that the Supabase browser client receives on sign-in.
  await page.addInitScript(() => {
    window.BroadcastChannel = class extends BroadcastChannel {
      constructor(name: string) {
        super(name);
        if (name.startsWith('sb-') && name.endsWith('-auth-token')) document.documentElement.dataset.testAuthChannel = name;
      }
    };
  });
  let owner = 'first-owner';
  const nextOwner = Promise.withResolvers<void>();
  await page.route('**' + catalog, async route => {
    if (owner === 'second-owner') await nextOwner.promise;
    await route.fulfill({ json: workspace(owner, owner === 'first-owner' ? 'Первая книга' : 'Вторая книга') });
  });
  await page.goto(studio + '/projects');
  await expect(page.getByRole('link', { name: /Первая книга/ })).toBeVisible();

  owner = 'second-owner';
  await notifyAccount(page, owner);
  await expect(page.getByRole('status')).toHaveText('Загружаем ваши проекты…');
  await expect(page.getByRole('link', { name: /Первая книга/ })).toHaveCount(0);
  nextOwner.resolve();
  await expect(page.getByRole('link', { name: /Вторая книга/ })).toBeVisible();
  await notifyAccount(page);
  await expect(page.getByRole('link', { name: 'Войти в Globoox' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Вторая книга/ })).toHaveCount(0);
});
