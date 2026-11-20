import { expect, test } from '@playwright/test';

const origin = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

for (const width of [390, 1360]) {
  test(`book detail header and language picker at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${origin}/prototype/admin`);
    const header = page.locator('main header');
    await expect(header.getByRole('heading', { name: 'Переводы книг' })).toBeVisible();
    const collectionHeight = await header.evaluate(el => el.getBoundingClientRect().height);

    await page.getByRole('button', { name: /^Берег ветров Анна Волкова/ }).click();
    await expect(header.getByRole('heading', { name: 'Берег ветров' })).toBeVisible();
    expect(await header.evaluate(el => el.getBoundingClientRect().height)).toBeLessThan(collectionHeight);

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

    await header.getByRole('button', { name: 'К книгам' }).click();
    await expect(header.getByRole('heading', { name: 'Переводы книг' })).toBeVisible();
  });
}
