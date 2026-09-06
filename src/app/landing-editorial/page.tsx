import type { Metadata } from 'next';
import { getLandingMessages } from '@/lib/landing-i18n';
import EditorialLanding from '@/components/landing-editorial/EditorialLanding';

export const metadata: Metadata = {
  title: getLandingMessages('en').metadata.title,
  description: getLandingMessages('en').metadata.description,
  robots: { index: false, follow: false },
  alternates: { canonical: '/landing-editorial' },
};

export default function EditorialLandingPage() {
  return <EditorialLanding />;
}
