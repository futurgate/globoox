'use client';

import Image from 'next/image';
import { SectionLabel } from './SectionLabel';

interface FoundersSectionProps {
  label: string;
  heading: string;
  description: string;
  items: Array<{
    name: string;
    role: string;
    linkedinText: string;
    theme: 'light' | 'dark';
    initials: string;
    photoSrc?: string;
    linkedinUrl?: string;
  }>;
}

export function FoundersSection({
  label,
  heading,
  description,
  items,
}: FoundersSectionProps) {
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
          <SectionLabel>{label}</SectionLabel>
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
            {heading}
          </h2>
          <p
            style={{
              margin: 0,
              maxWidth: '680px',
              fontSize: '19px',
              lineHeight: 1.55,
              color: 'var(--ash)',
            }}
          >
            {description}
          </p>
        </div>

        <div
          className="founders-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '28px',
          }}
        >
          {items.map((founder) => {
            return (
              <article
                key={founder.name}
                className="founders-card"
                style={{
                  borderRadius: '8px',
                  padding: '20px 18px',
                  background: 'rgba(255,255,255,0.72)',
                  color: 'var(--ink)',
                  border: '1px solid rgba(44,59,45,0.08)',
                  boxShadow: '0 18px 48px rgba(44,59,45,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div className="founders-card-main" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '16px' }}>
                  <div
                    className="founders-card-avatar"
                    style={{
                      position: 'relative',
                      width: '78px',
                      height: '78px',
                      borderRadius: '8px',
                      background: 'linear-gradient(180deg, rgba(192,90,58,0.16) 0%, rgba(192,90,58,0.05) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: "'Lora', serif",
                      fontSize: '28px',
                      color: 'var(--ink)',
                      flexShrink: 0,
                      overflow: 'hidden',
                    }}
                  >
                    {founder.photoSrc ? (
                      <Image
                        src={founder.photoSrc}
                        alt={founder.name}
                        fill
                        sizes="78px"
                        style={{
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      founder.initials
                    )}
                  </div>

                  <div className="founders-card-copy" style={{ flex: '1 1 auto', minWidth: 0 }}>
                    <div style={{ marginBottom: '4px' }}>
                      <h3
                        style={{
                          fontFamily: "'Lora', serif",
                          fontSize: '28px',
                          lineHeight: 1.08,
                          fontWeight: 400,
                          color: 'var(--ink)',
                        }}
                      >
                        {founder.name}
                      </h3>
                    </div>

                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'var(--primary)',
                        marginBottom: '10px',
                      }}
                    >
                      {founder.role}
                    </div>

                    {founder.linkedinUrl ? (
                      <a
                        href={founder.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`${founder.name} on LinkedIn`}
                        className="founders-card-link"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '13px',
                          lineHeight: 1.4,
                          color: 'var(--ink)',
                          textDecoration: 'underline',
                          textUnderlineOffset: '4px',
                          marginTop: '0',
                          transform: 'translate(-2px, -3px)',
                        }}
                      >
                        <Image
                          src="/images/icon-linkedin.svg"
                          alt=""
                          aria-hidden="true"
                          width={20}
                          height={20}
                          style={{
                            width: '20px',
                            height: '20px',
                            opacity: 1,
                            filter: 'brightness(0) saturate(100%) invert(19%) sepia(10%) saturate(849%) hue-rotate(71deg) brightness(96%) contrast(88%)',
                          }}
                        />
                        <span>{founder.linkedinText}</span>
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 1023px) {
          .founders-card {
            min-height: 0 !important;
          }

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

        @media (min-width: 720px) and (max-width: 1023px) {
          .founders-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
    </section>
  );
}
