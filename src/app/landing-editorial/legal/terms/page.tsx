import { EditorialLegalPage } from '@/components/landing-editorial/EditorialLegalPage';
import { createEditorialLegalMetadata } from '@/components/landing-editorial/editorialLegalCopy';

export const metadata = createEditorialLegalMetadata('terms');

export default function EditorialTermsPreview() {
  return <EditorialLegalPage kind="terms" />;
}
