import { CompareSlider } from './CompareSlider';

export function QualityAssurance() {
  return (
    <section style={{ padding: '120px 0' }}>
      <div style={{ marginBottom: '80px' }}>
        <span
          style={{
            textTransform: 'uppercase',
            fontSize: '12px',
            fontWeight: 600,
            color: '#B25032',
            letterSpacing: '0.12em',
            marginBottom: '16px',
            display: 'block',
          }}
        >
          Quality Assurance
        </span>
        <h2
          style={{
            fontFamily: 'Lora, serif',
            fontSize: '48px',
            lineHeight: 1.1,
            color: '#1A2420',
            marginBottom: '24px',
            maxWidth: '600px',
          }}
        >
          Every Translation is Vetted
        </h2>
        <p
          style={{
            fontSize: '18px',
            color: '#666',
            maxWidth: '600px',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Our multi-layer quality system ensures translations preserve literary nuance while maintaining readability in your language.
        </p>
      </div>

      <div style={{ marginTop: '60px' }}>
        <CompareSlider />
      </div>
    </section>
  );
}
