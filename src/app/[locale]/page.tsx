import { redirect } from 'next/navigation';
import { isLandingLocale } from '@/lib/landing-i18n';

export default async function LocaleIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${isLandingLocale(locale) ? locale : 'en'}/landing`);
}
