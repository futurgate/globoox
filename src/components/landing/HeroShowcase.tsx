'use client';

import { useState } from 'react';
import { DeviceShowcase } from './DeviceShowcase';
import { SectionLabel } from './SectionLabel';

interface HeroShowcaseProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  buttonText: string;
  titleClassName?: string;
}

export function HeroShowcase({ eyebrow, title, subtitle, buttonText, titleClassName }: HeroShowcaseProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      <section
        className="hero-showcase"
        style={{
          padding: '42px 0 84px',
          width: '100vw',
          marginLeft: 'calc(50% - 50vw)',
          marginRight: 'calc(50% - 50vw)',
          background:
            'radial-gradient(circle at top left, rgba(232,184,154,0.24) 0%, rgba(232,184,154,0) 34%), radial-gradient(circle at bottom right, rgba(44,59,45,0.08) 0%, rgba(44,59,45,0) 38%), var(--parchment)',
          overflow: 'clip',
          ['--hero-copy-width' as string]: '100%',
        }}
      >
        <div
          className="hero-showcase-inner"
          style={{
            width: 'min(1600px, calc(100vw - 128px))',
            margin: '0 auto',
            minHeight: 'calc(100vh - 300px)',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(360px, 440px)',
            alignItems: 'center',
            gap: '48px',
          }}
        >
          <div
            className="hero-showcase-copy"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'center',
              zIndex: 2,
              width: 'var(--hero-copy-width)',
              textAlign: 'left',
              padding: '0 40px',
            }}
          >
            <SectionLabel>{eyebrow}</SectionLabel>
            <h1
              className={`hero-showcase-title ${titleClassName || ''}`}
              style={{
                fontSize: titleClassName ? undefined : '64px',
                lineHeight: 1.06,
                marginBottom: subtitle ? '24px' : '34px',
                fontWeight: 500,
                fontFamily: "'Lora', serif",
                color: 'var(--ink)',
                maxWidth: '720px',
              }}
            >
              {title}
            </h1>
            {subtitle ? (
              <p
                className="hero-showcase-subtitle"
                style={{
                fontSize: '20px',
                color: 'var(--ash)',
                marginBottom: '36px',
                maxWidth: '620px',
              }}
            >
              {subtitle}
              </p>
            ) : null}
            <button
              className="hero-showcase-btn"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={() => {
                window.location.href = '/my-books';
              }}
              style={{
                display: 'inline-block',
                background: isHovered ? 'var(--primary-hover)' : 'var(--primary)',
                color: '#fff',
                padding: '18px 40px',
                borderRadius: '999px',
                fontWeight: 600,
                fontSize: '16px',
                transition: 'all 0.2s ease',
                border: 'none',
                cursor: 'pointer',
                boxShadow: `0 16px 34px ${isHovered ? 'rgba(163, 77, 50, 0.24)' : 'rgba(192, 90, 58, 0.2)'}`,
              }}
            >
              {buttonText}
            </button>
          </div>

          <DeviceShowcase mode="hero-tablet" />
        </div>
      </section>

      <style>{`
        @media (max-width: 1199px) {
          .hero-showcase-inner {
            min-height: auto !important;
            width: 100vw !important;
            margin: 0 !important;
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }

          .hero-showcase-copy {
            padding: 0 40px !important;
            align-items: center !important;
            text-align: center !important;
          }

          .hero-showcase-title {
            width: 100% !important;
            font-size: 48px !important;
            line-height: 1.08 !important;
            max-width: 820px !important;
          }

          .hero-showcase-subtitle {
            width: 100% !important;
            font-size: 20px !important;
            max-width: 720px !important;
          }
        }

        @media (max-width: 767px) {
          .hero-showcase {
            padding: 24px 0 56px !important;
            width: 100vw !important;
            margin-left: calc(50% - 50vw) !important;
            margin-right: calc(50% - 50vw) !important;
          }

          .hero-showcase-inner {
            width: 100vw !important;
            margin: 0 !important;
          }

          .hero-showcase-title {
            font-size: 30px !important;
            margin-bottom: 22px !important;
          }

          .hero-showcase-subtitle {
            font-size: 16px !important;
            margin-bottom: 28px !important;
          }

          .hero-showcase-btn {
            padding: 15px 28px !important;
            font-size: 15px !important;
          }

          .hero-showcase-copy {
            padding: 0 20px !important;
          }
        }
      `}</style>
    </>
  );
}
