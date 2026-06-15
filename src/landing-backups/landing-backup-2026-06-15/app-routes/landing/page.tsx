import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isLandingLocale } from '@/lib/landing-i18n';

export default async function LandingPage() {
  const cookieStore = await cookies();
  const preferredLocale = cookieStore.get('landing_locale')?.value;
  const locale = isLandingLocale(preferredLocale) ? preferredLocale : 'en';
  redirect(`/${locale}/landing`);
}
