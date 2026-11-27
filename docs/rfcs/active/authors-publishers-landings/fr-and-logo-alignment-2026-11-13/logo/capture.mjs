import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const output = fileURLToPath(new URL('./', import.meta.url));
const round = process.argv[2] || 'baseline';
const widths = (process.argv[3] || '1536,1024,390').split(',').map(Number);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ deviceScaleFactor: 2 });
const measurements = [];
for (const width of widths) {
  await page.setViewportSize({width, height: width < 500 ? 900 : 1100});
  await page.goto('http://localhost:3000/authors');
  await page.evaluate(() => document.fonts.ready);
  const cookie = page.getByRole('button', { name: 'Только нужные', exact: true });
  if (await cookie.isVisible()) await cookie.click();
  await page.locator('#hero img').evaluateAll(imgs => Promise.all(imgs.map(img => img.decode())));
  const diagram = page.locator('#hero [role=img]');
  await diagram.scrollIntoViewIfNeeded();
  const geometry = await diagram.evaluate(el => ({
    viewport: innerWidth,
    overflow: document.documentElement.scrollWidth - innerWidth,
    bounds: el.getBoundingClientRect().toJSON(),
    logos: [...el.querySelectorAll('img[data-logo]')].map(img => ({
      name: img.dataset.logo,
      rect: img.getBoundingClientRect().toJSON(),
      parent: img.parentElement.getBoundingClientRect().toJSON(),
      fit: getComputedStyle(img).objectFit,
      position: getComputedStyle(img).objectPosition,
      transform: getComputedStyle(img).transform,
    }))
  }));
  measurements.push(geometry);
  await diagram.screenshot({path: `${output}${round}-${width}.png`});
  await diagram.evaluate(el => {
    const first = el.querySelector('img[data-logo]').parentElement;
    const line = document.createElement('i');
    line.style.cssText = `position:absolute;left:${first.offsetLeft}px;top:0;bottom:0;width:1px;background:#f00080;opacity:.55;z-index:30;pointer-events:none`;
    el.append(line);
  });
  await diagram.screenshot({path: `${output}${round}-${width}-guide.png`});
}
await writeFile(`${output}${round}.json`, JSON.stringify(measurements, null, 2));
await browser.close();
console.log(JSON.stringify(measurements.map(m => ({viewport:m.viewport,overflow:m.overflow})),null,2));
