import { CompareSlider } from './CompareSlider';

interface QualityAssuranceV2Props {
  label: string;
  heading: string;
  description: string;
}

export function QualityAssuranceV2({ label, heading, description }: QualityAssuranceV2Props) {
  return (
    <section className="qa-section" style={{ padding: '120px 0', background: 'var(--parchment)' }}>
      <div className="qa-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px' }}>
      <div style={{ marginBottom: '48px', textAlign: 'center' }}>
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
          {label}
        </span>
        <h2
          className="qa-heading"
          style={{
            fontFamily: 'Lora, serif',
            fontSize: '48px',
            lineHeight: 1.1,
            color: 'var(--ink)',
            marginBottom: '24px',
            margin: '0 auto 24px',
            maxWidth: '600px',
          }}
        >
          {heading}
        </h2>
        <p
          style={{
            fontSize: '18px',
            color: 'var(--ash)',
            maxWidth: '600px',
            lineHeight: 1.6,
            margin: '0 auto',
          }}
        >
          {description}
        </p>
      </div>

      <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'center' }}>
        {/* MacBook mockup — visible on lg+ (≥1024px) */}
        <div className="device-macbook" style={{ position: 'relative', width: '100%', maxWidth: '800px' }}>
          {/* MacBook lid */}
          <div
            style={{
              width: '100%',
              aspectRatio: '520 / 340',
              background: '#C8C4BC',
              borderRadius: '16px 16px 4px 4px',
              padding: '1.5%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'var(--ink)',
                borderRadius: '10px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div className="device-screen-slider" style={{ width: '100%', height: '100%' }}>
                <CompareSlider />
              </div>
            </div>
          </div>
          {/* MacBook base */}
          <div
            style={{
              width: 'calc(100% + 60px)',
              height: '18px',
              background: '#B8B4AC',
              marginLeft: '-30px',
              borderRadius: '2px 2px 12px 12px',
              position: 'relative',
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            }}
          />
        </div>

        {/* Tablet mockup — visible on md (≥640px and <1024px) */}
        <div className="device-tablet" style={{ position: 'relative', width: '100%', maxWidth: '420px' }}>
          <div
            style={{
              width: '100%',
              aspectRatio: '3 / 4',
              background: '#C8C4BC',
              borderRadius: '24px',
              padding: '3%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'var(--ink)',
                borderRadius: '14px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div className="device-screen-slider" style={{ width: '100%', height: '100%' }}>
                <CompareSlider />
              </div>
            </div>
          </div>
        </div>

        {/* Tablet mockup end */}
        {/* iPhone mockup — visible on <640px */}
        <div className="device-iphone" style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
          <div
            style={{
              width: '100%',
              aspectRatio: '9 / 19.5',
              background: '#C8C4BC',
              borderRadius: '40px',
              padding: '3%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              position: 'relative',
              border: '3px solid #C8C4BC',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'var(--ink)',
                borderRadius: '32px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div className="device-screen-slider" style={{ width: '100%', height: '100%', background: '#fcfcfc' }}>
                <CompareSlider />
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      <style>{`
        .device-screen-slider > div { margin-top: 0 !important; height: 100% !important; }
        .device-screen-slider > div > div { height: 100% !important; border-radius: 0 !important; border: none !important; }

        /* Default: show iPhone, hide others */
        .device-macbook { display: none !important; }
        .device-tablet { display: none !important; }
        .device-iphone { display: block !important; }

        /* ≥440px: show tablet */
        @media (min-width: 440px) {
          .device-iphone { display: none !important; }
          .device-tablet { display: block !important; }
        }

        /* ≥1024px: show macbook */
        @media (min-width: 1024px) {
          .device-tablet { display: none !important; }
          .device-macbook { display: block !important; }
        }

        /* Section-level responsive styles */
        @media (max-width: 639px) {
          .qa-section { padding: 60px 0 !important; }
          .qa-container { padding: 0 20px !important; }
          .qa-heading { font-size: 36px !important; }
        }
        @media (max-width: 340px) {
          .qa-heading { font-size: 31px !important; }
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          .qa-heading { font-size: 36px !important; }
        }
      `}</style>
    </section>
  );
}
