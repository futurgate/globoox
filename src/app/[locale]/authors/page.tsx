import { notFound } from 'next/navigation';
import { BusinessLandingPage } from '@/components/landing-business/BusinessLandingPage';
import { createBusinessLandingMetadata } from '@/components/landing-business/metadata';

type AuthorsPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: AuthorsPageProps) {
  const { locale } = await params;
  if (locale !== 'fr') notFound();
  return createBusinessLandingMetadata('authors', locale);
}

export default async function LocalizedAuthorsPage({ params }: AuthorsPageProps) {
  const { locale } = await params;
  if (locale !== 'fr') notFound();
  return <BusinessLandingPage audience="authors" locale={locale} />;
}
