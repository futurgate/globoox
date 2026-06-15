'use client';

import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQProps {
  items: FAQItem[];
}

export function FAQ({ items }: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="faq-section" style={{ padding: '0 0 120px 0', background: 'var(--parchment)' }}>
      <div className="faq-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px' }}>
      <div style={{ marginBottom: '80px', textAlign: 'center' }}>
        <span
          style={{
            textTransform: 'uppercase',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--primary)',
            letterSpacing: '0.12em',
            marginBottom: '16px',
            display: 'block',
          }}
        >
          Questions?
        </span>
        <h2
          className="faq-heading"
          style={{
            fontFamily: 'Lora, serif',
            fontSize: '48px',
            lineHeight: 1.1,
            color: 'var(--ink)',
            marginBottom: '24px',
          }}
        >
          Frequently Asked Questions
        </h2>
        <p
          style={{
            fontSize: '18px',
            color: 'var(--ash)',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          Find answers to common questions about Globoox
        </p>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {items.map((item, index) => (
          <div
            key={index}
            style={{
              borderBottom: '1px solid #E0D9D0',
              paddingTop: index === 0 ? 0 : '24px',
              paddingBottom: '24px',
            }}
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--ink)',
                fontFamily: 'Inter, sans-serif',
                textAlign: 'left',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--ink)';
              }}
            >
              {item.question}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  flexShrink: 0,
                  marginLeft: '16px',
                  fontSize: '20px',
                  fontWeight: 300,
                }}
              >
                {openIndex === index ? '−' : '+'}
              </span>
            </button>

            {openIndex === index && (
              <div
                style={{
                  paddingTop: '16px',
                  marginTop: '16px',
                  fontSize: '16px',
                  lineHeight: 1.7,
                  color: 'var(--ash)',
                  animation: 'slideDown 0.3s ease',
                }}
              >
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (max-width: 639px) {
          .faq-section {
            padding: 0 0 60px 0 !important;
          }
          .faq-heading {
            font-size: 28px !important;
          }
          .faq-container {
            padding: 0 20px !important;
          }
        }
      `}</style>
      </div>
    </section>
  );
}
