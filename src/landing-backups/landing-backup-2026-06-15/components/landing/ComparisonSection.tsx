import { SectionLabel } from './SectionLabel';
import { ComparisonTable } from './ComparisonTable';

export function ComparisonSection() {
  return (
    <>
      <style>{`
        .comparison-section {
          padding: 0 0 120px 0;
        }
        .comparison-section__inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 40px;
        }
        .comparison-section__header {
          text-align: center;
          margin-bottom: 60px;
        }
        .comparison-section__title {
          font-family: 'Lora', serif;
          font-weight: 400;
          letter-spacing: -0.01em;
          font-size: 48px;
          margin-bottom: 20px;
          color: var(--ink);
        }
        .comparison-section__subtitle {
          font-size: 18px;
          color: var(--ash);
          max-width: 600px;
          margin: 0 auto;
        }
        @media (max-width: 1023px) {
          .comparison-section {
            padding: 0 0 80px 0;
          }
          .comparison-section__inner {
            padding: 0 24px;
          }
          .comparison-section__title {
            font-size: 36px;
          }
          .comparison-section__subtitle {
            font-size: 16px;
          }
        }
        @media (max-width: 639px) {
          .comparison-section {
            padding: 0 0 60px 0;
          }
          .comparison-section__inner {
            padding: 0 16px;
          }
          .comparison-section__header {
            margin-bottom: 32px;
          }
          .comparison-section__title {
            font-size: 28px;
            margin-bottom: 12px;
          }
          .comparison-section__subtitle {
            font-size: 15px;
          }
        }
      `}</style>
      <section className="comparison-section">
        <div className="comparison-section__inner">
          <div className="comparison-section__header">
            <SectionLabel>Detailed Comparison</SectionLabel>
            <h2 className="comparison-section__title">
              Every nuance compared
            </h2>
            <p className="comparison-section__subtitle">
              See exactly what each plan includes, from the essentials to the advanced features that power serious readers.
            </p>
          </div>

          <ComparisonTable />
        </div>
      </section>
    </>
  );
}
