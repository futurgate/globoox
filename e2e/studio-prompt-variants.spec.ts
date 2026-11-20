import { expect, test, type Page } from '@playwright/test';
import type { ServerPrompt } from '../src/lib/api';

const settings = (process.env.E2E_BASE_URL ?? 'http://localhost:3000') + '/studio/settings';
function template(name: string, group: ServerPrompt['group'], content: string): ServerPrompt {
  return { name, group, label: name, content, shipped: content, overridden: false, updatedAt: null };
}
async function interceptWorkspace(page: Page, owner: () => string) {
  await page.route('**/api/translation-workspace', route => route.fulfill({ json: { userId: owner(), role: 'admin', series: [], books: [] } }));
  await page.route('**/api/admin/models', route => route.fulfill({ json: { models: ['test-model'] } }));
}

test('a personal glossary variant survives reload, stays account-scoped and only publishes after confirmation', async ({ page }) => {
  let owner = 'admin-a';
  await interceptWorkspace(page, () => owner);
  const prompt = template('generate_fiction_glossary_ru_en.txt', 'glossary', 'Terms from {SOURCE_TEXT}');
  let persist = false;
  const writes: string[] = [];
  await page.route('**/api/admin/prompts*', async route => {
    const request = route.request();
    if (request.method() === 'GET') return route.fulfill({ json: { prompts: [prompt] } });
    writes.push(request.method());
    if (request.method() === 'PUT') {
      expect(request.postDataJSON().name).toBe(prompt.name);
      if (persist) { prompt.content = request.postDataJSON().content; prompt.overridden = true; }
    } else if (persist) {
      expect(new URL(request.url()).searchParams.get('name')).toBe(prompt.name);
      prompt.content = prompt.shipped; prompt.overridden = false;
    }
    return route.fulfill({ json: { ok: true } });
  });
  let sampled = '';
  await page.route('**/api/admin/fiction-flow-playground', async route => {
    const payload = route.request().postDataJSON();
    sampled = payload.prompts.glossary;
    expect(payload.enabled.translate).toBe(false);
    await route.fulfill({ contentType: 'application/x-ndjson', body: JSON.stringify({ type: 'done', results: [{ ok: true, glossary: { text: 'Sample result' } }] }) + '\n' });
  });

  await page.goto(settings);
  await page.getByRole('button', { name: 'Добавить вариант' }).click();
  await page.getByRole('link', { name: 'Открыть редактор' }).click();
  const draft = 'Names and places from {SOURCE_TEXT}';
  await page.getByLabel('Название варианта').fill('Имена и места');
  await page.getByLabel('Текст шаблона').fill(draft);
  await page.getByRole('button', { name: 'Сохранить вариант' }).click();
  await expect(page).toHaveURL(/variant=[a-f\d-]{36}$/);
  const link = page.url();
  expect(writes).toEqual([]);
  await page.reload();
  await expect(page.getByLabel('Название варианта')).toHaveValue('Имена и места');
  await expect(page.getByLabel('Текст шаблона')).toHaveValue(draft);
  await page.getByLabel('Фрагмент оригинала').fill('Один короткий фрагмент.');
  await page.getByRole('button', { name: 'Запустить пробу' }).click();
  await expect(page.getByText('Sample result')).toBeVisible();
  expect(sampled).toBe(draft);
  expect(writes).toEqual([]);

  await page.getByLabel('Название варианта').fill('Только имена');
  await page.getByLabel('Текст шаблона').fill('Names from {SOURCE_TEXT}');
  await page.getByRole('button', { name: 'Сохранить вариант' }).click();
  await page.getByRole('button', { name: 'Сделать общим' }).click();
  await page.getByRole('button', { name: 'Отмена' }).click();
  expect(writes).toEqual([]);
  await page.getByRole('button', { name: 'Сделать общим' }).click();
  await page.getByRole('button', { name: 'Применить для всех' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Сервер вернул другой' })).toBeVisible();
  persist = true;
  await page.getByRole('button', { name: 'Сделать общим' }).click();
  await page.getByRole('button', { name: 'Применить для всех' }).click();
  await expect(page.getByText('Общий шаблон обновлён.')).toBeVisible();
  expect(writes).toEqual(['PUT', 'PUT']);
  expect(prompt.content).toBe('Names from {SOURCE_TEXT}');

  owner = 'admin-b';
  await page.goto(link);
  await expect(page.getByText(/нет такого варианта/)).toBeVisible();
  owner = 'admin-a';
  await page.goto(settings);
  await page.getByRole('link', { name: /Только имена/ }).click();
  await page.getByRole('button', { name: 'Удалить вариант' }).click();
  await page.getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(page).toHaveURL(settings);
  await expect(page.getByRole('link', { name: /Только имена/ })).toHaveCount(0);
  expect(writes).toEqual(['PUT', 'PUT']);
  await page.getByRole('link', { name: /Общий шаблон/ }).click();
  await page.getByRole('button', { name: 'Вернуть исходный' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Вернуть исходный' }).click();
  await expect(page.getByLabel('Текст шаблона')).toHaveValue(prompt.shipped);
  expect(writes).toEqual(['PUT', 'PUT', 'DELETE']);
});

test('preview of an FR → RU revision uses the current translate prerequisite with the edited revision', async ({ page }) => {
  await interceptWorkspace(page, () => 'admin-a');
  const revision = template('revise_fiction_x_ru.txt', 'revise', 'Original {DRAFT_NUMBERED}');
  const translate = template('translate_fiction_x_ru.txt', 'translate', 'Translate from EN or FR into RU [N] {SOURCE_TEXT}');
  await page.route('**/api/admin/prompts*', route => route.fulfill({ json: { prompts: [translate, revision] } }));
  await page.route('**/api/admin/fiction-flow-playground', async route => {
    const body = route.request().postDataJSON();
    expect(body).toMatchObject({ sourceLanguage: 'FR', targetLanguage: 'RU', prompts: { translate: translate.content, revision: 'Edited {DRAFT_NUMBERED}' },
      enabled: { glossary: false, translate: true, revision: true, readerCheck: false, correction: false } });
    await route.fulfill({ contentType: 'application/x-ndjson', body: JSON.stringify({ type: 'done', results: [{ ok: true, revision: { finalText: 'Пример' } }] }) + '\n' });
  });
  await page.goto(settings);
  await page.getByRole('button', { name: 'Добавить вариант' }).click();
  await page.getByRole('button', { name: /Этап/ }).click();
  await page.getByRole('option', { name: 'Стилистическая редактура' }).click();
  await page.getByRole('link', { name: 'Открыть редактор' }).click();
  await page.getByLabel('Текст шаблона').fill('Edited {DRAFT_NUMBERED}');
  await page.getByRole('button', { name: /Направление/ }).click();
  await page.getByRole('option', { name: 'FR → RU' }).click();
  await page.getByLabel('Фрагмент оригинала').fill('Quelques mots.');
  await page.getByRole('button', { name: 'Запустить пробу' }).click();
  await expect(page.getByText(/"finalText": "Пример"/)).toBeVisible();
});
