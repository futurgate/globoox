import { isLandingLocale } from '@/lib/landing-i18n';
import { redirect } from 'next/navigation';

// Rendered per-request (it only resolves the locale and redirects). Opting out of
// static prerender avoids a Next 16 / Turbopack prerender crash
// ("Invariant: Expected workUnitAsyncStorage to have a store") that fires when
// redirect() runs during static generation on the constrained Vercel builder.
export const dynamic = 'force-dynamic';

export default async function LocalizedLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale = isLandingLocale(locale) ? locale : 'en';
  redirect(`/${safeLocale}`);
}
