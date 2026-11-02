// Focused selected-hero/archive QA: node docs/rfcs/active/authors-publishers-landings/verify-hero-concepts.mjs
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const base = process.env.LANDING_TEST_URL || 'http://127.0.0.1:3000';
const output = fileURLToPath(new URL('./hero-concepts-2026-10-30/implementation/', import.meta.url));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 });
await context.addInitScript(() => {
  window.__emailTargets = [];
  const original = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.protocol === 'mailto:') { window.__emailTargets.push(this.href); return; }
    return original.call(this);
  };
});
const page = await context.newPage();
const report = { checkedAt: new Date().toISOString(), viewports: [], motion: [], mailTargets: [], errors: [] };
page.on('pageerror', error => report.errors.push(error.message));

try {
  await page.goto(`${base}/authors`);
  await page.getByRole('button', { name: 'Только необходимые', exact: true }).click();

  for (const route of ['authors', 'authors/hero-archive']) {
    for (const width of [1536, 1024, 390, 320]) {
      await page.setViewportSize({ width, height: width < 500 ? 844 : 1024 });
      const response = await page.goto(`${base}/${route}`);
      assert.equal(response.status(), 200);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.locator('header').count(), 1);
      assert.equal(await page.locator('#business-title').count(), 1);
      if (route === 'authors') {
        assert.deepEqual(await page.locator('main>section').evaluateAll(els => els.slice(0, 2).map(e => e.id)), ['hero', 'translation']);
        assert.equal(await page.locator('#hero').getAttribute('data-hero-concept'), '04');
        assert.equal(await page.locator('[id^=hero-concept]').count(), 0);
        assert(!(await page.locator('#hero').textContent()).includes('Концепция'));
      } else {
        assert.match(await page.locator('meta[name=robots]').getAttribute('content'), /noindex/);
        assert.equal(await page.locator('#hero-concept-05 h2').count(), 1);
        assert.equal(await page.locator('main a[href="/authors"]').count(), 1);
        assert((await page.locator('main').textContent()).includes('Архив первых экранов'));
      }
      const ids = route === 'authors' ? ['hero'] : ['hero', 'hero-concept-05'];
      for (const id of ids) {
        const section = page.locator('#' + id);
        await section.locator('img').evaluateAll(imgs => Promise.all(imgs.map(i => i.decode())));
        const layout = await section.evaluate(el => {
          const bounds = node => {
            const r = node.getBoundingClientRect();
            return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
          };
          return {
            overflow: document.documentElement.scrollWidth - innerWidth,
            heading: el.querySelector('h1,h2').textContent.replace(/\s+/g, ' ').trim(),
            images: [...el.querySelectorAll('img')].map(n => ({ loaded: n.complete && n.naturalWidth > 0, ...bounds(n) })),
            eyebrowTop: el.querySelector('p').getBoundingClientRect().top,
            headerBottom: document.querySelector('header').getBoundingClientRect().bottom,
            buttons: el.querySelectorAll('button').length,
          };
        });
        assert.equal(layout.overflow, 0);
        assert.equal(layout.heading, 'Продавайте свои книги по всему миру на всех языках и платформах');
        assert.equal(layout.buttons, 1);
        if (id === 'hero') assert(layout.eyebrowTop >= layout.headerBottom + 16, 'Shared header must clear the first copy');
        for (const img of layout.images) {
          assert(img.loaded);
          assert(img.left >= -1 && img.right <= width + 1, `${route}/${id} image clipping at ${width}`);
        }
        assert.equal(await section.locator('circle>animateMotion').count(), 7);
        assert.equal(await section.locator('path').count(), 7);
        report.viewports.push({ route, width, id, ...layout });
      }
      await page.evaluate(() => { document.activeElement instanceof HTMLElement && document.activeElement.blur(); scrollTo(0, 0); });
      await page.screenshot({ path: `${output}/selected-${route === 'authors' ? 'authors' : 'archive'}-${width}.png`, fullPage: route !== 'authors', style: 'nextjs-portal {display:none}' });
    }

    await page.setViewportSize({ width: 1440, height: 1024 });
    const ids = route === 'authors' ? ['hero'] : ['hero', 'hero-concept-05'];
    for (const preference of ['no-preference', 'reduce']) {
      await page.emulateMedia({ reducedMotion: preference });
      await page.goto(`${base}/${route}`);
      for (const id of ids) {
        const section = page.locator('#' + id);
        await section.scrollIntoViewIfNeeded();
        const dots = section.locator('circle>animateMotion');
        const positions = nodes => nodes.map(n => { const m = n.parentElement.getCTM(); return { x: m.e, y: m.f }; });
        const before = await dots.evaluateAll(positions);
        await page.waitForTimeout(200);
        const after = await dots.evaluateAll(positions);
        assert(before.every((p, i) => Math.hypot(p.x - after[i].x, p.y - after[i].y) > 1), 'All seven dots move without controls');
        report.motion.push({ route, preference, id, before, after });
      }
    }
    for (const id of ids) {
      const button = page.locator('#' + id + ' button');
      await button.click();
      await button.focus();
      await page.keyboard.press('Enter');
      assert(await button.evaluate(el => document.activeElement === el));
      assert(await button.evaluate(el => getComputedStyle(el).outlineStyle !== 'none'), 'Keyboard CTA focus remains visible');
    }
    const targets = await page.evaluate(() => window.__emailTargets);
    assert.equal(targets.length, ids.length * 2);
    assert(targets.every(t => t.startsWith('mailto:lomovski@globoox.co?subject=')));
    report.mailTargets.push({ route, targets });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/authors`);
  const menu = page.getByRole('button', { name: 'Открыть или закрыть меню', exact: true });
  await menu.click();
  assert.equal(await menu.getAttribute('aria-expanded'), 'true');
  await page.keyboard.press('Escape');
  assert.equal(await menu.getAttribute('aria-expanded'), 'false');
  await menu.click();
  await page.getByRole('link', { name: 'Перевод', exact: true }).click();
  await page.waitForTimeout(300);
  assert((await page.locator('#translation').boundingBox()).y >= 80);

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${base}/publishers`);
    assert.equal(await page.locator('[data-hero-concept]').count(), 0);
    assert.equal(await page.locator('#hero img').count(), 7);
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.locator('header').count(), 1);
    assert.equal(await page.locator('#hero button').count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
  }
  assert.deepEqual(report.errors, []);
  await writeFile(`${output}/selected-checks.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ viewportCases: report.viewports.length, motionCases: report.motion.length, mailtoActivations: report.mailTargets.flatMap(r => r.targets).length, errors: report.errors }));
} finally {
  await browser.close();
}
