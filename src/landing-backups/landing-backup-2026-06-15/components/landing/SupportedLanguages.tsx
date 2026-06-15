'use client';

import Image from 'next/image';
import { BookOpen } from 'lucide-react';
import { SectionLabel } from './SectionLabel';

interface SupportedLanguagesProps {
  label: string;
  heading: string;
  description: string;
  currentLangs: string[];
  futureLangs: Array<{ label: string; soon: boolean }>;
  soonLabel: string;
  globeAlt: string;
}

export function SupportedLanguages({
  label,
  heading,
  description,
  currentLangs,
  futureLangs,
  soonLabel,
  globeAlt,
}: SupportedLanguagesProps) {

  return (
    <section className="supported-section" style={{ padding: '120px 40px', background: 'var(--ink)' }}>
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '80px',
          alignItems: 'center',
        }}
        className="supported-split"
      >
        <div className="supported-copy" style={{ maxWidth: '500px' }}>
          <div className="supported-globe-wrap" style={{ marginBottom: '24px' }}>
            <Image
              src="/images/globe.png"
              alt={globeAlt}
              width={64}
              height={79}
              unoptimized
              style={{ width: '64px', height: 'auto' }}
            />
          </div>
          <SectionLabel>{label}</SectionLabel>
          <h2
            className="supported-heading"
            style={{
              fontFamily: "'Lora', serif",
              fontSize: '48px',
              lineHeight: 1.1,
              color: 'var(--parchment)',
              marginBottom: '32px',
              fontWeight: 400,
            }}
          >
            {heading}
          </h2>
          <p
            style={{
              fontSize: '18px',
              color: 'var(--ash)',
              lineHeight: 1.7,
              hyphens: 'none',
              WebkitHyphens: 'none',
              msHyphens: 'none',
            }}
          >
            {description}
          </p>
        </div>

        <div className="supported-card-wrap" style={{ width: '100%', minWidth: 0 }}>
          <div
            style={{
              position: 'relative',
              minHeight: '420px',
              width: '100%',
              minWidth: 0,
              overflow: 'visible',
            }}
            className="supported-card"
          >
              <div
                className="supported-card-visual"
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  transform: 'translateX(-50%)',
                  minHeight: '420px',
                  width: '100%',
                  minWidth: '360px',
                  maxWidth: '600px',
                  padding: '32px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background:
                    'radial-gradient(circle at 50% 50%, rgba(184,196,185,0.14) 0%, rgba(184,196,185,0.06) 24%, rgba(255,255,255,0.01) 48%, rgba(255,255,255,0.00) 72%, rgba(255,255,255,0.00) 100%)',
                  overflow: 'visible',
                }}
              >
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: '14% 18%',
                  borderRadius: '50%',
                  border: '1px dashed rgba(184,196,185,0.16)',
                }}
              />
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: '26% 28%',
                  borderRadius: '50%',
                  border: '1px dashed rgba(184,196,185,0.12)',
                }}
              />
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'var(--dusk)',
                  top: '18%',
                  left: '22%',
                  opacity: 0.65,
                  boxShadow: '0 0 18px rgba(232,184,154,0.35)',
                }}
              />
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--mist)',
                  bottom: '20%',
                  right: '24%',
                  opacity: 0.5,
                }}
              />

              <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '320px' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '148px',
                    height: '148px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 30%, rgba(244,240,232,0.18) 0%, rgba(244,240,232,0.08) 34%, rgba(192,90,58,0.12) 62%, rgba(192,90,58,0.06) 100%)',
                    border: '1px solid rgba(244,240,232,0.14)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 18px 34px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.12)',
                  }}
                >
                  <BookOpen
                    aria-hidden="true"
                    size={60}
                    strokeWidth={1}
                    style={{ color: 'var(--parchment)', opacity: 0.7 }}
                  />
                </div>

                {[
                  { label: currentLangs[0], top: '11%', left: '15%', active: true },
                  { label: currentLangs[1], top: '18%', right: '8%', active: true },
                  { label: currentLangs[2], bottom: '23%', left: '10%', active: true },
                  { label: currentLangs[3], bottom: '14%', right: '14%', active: true },
                  { label: futureLangs[0].label, soon: futureLangs[0].soon, top: '6%', left: '53%', active: false, center: true },
                  { label: futureLangs[1].label, soon: futureLangs[1].soon, top: '36%', left: '4%', active: false },
                  { label: futureLangs[2].label, soon: futureLangs[2].soon, top: '46%', right: '0%', active: false },
                  { label: futureLangs[3].label, soon: futureLangs[3].soon, bottom: '8%', left: '2%', active: false },
                  { label: futureLangs[4].label, soon: futureLangs[4].soon, bottom: '4%', right: '4%', active: false },
                  { label: futureLangs[5].label, soon: futureLangs[5].soon, bottom: '-2%', left: '50%', active: false, center: true },
                ].map((lang) => (
                  <span
                    key={lang.label}
                    className="supported-lang-pill"
                    style={{
                      position: 'absolute',
                      ...(lang.top ? { top: lang.top } : {}),
                      ...(lang.bottom ? { bottom: lang.bottom } : {}),
                      ...(lang.left ? { left: lang.left } : {}),
                      ...(lang.right ? { right: lang.right } : {}),
                      ...(lang.center ? { transform: 'translateX(-50%)' } : {}),
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: lang.active ? '12px 22px' : '7px 13px',
                      borderRadius: '999px',
                      background: lang.active ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                      color: lang.active ? '#fff' : 'var(--ash)',
                      fontSize: lang.active ? '16px' : '10.5px',
                      fontWeight: lang.active ? 600 : 500,
                      border: lang.active ? 'none' : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: lang.active ? '0 8px 22px rgba(192, 90, 58, 0.28)' : 'none',
                      whiteSpace: 'nowrap',
                      zIndex: lang.active ? 2 : 1,
                    }}
                  >
                    <span>{lang.label}</span>
                    {lang.soon && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '-7px',
                          right: '-8px',
                          padding: '1px 5px',
                          borderRadius: '999px',
                          fontSize: '8px',
                          lineHeight: 1.1,
                          fontWeight: 500,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: 'var(--ash)',
                          background: 'var(--ink)',
                          border: 'none',
                          boxShadow: '0 2px 6px rgba(44, 59, 45, 0.18)',
                        }}
                      >
                        {soonLabel}
                      </span>
                    )}
                  </span>
                ))}
              </div>
              </div>
            </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 1023px) {
          .supported-split {
            grid-template-columns: 1fr !important;
            gap: 60px !important;
          }
          .supported-copy {
            margin: 0 auto !important;
            text-align: center !important;
          }
          .supported-globe-wrap {
            display: flex !important;
            justify-content: center !important;
          }
          .supported-card {
            min-height: 420px !important;
          }
          .supported-card-visual {
            padding: 32px !important;
          }
        }
        @media (max-width: 639px) {
          .supported-section {
            padding: 120px 20px !important;
          }
          .supported-heading {
            font-size: 36px !important;
          }
          .supported-card {
            min-height: 360px !important;
          }
          .supported-card-wrap {
            position: relative !important;
            left: 50% !important;
            margin-left: -50vw !important;
            width: 100vw !important;
            min-width: 0 !important;
            display: flex !important;
            justify-content: center !important;
            overflow-x: clip !important;
            overflow-y: visible !important;
          }
          .supported-card-visual {
            min-height: 360px !important;
            padding: 24px !important;
          }
        }
      `}</style>
    </section>
  );
}
