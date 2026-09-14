import { ReactNode } from 'react';
import type { Metadata } from 'next';
import UtmCapture from '@/components/UtmCapture';
import { sharedWidgetDescription, siteTitle } from '@/lib/shareMetadata';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://globoox.co';

export const metadata: Metadata = {
  title: siteTitle,
  description: sharedWidgetDescription,
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
    ],
    apple: '/apple-touch-icon.png',
  },
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: siteTitle,
    description: sharedWidgetDescription,
    siteName: siteTitle,
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: sharedWidgetDescription,
  },
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: siteTitle,
  url: SITE_URL,
  logo: `${SITE_URL}/icon-512.png`,
  description: sharedWidgetDescription,
  sameAs: [],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body>
        <UtmCapture />
        {children}
      </body>
    </html>
  );
}
