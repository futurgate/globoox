import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { WorkspaceData } from '../src/lib/translationWorkspaceTypes';

const origin = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const project = '10000000-0000-4000-8000-000000000001';
const series = '20000000-0000-4000-8000-000000000001';
const first = '30000000-0000-4000-8000-000000000001';
const second = '30000000-0000-4000-8000-000000000002';
const runId = '40000000-0000-4000-8000-000000000001';
const projectUrl = origin + '/studio/projects/' + project;
const bookUrl = '/studio/books/' + first + '/translations/EN';
const at = '2026-11-22T08:00:00Z';
const snapshot = Buffer.from('PK\x03\x04synthetic-run-EPUB');
const stage = { status: 'done', attempt: 1, startedAt: at, finishedAt: at, done: 2, total: 2 };

async function mockRun(page: Page, role: WorkspaceData['role'], historic: boolean) {
  const api: string[] = [];
  const workspace: WorkspaceData = {
    role, userId: 'owner', projects: [{ id: project, name: 'Проект Атласа' }],
    series: [{ id: series, name: 'Атлас островов', genre: 'litrpg', direction: 'RU->EN', ownerVerified: true }],
    books: [first, second].map((id, index) => ({ id, title: ['Первый остров', 'Второй остров'][index],
      author: null, sourceLanguage: 'RU', processingStatus: 'ready', volumeNumber: index + 1, seriesId: series, projectId: project })),
  };
  const stages = { glossary: stage, translate: stage };
  await page.route('**/api/**', async route => {
    const { pathname, searchParams } = new URL(route.request().url());
    api.push(pathname + (pathname.endsWith('/run-artifact') && searchParams.has('metadata') ? '?metadata' : ''));
    expect(route.request().method()).toBe('GET');
    if (pathname === '/api/translation-workspace') return route.fulfill({ json: workspace });
    if (pathname === '/api/studio/project-runs') {
      expect(searchParams.get('projectId')).toBe(project);
      return route.fulfill({ json: { nextCursor: null, groups: [{
        groupId: 'command', createdAt: at, operation: 'series', seriesName: 'Атлас островов', projectName: 'Проект Атласа',
        projectInferred: historic, lang: 'EN', status: 'done', totalVolumes: 2, doneVolumes: 2, usageComplete: true, costUsd: 0.42,
        volumes: workspace.books.map((book, i) => ({ runId: i === 0 ? runId : '40000000-0000-4000-8000-000000000002',
          bookId: book.id, title: book.title, volumeNumber: book.volumeNumber, lang: 'EN', status: 'done', activeStage: null,
          stages, costUsd: 0.21, usageComplete: true, progress: historic ? null : { done: 2, total: 2, updatedAt: at } })),
      }] } });
    }
    if (pathname === '/api/studio/run-timeline') {
      expect(searchParams.get('runId')).toBe(runId);
      const event = { id: 'event', at, kind: historic ? 'stage_done' : 'chapter_done', stage: 'translate', attempt: 1,
        chapterNumber: historic ? null : 2, done: historic ? null : 2, total: historic ? null : 2, reason: null };
      return route.fulfill({ json: { runId, bookId: first, lang: 'EN', operation: 'series', createdAt: at, status: 'done',
        stages, hasChapterEvents: !historic, events: [event], nextCursor: null, costUsd: 0.21, usageComplete: true,
        ...(role === 'admin' ? { tokensIn: 101, tokensOut: 52 } : {}) } });
    }
    if (pathname === '/api/studio/run-artifact') {
      expect(searchParams.get('runId')).toBe(runId);
      if (searchParams.get('metadata') === '1') return route.fulfill({ json: historic
        ? { status: 'unavailable', filename: null, sizeBytes: null }
        : { status: 'ready', filename: 'Первый остров EN.epub', sizeBytes: snapshot.length } });
      expect(historic).toBe(false);
      return route.fulfill({ contentType: 'application/epub+zip', body: snapshot });
    }
    return route.fulfill({ status: 404, json: { message: 'Unexpected request in isolated Studio fixture' } });
  });
  return api;
}

async function openVolume(page: Page) {
  await page.goto(projectUrl);
  await page.getByRole('navigation', { name: 'Разделы проекта' }).getByRole('link', { name: 'Запуски' }).click();
  const runs = page.getByRole('table', { name: 'История запусков проекта' });
  await expect(runs.getByText('Готово томов в проекте: 2 из 2')).toBeVisible();
  await runs.getByRole('button', { name: 'Атлас островов' }).click();
  await expect(runs.getByRole('link', { name: /Том 2 · Второй остров/ })).toBeVisible();
  await runs.getByRole('link', { name: /Том 1 · Первый остров/ }).click();
  await expect(page).toHaveURL(origin + bookUrl + '/runs/' + runId);
  await expect(page.getByRole('heading', { name: 'Журнал запуска' })).toBeVisible();
}

test('project command expands into volumes and downloads the EPUB saved for that run', async ({ page }) => {
  const requests = await mockRun(page, 'admin', false);
  await openVolume(page);
  await expect(page.getByText('Глава готова · глава 2')).toBeVisible();
  await expect(page.getByText(/Токены · вход 101 · выход 52/)).toBeVisible();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать EPUB этого запуска' }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe('Первый остров EN.epub');
  expect(await readFile((await download.path())!)).toEqual(snapshot);
  expect(requests).toContain('/api/studio/run-artifact');
  expect(requests.some(path => path.includes('download-translated'))).toBe(false);
});

test('author opens a historical project run and sees only its recorded history and current-edition link', async ({ page }) => {
  const requests = await mockRun(page, 'author', true);
  await openVolume(page);
  await expect(page.getByText(/Событий по главам в журнале нет/)).toBeVisible();
  await expect(page.getByText('Отдельный EPUB этого запуска не сохранён.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Текущее издание и обложка' })).toHaveAttribute('href', bookUrl + '/editions');
  await expect(page.getByRole('button', { name: 'Скачать EPUB этого запуска' })).toHaveCount(0);
  await expect(page.getByText(/Токены · вход/)).toHaveCount(0);
  expect(requests.some(path => path.startsWith('/api/admin/') || path === '/api/studio/recipe-run')).toBe(false);
});
