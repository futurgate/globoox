import { describe, expect, it } from 'vitest';
import { isLandingConsentPath } from '@/lib/landingConsentPath';

describe('landing consent route boundary', () => {
  it.each([
    '/landing-editorial', '/landing-editorial/',
    ...['en', 'es', 'fr', 'ru'].flatMap((locale) => [
      `/landing-editorial/${locale}`, `/landing-editorial/${locale}/`,
      `/landing-editorial/${locale}/legal/terms`, `/landing-editorial/${locale}/legal/privacy`,
    ]),
    '/landing-editorial/legal/terms', '/landing-editorial/legal/privacy',
    '/landing-editorial/privacy', '/landing-editorial/future/nested/page',
  ])('requires consent throughout the editorial subtree: %s', (pathname) => {
    expect(isLandingConsentPath(pathname)).toBe(true);
  });

  it.each([
    '/', '/my-books', '/my-books/reader', '/settings', '/api/books',
    '/landing-editorial-other', '/landing-editorial-other/fr', '/landing-editorials',
    '/other/landing-editorial', '/en/landing-editorial', '/landing/editorial',
  ])('does not extend the gate to unrelated routes: %s', (pathname) => {
    expect(isLandingConsentPath(pathname)).toBe(false);
  });

  it('preserves the former matcher outside the editorial subtree', () => {
    const formerMatcher = /^\/(?:landing|landing-editorial|(?:en|es|fr|ru)(?:\/landing)?)\/?$/;
    for (const base of ['landing', 'en', 'es', 'fr', 'ru', 'de', 'my-books', 'landing-backup']) {
      for (const suffix of ['', '/', '/landing', '/landing/', '/legal/terms', '/extra', '//']) {
        const pathname = `/${base}${suffix}`;
        expect(isLandingConsentPath(pathname), pathname).toBe(formerMatcher.test(pathname));
      }
    }
  });
});
