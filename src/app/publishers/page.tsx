import { BusinessLandingPage } from '@/components/landing-business/BusinessLandingPage';
import { createBusinessLandingMetadata } from '@/components/landing-business/metadata';

export const metadata = createBusinessLandingMetadata('publishers');

export default function PublishersPage() {
  return <BusinessLandingPage audience="publishers" />;
}
