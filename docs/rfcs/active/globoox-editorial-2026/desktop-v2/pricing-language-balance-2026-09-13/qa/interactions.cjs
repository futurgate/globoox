const { chromium } = require(process.cwd() + '/node_modules/playwright');
const fs = require('fs');
const assert = require('node:assert/strict');
const out = '/tmp/globoox-pricing-balance-2026-09-13';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  try {
    for (const width of [1440, 800, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 1900 } });
      await page.goto('http://localhost:3000/landing-editorial', { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Necessary only', exact: true }).click();
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
      const pricing = page.locator('#pricing');
      // This check captures the entire tall pricing section, including offscreen art.
      await pricing.locator('img').evaluateAll(es => es.forEach(e => { e.loading = 'eager'; }));
      await pricing.evaluate(e => scrollTo({ top: e.getBoundingClientRect().top + scrollY - 120, behavior: 'instant' }));
      await page.waitForFunction(() => [...document.querySelectorAll('#pricing img')].every(e => e.complete && e.naturalWidth > 0));
      await pricing.locator('img').evaluateAll(es => Promise.all(es.map(e => e.decode())));
      const measure = () => pricing.evaluate(e => {
        const cards = [...e.querySelectorAll('article')];
        const lower = e.querySelector('img[src*="free-sprig"],img[srcset*="free-sprig"]');
        const group = lower.parentElement;
        return {
          lowerOffset: lower.getBoundingClientRect().bottom - group.getBoundingClientRect().bottom,
          lastCardOffset: cards.at(-1).getBoundingClientRect().bottom - group.getBoundingClientRect().bottom,
          anchoredToArticle: !!lower.closest('article'),
          height: group.getBoundingClientRect().height,
          pointerEvents: getComputedStyle(lower).pointerEvents,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      const before = await measure();
      await pricing.getByRole('button', { name: 'Get Started', exact: true }).click();
      await page.getByText('Premium checkout is coming soon.', { exact: false }).waitFor();
      const after = await measure();
      assert.equal(after.lowerOffset, before.lowerOffset);
      assert.equal(after.lastCardOffset, 0);
      assert.equal(after.anchoredToArticle, false);
      assert.equal(after.pointerEvents, 'none');
      assert.equal(after.overflow, false);
      assert(after.height > before.height);
      assert.equal(await pricing.getByRole('link', { name: 'Start for free', exact: true }).getAttribute('href'), '/my-books');
      assert.equal(await pricing.getByRole('link', { name: 'Contact Us', exact: true }).getAttribute('href'), 'mailto:support@globoox.co?subject=Globoox%20Editorial');
      const cta = page.locator('#start').getByRole('link', { name: 'Upload your first book', exact: true });
      assert.equal(await cta.locator('svg').count(), 0);
      assert.equal(await cta.getAttribute('href'), '/my-books');
      await pricing.evaluate(e => scrollTo({ top: e.getBoundingClientRect().top + scrollY - 120, behavior: 'instant' }));
      const box = await pricing.boundingBox();
      await page.screenshot({ path: out + '/pricing-' + width + '-expanded.png', clip: { x: 0, y: box.y, width, height: box.height } });
      results.push({ width, before, after, ctaArrowAbsent: true, linksPreserved: true });
      await page.close();
    }
    fs.writeFileSync(out + '/interaction-checks.json', JSON.stringify(results, null, 2));
    console.log('PASS: expansion, group anchoring, CTA arrow, links and overflow at 1440/800/390/320');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
