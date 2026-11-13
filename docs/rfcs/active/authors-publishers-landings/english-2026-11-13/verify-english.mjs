import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { access, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Browser evidence for the English author's landing, based on source-en.pdf.
// Run from the repo with localhost:3000 available; no real email is opened.
const out = fileURLToPath(new URL('.', import.meta.url));
const base = process.env.LANDING_QA_BASE ?? 'http://localhost:3000';
const ids = ['hero', 'translation', 'languages', 'quality', 'trial', 'publishing', 'team', 'contact'];
const normalize = value => value.replace(/\s+/g, ' ').trim();
const expected = {
  hero: ['For authors', 'Sell your books worldwide in every language, on every platform', 'We translate your work and publish it on Amazon, Kobo, and other major ebook stores.', 'Get in touch'],
  translation: ['Translation that opens your book to readers worldwide', 'It runs on an AI-based translation system we built in-house with linguists, designed for literary and genre fiction, essays, popular science, and self-help.'],
  languages: ['Languages', 'Available now', 'Coming soon'],
  quality: ['Translation quality', 'Reads as naturally as the original', 'We preserve your style, voice, and terminology, and the result is comparable to a professional translator’s work.'],
  trial: ['One chapter, on us', 'Send us your book, and we’ll translate one chapter for free.', 'Get my free chapter'],
  publishing: ['We take your book all the way to readers', 'Production', 'We format your files to meet each platform’s requirements.', 'Distribution', 'We list your title in the stores you choose.', 'Royalties', 'We collect the sales revenue and pay you your share.'],
  team: ['Who we are', 'Meet the team', 'Globoox brings together a designer specializing in ebook typography, a linguist, a multilingual translator, and a software engineer with a deep understanding of AI.'],
  contact: ['Readers around the world are waiting for your book', 'Contact Globoox'],
};
const localizedAssets = [
  '/images/business-hero/book-concept-04-en.png',
  '/images/business-sections/trial-book-chapter-en.png',
  '/images/business-sections/contact-book-arcs-en.png',
];
for (const path of localizedAssets) await access(`public${path}`);
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
const previous = await readFile(out + 'browser-checks.json', 'utf8').then(JSON.parse).catch(() => null);
const previousAttempts = [...(previous?.previousAttempts ?? [])];
if (previous && !previous.passed) previousAttempts.push({ startedAt: previous.startedAt ?? null, failure: previous.failure, completedChecks: { copy: previous.copy.length, layouts: previous.layouts.length } });
const report = { startedAt: new Date().toISOString(), base, source: 'source-en.pdf', previousAttempts, copy: [], layouts: [], cookies: [], dropdowns: [], motion: [], metadata: [], interactions: [], screenshots: [], errors: [], passed: false };
page.on('pageerror', error => report.errors.push(error.message));
const ready = async () => {
  await page.evaluate(() => document.fonts.ready);
  await page.locator('img').evaluateAll(images => {
    images.forEach(image => { image.loading = 'eager'; });
    return Promise.all(images.map(image => image.decode()));
  });
};
const goto = async path => {
  // Same-document/hash navigation returns null; verify HTTP separately in that case.
  const response = await page.goto(base + path) ?? await page.request.get(base + path);
  assert.equal(response.status(), 200, path);
  await ready();
};

try {
  await goto('/en/authors');
  assert.equal(await page.locator('.marketing-page').getAttribute('lang'), 'en');
  assert.equal(await page.locator('h1').count(), 1);
  assert.deepEqual(await page.locator('main > section').evaluateAll(sections => sections.map(section => section.id)), ids);
  for (const [id, phrases] of Object.entries(expected)) {
    const text = normalize(await page.locator('#' + id).innerText());
    for (const phrase of phrases) assert(text.toLowerCase().includes(phrase.toLowerCase()), `${id}: ${phrase}`);
    report.copy.push({ id, phrases });
  }
  const mainText = normalize(await page.locator('main').innerText());
  assert(!/Trusted by|leading names in Russian publishing|С нами|Вместе мы|Продавайте/.test(mainText));
  assert.deepEqual(await page.locator('#languages li').allTextContents(), ['English', 'Français', 'Español', 'Русский', 'Deutsch', 'Italiano', 'Português', 'Türkçe', '中文', '日本語', '한국어', 'العربية', 'فارسی']);
  assert.deepEqual(await page.locator('#team article h3').allTextContents(), ['Tatiana Melnikova', 'Anton Lomovski', 'Kondrat Kondratenko', 'Maxim Ilichev']);
  for (const [index, role] of ['CTO', 'CEO', 'Head of design', 'Linguist'].entries()) {
    assert(normalize(await page.locator('#team article').nth(index).innerText()).toLowerCase().includes(role.toLowerCase()));
  }
  assert.equal(await page.locator('#team article').count(), 4);
  assert.equal(await page.locator('#team a').count(), 4);
  assert.equal(await page.locator('#quality [role=slider]').first().getAttribute('aria-label'), 'Compare original and translation');
  const quality = await page.locator('#quality').innerText();
  assert(quality.includes('RU→EN'));
  for (const fragment of ['Александр', 'Лурия', 'Эта маленькая книжка', 'Alexander Luria', 'A Little Book About a Vast Memory', 'For nearly thirty years']) assert(quality.includes(fragment), fragment);
  for (const asset of localizedAssets) assert(await page.locator(`img[src*="${encodeURIComponent(asset)}"],img[src="${asset}"]`).count(), asset);

  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(200);
    const cookie = await page.locator('.cookie-banner').evaluate(banner => ({
      width: innerWidth,
      elements: [...banner.querySelectorAll('h2,p,button')].map(element => {
        const range = document.createRange();
        range.selectNodeContents(element);
        const rects = [...range.getClientRects()].filter(rect => rect.width > 0);
        return { text: element.textContent, lines: new Set(rects.map(rect => Math.round(rect.top))).size };
      }),
    }));
    report.cookies.push(cookie);
    for (const element of cookie.elements) assert.equal(element.lines, 1, `${width}: cookie ${element.text}`);
  }
  await page.getByRole('button', { name: 'Essential only', exact: true }).click();
  assert.equal(await page.locator('.cookie-banner').count(), 0);

  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(150);
    const layout = await page.evaluate(() => ({
      width: innerWidth,
      overflow: document.documentElement.scrollWidth - innerWidth,
      broken: [...document.images].filter(image => !image.complete || !image.naturalWidth).map(image => image.src),
      outside: [...document.querySelectorAll('main h1,main h2,main h3,main p,main button,#languages li')].filter(element => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && (box.left < -1 || box.right > innerWidth + 1);
      }).map(element => element.textContent),
    }));
    report.layouts.push(layout);
    assert.equal(layout.overflow, 0, `overflow at ${width}`);
    assert.deepEqual(layout.broken, []);
    assert.deepEqual(layout.outside, []);
    if ([1440, 390].includes(width)) {
      for (const id of ids) {
        const filename = `en-${id}-${width}.png`;
        await page.locator('#' + id).screenshot({ path: out + filename, style: 'header,nextjs-portal{visibility:hidden}' });
        report.screenshots.push(filename);
      }
    }
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('#hero').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('#hero animateMotion').count(), 7);
  const positions = () => page.locator('#hero animateMotion').evaluateAll(motions => motions.map(motion => {
    const circle = motion.parentElement;
    const transform = circle.getCTM();
    return { tag: circle.tagName, radius: circle.getAttribute('r'), x: transform.e, y: transform.f };
  }));
  for (const reducedMotion of ['no-preference', 'reduce']) {
    await page.emulateMedia({ reducedMotion });
    const before = await positions();
    await page.waitForTimeout(300);
    const after = await positions();
    const movements = before.map((point, i) => Math.hypot(after[i].x - point.x, after[i].y - point.y));
    assert(movements.every(distance => distance > 0.1), 'all seven dots move');
    assert(before.every(point => point.tag === 'circle' && Number(point.radius) <= 4));
    report.motion.push({ reducedMotion, before, after, movements });
  }

  for (const [id, name, subject] of [
    ['hero', 'Get in touch', 'Book translation and publishing — Globoox'],
    ['trial', 'Get my free chapter', 'One chapter, on us — Globoox'],
    ['contact', 'Contact Globoox', 'Book translation and publishing — Globoox'],
  ]) {
    await page.locator('#' + id).getByRole('button', { name, exact: true }).click();
    const target = new URL(await page.evaluate(() => window.__emailTargets.at(-1)));
    assert.equal(target.pathname, 'lomovski@globoox.co');
    assert.equal(target.searchParams.get('subject'), subject);
    report.interactions.push({ id, email: target.href });
  }

  for (const width of [1920, 2560]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => scrollTo(0, 0));
    await page.getByRole('button', { name: 'Language', exact: true }).filter({ visible: true }).click();
    await page.waitForTimeout(220);
    const boxes = await page.evaluate(() => {
      const trigger = document.querySelector('.landing-header-language-trigger').getBoundingClientRect();
      const dropdown = document.querySelector('.landing-header-language-dropdown').getBoundingClientRect();
      return { width: innerWidth, triggerRight: trigger.right, menuRight: dropdown.right, menuLeft: dropdown.left, delta: dropdown.right - trigger.right };
    });
    report.dropdowns.push(boxes);
    assert(Math.abs(boxes.delta) <= 1, `dropdown right alignment at ${width}`);
    assert(boxes.menuLeft >= 0 && boxes.menuRight <= width);
    await page.keyboard.press('Escape');
  }

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await goto('/authors#languages');
    for (const [trigger, destination, path, menu, locale] of [
      ['Язык', 'English', '/en/authors', 'Открыть или закрыть меню', 'en'],
      ['Language', 'Français', '/fr/authors', 'Open or close menu', 'fr'],
      ['Langue', 'Русский', '/authors', 'Ouvrir ou fermer le menu', 'ru'],
    ]) {
      if (width < 900) await page.getByRole('button', { name: menu, exact: true }).click();
      await page.getByRole('button', { name: trigger, exact: true }).filter({ visible: true }).click();
      await page.getByRole('button', { name: destination, exact: true }).filter({ visible: true }).click();
      await page.waitForURL(`${base}${path}#languages`);
      await ready();
      assert.equal(await page.locator('.marketing-page').getAttribute('lang'), locale);
      assert((await context.cookies()).some(cookie => cookie.name === 'landing_locale' && cookie.value === locale));
    }
    report.interactions.push(`RU → EN → FR → RU with hash and locale cookie, ${width}px`);
  }

  for (const [path, locale] of [['/authors', 'ru'], ['/fr/authors', 'fr'], ['/en/authors', 'en']]) {
    await goto(path);
    const canonical = await page.locator('link[rel=canonical]').getAttribute('href');
    const alternates = await page.locator('link[rel=alternate][hreflang]').evaluateAll(links => Object.fromEntries(links.map(link => [link.hreflang, link.href])));
    assert.equal(canonical, 'https://globoox.co' + path);
    assert.deepEqual(alternates, { ru: 'https://globoox.co/authors', fr: 'https://globoox.co/fr/authors', en: 'https://globoox.co/en/authors' });
    report.metadata.push({ path, locale, canonical, alternates });
    if (locale === 'ru') {
      assert((await page.locator('#translation').innerText()).includes('литературы о саморазвитии'));
      assert.equal(await page.locator('#contact h2').innerText(), 'Читатели по всему миру ждут вашу книгу');
    }
    if (locale === 'fr') {
      assert((await page.locator('#hero').innerText()).includes('Amazon, Kobo, Litres'));
      assert((await page.locator('#trial').innerText()).includes('Découvrez un chapitre de votre livre dans la langue de votre choix.'));
      assert.equal(await page.locator('#contact h2').innerText(), 'Votre livre à la rencontre des lecteurs du monde entier');
      assert((await page.locator('#quality').innerText()).includes('EN→FR'));
    }
  }
  await goto('/publishers');
  assert((await page.locator('#translation').innerText()).includes('pour la fiction') === false);
  assert((await page.locator('#translation').innerText()).includes('для художественной и научно-популярной литературы'));
  assert.equal(await page.locator('#contact h2').innerText(), 'Откройте свою книгу читателям всего мира');
  assert.equal(await page.getByRole('button', { name: 'Язык', exact: true }).count(), 0);
  report.interactions.push('Russian authors, French authors, and publishers retained their established copy and examples');
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.failure = { message: error.message, stack: error.stack };
  throw error;
} finally {
  await writeFile(out + 'browser-checks.json', JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ passed: report.passed, layouts: report.layouts.length, screenshots: report.screenshots.length, errors: report.errors }));
