import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Hero } from '@/components/landing/Hero';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { PrivacyManifest } from '@/components/landing/PrivacyManifest';
import { SupportedLanguages } from '@/components/landing/SupportedLanguages';
import { UsageAnimation } from '@/components/landing/UsageAnimation';
import { QualityAssuranceV2 } from '@/components/landing/QualityAssuranceV2';
import { CTA } from '@/components/landing/CTA';
import { Footer } from '@/components/landing/Footer';

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/my-books');
  }

  return (
    <>
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, background: 'var(--marketing-shell-bg)', pointerEvents: 'none', zIndex: 0 }} />
      <div aria-hidden="true" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, height: '160px', background: 'var(--marketing-text)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1, paddingTop: '92px' }}>
        <LandingHeader
          navItems={[
            { label: 'How it works', href: '#how-it-works' },
            { label: 'Quality', href: '#quality' },
            { label: 'Languages', href: '#languages' },
            { label: 'Privacy', href: '#privacy' },
            { label: 'Start reading', href: '#start' },
          ]}
        />
        <style>{`
          .hero-long-title {
            font-size: 42px !important;
          }
          @media (max-width: 1023px) {
            .hero-long-title {
              font-size: 32px !important;
            }
          }
          @media (max-width: 639px) {
            .hero-long-title {
              font-size: 28px !important;
            }
          }
        `}</style>
        <section id="hero" aria-label="Hero">
          <Hero
            variant="split"
            withBooks={true}
            title="Globoox — reading app that instantly translates e&#8209;books into your native language"
            subtitle=""
            titleClassName="hero-long-title"
          />
        </section>

        <section id="how-it-works" aria-label="How it works">
          <UsageAnimation />
        </section>

        <section id="quality" aria-label="Translation quality">
          <QualityAssuranceV2
            label="Translation Quality"
            heading="Translations You Can Trust"
            description="Built on an AI engine fine-tuned by expert linguists, our app delivers clear, accurate, and easy-to-read translations that capture the author's true intent."
          />
        </section>

        <section id="languages" aria-label="Supported languages">
          <SupportedLanguages />
        </section>

        <section id="privacy" aria-label="Privacy">
          <PrivacyManifest />
        </section>

        <section id="start" aria-label="Get started">
          <CTA
            heading="Start with your first book"
            description="Upload your EPUB and enjoy it in your language."
            buttonText="Upload Your First Book"
          />
        </section>

        <Footer
          tagline="We are building a global book platform where any reader can discover, buy, read, and listen to any book in their native language."
        />
      </div>
    </>
  );
}
