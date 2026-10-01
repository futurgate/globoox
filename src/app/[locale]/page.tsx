import { notFound } from 'next/navigation';
import { LocalizedLandingPage } from '@/components/landing/LocalizedLandingPage';
import { createLandingJsonLd, createLandingMetadata } from '@/components/landing/landingMetadata';
import { isLandingLocale } from '@/lib/landing-i18n';
import '@/components/landing/landing.css';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLandingLocale(locale)) notFound();
  return createLandingMetadata(locale);
}

export default async function LocaleIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLandingLocale(locale)) notFound();
  const webAppJsonLd = createLandingJsonLd(locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd).replace(/</g, '\\u003c') }}
      />
      {await LocalizedLandingPage({ locale })}
    </>
  );
}
