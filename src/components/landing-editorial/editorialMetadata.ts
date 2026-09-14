import type { Metadata } from 'next';
import {
  createLandingJsonLd,
  createLandingMetadata,
} from '@/components/landing/landingMetadata';
import { landingLocales, type LandingLocale } from '@/lib/landing-i18n';
import { createSharedPreviewMetadata } from '@/lib/shareMetadata';

export type EditorialLandingMode = 'preview' | 'published';

export type EditorialLandingRoute =
  | { locale: LandingLocale; mode: 'preview'; previewRoot?: false }
  | { locale: 'en'; mode: 'preview'; previewRoot: true }
  | { locale: LandingLocale; mode: 'published'; previewRoot?: never };

export function getEditorialLandingPath(route: EditorialLandingRoute): string {
  if (route.mode === 'published') return `/${route.locale}`;
  return route.previewRoot ? '/landing-editorial' : `/landing-editorial/${route.locale}`;
}

export function createEditorialLandingMetadata(route: EditorialLandingRoute): Metadata {
  const publishedMetadata = createLandingMetadata(route.locale);

  // Future publication is an explicit caller choice, never an environment switch.
  if (route.mode === 'published') return publishedMetadata;

  const pagePath = getEditorialLandingPath(route);
  return {
    ...publishedMetadata,
    robots: { index: false, follow: false },
    alternates: {
      canonical: pagePath,
      languages: Object.fromEntries(
        landingLocales.map((locale) => [locale, getEditorialLandingPath({ locale, mode: 'preview' })]),
      ),
    },
    ...createSharedPreviewMetadata(pagePath),
  };
}

export function createEditorialLandingJsonLd(route: EditorialLandingRoute) {
  // Preview pages do not publish a duplicate WebApplication declaration.
  return route.mode === 'published' ? createLandingJsonLd(route.locale) : null;
}
