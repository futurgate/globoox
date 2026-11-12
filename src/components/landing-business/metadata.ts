import type { Metadata } from 'next';
import { businessLandingContent } from './content';
import { getAuthorLandingContent, type AuthorLocale } from './author-locales';

export function createBusinessLandingMetadata(audience: 'authors' | 'publishers', locale: AuthorLocale = 'ru'): Metadata {
  const isFrench = audience === 'authors' && locale === 'fr';
  const title = audience === 'authors'
    ? isFrench ? 'Globoox pour les auteurs — traduction et publication de livres' : 'Globoox для авторов — перевод и публикация книг'
    : 'Globoox для издателей — перевод и публикация книг';
  const description = audience === 'authors'
    ? getAuthorLandingContent(locale).hero.description
    : businessLandingContent.hero.description;
  const path = isFrench ? '/fr/authors' : `/${audience}`;

  return {
    title,
    description,
    alternates: {
      canonical: path,
      ...(audience === 'authors' ? { languages: { ru: '/authors', fr: '/fr/authors' } } : {}),
    },
    openGraph: { title, description, url: path, siteName: 'Globoox', type: 'website', locale: isFrench ? 'fr_FR' : 'ru_RU' },
    twitter: { card: 'summary_large_image', title, description },
  };
}
