'use client';

import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';

interface FooterProps {
  tagline: string;
  legalLabel: string;
  termsLabel: string;
  privacyLabel: string;
  copyright: string;
}

function LegalModal({
  open,
  onOpenChange,
  title,
  legalLabel,
  sections,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  legalLabel: string;
  sections: Array<{ heading: string; body: string[] }>;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousScrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      window.scrollTo(0, previousScrollY);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 220,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <button
        type="button"
        aria-label="Close modal"
        onClick={() => onOpenChange(false)}
        style={{
          position: 'absolute',
          inset: 0,
          border: 'none',
          background: 'rgba(18, 24, 18, 0.44)',
          backdropFilter: 'blur(12px)',
          cursor: 'pointer',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="landing-legal-modal"
        style={{
          position: 'relative',
          width: 'min(880px, calc(100vw - 32px))',
          maxHeight: 'min(88vh, 920px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: '28px',
          background: 'var(--parchment)',
          border: '1px solid rgba(44,59,45,0.08)',
          boxShadow: '0 28px 80px rgba(0,0,0,0.24)',
          color: 'var(--ink)',
        }}
      >
        <div
          style={{
            padding: '20px 24px 18px',
            borderBottom: '1px solid rgba(44,59,45,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--ash)',
                marginBottom: '8px',
              }}
            >
              {legalLabel}
            </div>
            <h2
              id={titleId}
              style={{
                fontFamily: "'Lora', serif",
                fontSize: '32px',
                lineHeight: 1.1,
                fontWeight: 400,
                color: 'var(--ink)',
                margin: 0,
              }}
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            style={{
              border: 'none',
              background: 'rgba(44,59,45,0.06)',
              color: 'var(--ink)',
              width: '40px',
              height: '40px',
              borderRadius: '999px',
              cursor: 'pointer',
              fontSize: '20px',
              lineHeight: 1,
              flexShrink: 0,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '24px' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            {sections.map((section) => (
              <section key={section.heading} style={{ marginBottom: '28px' }}>
                <h3
                  style={{
                    fontFamily: "'Lora', serif",
                    fontSize: '22px',
                    lineHeight: 1.2,
                    fontWeight: 500,
                    color: 'var(--ink)',
                    margin: '0 0 12px',
                  }}
                >
              {section.heading}
                </h3>
                {section.body.map((paragraph, index) => (
                  <p
                    key={index}
                    style={{
                      fontSize: '15px',
                      lineHeight: 1.75,
                      color: 'var(--ash)',
                      margin: index === section.body.length - 1 ? 0 : '0 0 12px',
                    }}
                  >
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 639px) {
          .landing-legal-modal {
            width: calc(100vw - 24px) !important;
            max-height: calc(100vh - 24px) !important;
            border-radius: 24px !important;
          }
        }
      `}</style>
    </div>,
    document.body,
  );
}

const TERMS_SECTIONS = [
  {
    heading: '1. Acceptance of These Terms',
    body: [
      'These Terms govern your access to and use of Globoox, including our website, reading tools, book purchasing flows, translation features, and related services. By accessing or using Globoox, you agree to be bound by these Terms.',
      'If you use Globoox on behalf of a company, institution, or other entity, you represent that you have authority to bind that entity to these Terms.',
    ],
  },
  {
    heading: '2. The Service',
    body: [
      'Globoox is a global reading platform designed to help readers discover, purchase, read, and listen to books, including translated reading experiences where available.',
      'Features, supported file formats, supported languages, regional availability, and catalog availability may change over time. We may add, modify, suspend, or discontinue features at any time.',
    ],
  },
  {
    heading: '3. Accounts and Eligibility',
    body: [
      'You may need to create an account to access certain features. You are responsible for maintaining the confidentiality of your credentials and for all activity that occurs under your account.',
      'You agree to provide accurate information, keep your account information up to date, and notify us promptly if you believe your account has been compromised.',
    ],
  },
  {
    heading: '4. Purchases, Access, and Content Availability',
    body: [
      'Books, subscriptions, credits, trials, and other paid features may be offered through Globoox. Prices, taxes, billing terms, trial conditions, and refund rules may vary by product, region, and payment provider.',
      'Your access to a book or feature may depend on licensing rights, territorial restrictions, publisher availability, and account status. Purchasing access to a title does not transfer ownership of the underlying intellectual property.',
    ],
  },
  {
    heading: '5. User Content and Uploaded Files',
    body: [
      'Where Globoox allows you to upload EPUB files or other materials, you retain your rights in the content you upload. You grant Globoox a limited license to host, process, store, display, transform, and transmit that content solely to operate and improve the service for you.',
      'You are responsible for ensuring that you have the legal right to upload and use any content you submit to Globoox. You must not upload content that infringes the rights of others or violates applicable law.',
    ],
  },
  {
    heading: '6. Translation, Audio, and AI-Assisted Features',
    body: [
      'Some Globoox features may rely on automated systems, including machine translation, text-to-speech, recommendations, or other AI-assisted functionality. These features may produce errors, omissions, imperfect translations, or outputs that do not fully preserve nuance.',
      'You remain responsible for how you use these outputs. Globoox does not guarantee that automated outputs will be complete, accurate, or suitable for any particular purpose.',
    ],
  },
  {
    heading: '7. Acceptable Use',
    body: [
      'You may not use Globoox to violate the law, infringe intellectual property rights, interfere with the service, attempt unauthorized access, scrape or reverse engineer protected portions of the platform, or misuse publisher or reader content.',
      'You may not use Globoox in a way that harms other users, rights holders, publishers, or the integrity and security of the service.',
    ],
  },
  {
    heading: '8. Intellectual Property',
    body: [
      'Globoox, including our software, design, branding, logos, interfaces, and service materials, is protected by intellectual property laws. Except for limited rights expressly granted in these Terms, Globoox retains all rights, title, and interest in the service.',
      'Book content, translations, publisher assets, and other third-party materials remain subject to the rights of their respective owners and licensors.',
    ],
  },
  {
    heading: '9. Suspension and Termination',
    body: [
      'We may suspend or terminate access to Globoox if we reasonably believe you have violated these Terms, created legal risk, interfered with the service, or used Globoox in a harmful or fraudulent way.',
      'You may stop using Globoox at any time. Certain provisions of these Terms will survive termination, including provisions relating to intellectual property, payment obligations, disclaimers, limitations of liability, and dispute-related terms.',
    ],
  },
  {
    heading: '10. Disclaimers and Liability',
    body: [
      'Globoox is provided on an “as is” and “as available” basis to the maximum extent permitted by law. We disclaim warranties of merchantability, fitness for a particular purpose, non-infringement, and uninterrupted availability, except where such disclaimers are not permitted by applicable law.',
      'To the maximum extent permitted by law, Globoox will not be liable for indirect, incidental, consequential, special, exemplary, or punitive damages, or for lost profits, revenues, goodwill, data, or business opportunities arising from or related to your use of the service.',
    ],
  },
  {
    heading: '11. Changes to These Terms',
    body: [
      'We may update these Terms from time to time. If we make material changes, we may provide notice through the service or by other reasonable means. Your continued use of Globoox after updated Terms become effective means you accept the revised Terms.',
    ],
  },
];

const PRIVACY_SECTIONS = [
  {
    heading: '1. Scope of This Policy',
    body: [
      'This Privacy Policy explains how Globoox collects, uses, stores, shares, and protects personal information when you use our website, applications, reading tools, and related services.',
      'It applies to information we collect directly from you, automatically from your use of Globoox, and from limited third-party sources such as payment processors, authentication providers, analytics services, or publishing partners.',
    ],
  },
  {
    heading: '2. Information We Collect',
    body: [
      'We may collect account information such as your name, email address, authentication details, billing-related metadata, language preferences, and account settings.',
      'We may also collect usage information such as purchased titles, uploaded files, reading progress, library activity, device and browser information, approximate location inferred from IP address, and interaction data that helps us operate and improve Globoox.',
    ],
  },
  {
    heading: '3. Uploaded Books and Reader Data',
    body: [
      'If you upload EPUB files or other reading materials, we process those files to provide storage, reading, translation, indexing, syncing, text-to-speech, and related features. We may also process metadata, bookmarks, annotations, reading position, and language settings associated with your library.',
      'We do not claim ownership over the books you upload. We process them only to provide the service to you and to maintain service quality, security, and performance.',
    ],
  },
  {
    heading: '4. How We Use Information',
    body: [
      'We use personal information to provide the service, create and maintain accounts, process purchases, sync reading progress, deliver translations and audio features, personalize recommendations, respond to support requests, detect abuse, and comply with legal obligations.',
      'We may also use aggregated or de-identified information to understand usage patterns, improve performance, refine product decisions, and measure the effectiveness of features.',
    ],
  },
  {
    heading: '5. Sharing of Information',
    body: [
      'We may share information with service providers that help us operate Globoox, including hosting, infrastructure, analytics, payment processing, email delivery, customer support, security monitoring, and authentication providers.',
      'We may also disclose information when required by law, to protect rights and safety, in connection with a business transfer, or with your consent. We do not sell personal information in the ordinary meaning of the term.',
    ],
  },
  {
    heading: '6. Cookies and Similar Technologies',
    body: [
      'We may use cookies, local storage, pixels, SDKs, and similar technologies to keep you signed in, remember preferences, measure performance, detect misuse, and understand how Globoox is used.',
      'Depending on your jurisdiction, you may have choices regarding certain categories of cookies or similar technologies.',
    ],
  },
  {
    heading: '7. Data Retention',
    body: [
      'We retain personal information for as long as reasonably necessary to provide the service, maintain your account, comply with legal obligations, resolve disputes, enforce our agreements, and protect the integrity of Globoox.',
      'Retention periods may vary depending on the category of information, the nature of the service, and applicable legal requirements.',
    ],
  },
  {
    heading: '8. Security',
    body: [
      'We use administrative, technical, and organizational measures designed to protect personal information against unauthorized access, loss, misuse, and disclosure. No system can be guaranteed completely secure, and you use Globoox with that understanding.',
    ],
  },
  {
    heading: '9. International Use and Transfers',
    body: [
      'Globoox may operate globally, which means your information may be processed in countries other than the one where you reside. Where required, we take appropriate steps intended to support lawful international data transfers.',
    ],
  },
  {
    heading: '10. Your Rights and Choices',
    body: [
      'Depending on where you live, you may have rights to access, correct, delete, restrict, object to, or export certain personal information. You may also have rights related to consent withdrawal, marketing preferences, and certain automated processing.',
      'You can also manage some information directly within your Globoox account, including profile details, language settings, and certain reading preferences.',
    ],
  },
  {
    heading: '11. Children and Sensitive Information',
    body: [
      'Globoox is not intended for children where prohibited by applicable law without appropriate parental or guardian authorization. Please do not provide sensitive personal information unless it is specifically requested and required for the service.',
    ],
  },
  {
    heading: '12. Changes to This Policy',
    body: [
      'We may update this Privacy Policy from time to time. When material changes are made, we may provide notice through the service or by other reasonable means. Your continued use of Globoox after an updated policy becomes effective is subject to that updated policy.',
    ],
  },
];

export function Footer({
  tagline,
  legalLabel,
  termsLabel,
  privacyLabel,
  copyright,
}: FooterProps) {
  const [openModal, setOpenModal] = useState<'terms' | 'privacy' | null>(null);

  return (
    <>
      <footer
        style={{
          padding: '32px 0',
          textAlign: 'center',
          background: 'var(--ink)',
          color: 'var(--ash)',
          fontSize: '13.5px',
        }}
      >
        <div className="footer-container" style={{ maxWidth: '960px', margin: '0 auto', padding: '0 40px' }}>
          <div
            className="footer-links"
            style={{
              display: 'none',
              justifyContent: 'center',
              gap: '32px',
            }}
          >
            <button
              type="button"
              style={{
                color: 'var(--ash)',
                textDecoration: 'none',
                fontWeight: 500,
                fontSize: '13.5px',
                transition: 'color 0.2s ease',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
              onClick={() => setOpenModal('terms')}
            >
              {termsLabel}
            </button>
            <button
              type="button"
              style={{
                color: 'var(--ash)',
                textDecoration: 'none',
                fontWeight: 500,
                fontSize: '13.5px',
                transition: 'color 0.2s ease',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
              onClick={() => setOpenModal('privacy')}
            >
              {privacyLabel}
            </button>
          </div>
          <p style={{ fontSize: '13.5px', color: 'var(--ash)', margin: '20px auto 0', lineHeight: 1.6 }}>
            {tagline}
            <br />
            <span style={{ fontSize: '24px', lineHeight: 1.6 }}>❧</span>
            <br />
            {copyright}
          </p>
        </div>

        <style>{`
          @media (max-width: 639px) {
            .footer-container {
              padding: 0 20px !important;
            }
          }
        `}</style>
      </footer>

      <LegalModal
        open={openModal === 'terms'}
        onOpenChange={(open) => setOpenModal(open ? 'terms' : null)}
        title={termsLabel}
        legalLabel={legalLabel}
        sections={TERMS_SECTIONS}
      />
      <LegalModal
        open={openModal === 'privacy'}
        onOpenChange={(open) => setOpenModal(open ? 'privacy' : null)}
        title={privacyLabel}
        legalLabel={legalLabel}
        sections={PRIVACY_SECTIONS}
      />
    </>
  );
}
