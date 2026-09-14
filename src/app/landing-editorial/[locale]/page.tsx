import { notFound } from 'next/navigation';
import { EditorialLandingServer } from '@/components/landing-editorial/EditorialLandingServer';
import { createEditorialLandingMetadata } from '@/components/landing-editorial/editorialMetadata';
import { isLandingLocale, landingLocales } from '@/lib/landing-i18n';

type LocalizedPreviewProps = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return landingLocales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocalizedPreviewProps) {
  const { locale } = await params;
  if (!isLandingLocale(locale)) notFound();
  return createEditorialLandingMetadata({ locale, mode: 'preview' });
}

export default async function LocalizedEditorialPreview({ params }: LocalizedPreviewProps) {
  const { locale } = await params;
  return <EditorialLandingServer locale={locale} mode="preview" />;
}
