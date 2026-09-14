import { describe, expect, it } from 'vitest';
import { getLandingMessages, landingLocales } from '../lib/landing-i18n';
import { getEditorialHeroParts } from '../components/landing-editorial/editorialHeroCopy';

describe('editorial hero layout preserves canonical text', () => {
  it.each(landingLocales)('retains every word and punctuation in %s', locale => {
    const title = getLandingMessages(locale).hero.title;
    const parts = getEditorialHeroParts(title, locale);
    expect(Object.values(parts).join('')).toBe(title);
    expect(parts.intro.length).toBeGreaterThan(0);
    expect(parts.emphasis.length).toBeGreaterThan(0);
  });
  it('falls back to the complete sentence when the canonical wording changes', () => {
    expect(getEditorialHeroParts('A new title.', 'en')).toEqual({ intro: '', lead: 'A new title.', connector: '', emphasis: '' });
  });
});
