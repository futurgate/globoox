import type { MetadataRoute } from 'next';
import amazonBooks from '@/data/amazon-books.json';
import { landingLocales } from '@/lib/landing-i18n';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://globoox.co';

export default function sitemap(): MetadataRoute.Sitemap {
  const localizedLandingPages: MetadataRoute.Sitemap = landingLocales.map((locale) => ({
    url: `${SITE_URL}/${locale}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 1.0,
  }));

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/store`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];

  const bookPages: MetadataRoute.Sitemap = amazonBooks.books.map((book) => ({
    url: `${SITE_URL}/store/${book.id}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...localizedLandingPages, ...staticPages, ...bookPages];
}
