'use client';

import { useEffect, useState } from 'react';
import { MyBooksMockup } from './MyBooksMockup';
import { ReaderMockup } from './ReaderMockup';
import { EnjoyMockup } from './EnjoyMockup';

export interface UseCaseItem {
  icon?: string;
  title: string;
  subtitle?: string;
  description?: string;
  benefits?: string[];
  imagePlaceholder?: boolean;
  mockup?: 'my-books' | 'reader' | 'enjoy';
}

interface UseCasesProps {
  label: string;
  heading: string;
  description: string;
  items: UseCaseItem[];
}

export function UseCases({ label, heading, description, items }: UseCasesProps) {
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    items.forEach((_, index) => {
      const timer = setTimeout(() => {
        setVisibleIndices((prev) => new Set(prev).add(index));
      }, index * 150);

      return () => clearTimeout(timer);
    });
  }, [items]);

  return (
    <section className="usecases-section" style={{ padding: '120px 0', background: 'var(--ink)' }}>
      <div className="usecases-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px' }}>
      <div style={{ marginBottom: '80px', textAlign: 'center' }}>
        <span
          style={{
            textTransform: 'uppercase',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--dusk)',
            letterSpacing: '0.12em',
            marginBottom: '16px',
            display: 'block',
          }}
        >
          {label}
        </span>
        <h2
          className="usecases-heading"
          style={{
            fontFamily: 'Lora, serif',
            fontSize: '48px',
            lineHeight: 1.1,
            color: 'var(--parchment)',
            marginBottom: '24px',
          }}
        >
          {heading}
        </h2>
        <p
          style={{
            fontSize: '18px',
            color: 'var(--parchment)',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '32px',
        }}
      >
        {items.map((useCase, index) => (
          <div
            key={index}
            className="usecases-card"
            style={{
              opacity: visibleIndices.has(index) ? 1 : 0,
              transform: visibleIndices.has(index) ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
              padding: '40px',
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Title */}
            <div>
              <h3
                style={{
                  fontFamily: 'Lora, serif',
                  fontSize: '24px',
                  fontWeight: 400,
                  color: 'var(--parchment)',
                  marginBottom: '8px',
                }}
              >
                {useCase.title}
              </h3>
              {useCase.subtitle && (
                <p
                  style={{
                    fontSize: '14px',
                    color: 'var(--dusk)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    margin: 0,
                  }}
                >
                  {useCase.subtitle}
                </p>
              )}
            </div>

            {/* Mockup or Image Placeholder */}
            {useCase.mockup === 'my-books' ? (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <MyBooksMockup />
              </div>
            ) : useCase.mockup === 'reader' ? (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <ReaderMockup />
              </div>
            ) : useCase.mockup === 'enjoy' ? (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <EnjoyMockup />
              </div>
            ) : useCase.imagePlaceholder && (
              <div
                style={{
                  width: '100%',
                  aspectRatio: '16/10',
                  backgroundColor: 'rgba(244, 240, 232, 0.03)',
                  border: '1px dashed rgba(244, 240, 232, 0.15)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                }}
              >
                <span style={{ color: 'var(--ash)', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>Screenshot UI</span>
              </div>
            )}

            {/* Description */}
            {useCase.description && (
              <p
                style={{
                  fontSize: '16px',
                  lineHeight: 1.6,
                  color: 'var(--parchment)',
                  margin: 0,
                }}
              >
                {useCase.description}
              </p>
            )}

            {/* Benefits */}
            {useCase.benefits && useCase.benefits.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
                {useCase.benefits.map((benefit, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        backgroundColor: 'var(--dusk)',
                        borderRadius: '50%',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: '14px', color: 'var(--parchment)' }}>{benefit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      </div>
      <style>{`
        @media (max-width: 639px) {
          .usecases-section { padding: 60px 0 !important; }
          .usecases-container { padding: 0 20px !important; }
          .usecases-heading { font-size: 28px !important; }
          .usecases-card { padding: 20px !important; }
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          .usecases-heading { font-size: 36px !important; }
        }
      `}</style>
    </section>
  );
}
