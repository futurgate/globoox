import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getLandingMessages, landingLocales } from '@/lib/landing-i18n';
import { EditorialLocaleProvider, getEditorialLocaleData, useEditorialLocale } from '@/components/landing-editorial/EditorialLocale';
import { getEditorialWalkthroughScreens } from '@/components/landing-editorial/editorialUi';
import QualitySection from '@/components/landing-editorial/QualitySection';

const textContent = (html: string) => html.replace(/<[^>]*>/g, '');
const escapeText = (text: string) => textContent(renderToStaticMarkup(createElement('p', null, text)));

describe('editorial localization', () => {
  it.each(landingLocales)('uses the canonical %s messages without substituting English copy', (locale) => {
    const canonical = getLandingMessages(locale);
    expect(getEditorialLocaleData(locale).messages).toBe(canonical);

    function LocaleProbe() {
      const { locale: currentLocale, messages } = useEditorialLocale();
      return createElement('p', { lang: currentLocale }, messages.hero.title);
    }
    const html = renderToStaticMarkup(createElement(EditorialLocaleProvider, { locale }, createElement(LocaleProbe)));
    expect(html).toContain(`lang="${locale}"`);
    expect(textContent(html)).toBe(escapeText(canonical.hero.title));
  });

  it.each(landingLocales)('uses three real screenshots with the correct %s destination language', (locale) => {
    const screens = getEditorialWalkthroughScreens(locale);
    expect(screens).toHaveLength(3);
    expect(screens[1].src).toContain(locale === 'en' ? '2.1-es.webp' : '2.1-en.webp');
    expect(screens[2].src).toContain(locale === 'en' ? '3-es-en.webp' : `3-en-${locale}.webp`);
    for (const screen of screens) {
      expect(existsSync(resolve(process.cwd(), 'public', screen.src.slice(1)))).toBe(true);
      expect(screen.alt.length).toBeGreaterThan(20);
    }
  });

  it.each(landingLocales)('preserves every canonical excerpt character behind the %s comparison', (locale) => {
    const html = renderToStaticMarkup(createElement(EditorialLocaleProvider, { locale }, createElement(QualitySection)));
    const articles = [...html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/g)];
    const { original, translated } = getLandingMessages(locale).quality.compare;
    expect(articles).toHaveLength(2);
    [original, translated].forEach((passage, index) => {
      expect(textContent(articles[index][1])).toBe(passage.paragraphs.map(escapeText).join(''));
    });
    const { quality: ui } = getEditorialLocaleData(locale).ui;
    expect(html).toContain(escapeText(ui.hideTranslation));
    expect(html).toContain(escapeText(ui.readFullExcerpt));
    expect(html).toContain(escapeText(ui.comparisonValue(50, original.lang, translated.lang)));
  });
});
