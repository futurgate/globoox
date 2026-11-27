import type { Metadata } from 'next';
import { businessLandingContent } from './content';
import { getAuthorLandingContent, type AuthorLocale } from './author-locales';

const authorTitles: Record<AuthorLocale, string> = {
  ru: 'Globoox для авторов — перевод и публикация книг',
  fr: 'Globoox pour les auteurs — traduction et publication de livres',
  en: 'Globoox for authors — book translation and publishing',
};

const openGraphLocales: Record<AuthorLocale, string> = { ru: 'ru_RU', fr: 'fr_FR', en: 'en_US' };

export function createBusinessLandingMetadata(audience: 'authors' | 'publishers', locale: AuthorLocale = 'ru'): Metadata {
  const effectiveLocale = audience === 'authors' ? locale : 'ru';
  const title = audience === 'authors'
    ? authorTitles[effectiveLocale]
    : 'Globoox для издателей — перевод и публикация книг';
  const description = audience === 'authors'
    ? getAuthorLandingContent(locale).hero.description
    : businessLandingContent.hero.description;
  const path = audience === 'authors' && effectiveLocale !== 'ru' ? `/${effectiveLocale}/authors` : `/${audience}`;

  return {
    title,
    description,
    alternates: {
      canonical: path,
      ...(audience === 'authors' ? { languages: { ru: '/authors', fr: '/fr/authors', en: '/en/authors' } } : {}),
    },
    openGraph: { title, description, url: path, siteName: 'Globoox', type: 'website', locale: openGraphLocales[effectiveLocale] },
    twitter: { card: 'summary_large_image', title, description },
  };
}
