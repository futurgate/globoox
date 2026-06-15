'use client';

import Image from 'next/image';

export function PrivacyManifest() {
  return (
    <section style={{ padding: '120px 40px', background: 'var(--parchment)', position: 'relative', overflow: 'hidden' }}>
      {/* Subtle background decoration */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          maxWidth: '1000px',
          height: '100%',
          background: 'radial-gradient(ellipse at center, rgba(192, 90, 58, 0.03) 0%, rgba(255,255,255,0) 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <Image
            src="/images/privacy-book.png"
            alt="Privacy Book icon"
            width={64}
            height={85}
            unoptimized
            style={{ opacity: 0.9 }}
          />
        </div>
        <h2
          className="privacy-heading"
          style={{
            fontFamily: "'Lora', serif",
            fontSize: '56px',
            lineHeight: 1.1,
            color: 'var(--ink)',
            marginBottom: '32px',
            fontWeight: 400,
            letterSpacing: '-0.01em',
          }}
        >
          Your files stay yours
        </h2>
        <p
          style={{
            fontSize: '20px',
            color: 'var(--ash)',
            lineHeight: 1.7,
            marginBottom: '0',
          }}
        >
          We understand it can feel risky to upload your books. Your EPUB files are used only for translation and are never shared. Our small team is dedicated to sharing knowledge and breaking language barriers.             Our first users have already tried Globoox and are enjoying it safely.
{' '}
          <span style={{ color: 'var(--ink)', fontWeight: 500 }}>
          </span>
        </p>
      </div>
      <style>{`
        @media (max-width: 639px) {
          .privacy-heading { font-size: 40px !important; }
        }
      `}</style>
    </section>
  );
}
