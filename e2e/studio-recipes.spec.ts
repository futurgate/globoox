import { test, expect, type Page } from '@playwright/test';
import type { RecipeSettings, RecipeValues } from '../src/lib/studioRecipe';

const origin = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const owner = 'b2541f42-e713-46ed-b59e-6e063706d55a';
const books = [
  { id: '81267211-db5a-40ac-985a-e3881b79330a', title: 'Северный архив' },
  { id: '5599e08e-50ea-4635-afdd-84c2bd9017c3', title: 'За туманом' },
];
const flash = 'gemini-2.5-flash';
const hydrogen = 'gemini-4-hydrogen';
const alternate = 'gemini-2.5-pro';
const base: RecipeValues = {
  glossaryModel: flash, translateModel: hydrogen, glossaryPromptId: 'default',
  translatePromptId: 'default', units: 'us', wishes: '',
};

async function mockStudio(page: Page) {
  const settings = new Map<string, { values: RecipeValues; revision: number }>();
  const writes: Array<{ book: string; values: RecipeValues }> = [];
  const quotes: Array<{ book: string; model: string }> = [];
  await page.route('**/api/**', async route => {
    const request = route.request();
    const { pathname, searchParams } = new URL(request.url());
    const reply = (json: unknown) => route.fulfill({ json });
    if (pathname === '/api/translation-workspace') {
      return reply({
        role: 'admin', userId: owner, series: [],
        books: books.map(book => ({ ...book, author: null, processingStatus: 'ready', sourceLanguage: 'RU' })),
      });
    }
    if (pathname === '/api/admin/models') return reply({ models: [flash, hydrogen, alternate] });
    if (pathname === '/api/admin/personal-prompts') return reply({ variants: [] });
    if (pathname === '/api/studio/recipe-runs') return reply({ runs: [], limit: 50 });
    if (pathname === '/api/studio/recipe-settings') {
      const book = searchParams.get('scopeId')!;
      expect(books.map(b => b.id)).toContain(book);
      const saved = settings.get(book) ?? { values: {}, revision: 0 };
      if (request.method() === 'PUT') {
        const body = request.postDataJSON();
        expect(request.headers()['x-workspace-account']).toBe(owner);
        expect(body).toMatchObject({ scope: 'book', scopeId: book, genre: 'litrpg', sourceLang: 'RU', targetLang: 'EN', revision: saved.revision });
        saved.values = body.values;
        saved.revision++;
        writes.push({ book, values: saved.values });
        settings.set(book, saved);
      }
      const response: RecipeSettings = {
        scope: 'book', scopeId: book, genre: 'litrpg', genreSource: saved.revision ? 'book' : 'series',
        sourceLang: 'RU', targetLang: 'EN', revision: saved.revision,
        values: saved.values, inherited: base, effective: { ...base, ...saved.values },
        inheritedSources: { glossaryModel: 'default', translateModel: 'account', units: 'series' },
        sources: { glossaryModel: saved.values.glossaryModel ? 'book' : 'default', translateModel: saved.values.translateModel ? 'book' : 'account' },
        templates: { glossary: 'generate_fiction_glossary_ru_en.txt', translate: 'translate_fiction_ru_en.txt' },
      };
      return reply(response);
    }
    const estimate = pathname.match(/\/books\/([^/]+)\/translation-estimate$/);
    if (estimate) {
      const model = searchParams.get('model') ?? flash;
      quotes.push({ book: estimate[1], model });
      return reply({ model, byLanguage: [{ lang: 'EN', blocksRemaining: 12, cost: { totalUsd: model === hydrogen ? 0.24 : 0.08 } }] });
    }
    // All calls stay in this browser fixture, including status polling.
    return reply({ state: 'idle', chapters: [] });
  });
  return { writes, quotes };
}

test('one book can override its glossary model and revert to its recipe without changing the other book or translation quote', async ({ page }) => {
  const { writes, quotes } = await mockStudio(page);
  async function openBook(index: number) {
    await page.goto(origin + '/studio/books/' + books[index].id + '/translations/EN');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(books[index].title);
    await page.getByText('Модели и шаблоны этапов', { exact: true }).click();
  }
  const glossary = page.getByRole('button', { name: /Модель глоссария/ });
  const translation = page.getByRole('button', { name: /Модель перевода/ });
  const save = page.getByRole('button', { name: 'Сохранить параметры' });
  await openBook(0);
  await expect(glossary).toContainText('По рецепту · ' + flash);
  await expect(translation).toContainText('По рецепту · ' + hydrogen);
  await glossary.click();
  await page.getByRole('option', { name: alternate, exact: true }).click();
  await save.click();
  await expect(page.getByText('Параметры сохранены.')).toBeVisible();
  expect(writes).toEqual([{ book: books[0].id, values: { glossaryModel: alternate } }]);
  await page.getByRole('button', { name: 'Рассчитать', exact: true }).click();
  await expect(page.getByText(new RegExp('осталось блоков: 12 · модель ' + hydrogen))).toBeVisible();
  expect(quotes.at(-1)).toEqual({ book: books[0].id, model: hydrogen });

  await openBook(1);
  await expect(glossary).toContainText('По рецепту · ' + flash);
  await expect(translation).toContainText('По рецепту · ' + hydrogen);
  await openBook(0);
  await expect(glossary).toContainText(alternate);
  await glossary.click();
  await page.getByRole('option', { name: 'По рецепту · ' + flash, exact: true }).click();
  await save.click();
  await expect(page.getByText('Параметры сохранены.')).toBeVisible();
  expect(writes.at(-1)).toEqual({ book: books[0].id, values: {} });

  await translation.click();
  await page.getByRole('option', { name: flash, exact: true }).click();
  await save.click();
  await expect(page.getByText('Параметры сохранены.')).toBeVisible();
  await page.getByRole('button', { name: 'Рассчитать', exact: true }).click();
  await expect(page.getByText(new RegExp('осталось блоков: 12 · модель ' + flash))).toBeVisible();
  expect(quotes.at(-1)).toEqual({ book: books[0].id, model: flash });
});
