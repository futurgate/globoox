import { describe, expect, it, vi } from 'vitest';
import { createBusinessLandingMetadata } from '@/components/landing-business/metadata';
import { businessLandingContent } from '@/components/landing-business/content';
import sitemap from '@/app/sitemap';

vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('NEXT_NOT_FOUND'); },
}));
vi.mock('@/components/landing-business/BusinessLandingPage', () => ({ BusinessLandingPage: () => null }));

import LocalizedAuthorsPage, { generateMetadata } from '@/app/[locale]/authors/page';

describe('author landing locale routes', () => {
  it('gives French its own canonical and the PDF description, including Litres', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'fr' }) });
    expect(metadata.alternates).toEqual({
      canonical: '/fr/authors',
      languages: { ru: '/authors', fr: '/fr/authors' },
    });
    expect(metadata.description).toBe('Nous traduisons votre livre et le mettons en vente sur Amazon, Kobo, Litres ou tout autre site de livres numériques.');
    expect(metadata.openGraph).toMatchObject({ url: '/fr/authors', locale: 'fr_FR' });
    expect(metadata.twitter?.description).toBe(metadata.description);
  });

  it('preserves the Russian canonical and copy while adding reciprocal alternates', () => {
    const metadata = createBusinessLandingMetadata('authors');
    expect(metadata.title).toBe('Globoox для авторов — перевод и публикация книг');
    expect(metadata.description).toBe(businessLandingContent.hero.description);
    expect(metadata.alternates).toEqual({
      canonical: '/authors',
      languages: { ru: '/authors', fr: '/fr/authors' },
    });
    expect(metadata.openGraph).toMatchObject({ url: '/authors', locale: 'ru_RU' });
  });

  it('leaves publishers Russian and does not advertise an untranslated French route', () => {
    const metadata = createBusinessLandingMetadata('publishers');
    expect(metadata.title).toBe('Globoox для издателей — перевод и публикация книг');
    expect(metadata.description).toBe(businessLandingContent.hero.description);
    expect(metadata.alternates).toEqual({ canonical: '/publishers' });
    expect(metadata.openGraph).toMatchObject({ url: '/publishers', locale: 'ru_RU' });
    expect(createBusinessLandingMetadata('publishers', 'fr')).toEqual(metadata);
  });

  it.each(['ru', 'en', 'es', 'de', 'unknown'])(
    'rejects the unimplemented /%s/authors route in both render and metadata', async (locale) => {
      const props = { params: Promise.resolve({ locale }) };
      await expect(generateMetadata(props)).rejects.toThrow('NEXT_NOT_FOUND');
      await expect(LocalizedAuthorsPage(props)).rejects.toThrow('NEXT_NOT_FOUND');
    },
  );

  it('lists both author URLs with reciprocal languages and no invented publisher translations', () => {
    const pages = sitemap();
    const ru = pages.find((page) => page.url.endsWith('/authors') && !page.url.endsWith('/fr/authors'));
    const fr = pages.find((page) => page.url.endsWith('/fr/authors'));
    expect(ru).toBeDefined();
    expect(fr).toBeDefined();
    expect(ru?.alternates?.languages).toEqual({ ru: ru?.url, fr: fr?.url });
    expect(fr?.alternates?.languages).toEqual(ru?.alternates?.languages);
    expect(pages.some((page) => page.url.endsWith('/fr/publishers'))).toBe(false);
  });
});
