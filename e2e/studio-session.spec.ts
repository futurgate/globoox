import { expect, test, type Page, type Request } from '@playwright/test';
import { loadEnvConfig } from '@next/env';

const origin = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const workspaceApi = '/api/translation-workspace';
const readerKey = 'globoox:access_token';
const firstId = '12345678-0123-4123-8123-123456789abc';

const data = (userId: string, admin: boolean) => ({
  userId, role: admin ? 'admin' : 'author', series: [], books: [],
  projects: [{ id: 'current-project', name: admin ? 'Проект редактора' : 'Проект автора' }],
});

function sdkStorageKey() {
  const authUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || loadEnvConfig(process.cwd(), true).combinedEnv.NEXT_PUBLIC_SUPABASE_URL;
  if (!authUrl) throw new Error('The test app needs its Supabase URL');
  return 'sb-' + new URL(authUrl).hostname.split('.')[0] + '-auth-token';
}

async function hasSessionCookie(request: Request, accessToken: string) {
  // These short SDK fixtures fit one cookie. The workspace API accepts a valid
  // same-origin cookie whether the client additionally supplies a bearer or not.
  const prefix = sdkStorageKey() + '=base64-';
  const encoded = (await request.headerValue('cookie'))?.split('; ').find(value => value.startsWith(prefix));
  if (!encoded) return false;
  return JSON.parse(Buffer.from(encoded.slice(prefix.length), 'base64url').toString()).access_token === accessToken;
}

async function isolateLogin(page: Page) {
  // The real login form and SDK run in the browser. Only the local Next app and
  // the explicitly mocked GoTrue / workspace responses receive test requests.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || /^\/(api\/|ingest|monitoring)/.test(url.pathname)) return route.abort();
    return route.continue();
  });
}

test('Studio and its child panels use the signed-in reader session and clear another account on storage changes', async ({ page }) => {
  await isolateLogin(page);
  await page.addInitScript(([key, token]) => localStorage.setItem(key, token), [readerKey, 'reader-first-test-session']);
  const secondRequest = Promise.withResolvers<void>();
  let activityAuthorization = '';
  await page.route('**' + workspaceApi, async route => {
    const bearer = route.request().headers().authorization;
    if (bearer === 'Bearer reader-first-test-session') return route.fulfill({ json: data(firstId, true) });
    if (bearer === 'Bearer reader-second-test-session') {
      await secondRequest.promise;
      return route.fulfill({ json: data('second', false) });
    }
    return route.fulfill({ status: 401, json: { error: 'Requires verified session' } });
  });
  await page.route('**' + workspaceApi + '/activity', route => {
    activityAuthorization = route.request().headers().authorization;
    return route.fulfill({ json: { attention: [], translations: [], attentionAvailable: true, attentionComplete: true, translationsAvailable: true } });
  });
  await page.goto(origin + '/studio');
  await expect(page.getByRole('link', { name: /Проект редактора/ })).toBeVisible();
  const sidebar = page.locator('.pt-sidebar');
  await sidebar.getByRole('link', { name: 'Очередь' }).click();
  await expect.poll(() => activityAuthorization).toBe('Bearer reader-first-test-session');
  await sidebar.getByRole('link', { name: 'Мои проекты' }).click();
  await page.evaluate(key => {
    localStorage.setItem(key, 'reader-second-test-session');
    window.dispatchEvent(new StorageEvent('storage', { key, newValue: 'reader-second-test-session' }));
  }, readerKey);
  await expect(page.getByRole('link', { name: /Проект редактора/ })).toHaveCount(0);
  secondRequest.resolve();
  await expect(page.getByRole('link', { name: /Проект автора/ })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'Очередь' })).toHaveCount(0);
  await page.evaluate(key => {
    localStorage.removeItem(key);
    window.dispatchEvent(new StorageEvent('storage', { key, newValue: null }));
  }, readerKey);
  await expect(page.getByRole('link', { name: 'Войти в Globoox' })).toBeVisible();
});

test('an authenticated cookie opens Studio and its queue while the browser auth lock is held', async ({ page, context }) => {
  await isolateLogin(page);
  const storageKey = sdkStorageKey();
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const session = { access_token: 'test-access', refresh_token: 'test-refresh', expires_at: expiresAt,
    token_type: 'bearer', user: { id: firstId, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} } };
  const value = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url');
  await context.addCookies([{ name: storageKey, value, url: origin }]);
  await page.addInitScript(key => {
    // A competing tab holds the same lock the real SDK needs before emitting INITIAL_SESSION.
    void navigator.locks.request('lock:' + key, () => new Promise<void>(() => {}));
  }, storageKey);
  const cookie = storageKey + '=' + value;
  let queueUsedCookie = false;
  await page.route('**' + workspaceApi, async route => {
    const cookies = (await route.request().headerValue('cookie'))?.split('; ') ?? [];
    if (!cookies.includes(cookie)) return route.fulfill({ status: 401, json: { error: 'Sign in' } });
    return route.fulfill({ json: data(firstId, true) });
  });
  await page.route('**' + workspaceApi + '/activity', async route => {
    queueUsedCookie = ((await route.request().headerValue('cookie'))?.split('; ') ?? []).includes(cookie);
    return route.fulfill({ status: queueUsedCookie ? 200 : 401, json: { attention: [], translations: [], attentionAvailable: true,
      attentionComplete: true, translationsAvailable: true } });
  });
  await page.goto(origin + '/studio');
  await expect(page.getByRole('link', { name: /Проект редактора/ })).toBeVisible();
  await page.locator('.pt-sidebar').getByRole('link', { name: 'Очередь' }).click();
  await expect.poll(() => queueUsedCookie).toBe(true);
});

test('a stalled project request offers a retry that can open the catalog', async ({ page }) => {
  await isolateLogin(page);
  let catalogRequested = false;
  let recovered = false;
  await page.route('**' + workspaceApi, route => {
    catalogRequested = true;
    // Leave the first request pending to model a server that never responds.
    if (recovered) return route.fulfill({ json: data(firstId, true) });
  });
  await page.clock.install();
  await page.goto(origin + '/studio');
  await expect.poll(() => catalogRequested).toBe(true);
  await page.clock.fastForward('01:00');
  const retry = page.getByRole('button', { name: 'Попробовать снова' });
  await expect(retry).toBeVisible();
  recovered = true;
  await retry.click();
  await expect(page.getByRole('link', { name: /Проект редактора/ })).toBeVisible();
});

test('password login returns to the Studio deep link with the durable Supabase session', async ({ page }) => {
  await isolateLogin(page);
  await page.addInitScript(key => localStorage.setItem(key, 'older-reader-session'), readerKey);
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = [encode({ alg: 'HS256', typ: 'JWT' }), encode({ sub: firstId, iat: now, exp: expiry, role: 'authenticated', aud: 'authenticated' }), 'test'].join('.');
  const testUser = { id: firstId, aud: 'authenticated', role: 'authenticated', email: 'studio@example.test', created_at: '2020-01-01T00:00:00Z',
    app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {} };
  const session = {
    access_token: token, refresh_token: 'local-test-refresh', token_type: 'bearer', expires_in: 3600, expires_at: expiry, user: testUser,
  };
  let admin = true;
  let activityAuthenticated = false;
  await page.route('**/auth/v1/token?grant_type=password', route => route.fulfill({ json: session }));
  await page.route('**' + workspaceApi + '/activity', async route => {
    activityAuthenticated = await hasSessionCookie(route.request(), token);
    expect(route.request().headers().authorization).not.toBe('Bearer older-reader-session');
    return route.fulfill({ json: { attention: [], translations: [], attentionAvailable: true, attentionComplete: true, translationsAvailable: true } });
  });
  await page.route('**/auth/v1/user', route => route.request().headers().authorization === 'Bearer ' + token
    ? route.fulfill({ json: testUser })
    : route.fulfill({ status: 401, json: { message: 'Expired reader credential' } }));
  await page.route('**' + workspaceApi, async route => {
    expect(route.request().headers().authorization).not.toBe('Bearer older-reader-session');
    if (!await hasSessionCookie(route.request(), token)) return route.fulfill({ status: 401, json: { error: 'Missing session' } });
    return route.fulfill({ json: data(firstId, admin) });
  });
  await page.goto(origin + '/auth?next=%2Fstudio%2Fprojects');
  await page.getByLabel('Email', { exact: true }).fill('studio@example.test');
  await page.getByLabel('Password', { exact: true }).fill('local-test-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(origin + '/studio/projects');
  await expect(page.getByRole('link', { name: /Проект редактора/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link', { name: /Проект редактора/ })).toBeVisible();
  await page.goto(origin + '/auth?next=%2Fstudio%2Fprojects');
  await expect(page).toHaveURL(origin + '/studio/projects');
  await expect(page.getByRole('link', { name: /Проект редактора/ })).toBeVisible();
  const sidebar = page.locator('.pt-sidebar');
  await sidebar.getByRole('link', { name: 'Очередь' }).click();
  await expect.poll(() => activityAuthenticated).toBe(true);
  admin = false;
  await page.evaluate(session => {
    const match = document.cookie.match(/(?:^|;\s*)(sb-[^=;]+?-auth-token)(?:\.\d+)?=/);
    if (!match) throw new Error('SDK session cookie missing');
    const peer = new BroadcastChannel(match[1]);
    peer.postMessage({ event: 'TOKEN_REFRESHED', session });
    peer.close();
  }, session);
  await expect(sidebar.getByRole('link', { name: 'Очередь' })).toHaveCount(0);
});

test('Studio renews an old reader session and keeps its account after a reload', async ({ page }) => {
  await isolateLogin(page);
  const storageKey = sdkStorageKey();
  const now = Math.floor(Date.now() / 1000);
  const encode = (part: object) => Buffer.from(JSON.stringify(part)).toString('base64url');
  const jwt = (exp: number) => [encode({ alg: 'HS256', typ: 'JWT' }),
    encode({ sub: firstId, exp, iat: now - 7200, aud: 'authenticated', role: 'authenticated' }), 'dGVzdA'].join('.');
  const oldToken = jwt(now - 300);
  const freshToken = jwt(now + 3600);
  const user = { id: firstId, aud: 'authenticated', role: 'authenticated', email: 'studio@example.test',
    created_at: '2020-01-01T00:00:00Z', app_metadata: {}, user_metadata: {} };
  const session = { access_token: freshToken, refresh_token: 'rotated-test-refresh', token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, user };
  await page.addInitScript(({ storageKey, oldToken, user }) => {
    if (sessionStorage.getItem('legacy-seeded')) return;
    sessionStorage.setItem('legacy-seeded', '1');
    localStorage.setItem(storageKey, JSON.stringify({ access_token: oldToken, refresh_token: 'old-test-refresh', user }));
    localStorage.setItem('globoox:access_token', oldToken);
  }, { storageKey, oldToken, user });
  let refreshCount = 0;
  await page.route('**/auth/v1/token?grant_type=refresh_token', route => {
    expect(route.request().postDataJSON().refresh_token).toBe('old-test-refresh');
    refreshCount++;
    return route.fulfill({ json: session });
  });
  await page.route('**/auth/v1/user', route => route.fulfill({ json: user }));
  await page.route('**' + workspaceApi, async route => {
    const authorized = await hasSessionCookie(route.request(), freshToken) || route.request().headers().authorization === 'Bearer ' + freshToken;
    return authorized ? route.fulfill({ json: data(firstId, false) })
      : route.fulfill({ status: 401, json: { error: 'Expired session' } });
  });
  await page.goto(origin + '/studio');
  await expect(page.getByRole('link', { name: /Проект автора/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link', { name: /Проект автора/ })).toBeVisible();
  expect(refreshCount).toBe(1);
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull();
});

test('Studio does not renew a different saved account when the reader session is rejected', async ({ page }) => {
  await isolateLogin(page);
  await page.addInitScript(key => {
    localStorage.setItem('globoox:access_token', 'reader-account');
    localStorage.setItem(key, JSON.stringify({ access_token: 'other-account', refresh_token: 'other-account-refresh' }));
    localStorage.setItem('sb-another-project-auth-token', JSON.stringify({ access_token: 'different-project' }));
  }, sdkStorageKey());
  let renewed = false;
  await page.route('**/auth/v1/token?grant_type=refresh_token', route => { renewed = true; return route.abort(); });
  await page.route('**' + workspaceApi, route => {
    expect(route.request().headers().authorization).toBe('Bearer reader-account');
    return route.fulfill({ status: 401, json: { error: 'Expired session' } });
  });
  await page.goto(origin + '/studio');
  await expect(page.getByRole('link', { name: 'Войти в Globoox' })).toBeVisible();
  expect(renewed).toBe(false);
});

test('a bookmarked Studio login accepts the valid reader bearer before it has an SDK cookie', async ({ page }) => {
  await isolateLogin(page);
  await page.addInitScript(key => localStorage.setItem(key, 'active-legacy-reader'), readerKey);
  await page.route('**/auth/v1/user', route => {
    expect(route.request().headers().authorization).toBe('Bearer active-legacy-reader');
    return route.fulfill({ json:{ id:firstId, aud:'authenticated', email:'reader@example.test', user_metadata:{}, app_metadata:{} } });
  });
  await page.route('**' + workspaceApi, route => route.fulfill({ json: data(firstId, false) }));
  await page.goto(origin + '/auth?next=%2Fstudio');
  await expect(page).toHaveURL(origin + '/studio');
  await expect(page.getByRole('link', { name:/Проект автора/ })).toBeVisible();
});
