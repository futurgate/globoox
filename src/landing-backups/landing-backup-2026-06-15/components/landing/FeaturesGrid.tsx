import { SectionLabel } from './SectionLabel';

interface FeatureCard {
  label: string;
  heading: string;
  content: React.ReactNode;
  variant?: 'light' | 'dark' | 'accent';
  size?: 'sm' | 'lg';
}

interface FeaturesGridProps {
  sectionLabel: string;
  sectionHeading: string;
  cards: FeatureCard[];
}

export function FeaturesGrid({ sectionLabel, sectionHeading, cards }: FeaturesGridProps) {
  return (
    <section className="fg-section" style={{ padding: '120px 0', background: 'var(--parchment)' }}>
      <div className="fg-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px' }}>
      <div style={{ marginBottom: '80px' }}>
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
          {sectionLabel}
        </span>
        <h2
          className="fg-heading"
          style={{
            fontFamily: 'Lora, serif',
            fontSize: '48px',
            lineHeight: 1.1,
            color: 'var(--ink)',
            marginBottom: '24px',
          }}
        >
          {sectionHeading}
        </h2>
      </div>

      <div
        className="fg-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '24px',
        }}
      >
        {cards.map((card, i) => {
          const isDark = card.variant === 'dark';
          const isAccent = card.variant === 'accent';
          const isSmall = card.size === 'sm';
          return (
            <div
              key={i}
              className={`fg-card ${isSmall ? 'fg-card-sm' : 'fg-card-lg'}`}
              style={{
                gridColumn: isSmall ? 'span 5' : 'span 7',
                background: isDark ? 'var(--ink)' : '#FFFFFF',
                borderRadius: '12px',
                padding: '48px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                border: '1px solid rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                ...(isAccent ? { textAlign: 'center' as const, borderColor: 'var(--primary)' } : {}),
              }}
            >
              <div>
                <SectionLabel style={isDark ? { color: '#C4826E' } : undefined}>{card.label}</SectionLabel>
                <h2
                  style={{
                    fontFamily: "'Lora', serif",
                    fontWeight: 400,
                    letterSpacing: '-0.01em',
                    fontSize: '32px',
                    marginBottom: '16px',
                    color: isDark ? 'white' : 'var(--ink)',
                  }}
                >
                  {card.heading}
                </h2>
                {card.content}
              </div>
            </div>
          );
        })}
      </div>
      </div>

      <style>{`
        /* Mobile: < 640px */
        @media (max-width: 639px) {
          .fg-section {
            padding: 60px 0 !important;
          }
          .fg-container {
            padding: 0 20px !important;
          }
          .fg-heading {
            font-size: 28px !important;
          }
          .fg-grid {
            grid-template-columns: 1fr !important;
          }
          .fg-card {
            grid-column: span 1 !important;
            padding: 24px !important;
          }
        }

        /* Tablet: 640px – 1023px */
        @media (min-width: 640px) and (max-width: 1023px) {
          .fg-section {
            padding: 80px 0 !important;
          }
          .fg-container {
            padding: 0 32px !important;
          }
          .fg-heading {
            font-size: 36px !important;
          }
          .fg-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .fg-card {
            grid-column: span 1 !important;
            padding: 32px !important;
          }
        }
      `}</style>
    </section>
  );
}
