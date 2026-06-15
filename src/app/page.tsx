import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
	createSharedPreviewMetadata,
	sharedWidgetDescription,
	siteTitle,
} from '@/lib/shareMetadata';
import { isLandingLocale } from '@/lib/landing-i18n';

export const metadata: Metadata = {
	title: siteTitle,
	description: sharedWidgetDescription,
	alternates: {
		canonical: '/',
	},
	...createSharedPreviewMetadata('/'),
};

export default async function HomePage() {
	const cookieStore = await cookies();
	const preferredLocale = cookieStore.get('landing_locale')?.value;
	const locale = isLandingLocale(preferredLocale) ? preferredLocale : 'en';
	redirect(`/${locale}`);
}
