import { EditorialLandingServer } from '@/components/landing-editorial/EditorialLandingServer';
import { createEditorialLandingMetadata } from '@/components/landing-editorial/editorialMetadata';

export const metadata = createEditorialLandingMetadata({ locale: 'en', mode: 'preview', previewRoot: true });

export default function EditorialLandingPage() {
  return <EditorialLandingServer locale="en" mode="preview" />;
}
