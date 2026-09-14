import { notFound, redirect } from 'next/navigation';
import { isLandingLocale } from '@/lib/landing-i18n';
import { createClient } from '@/lib/supabase/server';
import EditorialLanding from './EditorialLanding';
import { createEditorialLandingJsonLd, type EditorialLandingMode } from './editorialMetadata';

/** Published locale pages check authentication; isolated previews stay available for review. */
export async function EditorialLandingServer({
  locale,
  mode,
}: {
  locale: string;
  mode: EditorialLandingMode;
}) {
  if (!isLandingLocale(locale)) notFound();

  if (mode === 'published') {
    // Preserve the existing localized landing's authenticated-user behavior.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect('/my-books');
  }

  const webAppJsonLd = mode === 'published'
    ? createEditorialLandingJsonLd({ locale, mode })
    : null;

  return (
    <>
      {webAppJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd).replace(/</g, '\\u003c') }}
        />
      )}
      <EditorialLanding locale={locale} navigationMode={mode} />
    </>
  );
}
