import { expect, test, type Page } from '@playwright/test';
import type { WorkspaceData } from '../src/lib/translationWorkspaceTypes';

const origin = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const book = '30000000-0000-4000-8000-000000000001';
const volume = '30000000-0000-4000-8000-000000000002';
const series = '20000000-0000-4000-8000-000000000001';
const run = '40000000-0000-4000-8000-000000000001';
const bookAction = '/api/translation-workspace/books/' + book + '/run';
const seriesAction = '/api/translation-workspace/series/' + series + '/run';
const workspace: WorkspaceData = {
  userId: '10000000-0000-4000-8000-000000000001', role: 'author',
  series: [{ id: series, name: 'Острова', genre: 'litrpg', direction: 'RU->EN', ownerVerified: true }],
  books: [
    { id: book, title: 'Маяк', seriesId: null, volumeNumber: null },
    { id: volume, title: 'Первый остров', seriesId: series, volumeNumber: 1 },
  ].map(item => ({ ...item, author: null, sourceLanguage: 'RU', processingStatus: 'ready' })),
};

async function mockAccess(page: Page, allowed: boolean) {
  const submissions: { path: string; body: unknown }[] = [];
  const unexpected: string[] = [];
  await page.route('**/api/**', route => {
    const request = route.request();
    const { pathname: path, searchParams } = new URL(request.url());
    const reply = (json: unknown) => route.fulfill({ json });
    const status = { bookId: book, runId: run, lang: 'EN', stage: 'glossary', status: 'queued' };
    if (request.method() === 'GET') {
      if (path === '/api/translation-workspace') return reply(workspace);
      if (path === '/api/studio/translation-access') return reply({ canStartTranslation: allowed });
      if (path === '/api/studio/recipe-settings') return reply({
        ...Object.fromEntries(searchParams), genre: 'litrpg', values: {}, effective: { units: 'keep' },
        inherited: { units: 'keep' }, sources: {}, inheritedSources: {}, templates: {}, revision: 1,
      });
      if (path === '/api/studio/recipe-runs') return reply({ runs: [], limit: 50 });
      if (path.endsWith('/translation-estimate')) return reply({ byLanguage: [] });
      if (path === bookAction && searchParams.get('runId') === run) return reply(status);
    }
    if (request.method() === 'POST' && (path === bookAction || path === seriesAction)) {
      submissions.push({ path, body: request.postDataJSON() });
      if (!allowed) return route.fulfill({ status: 403, json: { message: 'Нет доступа' } });
      return reply(path === bookAction ? status : {
        seriesId: series, enqueued: { bookId: volume, volumeNumber: 1 }, runs: [{ bookId: volume, runId: run }],
      });
    }
    unexpected.push(request.method() + ' ' + path);
    return route.fulfill({ status: 404, json: { message: 'Unexpected Studio fixture request' } });
  });
  return { submissions, unexpected };
}

const launchPages = [
  { kind: 'book', path: '/studio/books/' + book + '/translations/EN', button: 'Запустить перевод книги', action: bookAction },
  { kind: 'series', path: '/studio/series/' + series, button: 'Запустить перевод серии', action: seriesAction },
] as const;

for (const target of launchPages) {
  test('invited author launches their ' + target.kind + ' with the saved recipe', async ({ page }) => {
    const { submissions, unexpected } = await mockAccess(page, true);
    await page.goto(origin + target.path);
    await page.getByRole('button', { name: target.button }).click();
    if (target.kind === 'series') {
      expect(submissions).toHaveLength(0);
      await expect(page.getByText('Томов в запуске · 1. Направление · RU → EN.')).toBeVisible();
      await expect(page.getByRole('button', { name: /Модель .* для запуска/ })).toHaveCount(0);
      await page.getByRole('button', { name: 'Подтвердить запуск' }).click();
    }
    await expect(page.getByText(target.kind === 'book' ? 'В очереди · глоссарий' :
      'Перевод серии принят. Ход работы доступен в истории запусков проекта.')).toBeVisible();
    if (target.kind === 'series') await expect(page.getByRole('button', { name: target.button })).toHaveCount(0);
    const journal = page.getByRole('link', { name: target.kind === 'book' ? 'Ход запуска' : 'Открыть журнал тома' });
    const runBook = target.kind === 'book' ? book : volume;
    await expect(journal).toHaveAttribute('href', '/studio/books/' + runBook + '/translations/EN/runs/' + run);
    expect(submissions).toEqual([{ path: target.action, body: {
      lang: 'EN', studioRun: { requestId: expect.stringMatching(/^[0-9a-f-]{36}$/i) },
    } }]);
    expect(unexpected).toEqual([]);
  });

  test('account without an invitation cannot launch its ' + target.kind, async ({ page }) => {
    const { submissions, unexpected } = await mockAccess(page, false);
    await page.goto(origin + target.path);
    await expect(page.getByText('Доступ к запуску перевода выдаёт администратор.')).toBeVisible();
    await expect(page.getByRole('button', { name: target.button })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Подтвердить запуск' })).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: 'Указания по стилю перевода' })).toBeVisible();
    expect(submissions).toEqual([]);
    expect(unexpected).toEqual([]);
  });
}
