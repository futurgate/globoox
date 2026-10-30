import type { Metadata } from 'next';
import { businessLandingContent } from './content';

export function createBusinessLandingMetadata(audience: 'authors' | 'publishers'): Metadata {
  const title = audience === 'authors'
    ? 'Globoox для авторов — перевод и публикация книг'
    : 'Globoox для издателей — перевод и публикация книг';
  const description = businessLandingContent.hero.description;
  const path = `/${audience}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: 'Globoox', type: 'website', locale: 'ru_RU' },
    twitter: { card: 'summary_large_image', title, description },
  };
}
