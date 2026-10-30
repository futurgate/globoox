// Run against the local dev server: node docs/rfcs/active/authors-publishers-landings/verify.mjs
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const output = fileURLToPath(new URL('./evidence/', import.meta.url));
const base = process.env.LANDING_TEST_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { base, checkedAt: new Date().toISOString(), viewports: [], interactions: [], errors: [] };
// Capture the outgoing URI without opening a mail application or sending a message.
function interceptMailto() {
  window.__emailTargets = [];
  const nativeClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.protocol === 'mailto:') {
      window.__emailTargets.push(this.href);
      return;
    }
    return nativeClick.call(this);
  };
}
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(interceptMailto);
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));

try {
  const response = await page.goto(`${base}/authors`);
  assert.equal(response.status(), 200);
  await page.getByRole('button', { name: 'Только необходимые', exact: true }).click();
  assert.equal(await page.locator('.cookie-banner').count(), 0);
  report.interactions.push('Cookie choice dismisses banner and persists across routes');

  const expectedCopy = {};
  let expectedCommonCopy;
  for (const route of ['authors', 'publishers']) {
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const response = await page.goto(`${base}/${route}`);
      assert.equal(response.status(), 200);
      assert(!(await response.text()).includes('lomovski@globoox.co'), 'Recipient must not be exposed in server HTML');
      await page.evaluate(() => document.fonts.ready);
      const result = await page.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        h1Count: document.querySelectorAll('h1').length,
        lang: document.querySelector('.marketing-page').lang,
        canonical: document.querySelector('link[rel=canonical]').getAttribute('href'),
        visibleLanguageSelectors: [...document.querySelectorAll('.landing-header-language-trigger')].filter(e => e.getBoundingClientRect().width > 0).length,
        localTargetsMissing: [...document.querySelectorAll('a[href^="#"]')].map(e => e.getAttribute('href')).filter(href => href.length > 1 && !document.getElementById(href.slice(1))),
        copy: document.querySelector('main').textContent,
        commonCopy: ['translation', 'languages', 'quality', 'trial', 'publishing', 'contact'].map(id => document.getElementById(id).textContent),
      }));
      assert.equal(result.scrollWidth, width, `${route} horizontal overflow at ${width}`);
      assert.equal(result.h1Count, 1);
      const languageLayout = await page.locator('#languages').evaluate(section => {
        const pills = [...section.querySelectorAll('.supported-lang-pill')].map(element => {
          const rects = [element, ...element.querySelectorAll('span')].map(node => node.getBoundingClientRect());
          return { text: element.textContent, left: Math.min(...rects.map(r => r.left)), right: Math.max(...rects.map(r => r.right)), top: Math.min(...rects.map(r => r.top)), bottom: Math.max(...rects.map(r => r.bottom)) };
        });
        return {
          count: pills.length,
          outside: pills.filter(p => p.left < 0 || p.right > innerWidth).map(p => p.text),
          overlaps: pills.flatMap((a, i) => pills.slice(i + 1).filter(b => Math.min(a.right,b.right) > Math.max(a.left,b.left) && Math.min(a.bottom,b.bottom) > Math.max(a.top,b.top)).map(b => [a.text,b.text])),
          languageBackground: getComputedStyle(section.querySelector('.supported-section')).backgroundColor,
          stepBackground: getComputedStyle(document.getElementById('publishing')).backgroundColor,
        };
      });
      assert.equal(languageLayout.count, 13, 'All four current and nine upcoming languages must render');
      assert.deepEqual(languageLayout.outside, [], 'Language labels/badges must fit within viewport');
      assert.deepEqual(languageLayout.overlaps, [], 'Language labels/badges must not overlap');
      assert.equal(languageLayout.stepBackground, languageLayout.languageBackground);
      result.languageLayout = languageLayout;
      assert.equal(result.lang, 'ru');
      assert(result.canonical.endsWith(`/${route}`));
      assert.equal(result.visibleLanguageSelectors, 0);
      assert.equal(await page.locator('header a[href="/my-books"]').count(), 0);
      assert(!(await page.locator('header').textContent()).includes('Открыть приложение'));
      assert(!(await page.locator('footer').textContent()).includes('Мы создаём первый'));
      assert.equal(await page.locator('header a[aria-current="true"]').count(), 0, 'No section should be selected above the first section');
      assert.deepEqual(result.localTargetsMissing, []);
      expectedCopy[route] ??= result.copy;
      assert.equal(result.copy, expectedCopy[route], 'Each route must keep identical copy across widths');
      expectedCommonCopy ??= result.commonCopy;
      assert.deepEqual(result.commonCopy, expectedCommonCopy, 'Common material must stay identical across routes');
      assert.equal(await page.locator('#hero').getByRole('button', { name: 'Связаться с нами', exact: true }).count(), 1);
      assert.equal(await page.locator('main a[href^="mailto:"]').count(), 0);
      assert(!(await page.locator('main').innerText()).includes('lomovski@globoox.co'));
      assert.equal(await page.locator('#team article').count(), 4);
      if (route === 'authors') {
        assert(!result.copy.toLowerCase().includes('издател'));
        assert(!result.copy.includes('С нами уже работают'));
        assert(!result.copy.includes('Нас консультируют'));
        assert(!result.copy.includes('Вместе мы строим'));
        assert(result.copy.includes('Команда — наша главная сила'));
        assert.equal(await page.locator('#team a[href*="linkedin.com"]').count(), 4);
      } else {
        assert(!result.copy.includes('Для авторов'));
        assert(result.copy.includes('Для издателей'));
        assert(result.copy.includes('С нами уже работают'));
        assert(result.copy.includes('Нас консультируют'));
        assert(result.copy.includes('Кондрат Кондратенко'));
      }
      assert(!result.copy.includes('???'));
      assert(!result.copy.includes('[фрагмент оригинала]'));
      delete result.copy;
      delete result.commonCopy;
      report.viewports.push({ route, ...result });
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/authors`);
  const menu = page.getByRole('button', { name: 'Открыть или закрыть меню' });
  await menu.click();
  assert.equal(await menu.getAttribute('aria-expanded'), 'true');
  assert.equal(await page.locator('.landing-header-mobile-menu a').count(), 5);
  assert.equal(await page.locator('.landing-header-open-app-mobile').count(), 0);
  await page.keyboard.press('Escape');
  assert.equal(await menu.getAttribute('aria-expanded'), 'false');
  await menu.click();
  await page.getByRole('link', { name: 'Команда', exact: true }).click();
  assert.equal(new URL(page.url()).hash, '#team');
  assert.equal(await menu.getAttribute('aria-expanded'), 'false');
  const targetTop = await page.locator('#team').evaluate(e => e.getBoundingClientRect().top);
  assert(targetTop >= 80 && targetTop <= 120, `Header obscures target: ${targetTop}`);
  report.interactions.push('Mobile menu opens, closes with Escape and closes on an unobscured section anchor');

  await page.locator('#quality').scrollIntoViewIfNeeded();
  const slider = page.getByRole('slider', { name: 'Сравнить оригинал и перевод' });
  assert.equal(await slider.count(), 1);
  await slider.focus();
  await page.keyboard.press('Home');
  assert.equal(await slider.getAttribute('aria-valuenow'), '0');
  await page.keyboard.press('ArrowRight');
  assert.equal(await slider.getAttribute('aria-valuenow'), '5');
  await page.keyboard.press('Shift+ArrowRight');
  assert.equal(await slider.getAttribute('aria-valuenow'), '15');
  await page.keyboard.press('End');
  assert.equal(await slider.getAttribute('aria-valuenow'), '100');
  await page.keyboard.press('ArrowRight');
  assert.equal(await slider.getAttribute('aria-valuenow'), '100');
  const track = await slider.evaluateHandle(e => e.parentElement);
  const rect = await track.evaluate(e => {const r = e.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height};});
  await page.mouse.move(rect.x + rect.width * .7, rect.y + rect.height * .5);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width * .25, rect.y + rect.height * .5);
  await page.mouse.up();
  const position = Number(await slider.getAttribute('aria-valuenow'));
  assert(position >= 24 && position <= 26);
  report.interactions.push('Comparison keyboard arrows, Shift, Home/End, bounds and mouse drag work');

  for (const route of ['authors', 'publishers']) {
    await page.goto(`${base}/${route}`);
    const heroContact = page.locator('#hero').getByRole('button', { name: 'Связаться с нами', exact: true });
    await heroContact.evaluate(button => {
      button.click();
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    assert.deepEqual(await page.evaluate(() => window.__emailTargets), [], 'Synthetic DOM clicks must not open mail');
    await heroContact.click();
    const trial = page.getByRole('button', { name: 'Получить пробный перевод', exact: true });
    await trial.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await page.getByRole('button', { name: 'Связаться с Globoox', exact: true }).click();
    const targets = await page.evaluate(() => window.__emailTargets);
    assert.equal(targets.length, 4);
    for (const target of targets) assert(target.startsWith('mailto:lomovski@globoox.co?subject='));
    assert(decodeURIComponent(targets[1]).includes('Бесплатный пробный перевод'));
    assert.equal(targets[1], targets[2]);
    assert.equal(targets[0], targets[3]);
    assert(!(await page.locator('main').innerHTML()).includes('lomovski@globoox.co'));
    report.interactions.push(`${route}: synthetic DOM clicks ignored; browser mouse/Enter/Space open correct mailto and subject; target captured without opening mail`);
  }
  const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await touchContext.addInitScript(interceptMailto);
  const touchPage = await touchContext.newPage();
  await touchPage.goto(`${base}/authors`);
  await touchPage.getByRole('button', { name: 'Только необходимые', exact: true }).tap();
  await touchPage.locator('#hero').getByRole('button', { name: 'Связаться с нами', exact: true }).tap();
  const touchTargets = await touchPage.evaluate(() => window.__emailTargets);
  assert.equal(touchTargets.length, 1);
  assert(touchTargets[0].startsWith('mailto:lomovski@globoox.co?subject='));
  await touchContext.close();
  report.interactions.push('Touch activation opens the correct mailto; browser automation remains able to activate by design (not CAPTCHA)');

  // Scroll into lazy-loaded founder images before recording their final state.
  await page.locator('#team').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll('#team img')].every(e => e.complete && e.naturalWidth > 0));
  report.interactions.push('All four founder photos load');

  for (const {route,width} of [{route:'authors',width:1440},{route:'authors',width:390},{route:'authors',width:320},{route:'publishers',width:1440},{route:'publishers',width:390}]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${base}/${route}`);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('#team').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => [...document.querySelectorAll('#team img')].every(e => e.complete && e.naturalWidth > 0));
    await page.evaluate(() => window.scrollTo({top: 0, behavior:'instant'}));
    await page.screenshot({ path: `${output}/${route}-${width}.png`, fullPage: true });
  }

  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
  report.interactions.push('Reduced-motion preference disables smooth scrolling');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  await page.setViewportSize({width:1440,height:1000});
  await page.goto(`${base}/ru`);
  assert((await page.locator('h1').innerText()).includes('приложение для чтения'));
  assert((await page.locator('.landing-header-open-app').innerText()).includes('Открыть приложение'));
  assert((await page.locator('footer').textContent()).includes('Мы создаём первый'));
  await page.getByRole('button', {name:'Язык',exact:true}).click();
  assert(await page.getByRole('button',{name:'English',exact:true}).isVisible());
  await page.keyboard.press('Escape');
  report.interactions.push('Main /ru retains reader hero and working language selector');

  const sitemap = await page.request.get(`${base}/sitemap.xml`);
  const xml = await sitemap.text();
  assert(xml.includes('/authors</loc>') && xml.includes('/publishers</loc>'));
  report.interactions.push('Both routes included in sitemap');
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = error.stack;
  process.exitCode = 1;
} finally {
  await writeFile(`${output}/browser-checks.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({passed:report.passed,viewports:report.viewports.length,interactions:report.interactions,errors:report.errors,failure:report.failure}, null, 2));
  await browser.close();
}
