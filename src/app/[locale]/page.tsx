import { notFound } from 'next/navigation';
import { EditorialLandingServer } from '@/components/landing-editorial/EditorialLandingServer';
import { createEditorialLandingMetadata } from '@/components/landing-editorial/editorialMetadata';
import { isLandingLocale } from '@/lib/landing-i18n';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLandingLocale(locale)) notFound();
  return createEditorialLandingMetadata({ locale, mode: 'published' });
}

export default async function LocaleIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <EditorialLandingServer locale={locale} mode="published" />;
}
