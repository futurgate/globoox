import { notFound, redirect } from 'next/navigation';
import { HeroShowcase } from '@/components/landing/HeroShowcase';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { SupportedLanguages } from '@/components/landing/SupportedLanguages';
import { UsageAnimation } from '@/components/landing/UsageAnimation';
import { QualityAssuranceV2 } from '@/components/landing/QualityAssuranceV2';
import { FoundersSection } from '@/components/landing/FoundersSection';
import { CTA } from '@/components/landing/CTA';
import { Footer } from '@/components/landing/Footer';
import { createClient } from '@/lib/supabase/server';
import { getLandingMessages, isLandingLocale } from '@/lib/landing-i18n';

export default async function LocalizedLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLandingLocale(locale)) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/my-books');
  }

  const messages = getLandingMessages(locale);

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--marketing-shell-bg)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: '160px',
          background: 'var(--marketing-text)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, paddingTop: '92px' }}>
        <LandingHeader
          navItems={messages.header.nav}
          locale={locale}
          openAppLabel={messages.header.openApp}
          languageLabel={messages.header.languageLabel}
          languages={messages.header.languages}
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

        <section id="hero" aria-label={messages.sections.hero}>
          <HeroShowcase
            eyebrow={messages.hero.eyebrow}
            title={messages.hero.title}
            subtitle=""
            buttonText={messages.hero.button}
            titleClassName="hero-long-title"
          />
        </section>

        <section id="how-it-works" aria-label={messages.sections.howItWorks}>
          <UsageAnimation
            label={messages.usage.label}
            heading={messages.usage.heading}
            steps={messages.usage.steps}
          />
        </section>

        <section id="quality" aria-label={messages.sections.quality}>
          <QualityAssuranceV2
            label={messages.quality.label}
            heading={messages.quality.heading}
            description={messages.quality.description}
          />
        </section>

        <section id="languages" aria-label={messages.sections.languages}>
          <SupportedLanguages
            label={messages.supportedLanguages.label}
            heading={messages.supportedLanguages.heading}
            description={messages.supportedLanguages.description}
            currentLangs={messages.supportedLanguages.current}
            futureLangs={messages.supportedLanguages.future}
            soonLabel={messages.supportedLanguages.soonLabel}
            globeAlt={messages.supportedLanguages.globeAlt}
          />
        </section>

        <section id="team" aria-label={messages.sections.team}>
          <FoundersSection
            label={messages.founders.label}
            heading={messages.founders.heading}
            linkedinLabel={messages.founders.linkedinLabel}
            items={messages.founders.items}
          />
        </section>

        <section id="start" aria-label={messages.sections.start}>
          <CTA
            heading={messages.cta.heading}
            description={messages.cta.description}
            buttonText={messages.cta.button}
            floatingScripts={messages.cta.floatingScripts}
          />
        </section>

        <Footer
          tagline={messages.footer.tagline}
          legalLabel={messages.footer.legal}
          termsLabel={messages.footer.terms}
          privacyLabel={messages.footer.privacy}
          copyright={messages.footer.copyright}
        />
      </div>
    </>
  );
}
