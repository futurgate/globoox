import { LocalizedLandingPage } from '@/components/landing/LocalizedLandingPage';
import { createLandingJsonLd, createLandingMetadata } from '@/components/landing/landingMetadata';
import '@/components/landing/landing.css';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return createLandingMetadata(locale);
}

export default async function LocaleIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const webAppJsonLd = createLandingJsonLd(locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />
      {await LocalizedLandingPage({ locale })}
    </>
  );
}
