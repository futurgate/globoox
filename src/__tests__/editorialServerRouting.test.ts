import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLandingJsonLd, createLandingMetadata } from '@/components/landing/landingMetadata';
import {
  createEditorialLandingJsonLd,
  createEditorialLandingMetadata,
  getEditorialLandingPath,
} from '@/components/landing-editorial/editorialMetadata';
import { getLandingMessages, landingLocales } from '@/lib/landing-i18n';

const auth = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
  redirect: vi.fn((path: string) => { throw new Error(`NEXT_REDIRECT:${path}`); }),
}));

vi.mock('@/lib/supabase/server', () => ({ createClient: auth.createClient }));
vi.mock('next/navigation', () => ({ notFound: auth.notFound, redirect: auth.redirect }));
vi.mock('@/components/landing-editorial/EditorialLanding', () => ({ default: () => null }));

import { EditorialLandingServer } from '@/components/landing-editorial/EditorialLandingServer';
import { generateMetadata } from '@/app/landing-editorial/[locale]/page';
import { generateMetadata as generatePublishedMetadata } from '@/app/[locale]/page';

describe('isolated editorial metadata', () => {
  it('retains a self-canonical English root preview', () => {
    const route = { locale: 'en', mode: 'preview', previewRoot: true } as const;
    expect(getEditorialLandingPath(route)).toBe('/landing-editorial');
    expect(createEditorialLandingMetadata(route).alternates?.canonical).toBe('/landing-editorial');
  });

  it.each(landingLocales)('%s preview stays non-indexable and within isolated locale URLs', (locale) => {
    const route = { locale, mode: 'preview' } as const;
    const metadata = createEditorialLandingMetadata(route);
    const path = `/landing-editorial/${locale}`;

    expect(getEditorialLandingPath(route)).toBe(path);
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.alternates).toEqual({
      canonical: path,
      languages: { en: '/landing-editorial/en', es: '/landing-editorial/es', fr: '/landing-editorial/fr', ru: '/landing-editorial/ru' },
    });
    expect(metadata.openGraph?.url).toBe(path);
    expect(metadata.title).toBe(getLandingMessages(locale).metadata.title);
    expect(metadata.description).toBe(getLandingMessages(locale).metadata.description);
    expect(createEditorialLandingJsonLd(route)).toBeNull();
  });

  it.each(landingLocales)('%s publication preserves existing SEO helpers exactly', (locale) => {
    const route = { locale, mode: 'published' } as const;
    expect(getEditorialLandingPath(route)).toBe(`/${locale}`);
    expect(createEditorialLandingMetadata(route)).toEqual(createLandingMetadata(locale));
    expect(createEditorialLandingJsonLd(route)).toEqual(createLandingJsonLd(locale));
  });

  it.each(landingLocales)('%s primary route retains its original published metadata', async (locale) => {
    expect(await generatePublishedMetadata({ params: Promise.resolve({ locale }) }))
      .toEqual(createLandingMetadata(locale));
  });
});

describe('editorial server mode boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.getUser.mockResolvedValue({ data: { user: null } });
    auth.createClient.mockResolvedValue({ auth: { getUser: auth.getUser } });
  });

  it.each(landingLocales)('renders %s preview without consulting the signed-in session', async (locale) => {
    await EditorialLandingServer({ locale, mode: 'preview' });
    expect(auth.createClient).not.toHaveBeenCalled();
    expect(auth.redirect).not.toHaveBeenCalled();
  });

  it('keeps the existing published authenticated-user redirect', async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: 'existing-user' } } });
    await expect(EditorialLandingServer({ locale: 'fr', mode: 'published' }))
      .rejects.toThrow('NEXT_REDIRECT:/my-books');
    expect(auth.getUser).toHaveBeenCalledOnce();
  });

  it('allows an anonymous published render after checking the session', async () => {
    await EditorialLandingServer({ locale: 'ru', mode: 'published' });
    expect(auth.getUser).toHaveBeenCalledOnce();
    expect(auth.redirect).not.toHaveBeenCalled();
  });

  it.each(['preview', 'published'] as const)('rejects an unknown locale before auth in %s mode', async (mode) => {
    await expect(EditorialLandingServer({ locale: 'de', mode })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(auth.createClient).not.toHaveBeenCalled();
  });

  it.each([generateMetadata, generatePublishedMetadata])('rejects unknown-locale metadata instead of emitting an English fallback', async (metadata) => {
    await expect(metadata({ params: Promise.resolve({ locale: 'unknown' }) }))
      .rejects.toThrow('NEXT_NOT_FOUND');
  });
});
