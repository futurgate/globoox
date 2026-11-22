import { expect, test } from '@playwright/test';

const bookId = '30000000-0000-4000-8000-000000000001';
const blockId = '40000000-0000-4000-8000-000000000001';
const itemId = '50000000-0000-4000-8000-000000000001';

for (const role of ['admin', 'author']) {
  test(role + ' can edit, reset, recover from a save error and reopen the formatted decision', async ({ page }) => {
    let saved = 'На берегу';
    let fail = true;
    const writes: string[] = [];
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/studio/translation-access') return route.fulfill({ json: { canStartTranslation: true } });
      if (path === '/api/translation-workspace') return route.fulfill({ json: { userId: 'owner', role, series: [], books: [
        { id: bookId, title: 'Своя книга', sourceLanguage: 'RU', processingStatus: 'ready' },
      ] } });
      if (path.endsWith('/review-block')) return route.fulfill({ json: { id: blockId, original: 'На побережье', translated: saved } });
      if (path.endsWith('/reader-check-journal')) return route.fulfill({ json: { items: [{
        id: itemId, blockId, chapterTitle: 'Глава первая', before: 'Берег', after: saved, outcome: writes.length ? 'fixed' : 'proposed',
      }] } });
      if (path.endsWith('/reader-check-apply')) {
        const body = route.request().postDataJSON();
        expect(body.action).toBe('approve');
        if (fail) { fail = false; return route.fulfill({ status: 503, json: { message: 'Попробуйте ещё раз.' } }); }
        saved = String(body.editedText);
        writes.push(saved);
        return route.fulfill({ json: { ok: true } });
      }
      return route.fulfill({ json: {} });
    });
    await page.goto((process.env.E2E_BASE_URL ?? 'http://localhost:3000') + '/studio/books/' + bookId + '/translations/EN/review');
    await page.getByText('Глава первая · На рассмотрении').click();
    const field = page.getByRole('textbox', { name: 'Предложение' });
    await expect(field).toHaveText('На берегу');
    await expect(page.getByText('На побережье')).toBeVisible();
    await field.fill('черновик');
    await page.getByRole('button', { name: 'Сбросить изменения' }).click();
    await expect(field).toHaveText('На берегу');
    await field.fill('*буквально*');
    await field.press('ControlOrMeta+a');
    await page.getByRole('button', { name: 'Полужирный', exact: true }).click();
    await expect(field.locator('strong')).toHaveText('*буквально*');
    await page.getByRole('button', { name: 'Применить свой вариант' }).click();
    await expect(page.getByText('Попробуйте ещё раз.', { exact: true })).toBeVisible();
    await expect(field.locator('strong')).toHaveText('*буквально*');
    await page.getByRole('button', { name: 'Применить свой вариант' }).click();
    await expect.poll(() => writes.length).toBe(1);
    await page.getByText('Глава первая · Применено').click();
    await expect(field.locator('strong')).toHaveText('*буквально*');
    await expect(field).toHaveText('*буквально*');
  });
}
