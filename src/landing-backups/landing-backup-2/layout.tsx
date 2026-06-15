import { ReactNode } from 'react';
import type { Metadata } from 'next';
import { sharedWidgetDescription, sharedWidgetTitle, siteTitle } from '@/lib/shareMetadata';
import './landing.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://globoox.co';

export const metadata: Metadata = {
  title: siteTitle,
  description: sharedWidgetDescription,
  alternates: {
    canonical: '/landing',
  },
  openGraph: {
    title: sharedWidgetTitle,
    description: sharedWidgetDescription,
    url: `${SITE_URL}/landing`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: sharedWidgetTitle,
    description: sharedWidgetDescription,
  },
};

const webAppJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: siteTitle,
  url: SITE_URL,
  applicationCategory: 'ReadingApplication',
  operatingSystem: 'Any',
  description: sharedWidgetDescription,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free to upload and translate your first book',
  },
  featureList: [
    'EPUB ebook upload',
    'AI-powered book translation',
    'English, French, Spanish, German, Russian support',
    'Side-by-side original and translated text',
    'Reading progress sync',
    'Privacy-first: your books stay private',
  ],
};

export default function LandingLayout({ children }: { children: ReactNode }) {
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
