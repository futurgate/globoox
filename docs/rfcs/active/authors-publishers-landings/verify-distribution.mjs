// Run against the local dev server; captures only the changed hero illustration.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const output = fileURLToPath(new URL('./evidence/', import.meta.url));
const base = process.env.LANDING_TEST_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
const report = { base, checkedAt: new Date().toISOString(), viewports: [], motion: [], errors: [] };
page.on('pageerror', error => report.errors.push(error.message));

try {
  await page.goto(`${base}/authors`);
  await page.getByRole('button', { name: 'Только необходимые', exact: true }).click();
  for (const route of ['authors', 'publishers']) {
    const response = await page.goto(`${base}/${route}`);
    assert.equal(response.status(), 200);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('#hero img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    assert.equal((await page.locator('#business-title').textContent()).trim(), 'Продавайте свои книги по всему миру на всех языках и платформах');
    assert.equal(await page.locator('#hero p').nth(1).textContent(), 'Мы переведем вашу книгу и разместим её на Amazon, Kobo или в любом другом магазине электронных книг.');
    assert.equal(await page.locator('#hero').getByText('G', { exact: true }).count(), 0);
    assert.equal(await page.locator('#hero').getByText('GLOBOOX · КНИГИ БЕЗ ГРАНИЦ', { exact: true }).count(), 0);
    assert.equal(await page.locator('#hero button').count(), 1, 'Only the contact CTA remains; no animation toggles');
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const result = await page.locator('#hero [role="img"]').evaluate(scene => {
        const box = element => {
          const rect = element.getBoundingClientRect();
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
        };
        const book = scene.querySelector(':scope > img') || scene.querySelector('div');
        const bookTitle = book.querySelector('span:last-child');
        const images = [...scene.querySelectorAll(':scope > div > img')];
        return {
          width: innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          book: box(book),
          stores: images.map(image => {
            const children = [image.parentElement, ...image.parentElement.children].map(box);
            const bounds = { left: Math.min(...children.map(b => b.left)), right: Math.max(...children.map(b => b.right)), top: Math.min(...children.map(b => b.top)), bottom: Math.max(...children.map(b => b.bottom)) };
            return { box: bounds, overflow: bounds.left < 0 || bounds.right > innerWidth, imageLoaded: image.naturalWidth > 0 };
          }),
          threadCount: scene.querySelectorAll('svg > g').length,
          movingDots: scene.querySelectorAll('circle > animateMotion').length,
          staticThreads: [...scene.querySelectorAll('path')].every(path => getComputedStyle(path).animationName === 'none' && getComputedStyle(path).strokeDasharray === 'none'),
          headingSize: getComputedStyle(document.querySelector('#business-title')).fontSize,
          subheadingSize: getComputedStyle(document.querySelector('#business-title > span')).fontSize,
          bookTitleLeading: bookTitle ? getComputedStyle(bookTitle).lineHeight : null,
          bookTitleSize: bookTitle ? getComputedStyle(bookTitle).fontSize : null,
        };
      });
      assert.equal(result.scrollWidth, width);
      assert.equal(result.stores.length, 7);
      assert.equal(result.threadCount, 7);
      assert.equal(result.movingDots, 7);
      assert(result.staticThreads, 'Connections stay static with no moving dash trails');
      assert(parseFloat(result.subheadingSize) < parseFloat(result.headingSize) * .7);
      if (result.bookTitleSize) assert(parseFloat(result.bookTitleLeading) < parseFloat(result.bookTitleSize) * 1.06);
      for (const store of result.stores) {
        assert(store.imageLoaded);
        assert(!store.overflow);
        assert(store.box.left > result.book.right, 'Every marketplace stays to the right of the book');
        assert(store.box.right <= width);
      }
      for (let index = 1; index < result.stores.length; index++) {
        assert(result.stores[index].box.top > result.stores[index - 1].box.bottom, 'Marketplace cards do not overlap');
      }
      report.viewports.push({ route, ...result });
      if (route === 'authors' && [390, 1440].includes(width)) {
        await page.locator('#hero').screenshot({ path: `${output}/distribution-hero-${width}.png` });
      }
    }

    for (const preference of ['no-preference', 'reduce']) {
      await page.emulateMedia({ reducedMotion: preference });
      // Navigate to the ordinary URL so neither a click nor a query flag can start it.
      await page.goto(`${base}/${route}`);
      assert.equal(await page.locator('#hero button').count(), 1);
      assert.equal(await page.locator('#hero path').count(), 7, 'Exactly seven static connections; no extra animated strokes');
      assert.equal(await page.locator('#hero circle > animateMotion').count(), 7);
      assert.equal(await page.locator('#hero path[pathLength]').count(), 0);
      const particlePositions = [];
      for (const time of [0.6, 1.8]) {
        particlePositions.push(await page.locator('#hero svg').evaluate((svg, time) => {
          svg.pauseAnimations();
          svg.setCurrentTime(time);
          return [...svg.querySelectorAll('animateMotion')].map(motion => {
            const dot = motion.parentElement;
            const point = new DOMPoint(0, 0).matrixTransform(dot.getCTM()).matrixTransform(svg.getCTM().inverse());
            return { x: point.x, y: point.y, opacity: getComputedStyle(dot).opacity, display: getComputedStyle(dot).display };
          });
        }, time));
      }
      assert(particlePositions[1][0].x > particlePositions[0][0].x + 30, 'Visible dot advances toward its store');
      assert(parseFloat(particlePositions[1][0].opacity) > .9);
      assert.notEqual(particlePositions[1][0].display, 'none');
      await page.locator('#hero svg').evaluate(svg => svg.unpauseAnimations());
      const liveDot = page.locator('#hero animateMotion').first();
      const positionBefore = await liveDot.evaluate(motion => motion.parentElement.getCTM().e);
      await page.waitForTimeout(180);
      const positionAfter = await liveDot.evaluate(motion => motion.parentElement.getCTM().e);
      assert(positionAfter > positionBefore + 1, 'Dots move automatically on the real elapsed clock');
      report.motion.push({ route, preference, particlePositions, positionBefore, positionAfter });
    }
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  }
  assert.deepEqual(report.errors, []);
  await writeFile(`${output}/distribution-checks.json`, `${JSON.stringify(report, null, 2)}\n`);
  console.log('Passed: 10 route/viewport combinations, seven logos, automatic round-dot motion under both preferences, no toggles or animated stroke trails, no page errors.');
} finally {
  await browser.close();
}
