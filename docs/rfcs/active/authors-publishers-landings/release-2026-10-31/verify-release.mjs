// Run only after the release server is ready. No mail client or message is opened.
// LANDING_TEST_URL=http://127.0.0.1:3004 EVIDENCE_DIR=/absolute/path node <this-file>
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = (process.env.LANDING_TEST_URL || 'http://127.0.0.1:3004').replace(/\/+$/, '');
const output = process.env.EVIDENCE_DIR
  ? resolve(process.env.EVIDENCE_DIR)
  : fileURLToPath(new URL('./evidence/', import.meta.url));
const heroTitle = 'Продавайте свои книги по всему миру на всех языках и платформах';
const heroDescription = 'Мы переведем вашу книгу и разместим её на Amazon, Kobo или в любом другом магазине электронных книг.';
const available = ['English', 'Français', 'Español', 'Русский'];
const upcoming = ['Deutsch', 'Italiano', 'Português', 'Türkçe', '中文', '日本語', '한국어', 'العربية', 'فارسی'];
const logoFiles = ['amazon.png', 'kobo.png', 'apple-books.png', 'google-play-books.png', 'barnes-noble.svg', 'thalia.png', 'bookshop.png'];
const ctas = [
  { id: 'hero', label: 'Связаться с нами', subject: 'Перевод и публикация книги — Globoox' },
  { id: 'trial', label: 'Получить пробный перевод', subject: 'Бесплатный пробный перевод — Globoox' },
  { id: 'contact', label: 'Связаться с Globoox', subject: 'Перевод и публикация книги — Globoox' },
];
const report = {
  base, startedAt: new Date().toISOString(), status: 'running',
  business: [], consent: [], menus: [], main: [], archive: null,
  screenshots: [], pageErrors: [], consoleErrors: [],
};
const normalize = text => text.replace(/\s+/gu, ' ').trim();

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });

function interceptMailto() {
  window.__releaseMailTargets = [];
  const nativeClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.protocol === 'mailto:') {
      window.__releaseMailTargets.push(this.href);
      return;
    }
    return nativeClick.call(this);
  };
}

function observe(page) {
  page.setDefaultTimeout(20_000);
  page.setDefaultNavigationTimeout(30_000);
  page.on('pageerror', error => report.pageErrors.push({ url: page.url(), message: error.message }));
  page.on('console', message => {
    if (message.type() !== 'error' || report.consoleErrors.length >= 12) return;
    const text = message.text().slice(0, 500);
    if (!report.consoleErrors.some(entry => entry.message === text)) {
      report.consoleErrors.push({ url: page.url(), message: text });
    }
  });
}

async function visit(page, route) {
  const response = await page.goto(`${base}/${route}`, { waitUntil: 'domcontentloaded' });
  assert.equal(response?.status(), 200, `${route}: HTTP status`);
  await page.locator('.marketing-page').waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.equal(new URL(page.url()).search, '', 'Smoke must use ordinary URLs without motion flags');
}

function buttonStyle(button) {
  const s = getComputedStyle(button);
  return Object.fromEntries([
    'fontFamily', 'fontSize', 'fontWeight', 'lineHeight',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderRadius', 'borderWidth', 'minHeight', 'backgroundColor', 'color',
  ].map(key => [key, s[key]]));
}

async function checkMotion(page) {
  const dots = page.locator('#hero circle > animateMotion');
  assert.equal(await dots.count(), 7);
  assert.equal(await page.locator('#hero path').count(), 7);
  assert(await page.locator('#hero path').evaluateAll(paths => paths.every(path => {
    const s = getComputedStyle(path);
    return s.animationName === 'none' && s.strokeDasharray === 'none';
  })), 'Connections must stay static without moving stroke trails');
  const positions = nodes => nodes.map(node => {
    const matrix = node.parentElement.getCTM();
    return { x: matrix.e, y: matrix.f };
  });
  const before = await dots.evaluateAll(positions);
  await page.waitForTimeout(250);
  const after = await dots.evaluateAll(positions);
  const distances = before.map((p, i) => Number(Math.hypot(p.x - after[i].x, p.y - after[i].y).toFixed(2)));
  assert(distances.every(distance => distance > .5), 'All seven dots must move on the real elapsed clock');
  return distances;
}

async function checkBusiness(page, route, width, touch) {
  await visit(page, route);
  await page.mouse.move(0, 0);
  assert.equal(await page.locator('.cookie-banner').count(), 0, 'Consent must persist across business routes');
  assert.equal(await page.locator('h1').count(), 1);
  assert.equal(await page.locator('header').count(), 1);
  assert.equal(normalize(await page.locator('#business-title').textContent()), heroTitle);
  assert.equal(await page.locator('#hero p').nth(1).textContent(), heroDescription);
  assert.equal(await page.locator('#hero button').count(), 1, 'No animation toggle in the hero');
  const audience = route === 'authors' ? 'Для авторов' : 'Для издателей';
  const otherAudience = route === 'authors' ? 'Для издателей' : 'Для авторов';
  assert.equal(normalize(await page.locator('#hero p').first().textContent()), audience);
  const headings = await page.locator('main h1, main h2, main h3').allTextContents();
  assert(headings.every(heading => !heading.includes(otherAudience)));
  const mainText = await page.locator('main').innerText();
  assert(!mainText.includes(otherAudience));
  if (route === 'authors') {
    assert(!/издател/iu.test(mainText));
    assert(!/С нами уже работают/iu.test(mainText));
    assert(!mainText.includes('Вместе мы строим'));
    assert.equal(await page.locator('#hero').getAttribute('data-hero-concept'), '04');
    assert.equal(await page.locator('[id^="hero-concept-"]').count(), 0);
  } else {
    assert(/С нами уже работают/iu.test(mainText));
    assert.equal(await page.locator('#hero [data-hero-concept]').count(), 0);
    assert.equal(await page.locator('#hero').getAttribute('data-hero-concept'), null);
  }
  assert.equal(await page.locator('header a[href="/my-books"]').count(), 0);
  assert(!(await page.locator('footer').textContent()).includes('Мы создаём первый'));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);

  const logos = page.locator('#hero img[src*="/images/marketplaces/"]');
  await logos.evaluateAll(images => Promise.all(images.map(image => image.decode())));
  const loadedLogos = await logos.evaluateAll(images => images.map(image => ({
    file: new URL(image.currentSrc || image.src).pathname.split('/').at(-1),
    loaded: image.complete && image.naturalWidth > 0,
  })));
  assert.deepEqual(loadedLogos.map(logo => logo.file), logoFiles);
  assert(loadedLogos.every(logo => logo.loaded));
  const motion = { normal: await checkMotion(page) };
  await page.emulateMedia({ reducedMotion: 'reduce' });
  motion.reduced = await checkMotion(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  let languages;
  if (route === 'authors') {
    assert.equal(await page.locator('#languages .supported-card').count(), 0);
    assert.equal(await page.locator('#languages img, #languages svg').count(), 0);
    assert.equal(await page.locator('#languages ul').count(), 2);
    const current = await page.locator('#languages ul').nth(0).locator('li').allTextContents();
    const future = await page.locator('#languages ul').nth(1).locator('li').allTextContents();
    assert.deepEqual(current, available);
    assert.deepEqual(future, upcoming);
    languages = { layout: 'author text lists', available: current.length, upcoming: future.length };
  } else {
    assert.equal(await page.locator('#languages .supported-card').count(), 1);
    const names = await page.locator('#languages .supported-lang-pill > bdi').allTextContents();
    assert.deepEqual(names, [...available, ...upcoming]);
    languages = { layout: 'original shared illustration', available: 4, upcoming: names.length - 4 };
  }

  const styles = [];
  for (const cta of ctas) {
    const button = page.locator(`#${cta.id}`).getByRole('button', { name: cta.label, exact: true });
    assert.equal(await button.count(), 1);
    styles.push(await button.evaluate(buttonStyle));
  }
  assert.deepEqual(styles[1], styles[0], `${route}: trial CTA style differs from hero`);
  assert.deepEqual(styles[2], styles[0], `${route}: contact CTA style differs from hero`);
  assert.equal(styles[0].borderRadius, '7px');
  assert.equal(styles[0].fontSize, width <= 900 ? '16px' : '17px');
  assert.equal(styles[0].paddingTop, width <= 900 ? '16px' : '18px');
  assert.equal(styles[0].paddingRight, width <= 900 ? '25px' : '30px');
  assert.equal(styles[0].fontWeight, '600');

  await page.mouse.move(0, 0);
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  const screenshot = `${route}-${width}.png`;
  await page.screenshot({ path: `${output}/${screenshot}`, fullPage: false });
  report.screenshots.push(screenshot);

  if (width < 500) {
    const menu = page.getByRole('button', { name: 'Открыть или закрыть меню', exact: true });
    const present = await menu.isVisible();
    if (present) {
      await menu.click();
      assert.equal(await menu.getAttribute('aria-expanded'), 'true');
      assert.equal(await page.locator('.landing-header-mobile-menu a').count(), 5);
      await page.keyboard.press('Escape');
      assert.equal(await menu.getAttribute('aria-expanded'), 'false');
    }
    report.menus.push({ route, width, checked: present });
  }

  const activations = [];
  for (const cta of ctas) {
    const section = page.locator(`#${cta.id}`);
    const button = section.getByRole('button', { name: cta.label, exact: true });
    await button.scrollIntoViewIfNeeded();
    if (route === 'authors' && cta.id !== 'hero') {
      assert.equal(await section.locator('img').count(), 1);
      await section.locator('img').evaluate(image => image.decode());
    }
    const before = await page.evaluate(() => window.__releaseMailTargets.length);
    if (touch) await button.tap();
    else await button.click();
    const targets = await page.evaluate(() => window.__releaseMailTargets);
    assert.equal(targets.length, before + 1);
    const target = new URL(targets.at(-1));
    assert.equal(target.protocol, 'mailto:');
    assert.equal(target.pathname, 'lomovski@globoox.co');
    assert.equal(target.searchParams.get('subject'), cta.subject);
    activations.push({ section: cta.id, modality: touch ? 'touch' : 'mouse', recipient: target.pathname, subject: target.searchParams.get('subject') });
  }
  if (!touch) {
    const trial = page.locator('#trial button');
    const before = await page.evaluate(() => window.__releaseMailTargets.length);
    await trial.focus();
    await page.keyboard.press('Enter');
    assert(await trial.evaluate(button => document.activeElement === button && getComputedStyle(button).outlineStyle !== 'none'));
    const targets = await page.evaluate(() => window.__releaseMailTargets);
    assert.equal(targets.length, before + 1);
    assert.equal(new URL(targets.at(-1)).searchParams.get('subject'), ctas[1].subject);
    activations.push({ section: 'trial', modality: 'keyboard', recipient: new URL(targets.at(-1)).pathname, subject: ctas[1].subject });
  }
  report.business.push({ route, width, audience, heroTitle, logoCount: loadedLogos.length, dotMovementPx: motion, languages, ctaStyle: styles[0], activations, overflow: 0 });
}

async function checkMain(page, width) {
  await visit(page, 'ru');
  assert.equal(await page.locator('h1').count(), 1);
  assert(await page.getByRole('link', { name: 'Открыть приложение', exact: true }).count() > 0);
  assert.equal(await page.locator('.supported-card').count(), 1);
  assert.equal(await page.locator('.supported-lang-pill').count(), 10);
  assert.equal(await page.locator('.supported-lang-pill > span').count(), 5);
  assert.equal(await page.locator('#business-main, #trial, #publishing, [data-hero-concept]').count(), 0);
  assert.equal(await page.locator('img[src*="business-sections"], img[src*="business-hero"]').count(), 0);
  assert.notEqual(normalize(await page.locator('h1').textContent()), heroTitle);
  assert(!(await page.locator('.marketing-page').innerText()).includes('Для издателей'));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
  report.main.push({ route: 'ru', width, openAppRetained: true, upcoming: 6, businessContentAbsent: true });
}

try {
  for (const width of [1440, 390]) {
    const touch = width < 500;
    const context = await browser.newContext({
      viewport: { width, height: touch ? 844 : 1000 },
      deviceScaleFactor: 1, isMobile: touch, hasTouch: touch,
      reducedMotion: 'no-preference',
    });
    await context.addInitScript(interceptMailto);
    const page = await context.newPage();
    observe(page);
    try {
      await visit(page, 'authors');
      const necessary = page.locator('.cookie-banner').getByRole('button', { name: /^Только (нужные|необходимые)$/u });
      await necessary.waitFor({ state: 'visible' });
      await necessary.click();
      await page.locator('.cookie-banner').waitFor({ state: 'detached' });
      report.consent.push({ width, choice: 'necessary', dismissed: true });
      for (const route of ['authors', 'publishers']) await checkBusiness(page, route, width, touch);
      await checkMain(page, width);

      if (!touch) {
        await visit(page, 'authors/hero-archive');
        assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/u);
        assert.equal(await page.locator('h1').count(), 1);
        assert.equal(await page.locator('#hero h1').count(), 1);
        assert.equal(await page.locator('#hero-concept-05 h2').count(), 1);
        assert.equal(await page.locator('#hero animateMotion').count(), 7);
        assert.equal(await page.locator('#hero-concept-05 animateMotion').count(), 7);
        assert.equal(await page.locator('[data-hero-concept="04"]').count(), 0);
        assert(await page.locator('a[href="/authors"]').count() > 0);
        report.archive = { noindex: true, originalHero: true, concept05: true, returnLink: true };
      }
    } finally {
      await context.close();
    }
  }
  assert.deepEqual(report.pageErrors, []);
  assert.equal(report.screenshots.length, 4);
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.failure = { message: error.message, location: error.stack?.split('\n').slice(1, 3).join('\n') };
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  await writeFile(`${output}/release-checks.json`, JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  console.log(JSON.stringify({ status: report.status, businessCases: report.business.length, screenshots: report.screenshots.length, pageErrors: report.pageErrors.length, consoleErrors: report.consoleErrors.length, evidence: output, failure: report.failure?.message }));
}
