import { ReactNode } from 'react';
import type { Metadata } from 'next';
import { createSharedPreviewMetadata } from '@/lib/shareMetadata';
import {
  getLandingMessages,
  isLandingLocale,
  landingLocales,
  type LandingLocale,
} from '@/lib/landing-i18n';
import '../../landing/landing.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://globoox.co';

export function generateStaticParams() {
  return landingLocales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale: LandingLocale = isLandingLocale(locale) ? locale : 'en';
  const messages = getLandingMessages(safeLocale);
  const pagePath = `/${safeLocale}/landing`;

  return {
    title: messages.metadata.title,
    description: messages.metadata.description,
    alternates: {
      canonical: pagePath,
      languages: Object.fromEntries(
        landingLocales.map((landingLocale) => [landingLocale, `/${landingLocale}/landing`]),
      ),
    },
    ...createSharedPreviewMetadata(pagePath),
  };
}

export default async function LocalizedLandingLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: LandingLocale = isLandingLocale(locale) ? locale : 'en';
  const messages = getLandingMessages(safeLocale);

  const webAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: messages.metadata.title,
    url: `${SITE_URL}/${safeLocale}/landing`,
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />
      {children}
    </>
  );
}
