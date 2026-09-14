import { EditorialLegalPage } from '@/components/landing-editorial/EditorialLegalPage';
import { createEditorialLegalMetadata } from '@/components/landing-editorial/editorialLegalCopy';

export const metadata = createEditorialLegalMetadata('privacy');

export default function EditorialPrivacyPreview() {
  return <EditorialLegalPage kind="privacy" />;
}
