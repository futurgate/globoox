import { expect, test } from '@playwright/test';

const origin = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const email = 'writer@example.org';
const owner = 'admin-account';
const grant = { userId: '4cd71074-af62-4535-8819-5dd6a4f702ab', email, grantedAt: '2026-11-22T09:00:00Z' };

test('administrator grants and revokes translation access for an existing account', async ({ page }) => {
  let active = false;
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === '/api/translation-workspace')
      return route.fulfill({ json: { userId:owner, role:'admin', books:[], projects:[], series:[] } });
    if (url.pathname === '/api/studio/translation-access') return route.fulfill({ json:{canStartTranslation:true} });
    if (url.pathname !== '/api/studio/author-grants') throw Error('Unexpected API request ' + url.pathname);
    if (request.method() === 'GET') return route.fulfill({ json: { grants:active ? [grant] : [], nextCursor:null } });
    expect(request.headers()['x-workspace-account']).toBe(owner);
    if (request.method() === 'DELETE') {
      expect(url.searchParams.get('userId')).toBe(grant.userId);
      active = false;
      return route.fulfill({json:{revoked:true}});
    }
    expect(request.method()).toBe('PUT');
    if (request.postDataJSON().email !== email)
      return route.fulfill({status:404,json:{message:'Аккаунт не найден'}});
    active = true;
    return route.fulfill({json:grant});
  });
  await page.goto(origin + '/studio/settings?section=access');
  await expect(page.getByRole('link', { name:'Доступ авторов' })).toHaveAttribute('aria-current','page');
  const input = page.getByRole('textbox', {name:'Email зарегистрированного автора'});
  await expect(page.getByText('Доступ пока никому не выдан.')).toBeVisible();
  await input.fill('unknown@example.org');
  await page.getByRole('button', {name:'Выдать доступ'}).click();
  await expect(page.getByRole('alert').filter({hasText:'Аккаунт не найден'})).toBeVisible();
  await input.fill(email);
  await page.getByRole('button', {name:'Выдать доступ'}).click();
  const revoke = page.getByRole('button', { name:'Отозвать доступ у ' + email });
  await expect(revoke).toBeVisible();
  await page.reload();
  await revoke.click();
  await expect(page.getByText('Доступ отозван у ' + email + '.')).toBeVisible();
  await expect(page.getByText('Доступ пока никому не выдан.')).toBeVisible();
});
