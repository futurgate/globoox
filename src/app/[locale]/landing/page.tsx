import { isLandingLocale } from '@/lib/landing-i18n';
import { redirect } from 'next/navigation';

export default async function LocalizedLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale = isLandingLocale(locale) ? locale : 'en';
  redirect(`/${safeLocale}`);
}
