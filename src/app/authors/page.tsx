import { BusinessLandingPage } from '@/components/landing-business/BusinessLandingPage';
import { createBusinessLandingMetadata } from '@/components/landing-business/metadata';

export const metadata = createBusinessLandingMetadata('authors');

export default function AuthorsPage() {
  return <BusinessLandingPage audience="authors" />;
}
