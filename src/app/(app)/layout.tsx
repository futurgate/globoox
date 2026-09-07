import type { Metadata, Viewport } from 'next';
// import Script from 'next/script'; // re-enable with Microsoft Clarity below
import Header from '@/components/ui/Header';
import PostHogProvider from '@/components/PostHogProvider';
import SyncCheckClient from '@/components/SyncCheckClient';
import PaletteSync from '@/components/PaletteSync';
import { sharedWidgetDescription, siteTitle } from '@/lib/shareMetadata';
import { getThemeBootstrapScript } from '@/lib/themes';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: siteTitle,
  description: sharedWidgetDescription,
  keywords: [
    'reading',
    'books',
    'translation',
    'language learning',
    'ebooks',
    'epub reader',
    'AI translation',
    'book translator',
  ],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: siteTitle,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: siteTitle,
    description: sharedWidgetDescription,
    type: 'website',
    url: 'https://globoox.com',
    siteName: siteTitle,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: sharedWidgetDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: getThemeBootstrapScript() }} />
      {/* Microsoft Clarity temporarily disabled. Re-enable by uncommenting.
      {process.env.NODE_ENV === 'production' && (
        <Script
          id="microsoft-clarity"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
                (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                })(window, document, "clarity", "script", "vo25c0m78q");
            `,
          }}
        />
      )}
      */}
      <div className="antialiased bg-[var(--bg-grouped)]">
        <PostHogProvider />
        <SyncCheckClient />
        <PaletteSync />
        <div className="min-h-screen">
          <main>
            {children}
          </main>
          </div>
        <Header />
      </div>
    </>
  );
}
