'use client';

import { Hero } from '@/components/landing/Hero';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { FeaturesGrid } from '@/components/landing/FeaturesGrid';
import { UseCases } from '@/components/landing/UseCases';
import { QualityAssuranceV2 } from '@/components/landing/QualityAssuranceV2';
import { Reviews } from '@/components/landing/Reviews';
import { Pricing } from '@/components/landing/Pricing';
import { FAQ } from '@/components/landing/FAQ';
import { CTA } from '@/components/landing/CTA';
import { Footer } from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <>
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, background: 'var(--parchment)', pointerEvents: 'none', zIndex: 0 }} />
      <div aria-hidden="true" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, height: '160px', background: 'var(--ink)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1, paddingTop: '92px' }}>
        <LandingHeader
          navItems={[
            { label: 'Use Cases', href: '#use-cases' },
            { label: 'Features', href: '#features' },
            { label: 'Quality', href: '#quality' },
            { label: 'FAQ', href: '#faq' },
          ]}
        />
        {/* Hero: Split with books */}
        <Hero
          variant="split"
          withBooks={true}
          title="The world's library, in your native language."
          subtitle="Instantly translate any e-book and experience stories with the nuance and depth they were meant to be read."
        />

        {/* Use Cases section */}
        <div id="use-cases">
          <UseCases
            label="Who Uses Globoox"
            heading="Perfect for every kind of reader"
            description="Whatever brings you to reading, Globoox adapts to your needs"
            items={[
          {
            title: 'Scholars',
            subtitle: 'Study sources in any language',
            description:
              'Access primary sources, monographs, and scholarly texts in their original language. Understand the precise terminology and argumentation without relying on sparse or outdated translations.',
            benefits: ['Read primary sources', 'Precise terminology', 'Cross-language citations', 'Deeper comprehension'],
          },
          {
            title: 'Researchers',
            subtitle: 'Access global knowledge without limits',
            description:
              'Read research papers, academic texts, and specialized knowledge from around the world in your preferred language. Never let language barriers limit your research.',
            benefits: ['Break language barriers', 'Access global research', 'Maintain academic rigor', 'Faster comprehension'],
          },
          {
            title: 'Non-fiction Readers',
            subtitle: 'Explore ideas from every language',
            description:
              'Access the best non-fiction from around the world — science, history, philosophy, business — in your native language, without waiting for a traditional translation.',
            benefits: ['Read global non-fiction', 'Stay current with ideas', 'No waiting for publishers', 'Unlimited selection'],
          },
            ]}
          />
        </div>

        {/* Features grid */}
        <div id="features">
          <FeaturesGrid
            sectionLabel="How it Works"
            sectionHeading="Powerful features for every reader"
            cards={[
          {
            label: 'The Method',
            heading: 'Seamless by design.',
            content: (
              <ol style={{ margin: '24px 0 0 0', color: 'var(--ash)' }}>
                <li style={{ marginBottom: '12px', paddingLeft: '0' }}>Upload your manuscript</li>
                <li style={{ marginBottom: '12px', paddingLeft: '0' }}>Select your destination language</li>
                <li style={{ marginBottom: '12px', paddingLeft: '0' }}>Begin your literary journey</li>
              </ol>
            ),
            size: 'sm',
          },
          {
            label: 'Advanced Engine',
            heading: 'Thought-for-thought translation.',
            content: (
              <p style={{ color: 'rgba(244, 240, 232, 0.7)', fontSize: '17px' }}>
                We move beyond literal substitution. Our engine preserves the author&apos;s voice, cultural idioms, and the
                emotional resonance of every passage.
              </p>
            ),
            variant: 'dark',
            size: 'lg',
          },
          {
            label: 'Privacy First',
            heading: 'Your library, kept private.',
            content: (
              <p style={{ color: 'var(--ash)', fontSize: '17px' }}>
                We respect the sanctity of your personal collection. Files are processed securely, encrypted at rest, and
                never stored beyond the translation window.
              </p>
            ),
            size: 'lg',
          },
          {
            label: 'Premium Access',
            heading: 'Simple pricing.',
            content: (
              <>
                <div
                  style={{
                    fontFamily: "'Lora', serif",
                    fontSize: '56px',
                    fontWeight: '700',
                    margin: '16px 0',
                    color: 'var(--ink)',
                  }}
                >
                  $4.99
                  <span style={{ fontSize: '18px', color: 'var(--ash)', fontWeight: '400' }}> / month</span>
                </div>
                <p style={{ fontSize: '15px', color: 'var(--ash)' }}>
                  Includes unlimited translations and cloud sync across all your reading devices.
                </p>
              </>
            ),
            variant: 'accent',
            size: 'sm',
          },
            ]}
          />
        </div>

        {/* Quality Assurance section */}
        <div id="quality">
          <QualityAssuranceV2
            label="Quality Assurance"
            heading="Every Translation is Vetted"
            description="Our multi-layer quality system ensures translations preserve literary nuance while maintaining readability in your language."
          />
        </div>

        {/* Reviews section */}
        <Reviews />

        {/* Pricing section */}
        <Pricing />

        {/* FAQ section */}
        <div id="faq">
          <FAQ
            items={[
          {
            question: 'How does Globoox translate books?',
            answer: 'Globoox uses advanced AI translation technology to translate e-books while preserving the original nuance, style, and literary depth. Our neural networks are trained on millions of literary texts to ensure translations sound natural in your language.',
          },
          {
            question: 'Which languages are supported?',
            answer: 'We currently support 50+ languages including major European languages, Asian languages, and more. We\'re constantly adding new languages based on user demand.',
          },
          {
            question: 'Can I download books for offline reading?',
            answer: 'Yes! Premium members can download translated books for offline reading. This works across all your devices with automatic syncing when you\'re back online.',
          },
          {
            question: 'What happens to my reading progress?',
            answer: 'Your reading position is automatically saved and synced across all your devices. Switch from phone to tablet to desktop seamlessly without losing your place.',
          },
          {
            question: 'Is my data private?',
            answer: 'Absolutely. We use end-to-end encryption for all your personal data. Your reading history, preferences, and saved books are private and never shared with third parties.',
          },
          {
            question: 'Can I cancel my subscription anytime?',
            answer: 'Yes, you can cancel your subscription anytime without penalties or hidden fees. Your access continues until the end of your billing period.',
          },
            ]}
          />
        </div>

        {/* CTA section */}
        <CTA
          heading="Begin your first chapter free."
          buttonText="Get Started — It's Free"
        />

        {/* Footer */}
        <Footer tagline="We are building a global book platform where any reader can discover, buy, read, and listen to any book in their native language." />
      </div>
    </>
  );
}
