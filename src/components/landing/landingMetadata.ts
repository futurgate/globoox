import type { Metadata } from 'next';
import { createSharedPreviewMetadata } from '@/lib/shareMetadata';
import {
  getLandingMessages,
  isLandingLocale,
  landingLocales,
  type LandingLocale,
} from '@/lib/landing-i18n';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://globoox.co';

export function getSafeLandingLocale(locale: string): LandingLocale {
  return isLandingLocale(locale) ? locale : 'en';
}

export function createLandingMetadata(locale: string): Metadata {
  const safeLocale = getSafeLandingLocale(locale);
  const messages = getLandingMessages(safeLocale);
  const pagePath = `/${safeLocale}`;

  return {
    title: messages.metadata.title,
    description: messages.metadata.description,
    alternates: {
      canonical: pagePath,
      languages: Object.fromEntries(landingLocales.map((value) => [value, `/${value}`])),
    },
    ...createSharedPreviewMetadata(pagePath),
  };
}

export function createLandingJsonLd(locale: string) {
  const safeLocale = getSafeLandingLocale(locale);
  const messages = getLandingMessages(safeLocale);

  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: messages.metadata.title,
    url: `${SITE_URL}/${safeLocale}`,
    applicationCategory: 'ReadingApplication',
    operatingSystem: 'Any',
    description: messages.metadata.description,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: messages.metadata.freeOffer,
    },
    featureList: messages.metadata.featureList,
    inLanguage: safeLocale,
  };
}
