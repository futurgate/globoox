import { expect, test, type Locator } from '@playwright/test';

const origin = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

async function checkBreadcrumbs(header: Locator, title: string, ancestors: string[]) {
  const trail = header.getByRole('navigation', { name: 'Путь навигации' });
  const heading = header.getByRole('heading', { level: 1, name: title, exact: true });
  await expect(heading).toBeVisible();
  await expect(trail.getByRole('link')).toHaveText(ancestors);
  const trailBottom = await trail.evaluate(el => el.getBoundingClientRect().bottom);
  const headingTop = await heading.evaluate(el => el.getBoundingClientRect().top);
  expect(trailBottom).toBeLessThanOrEqual(headingTop + 1);
  return trail;
}

for (const width of [390, 1360]) {
  test(`book detail header and language picker at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${origin}/prototype/admin`);
    const header = page.locator('main header');
    const heading = header.getByRole('heading', { level: 1 });
    await expect(heading).toHaveText('Переводы книг');
    const collectionFontSize = await heading.evaluate(el => parseFloat(getComputedStyle(el).fontSize));

    await page.getByRole('button', { name: /^Берег ветров Анна Волкова/ }).click();
    const trail = await checkBreadcrumbs(header, 'Берег ветров', ['Переводы книг']);
    const bookFontSize = await heading.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    expect(bookFontSize).toBeLessThan(collectionFontSize);

    const picker = header.getByRole('button', { name: 'Целевой язык книги' });
    await picker.focus();
    await page.keyboard.press('ArrowDown');
    const options = page.getByRole('listbox', { name: 'Целевой язык книги' });
    await expect(options.getByRole('option', { selected: true })).toBeFocused();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/FR$/);
    await expect(picker).toBeFocused();
    await expect(options).toHaveCount(0);

    await trail.getByRole('link', { name: 'Переводы книг' }).click();
    await expect(heading).toHaveText('Переводы книг');
  });

  test(`author can follow the project hierarchy at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${origin}/prototype/author`);
    const header = page.locator('main header');
    await page.getByRole('button', { name: /Хроники Севера/ }).click();
    const overview = await checkBreadcrumbs(header, 'Хроники Севера', ['Мои проекты']);

    await page.getByRole('button', { name: 'Выбрать перевод' }).click();
    const task = await checkBreadcrumbs(header, 'Перевод термина', ['Мои проекты', 'Хроники Севера']);
    await task.getByRole('link', { name: 'Хроники Севера' }).click();
    await expect(header.getByRole('heading', { level: 1 })).toHaveText('Хроники Севера');
    await overview.getByRole('link', { name: 'Мои проекты' }).click();
    await expect(header.getByRole('heading', { level: 1 })).toHaveText('Мои проекты');

    await page.goBack();
    await checkBreadcrumbs(header, 'Хроники Севера', ['Мои проекты']);
    await page.goBack();
    await checkBreadcrumbs(header, 'Перевод термина', ['Мои проекты', 'Хроники Севера']);
  });
}
