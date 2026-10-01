// Actual Sonner + AppToaster fixture. No app server, credentials or network requests.
import { build } from 'esbuild';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const source = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import AppToaster from './src/components/ui/app-toaster';
import * as notifications from './src/lib/notifications';
import { getThemeStyle } from './src/lib/themes';
let scope;
let savedScope;
let actions = 0;
const root = createRoot(document.getElementById('root'));
const render = () => root.render(<><button id="outside">Outside</button><div style={getThemeStyle('forest-dark')}>Reader theme surface</div><AppToaster /></>);
window.check = {
  mount() { Object.entries(getThemeStyle('light')).forEach(([key,value])=>document.documentElement.style.setProperty(key,value)); render(); scope=notifications.setNotificationScope('guest:a::fixture'); },
  theme(theme) { window.__mode=theme.endsWith('dark')?'dark':'light'; Object.entries(getThemeStyle(theme)).forEach(([key,value])=>document.documentElement.style.setProperty(key,value)); render(); },
  notify(operationId='upload',event='ready',action=true) { return notifications.notify({ scope,operationId,event,title:'Book ready to read',description:'Your new book is available.',kind:'success',action:action?{label:'Open',onClick:()=>actions++}:undefined }); },
  scope(key) { savedScope=scope; scope=notifications.setNotificationScope(key); },
  late() { return notifications.notify({scope:savedScope,operationId:'late',event:'ready',title:'Stale title'}); },
  suppress(value,owner='modal',mode='drop') { notifications.setNotificationsSuppressed(value,owner,mode); },
  cancel(operationId) { notifications.dismissNotification(scope,operationId); },
  auth(userId,event='SIGNED_IN') { window.__auth(event,userId?{user:{id:userId}}:null); },
  actions() { return actions; },
};
window.check.mount();
`;
const bundled = await build({
  stdin: { contents: source, resolveDir: process.cwd(), sourcefile: 'notificationsFixture.tsx', loader: 'tsx' },
  bundle: true, write: false, outdir: 'out', format: 'iife', platform: 'browser',
  define: { 'process.env.NODE_ENV': '"development"' },
  plugins: [{ name: 'notification-fixture', setup(builder) {
    builder.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: 'navigation', namespace: 'mock' }));
    builder.onResolve({ filter: /lib\/hooks\/useAppTheme$/ }, () => ({ path: 'theme', namespace: 'mock' }));
    builder.onResolve({ filter: /lib\/supabase\/client$/ }, () => ({ path: 'auth', namespace: 'mock' }));
    builder.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ loader: 'js', contents: {
      navigation: `export const usePathname=()=>'/my-books';`,
      theme: `export const useAppTheme=()=>({mode:window.__mode??'light'});`,
      auth: `export const createClient=()=>({auth:{onAuthStateChange(callback){window.__auth=callback;return {data:{subscription:{unsubscribe(){}}}}}}});`,
    }[args.path] }));
  } }],
});
const browser = await chromium.launch({ channel: process.env.CATALOG_BROWSER_CHANNEL ?? 'chrome', headless: true });
const results = [];
const selector = '[data-sonner-toast]:not([data-removed="true"])';
async function fixture() {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route('**/*', route => route.abort());
  await page.clock.install();
  await page.setContent('<div id="root"></div>');
  await page.evaluate(() => Object.defineProperty(window, 'visualViewport', { configurable: true, value: Object.assign(new EventTarget(), { height: 844, offsetTop: 0 }) }));
  // CSS arrives before JS in Next; Sonner then injects its own defaults at runtime.
  for (const file of [...bundled.outputFiles].sort((a, b) => Number(b.path.endsWith('.css')) - Number(a.path.endsWith('.css')))) {
    if (file.path.endsWith('.css')) await page.addStyleTag({ content: file.text });
    else await page.addScriptTag({ content: file.text });
  }
  await page.clock.runFor(32);
  return page;
}
async function run(page, method, ...args) {
  const result = await page.evaluate(({ method, args }) => window.check[method](...args), { method, args });
  await page.clock.runFor(64);
  return result;
}
try {
  let page = await fixture();
  await page.locator('#outside').focus();
  await run(page, 'notify');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'outside');
  assert.equal(await page.locator('[aria-live="polite"]').count(), 1);
  assert.equal(await page.locator('[role="status"], [role="alert"]').count(), 0);
  const toast = page.locator(selector);
  assert.equal(await toast.locator('[data-button]').count(), 1);
  assert.equal(await toast.locator('[data-close-button]').count(), 0);
  assert.equal(await toast.evaluate(node => getComputedStyle(node).paddingRight), '16px');
  const style = await toast.evaluate(node => ({ color: getComputedStyle(node).backgroundColor, bottom: getComputedStyle(node.parentElement).bottom, zIndex: getComputedStyle(node.parentElement).zIndex }));
  assert.equal(style.color, 'rgb(255, 255, 255)');
  assert.equal(style.bottom, '76px');
  assert.equal(style.zIndex, '55');
  await toast.locator('[data-button]').focus();
  await page.clock.runFor(12_000);
  assert.equal(await page.locator(selector).count(), 1);
  assert.equal(await toast.locator('[data-title]').textContent(), 'Book ready to read');
  assert.equal(await toast.locator('[data-description]').textContent(), 'Your new book is available.');
  assert.equal(await toast.locator('[data-button]').textContent(), 'Open');
  assert.equal(await toast.getAttribute('data-type'), 'success');
  await page.locator('#outside').focus();
  await page.clock.runFor(11_000);
  assert.equal(await page.locator(selector).count(), 0);
  results.push('native one polite region, no focus stealing; Tab pause retains exact title/description/action/kind, then expires; App colors and bottom-nav offset');
  await page.close();

  page = await fixture();
  await run(page, 'notify', 'hover', 'ready', false);
  await page.clock.runFor(500);
  const rect = await page.locator(selector).boundingBox();
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.clock.runFor(7_000);
  assert.equal(await page.locator(selector).count(), 1);
  await page.mouse.move(0, 0);
  await page.clock.runFor(7_000);
  assert.equal(await page.locator(selector).count(), 0);
  results.push('Sonner native hover pause and dismissal after leaving');
  await page.close();

  page = await fixture();
  await run(page, 'notify', 'focused');
  await page.locator(`${selector} [data-button]`).focus();
  await page.clock.runFor(32);
  for (const operation of ['second', 'third', 'fourth']) await run(page, 'notify', operation);
  await page.clock.runFor(500);
  const focused = page.locator(`${selector}[data-testid$=":focused"]`);
  assert.equal(await page.locator(selector).count(), 3);
  assert.equal(await focused.count(), 1);
  assert.equal(await focused.getAttribute('data-expanded'), 'true');
  assert.equal(await focused.locator('[data-button]').evaluate(node => document.activeElement === node), true);
  await page.keyboard.press('Enter');
  assert.equal(await run(page, 'actions'), 1);
  results.push('fourth operation preserves focused visible action, evicts nonfocused message, and keeps three active');
  await page.close();

  page = await fixture();
  await run(page, 'notify');
  for (const theme of ['light', 'dark', 'forest-light', 'forest-dark']) {
    await run(page, 'theme', theme);
    const matches = await page.locator(selector).evaluate(node => {
      const probe = document.createElement('div');
      probe.style.backgroundColor = 'var(--app-surface-bg)';
      probe.style.color = 'var(--app-text-muted)';
      document.body.appendChild(probe);
      const expected = getComputedStyle(probe);
      const result = getComputedStyle(node).backgroundColor === expected.backgroundColor && getComputedStyle(node.querySelector('[data-description]')).color === expected.color;
      probe.remove();
      return result;
    });
    assert.equal(matches, true, theme);
  }
  await page.evaluate(() => { window.visualViewport.height = 500; window.visualViewport.dispatchEvent(new Event('resize')); });
  await page.clock.runFor(32);
  assert.equal(await page.locator('[data-sonner-toaster]').evaluate(node => getComputedStyle(node).bottom), '360px');
  results.push('all four App palettes override library defaults independently of Reader; keyboard viewport moves host above occlusion');
  await page.close();

  page = await fixture();
  await run(page, 'notify');
  await run(page, 'notify');
  assert.equal(await page.locator(selector).count(), 1);
  await run(page, 'suppress', true);
  await page.clock.runFor(300);
  assert.equal(await page.locator(selector).count(), 0);
  assert.equal(await run(page, 'notify', 'hidden'), null);
  await run(page, 'suppress', false);
  assert.equal(await page.locator(selector).count(), 0);
  await run(page, 'notify', 'visible');
  await run(page, 'auth', 'other-user');
  await page.clock.runFor(300);
  assert.equal(await page.locator(selector).count(), 0);
  assert.equal(await run(page, 'notify', 'stale-auth'), null);
  await run(page, 'scope', 'user:other-user::fixture');
  assert.equal(await run(page, 'late'), null);
  await run(page, 'notify', 'new-scope');
  await page.locator(`${selector} [data-button]`).click();
  assert.equal(await run(page, 'actions'), 1);
  results.push('same-event dedup, modal clears without backlog, auth reset rejects late results, current action works');
  await page.close();

  page = await fixture();
  await run(page, 'suppress', true, 'delete', 'defer');
  for (const operation of ['old', 'cancelled', 'third', 'fourth']) await run(page, 'notify', operation);
  await run(page, 'cancel', 'cancelled');
  await run(page, 'notify', 'third', 'updated');
  assert.equal(await page.locator(selector).count(), 0);
  await run(page, 'suppress', false, 'delete');
  assert.equal(await page.locator(selector).count(), 2);
  assert.equal(await page.locator(`${selector}[data-testid$=":old"], ${selector}[data-testid$=":cancelled"]`).count(), 0);
  assert.equal(await page.locator('[data-close-button]').count(), 0);
  await page.locator(`${selector}[data-testid$=":third"] [data-button]`).click();
  assert.equal(await run(page, 'actions'), 1);
  results.push('unrelated dialog defers bounded latest results; cancelled result is discarded; released action works without close buttons');
  await page.close();

  page = await fixture();
  await run(page, 'suppress', true, 'sort', 'defer');
  await run(page, 'notify', 'before-navigation');
  await run(page, 'scope', null);
  await run(page, 'suppress', false, 'sort');
  assert.equal(await page.locator(selector).count(), 0);
  assert.equal(await run(page, 'late'), null);
  results.push('navigation scope cleanup discards deferred results and rejects the previous scope');
  await page.close();
  console.log(JSON.stringify({ passed: results.length, fixtureOnly: true, results }, null, 2));
} finally {
  await browser.close();
}
