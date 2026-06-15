import { SectionLabel } from './SectionLabel';
import { PricingGrid } from './PricingGrid';

export function Pricing() {
  return (
    <>
      <style>{`
        .pricing-section {
          padding: 120px 0 80px 0;
        }
        .pricing-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 40px;
        }
        .pricing-heading {
          font-family: 'Lora', serif;
          font-weight: 400;
          letter-spacing: -0.01em;
          font-size: 48px;
          margin-bottom: 20px;
          color: var(--ink);
        }
        @media (max-width: 639px) {
          .pricing-section {
            padding: 60px 0 40px 0;
          }
          .pricing-container {
            padding: 0 20px;
          }
          .pricing-heading {
            font-size: 28px;
          }
        }
      `}</style>
      <section className="pricing-section" style={{ background: 'var(--parchment)' }}>
        <div className="pricing-container">
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <SectionLabel>Investment in Wisdom</SectionLabel>
          <h2 className="pricing-heading">
            A plan for every reader
          </h2>
          <p
            style={{
              fontSize: '18px',
              color: 'var(--ash)',
              maxWidth: '600px',
              margin: '0 auto',
            }}
          >
            From casual discovery to deep academic research, choose the scale of your literary exploration.
          </p>
        </div>

        <PricingGrid />
        </div>
      </section>
    </>
  );
}
