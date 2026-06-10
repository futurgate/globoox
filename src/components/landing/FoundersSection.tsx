'use client';

import { Linkedin } from 'lucide-react';
import { SectionLabel } from './SectionLabel';

const founders = [
  {
    name: 'Founder One',
    role: 'Product & vision',
    note: 'Shapes the reading experience and product direction.',
    theme: 'light' as const,
    initials: 'FO',
    linkedinUrl: 'https://www.linkedin.com/in/founder-one',
  },
  {
    name: 'Founder Two',
    role: 'Translation systems',
    note: 'Leads the translation engine and language quality.',
    theme: 'dark' as const,
    initials: 'FT',
    linkedinUrl: 'https://www.linkedin.com/in/founder-two',
  },
  {
    name: 'Founder Three',
    role: 'Library & platform',
    note: 'Builds the library, sync, and platform layer.',
    theme: 'light' as const,
    initials: 'FH',
    linkedinUrl: 'https://www.linkedin.com/in/founder-three',
  },
];

export function FoundersSection() {
  return (
    <section
      className="founders-section"
      style={{
        padding: '120px 40px 80px',
        background: 'var(--parchment)',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ maxWidth: '720px', marginBottom: '48px' }}>
          <SectionLabel>Meet the team</SectionLabel>
          <h2
            className="founders-heading"
            style={{
              fontFamily: "'Lora', serif",
              fontSize: '52px',
              lineHeight: 1.08,
              color: 'var(--ink)',
              marginBottom: '20px',
              fontWeight: 400,
            }}
          >
            The team behind Globoox.
          </h2>
        </div>

        <div
          className="founders-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '28px',
          }}
        >
          {founders.map((founder) => {
            const isDark = founder.theme === 'dark';

            return (
              <article
                key={founder.name}
                style={{
                  minHeight: '460px',
                  borderRadius: '8px',
                  padding: '34px 34px 32px',
                  background: isDark ? '#202635' : 'rgba(255,255,255,0.72)',
                  color: isDark ? 'var(--parchment)' : 'var(--ink)',
                  border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(44,59,45,0.08)',
                  boxShadow: isDark
                    ? '0 24px 60px rgba(20, 25, 34, 0.18)'
                    : '0 18px 48px rgba(44,59,45,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      width: '92px',
                      height: '92px',
                      borderRadius: '8px',
                      marginBottom: '28px',
                      background: isDark
                        ? 'linear-gradient(180deg, rgba(232,184,154,0.22) 0%, rgba(232,184,154,0.08) 100%)'
                        : 'linear-gradient(180deg, rgba(192,90,58,0.16) 0%, rgba(192,90,58,0.05) 100%)',
                      border: isDark ? '1px solid rgba(232,184,154,0.18)' : '1px solid rgba(192,90,58,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: "'Lora', serif",
                      fontSize: '28px',
                      color: isDark ? 'var(--parchment)' : 'var(--ink)',
                    }}
                  >
                    {founder.initials}
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <h3
                      style={{
                        fontFamily: "'Lora', serif",
                        fontSize: '38px',
                        lineHeight: 1.08,
                        fontWeight: 400,
                        color: isDark ? 'var(--parchment)' : 'var(--ink)',
                      }}
                    >
                      {founder.name}
                    </h3>
                  </div>

                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      color: isDark ? 'rgba(244,240,232,0.72)' : 'rgba(44,59,45,0.64)',
                      marginBottom: '22px',
                    }}
                  >
                    {founder.role}
                  </div>

                  <p
                    style={{
                      fontSize: '17px',
                      lineHeight: 1.6,
                      color: isDark ? 'rgba(244,240,232,0.86)' : 'var(--ash)',
                      maxWidth: '28ch',
                      marginBottom: '24px',
                    }}
                  >
                    {founder.note}
                  </p>

                  <a
                    href={founder.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${founder.name} on LinkedIn`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px',
                      lineHeight: 1.4,
                      color: isDark ? 'rgba(244,240,232,0.88)' : 'var(--ink)',
                      textDecoration: 'underline',
                      textUnderlineOffset: '4px',
                    }}
                  >
                    <Linkedin size={14} strokeWidth={2} />
                    <span>LinkedIn</span>
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 1023px) {
          .founders-grid {
            grid-template-columns: 1fr !important;
          }

          .founders-heading {
            font-size: 40px !important;
          }
        }

        @media (max-width: 639px) {
          .founders-section {
            padding: 80px 20px 56px !important;
          }

          .founders-heading {
            font-size: 34px !important;
          }
        }
      `}</style>
    </section>
  );
}
