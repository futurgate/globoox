import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('.', import.meta.url));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => {
  window.__emailTargets = [];
  const original = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.protocol === 'mailto:') { window.__emailTargets.push(this.href); return; }
    return original.call(this);
  };
});
const page = await context.newPage();
const report = { layouts: [], interactions: [], errors: [] };
page.on('pageerror', error => report.errors.push(error.message));
const base = 'http://localhost:3000';
const ready = async () => {
  await page.evaluate(() => document.fonts.ready);
  await page.locator('img').evaluateAll(images => {
    images.forEach(image => { image.loading = 'eager'; });
    return Promise.all(images.map(image => image.decode()));
  });
};

try {
  const response = await page.goto(`${base}/fr/authors`);
  assert.equal(response.status(), 200);
  await ready();
  const text = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  for (const phrase of [
    'Vos livres partout dans le monde',
    'en toutes langues et sur toutes les plateformes',
    'Amazon, Kobo, Litres ou tout autre site de livres numériques.',
    'pour la fiction comme pour la non-fiction, du roman de genre à l’essai.',
    'Traduction irréprochable et fidèle à l’original',
    'Le style, le ton et la terminologie de l’auteur sont préservés avec soin, pour une qualité comparable à celle d’une traduction professionnelle.',
    'Découvrez un chapitre de votre livre dans la langue de votre choix.',
    'Nous prenons en charge tout le parcours de votre livre jusqu’à ses lecteurs',
    'Nous collectons les recettes et vous reversons votre part des ventes.',
    'Notre force, c’est notre équipe',
    'Tatiana Melnikova', 'Maxim Ilichev',
    'Votre livre à la rencontre des lecteurs du monde entier',
  ]) assert(text.includes(phrase), phrase);
  assert.equal(await page.locator('.marketing-page').getAttribute('lang'), 'fr');
  assert.equal(await page.locator('#languages li').count(), 13);
  assert.equal(await page.locator('#team article').count(), 4);
  assert.equal(await page.locator('#hero animateMotion').count(), 7);
  assert.equal(await page.locator('h1').count(), 1);
  assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), 'https://globoox.co/fr/authors');
  assert.equal(await page.locator('#quality [role=slider]').first().getAttribute('aria-label'), 'Comparer l’original et la traduction');
  assert((await page.locator('#quality').innerText()).includes('EN→FR'));
  assert(!/Ваша|Глава|Связаться|С нами|Вместе мы|Пришлите/.test(text));
  await page.getByRole('button', { name: 'Essentiels uniquement', exact: true }).click();

  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(150);
    const layout = await page.evaluate(() => ({
      width: innerWidth,
      overflow: document.documentElement.scrollWidth - innerWidth,
      broken: [...document.images].filter(image => !image.complete || !image.naturalWidth).map(image => image.src),
      outside: [...document.querySelectorAll('main h1,main h2,main h3,main p,main button,#languages li')].filter(element => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && (box.left < 0 || box.right > innerWidth + 1);
      }).map(element => element.textContent),
    }));
    report.layouts.push(layout);
    assert.equal(layout.overflow, 0, `overflow at ${width}`);
    assert.deepEqual(layout.broken, []);
    assert.deepEqual(layout.outside, []);
    if ([1440, 390].includes(width)) {
      for (const id of ['hero', 'translation', 'languages', 'quality', 'trial', 'publishing', 'team', 'contact']) {
        await page.locator('#' + id).screenshot({ path: `${out}/fr-${id}-${width}.png`, style: 'header,nextjs-portal{visibility:hidden}' });
      }
    }
  }

  for (const [id, name, subject] of [
    ['hero', 'Nous contacter', 'Traduction et publication de votre livre — Globoox'],
    ['trial', 'Recevoir mon chapitre gratuit', 'Un chapitre offert — Globoox'],
    ['contact', 'Contacter Globoox', 'Traduction et publication de votre livre — Globoox'],
  ]) {
    await page.locator('#' + id).getByRole('button', { name, exact: true }).click();
    const target = new URL(await page.evaluate(() => window.__emailTargets.at(-1)));
    assert.equal(target.pathname, 'lomovski@globoox.co');
    assert.equal(target.searchParams.get('subject'), subject);
  }
  report.interactions.push('Three native email CTAs: recipient and French subjects');

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${base}/authors#languages`);
    for (const [from, to, path, menu] of [
      ['Русский', 'Français', '/fr/authors', 'Открыть или закрыть меню'],
      ['Français', 'Русский', '/authors', 'Ouvrir ou fermer le menu'],
    ]) {
      if (width < 900) await page.getByRole('button', { name: menu, exact: true }).click();
      await page.getByRole('button', { name: from === 'Русский' ? 'Язык' : 'Langue', exact: true }).filter({ visible: true }).click();
      await page.getByRole('button', { name: to, exact: true }).filter({ visible: true }).click();
      await page.waitForURL(`${base}${path}#languages`);
      await page.waitForTimeout(250);
      assert((await context.cookies()).some(cookie => cookie.name === 'landing_locale' && cookie.value === (to === 'Français' ? 'fr' : 'ru')));
    }
    report.interactions.push(`RU → FR → RU with hash and locale cookie, ${width}px`);
  }

  assert((await page.locator('#translation').innerText()).includes('литературы о саморазвитии'));
  assert.equal(await page.locator('#contact h2').innerText(), 'Читатели по всему миру ждут вашу книгу');
  await page.goto(`${base}/publishers`);
  assert((await page.locator('#translation').innerText()).includes('для художественной и научно-популярной литературы'));
  assert.equal(await page.locator('#contact h2').innerText(), 'Откройте свою книгу читателям всего мира');
  assert.equal(await page.getByRole('button', { name: 'Français', exact: true }).count(), 0);
  report.interactions.push('Russian authors latest copy and original publishers preserved');
  assert.deepEqual(report.errors, []);
  report.passed = true;
} finally {
  await writeFile(`${out}/browser-checks.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify(report));
