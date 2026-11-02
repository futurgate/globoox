import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const base = process.env.LANDING_TEST_URL || 'http://127.0.0.1:3000';
const output = fileURLToPath(new URL('.', import.meta.url));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { checkedAt: new Date().toISOString(), layouts: [], interactions: [], isolation: [], errors: [] };
const intercept = () => {
  window.__emailTargets = [];
  const nativeClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.protocol === 'mailto:') { window.__emailTargets.push(this.href); return; }
    return nativeClick.call(this);
  };
};
const context = await browser.newContext({ viewport: { width: 1536, height: 1100 }, deviceScaleFactor: 1 });
await context.addInitScript(intercept);
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));
const expected = {
  trial: { title: 'Бесплатный пробный перевод', button: 'Получить пробный перевод', subject: 'Бесплатный пробный перевод — Globoox' },
  contact: { title: 'Откройте свою книгу читателям всего мира', button: 'Связаться с Globoox', subject: 'Перевод и публикация книги — Globoox' },
};

try {
  await page.goto(`${base}/authors`);
  await page.getByRole('button', { name: 'Только необходимые', exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
  for (const width of [1536, 1024, 768, 390, 320, 1832, 1639]) {
    await page.setViewportSize({ width, height: 1200 });
    for (const id of ['trial', 'contact']) {
      const section = page.locator('#' + id);
      await section.scrollIntoViewIfNeeded();
      await section.locator('img').evaluateAll(images => Promise.all(images.map(i => i.decode())));
      const layout = await section.evaluate(el => {
        const box = n => { const r = n.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom }; };
        return {
          overflow: document.documentElement.scrollWidth - innerWidth,
          heading: el.querySelector('h2').textContent,
          button: el.querySelector('button').textContent.trim(),
          headingBox: box(el.querySelector('h2')),
          buttonBox: box(el.querySelector('button')),
          imageBox: box(el.querySelector('img')),
          imageLoaded: el.querySelector('img').naturalWidth > 0,
          headingFont: getComputedStyle(el.querySelector('h2')).fontFamily,
          buttonFont: getComputedStyle(el.querySelector('button')).fontFamily,
        };
      });
      assert.equal(layout.overflow, 0);
      assert.equal(layout.heading, expected[id].title);
      assert.equal(layout.button, expected[id].button);
      assert(layout.imageLoaded);
      assert.match(layout.headingFont, /Lora/);
      assert.match(layout.buttonFont, /Inter/);
      for (const b of [layout.headingBox, layout.buttonBox]) assert(b.x >= 0 && b.right <= width);
      // Contact's fine arcs may meet the right edge, as in the selected reference.
      const image = layout.imageBox;
      const art = id === 'contact' ? { x:image.x + image.width * .072, right:image.x + image.width * .585, y:image.y + image.height * .10, bottom:image.y + image.height * .91 } : image;
      assert(art.x >= 0 && art.right <= width);
      for (const b of [layout.headingBox, layout.buttonBox]) {
        assert(Math.min(b.right, art.right) <= Math.max(b.x, art.x) || Math.min(b.bottom, art.bottom) <= Math.max(b.y, art.y), `${id} copy/book overlap at ${width}`);
      }
      report.layouts.push({ width, id, ...layout });
      await page.mouse.move(0, 0);
      await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
      if (id === 'trial') {
        await section.screenshot({ path: `${output}/selected-trial-${width}.png`, style: 'header {visibility:hidden} nextjs-portal {display:none}' });
      } else {
        await page.locator('footer').scrollIntoViewIfNeeded();
        const clip = await page.evaluate(() => {
          const start = document.querySelector('#contact').getBoundingClientRect();
          const end = document.querySelector('footer').getBoundingClientRect();
          return { x:0, y:start.top, width:innerWidth, height:end.bottom - start.top };
        });
        assert(clip.y >= 0 && clip.y + clip.height <= 1201);
        await page.screenshot({ path: `${output}/selected-contact-footer-${width}.png`, clip, style: 'header {visibility:hidden} nextjs-portal {display:none}' });
      }
    }
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.locator('footer').count(), 1);
    assert.equal(await page.locator('footer > [aria-hidden=true]').count(), 1);
    assert(!(await page.locator('footer').textContent()).includes('Мы создаём'));
  }

  await page.setViewportSize({ width: 1536, height: 1100 });
  for (const id of ['trial', 'contact']) {
    const button = page.locator('#' + id + ' button');
    await button.evaluate(el => el.click());
    assert.equal((await page.evaluate(() => window.__emailTargets)).length, report.interactions.length);
    await button.click();
    report.interactions.push({ id, modality: 'mouse' });
    await button.focus();
    await page.keyboard.press('Enter');
    assert(await button.evaluate(el => document.activeElement === el && getComputedStyle(el).outlineStyle !== 'none'));
    report.interactions.push({ id, modality: 'keyboard' });
  }
  const desktopTargets = await page.evaluate(() => window.__emailTargets);
  assert.equal(desktopTargets.length, 4);
  desktopTargets.forEach((target, i) => {
    const url = new URL(target);
    assert.equal(url.pathname, 'lomovski@globoox.co');
    assert.equal(url.searchParams.get('subject'), expected[i < 2 ? 'trial' : 'contact'].subject);
    report.interactions[i].target = target;
  });

  const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: await context.storageState() });
  await touchContext.addInitScript(intercept);
  const touch = await touchContext.newPage();
  touch.on('pageerror', error => report.errors.push(error.message));
  await touch.goto(`${base}/authors`);
  for (const id of ['trial', 'contact']) {
    await touch.locator('#' + id + ' button').tap();
    const target = await touch.evaluate(() => window.__emailTargets.at(-1));
    const url = new URL(target);
    assert.equal(url.pathname, 'lomovski@globoox.co');
    assert.equal(url.searchParams.get('subject'), expected[id].subject);
    report.interactions.push({ id, modality: 'touch', target });
  }
  await touchContext.close();

  for (const route of ['publishers', 'ru', 'authors/hero-archive']) {
    await page.goto(`${base}/${route}`);
    assert.equal(await page.locator('img[src*="business-sections"]').count(), 0);
    if (route !== 'authors/hero-archive') {
      assert.equal(await page.locator('footer > [aria-hidden=true]').count(), 0);
      assert.equal(await page.locator('footer').evaluate(el => getComputedStyle(el).paddingTop), '32px');
    }
    if (route === 'publishers') {
      assert.equal(await page.locator('#trial img, #contact img').count(), 0);
      assert.equal(await page.locator('#hero img').count(), 7);
    }
    report.isolation.push(route);
  }
  assert.deepEqual(report.errors, []);
  await writeFile(`${output}/selected-checks.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ layouts: report.layouts.length, interactions: report.interactions.length, isolation: report.isolation, errors: report.errors }));
} finally {
  await browser.close();
}
