const { chromium } = require(process.cwd() + '/node_modules/playwright');
const fs = require('fs');
const assert = require('assert/strict');
const out = '/tmp/globoox-replacement-nav-2026-09-14';
fs.mkdirSync(out, { recursive: true });
const report = { errors: [], trips: [], manual: [], resize: {}, locale: {} };
const normalize = value => value.replace(/\s+/g, ' ').trim();

async function settle(page) {
  await page.locator('#editorial-title').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.waitForTimeout(500);
}

async function snapshot(page, href) {
  return page.evaluate(href => {
    const section = href && document.querySelector(href);
    return {
      href: location.hash,
      y: scrollY,
      top: section?.getBoundingClientRect().top,
      headerBottom: document.querySelector('header').getBoundingClientRect().bottom,
      active: [...new Set([...document.querySelectorAll('header nav a[aria-current="location"]')].map(a => a.getAttribute('href')))],
      compact: !!document.querySelector('[data-navigation-compact]'),
      transit: !!document.querySelector('[data-section-navigation]'),
      selectedStep: [...document.querySelectorAll('#how-it-works [role="tab"]')].findIndex(e => e.getAttribute('aria-selected') === 'true'),
    };
  }, href);
}

async function menuTrip(page, href, name) {
  await page.evaluate(() => {
    window.__navQaSamples = [];
    window.__navQaStarts = 0;
    window.__navQaEnds = 0;
    const sample = () => {
      const travelling = !!document.querySelector('[data-section-navigation]');
      window.__navQaSamples.push({
        y: scrollY,
        travelling,
        compact: !!document.querySelector('[data-navigation-compact]'),
        active: [...new Set([...document.querySelectorAll('header nav a[aria-current="location"]')].map(a => a.getAttribute('href')))],
      });
      if (travelling) requestAnimationFrame(sample);
    };
    window.addEventListener('editorial:section-navigation-start', () => {
      window.__navQaStarts++;
      requestAnimationFrame(sample);
    }, { once: true });
    window.addEventListener('editorial:section-navigation-end', () => window.__navQaEnds++, { once: true });
  });
  await page.locator(`header a[href="${href}"]:visible`).first().click();
  await page.waitForFunction(() => window.__navQaEnds === 1);
  await page.waitForTimeout(100);
  const result = await snapshot(page, href);
  result.name = name;
  result.samples = await page.evaluate(() => window.__navQaSamples);
  assert.deepEqual(result.active, [href], `${name}: arrival active`);
  assert.equal(result.href, href, `${name}: arrival hash`);
  assert.equal(result.transit, false, `${name}: transit cleaned`);
  assert.equal(result.compact, false, `${name}: geometry restored`);
  assert.ok(result.samples.length > 1, `${name}: sampled motion`);
  for (const sample of result.samples.filter(s => s.travelling)) assert.deepEqual(sample.active, [href], `${name}: active stable during travel`);
  report.trips.push(result);
  fs.writeFileSync(out + '/qa.json', JSON.stringify(report, null, 2));
  return result;
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto('http://localhost:3000/landing-editorial', { waitUntil: 'domcontentloaded' });
    await settle(page);
    const consent = page.getByRole('button', { name: 'Necessary only', exact: true });
    if (await consent.isVisible()) await consent.click();
    console.log('desktop trips');
    await menuTrip(page, '#languages', 'Hero → Languages');
    await page.screenshot({ path: out + '/languages-1440.png' });
    await menuTrip(page, '#pricing', 'Languages → Pricing');
    await page.screenshot({ path: out + '/pricing-1440.png' });
    await menuTrip(page, '#start', 'Pricing → Start');
    await page.screenshot({ path: out + '/start-1440.png' });
    await menuTrip(page, '#languages', 'Start → Languages');

    console.log('manual walkthrough forward/reverse');
    const geometry = await page.locator('#how-it-works').evaluate(section => {
      const pin = section.querySelector('[data-walkthrough-pin]');
      return { start: scrollY + section.getBoundingClientRect().top - parseFloat(getComputedStyle(pin).top), distance: section.offsetHeight - pin.offsetHeight };
    });
    for (const progress of [0.05, 0.5, 0.95, 0.5, 0.05]) {
      await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), geometry.start + geometry.distance * progress);
      await page.waitForTimeout(100);
      const sample = await snapshot(page, '#how-it-works');
      sample.progress = progress;
      assert.deepEqual(sample.active, ['#how-it-works']);
      assert.equal(sample.selectedStep, progress < .265 ? 0 : progress < .735 ? 1 : 2);
      report.manual.push(sample);
    }
    await page.screenshot({ path: out + '/how-1440-reversed.png' });

    console.log('cancelled navigation');
    await page.locator('header a[href="#start"]:visible').click();
    await page.waitForTimeout(160);
    await page.mouse.wheel(0, 1);
    await page.waitForTimeout(120);
    report.cancelled = await snapshot(page, '#how-it-works');
    assert.equal(report.cancelled.transit, false);
    assert.equal(report.cancelled.compact, false);
    assert.notDeepEqual(report.cancelled.active, ['#start'], 'interrupted destination should not stay active');

    console.log('mobile resize reset');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    const menu = page.locator('button[aria-controls="editorial-mobile-nav"]');
    await menu.click();
    assert.equal(await menu.getAttribute('aria-expanded'), 'true');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.waitForTimeout(100);
    report.resize.desktopClosed = await menu.getAttribute('aria-expanded');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(100);
    report.resize.mobileClosed = await menu.getAttribute('aria-expanded');
    report.resize.mobileMenuCount = await page.locator('#editorial-mobile-nav').count();
    assert.equal(report.resize.desktopClosed, 'false');
    assert.equal(report.resize.mobileClosed, 'false');
    assert.equal(report.resize.mobileMenuCount, 0);
    await page.screenshot({ path: out + '/mobile-resize-closed.png' });

    console.log('desktop French preview locale');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await menuTrip(page, '#languages', 'Resized hero → Languages');
    await page.locator('#editorial-locale').selectOption('fr');
    await page.waitForURL('**/landing-editorial/fr#languages');
    await settle(page);
    report.locale.fr = { url: page.url(), lang: await page.locator('html').getAttribute('lang'), hero: normalize(await page.locator('#editorial-title').innerText()), navigation: await snapshot(page, '#languages') };
    assert.equal(report.locale.fr.lang, 'fr');
    assert.match(report.locale.fr.hero, /traduit|lecture/);
    assert.deepEqual(report.locale.fr.navigation.active, ['#languages']);
    await page.screenshot({ path: out + '/fr-languages-1440.png' });
    await page.locator('#hero').evaluate(element => scrollTo({ top: element.getBoundingClientRect().top + scrollY - 96, behavior: 'instant' }));
    await page.waitForTimeout(100);
    await page.screenshot({ path: out + '/fr-hero-1440.png' });

    console.log('mobile Russian preview locale');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('button[aria-controls="editorial-mobile-nav"]').click();
    await page.locator('#editorial-mobile-nav a[href="#languages"]').click();
    await page.waitForTimeout(1100);
    await page.locator('button[aria-controls="editorial-mobile-nav"]').click();
    const russian = page.locator('#editorial-mobile-nav a[lang="ru"]');
    report.locale.ruLink = await russian.getAttribute('href');
    assert.equal(report.locale.ruLink, '/landing-editorial/ru#languages');
    await russian.click();
    await page.waitForURL('**/landing-editorial/ru#languages');
    await settle(page);
    report.locale.ru = { url: page.url(), lang: await page.locator('html').getAttribute('lang'), hero: normalize(await page.locator('#editorial-title').innerText()), navigation: await snapshot(page, '#languages') };
    assert.equal(report.locale.ru.lang, 'ru');
    assert.match(report.locale.ru.hero, /[а-яё]{4}/i);
    assert.deepEqual(report.locale.ru.navigation.active, ['#languages']);
    await page.screenshot({ path: out + '/ru-languages-390.png' });
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(100);
    await page.screenshot({ path: out + '/ru-hero-390.png' });
    assert.deepEqual(report.errors, []);
    report.passed = true;
    fs.writeFileSync(out + '/qa.json', JSON.stringify(report, null, 2));
    console.log('ALL NAV/LOCALE CHECKS PASS');
  } catch (error) {
    report.failure = error.stack;
    fs.writeFileSync(out + '/qa.json', JSON.stringify(report, null, 2));
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
