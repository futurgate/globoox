import { expect, test, type Page } from '@playwright/test';

const origin = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const id = '30000000-0000-4000-8000-000000000001';
const edition = origin + '/studio/books/' + id + '/translations/EN/editions';
const coverUrl = '**/api/books/' + id + '/export-cover?lang=EN';
const originalPreview = '/test-cover.png';
const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2ioAAAAASUVORK5CYII=', 'base64');
const book = { id, title: 'Тестовая книга', sourceLanguage: 'RU', processingStatus: 'ready' };
const estimate = { byLanguage: [{ lang: 'EN', blocksTranslated: 12, blocksRemaining: 0 }] };

async function setup(page: Page) {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/translation-workspace') return route.fulfill({ json: { userId: 'owner', role: 'admin', books: [book], series: [] } });
    if (path.endsWith('/translation-estimate')) return route.fulfill({ json: estimate });
    if (path.endsWith('/export-cover')) return route.fulfill({ json: { source: 'none', preview: null } });
    return route.fulfill({ status: 404, json: {} });
  });
}

test('cover reports loading metadata, preview, saving a file and restoring the original', async ({ page }) => {
  await setup(page);
  const read = Promise.withResolvers<void>(), put = Promise.withResolvers<void>(), restore = Promise.withResolvers<void>();
  const thumbnail = Promise.withResolvers<void>();
  await page.route('**' + originalPreview, async route => {
    await thumbnail.promise;
    return route.fulfill({ contentType: 'image/png', body: image });
  });
  await page.route(coverUrl, async route => {
    const method = route.request().method();
    if (method === 'PUT') {
      await put.promise;
      return route.fulfill({ json: { source: 'custom', preview: 'data:image/png;base64,' + image.toString('base64') } });
    }
    if (method === 'GET') await read.promise;
    else { expect(method).toBe('DELETE'); await restore.promise; }
    return route.fulfill({ json: { source: 'original', preview: originalPreview } });
  });
  await page.goto(edition, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Загружаем обложку…')).toBeVisible();
  read.resolve();
  await expect(page.getByText('Загружаем миниатюру…')).toBeVisible();
  thumbnail.resolve();
  await expect(page.getByText('Загружаем миниатюру…')).toHaveCount(0);
  const picker = page.waitForEvent('filechooser');
  await page.getByRole('button', {name: 'Заменить обложку'}).click();
  await (await picker).setFiles({ name: 'cover.png', mimeType: 'image/png', buffer: image });
  await expect(page.getByText('Сохраняем новую обложку…')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Скачать EPUB', exact: true })).toBeDisabled();
  put.resolve();
  await expect(page.getByText('Для этого перевода сохранена своя обложка.')).toBeVisible();
  await page.getByRole('button', {name:'Убрать свою обложку'}).click();
  await expect(page.getByText('Восстанавливаем исходную обложку…')).toBeVisible();
  restore.resolve();
  await expect(page.getByText('Исходная обложка восстановлена.')).toBeVisible();
});

test('edition refresh retains the ready count and shows waiting for quality and EPUB download', async ({ page }) => {
  await setup(page);
  const reload = Promise.withResolvers<void>(), check = Promise.withResolvers<void>(), file = Promise.withResolvers<void>();
  let reads = 0;
  await page.route('**/translation-estimate?lang=EN', async route => {
    if (++reads > 1) await reload.promise;
    return route.fulfill({ json: estimate });
  });
  await page.route('**/translation-quality?lang=EN', async route => {
    await check.promise;
    return route.fulfill({ json: { summary: { errors: 0, review: 0 }, epub: { blocking: [], warnings: [] }, issues: [] } });
  });
  await page.route('**/download-translated?lang=EN', async route => {
    await file.promise;
    return route.fulfill({ contentType: 'application/epub+zip', body: Buffer.from('test-book') });
  });
  await page.goto(edition, { waitUntil: 'domcontentloaded' });
  const ready = page.getByText('Переведено блоков: 12, осталось: 0.');
  await expect(ready).toBeVisible();
  await page.getByRole('button', {name:'Обновить', exact:true}).click();
  await expect(page.getByRole('button',{name:'Обновляем…'})).toBeDisabled();
  await expect(ready).toBeVisible();
  reload.resolve();
  await expect(page.getByRole('button', {name:'Обновить', exact:true})).toBeEnabled();
  const download = page.getByRole('button', {name:'Скачать EPUB', exact:true});
  await page.getByRole('button', {name:'Проверить качество EPUB'}).click();
  await expect(page.getByText('Проверяем текст и структуру EPUB…')).toBeVisible();
  await expect(download).toBeDisabled();
  check.resolve();
  await expect(page.getByRole('heading',{name:'Результат проверки'})).toBeVisible();
  await download.click();
  await expect(page.getByText('Готовим EPUB к скачиванию…')).toBeVisible();
  const downloaded = page.waitForEvent('download');
  file.resolve();
  expect((await downloaded).suggestedFilename()).toBe('Тестовая книга (EN).epub');
  await expect(page.getByText('Скачивание EPUB началось.')).toBeVisible();
});

test('a retry shows that personal templates are being read while the shared template stays visible', async ({ page }) => {
  await setup(page);
  const retry = Promise.withResolvers<void>();
  let reads = 0;
  const name = 'generate_fiction_glossary_ru_en.txt';
  await page.route('**/api/admin/prompts*', route => route.fulfill({ json: { prompts: [
    { name, label: 'Глоссарий', content: 'Тестовый шаблон', shipped: 'Тестовый шаблон', group: 'glossary' },
  ] } }));
  await page.route('**/api/admin/personal-prompts*', async route => {
    if (++reads === 1) return route.fulfill({ status: 403, json: {} });
    await retry.promise;
    return route.fulfill({ json: { variants: [] } });
  });
  await page.goto(origin + '/studio/settings/templates/' + name, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', {name:'Повторить загрузку'}).click();
  await expect(page.getByText('Обновляем шаблоны…')).toBeVisible();
  await expect(page.getByRole('textbox',{name:'Текст шаблона'})).toHaveValue('Тестовый шаблон');
  retry.resolve();
  await expect(page.getByText('Обновляем шаблоны…')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Повторить загрузку'})).toHaveCount(0);
  expect(reads).toBe(2);
});
