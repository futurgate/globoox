import React, { useState, useEffect, useRef } from 'react';

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-font-smoothing: antialiased;
  }

  body {
    font-family: 'Inter', -apple-system, sans-serif;
    background-color: #F7F5F2;
    color: #1A1F2B;
    line-height: 1.6;
    overflow-x: hidden;
  }

  h1, h2, h3 {
    font-family: 'Lora', serif;
    font-weight: 400;
    letter-spacing: -0.01em;
    color: #1A1F2B;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0) rotate(0); }
    50% { transform: translateY(-30px) rotate(5deg); }
  }

  .spine-hover:hover {
    transform: translateY(-20px) scale(1.05) rotate(2deg) !important;
    z-index: 10;
  }

  .btn-primary-hover:hover {
    background: #963F26 !important;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(178, 80, 50, 0.3) !important;
  }

  .footer-link:hover {
    color: #B25032;
  }
`;

const SectionLabel = ({ children, style = {} }) => (
  <span style={{
    textTransform: 'uppercase',
    fontSize: '12px',
    fontWeight: 600,
    color: '#B25032',
    letterSpacing: '0.12em',
    marginBottom: '16px',
    display: 'block',
    ...style
  }}>
    {children}
  </span>
);

const FloatingScript = ({ children, style }) => (
  <div style={{
    position: 'absolute',
    fontFamily: "'Lora', serif",
    color: '#B25032',
    opacity: 0.15,
    fontSize: '24px',
    pointerEvents: 'none',
    ...style
  }}>
    {children}
  </div>
);

const BookSpine = ({ title, height, bg, textColor }) => (
  <div
    className="spine-hover"
    style={{
      width: '45px',
      height: `${height}px`,
      background: bg,
      borderRadius: '4px',
      borderLeft: '3px solid rgba(0,0,0,0.05)',
      boxShadow: '10px 10px 30px rgba(0,0,0,0.05)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      padding: '20px 0',
      transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
      position: 'relative',
      overflow: 'hidden',
      cursor: 'default'
    }}
  >
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.05) 100%)',
      zIndex: 1
    }} />
    <span style={{
      writingMode: 'vertical-rl',
      textOrientation: 'mixed',
      fontFamily: "'Lora', serif",
      fontSize: '14px',
      color: textColor || '#5E6771',
      margin: '0 auto',
      opacity: 0.8,
      transform: 'rotate(180deg)',
      position: 'relative',
      zIndex: 2
    }}>
      {title}
    </span>
  </div>
);

const HeroSection = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <header style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      minHeight: '90vh',
      alignItems: 'center',
      gap: '60px',
      padding: '60px 0'
    }}>
      <div style={{
        textAlign: 'left',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start'
      }}>
        <SectionLabel>Introducing Globoox</SectionLabel>
        <h1 style={{ fontSize: '64px', lineHeight: 1.1, marginBottom: '28px', fontWeight: 500 }}>
          The world's library, in your native language.
        </h1>
        <p style={{ fontSize: '20px', color: '#5E6771', marginBottom: '44px', maxWidth: '520px' }}>
          Instantly translate any e-book and experience stories with the nuance and depth they were meant to be read.
        </p>
        <button
          className="btn-primary-hover"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => {}}
          style={{
            display: 'inline-block',
            background: '#B25032',
            color: 'white',
            padding: '18px 40px',
            borderRadius: '8px',
            fontWeight: 500,
            fontSize: '16px',
            transition: 'all 0.2s ease',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(178, 80, 50, 0.25)',
            fontFamily: "'Inter', sans-serif"
          }}
        >
          Start Reading Free
        </button>
      </div>

      <div style={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'relative',
          width: '100%',
          height: '500px',
          background: 'rgba(178, 80, 50, 0.03)',
          borderRadius: '200px 40px 200px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: '1000px'
        }}>
          <FloatingScript style={{ top: '15%', left: '10%', animation: 'float 8s infinite ease-in-out', animationDelay: '0s' }}>哲学</FloatingScript>
          <FloatingScript style={{ bottom: '20%', right: '15%', animation: 'float 8s infinite ease-in-out', animationDelay: '2s', fontSize: '32px' }}>Poésie</FloatingScript>
          <FloatingScript style={{ top: '25%', right: '20%', animation: 'float 8s infinite ease-in-out', animationDelay: '4s' }}>قصة</FloatingScript>
          <FloatingScript style={{ bottom: '10%', left: '25%', animation: 'float 8s infinite ease-in-out', animationDelay: '1s' }}>History</FloatingScript>

          <div style={{ display: 'flex', gap: '12px', transform: 'rotate(-5deg)' }}>
            <BookSpine title="Moby Dick" height={320} bg="#E8E4DF" />
            <BookSpine title="Anna Karenina" height={280} bg="#DED9D2" />
            <BookSpine title="Globoox Engine" height={340} bg="#1A1F2B" textColor="#D48B77" />
            <BookSpine title="The Odyssey" height={280} bg="#DED9D2" />
            <BookSpine title="Don Quixote" height={320} bg="#E8E4DF" />
          </div>
        </div>
      </div>
    </header>
  );
};

const CompareSlider = () => {
  const wrapRef = useRef(null);
  const [position, setPosition] = useState(50);
  const isDragging = useRef(false);

  const move = (clientX) => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const p = Math.max(0, Math.min(((clientX - rect.left) / rect.width) * 100, 100));
    setPosition(p);
  };

  useEffect(() => {
    const onMouseMove = (e) => { if (isDragging.current) move(e.clientX); };
    const onMouseUp = () => { isDragging.current = false; };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div style={{ marginTop: '40px', width: '100%' }}>
      <div
        ref={wrapRef}
        onMouseDown={(e) => { isDragging.current = true; move(e.clientX); }}
        style={{
          position: 'relative',
          width: '100%',
          height: '240px',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid rgba(0,0,0,0.08)',
          cursor: 'col-resize'
        }}
      >
        <div style={{
          position: 'absolute',
          inset: 0,
          padding: '32px',
          fontSize: '15px',
          lineHeight: 1.8,
          fontFamily: "'Lora', serif",
          background: '#fcfcfc',
          color: '#1A1F2B'
        }}>
          <span>About 70,000 years ago, organisms belonging to the species Homo sapiens started to form even larger and more complex structures called cultures. The subsequent development of these human cultures is called history.</span>
        </div>
        <div style={{
          position: 'absolute',
          inset: 0,
          padding: '32px',
          fontSize: '15px',
          lineHeight: 1.8,
          fontFamily: "'Lora', serif",
          background: '#fffbf9',
          color: '#B25032',
          clipPath: `inset(0 ${100 - position}% 0 0)`
        }}>
          <span>Около 70 000 лет назад организмы, принадлежащие к виду Homo sapiens, начали формировать ещё более крупные и сложные структуры, называемые культурами. Последующее развитие этих культур называется историей.</span>
        </div>
        <div style={{
          position: 'absolute',
          top: 0,
          left: `${position}%`,
          width: '1px',
          height: '100%',
          background: '#B25032',
          transform: 'translateX(-50%)',
          zIndex: 3
        }} />
        <div style={{
          position: 'absolute',
          top: '50%',
          left: `${position}%`,
          transform: 'translate(-50%, -50%)',
          width: '36px',
          height: '36px',
          background: 'white',
          border: '1px solid #B25032',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 4,
          userSelect: 'none'
        }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#B25032" strokeWidth="2.5">
            <path d="M8 9l-4 3 4 3M16 9l4 3-4 3" />
          </svg>
        </div>
      </div>
    </div>
  );
};

const FeatureGrid = () => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gap: '24px',
    margin: '100px 0'
  }}>
    <div style={{
      gridColumn: 'span 5',
      background: '#FFFFFF',
      borderRadius: '12px',
      padding: '48px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
      border: '1px solid rgba(0,0,0,0.05)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      <div>
        <SectionLabel>The Method</SectionLabel>
        <h2 style={{ fontSize: '32px', marginBottom: '16px' }}>Seamless by design.</h2>
        <ol style={{ margin: '24px 0 0 20px', color: '#5E6771' }}>
          <li style={{ marginBottom: '12px', paddingLeft: '8px' }}>Upload your manuscript</li>
          <li style={{ marginBottom: '12px', paddingLeft: '8px' }}>Select your destination language</li>
          <li style={{ marginBottom: '12px', paddingLeft: '8px' }}>Begin your literary journey</li>
        </ol>
      </div>
    </div>

    <div style={{
      gridColumn: 'span 7',
      background: '#1A1F2B',
      borderRadius: '12px',
      padding: '48px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
      border: '1px solid rgba(0,0,0,0.05)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      <div>
        <SectionLabel style={{ color: '#D48B77' }}>Advanced Engine</SectionLabel>
        <h2 style={{ fontSize: '32px', marginBottom: '16px', color: 'white' }}>Thought-for-thought translation.</h2>
        <p style={{ color: '#A0A9B5', fontSize: '17px' }}>We move beyond literal substitution. Our engine preserves the author's voice, cultural idioms, and the emotional resonance of every passage.</p>
      </div>
    </div>

    <div style={{
      gridColumn: 'span 12',
      background: '#FFFFFF',
      borderRadius: '12px',
      padding: '48px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
      border: '1px solid rgba(0,0,0,0.05)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 40px' }}>
        <SectionLabel>Quality Assurance</SectionLabel>
        <h2 style={{ fontSize: '32px', marginBottom: '16px' }}>Preserving the narrative.</h2>
        <p style={{ color: '#5E6771', fontSize: '17px' }}>Experience the fidelity of our translations compared to original texts. Drag the slider to compare.</p>
      </div>
      <CompareSlider />
    </div>
  </div>
);

const Footer = () => (
  <footer style={{
    marginTop: '60px',
    padding: '60px 0',
    textAlign: 'center',
    borderTop: '1px solid rgba(0,0,0,0.05)',
    color: '#5E6771',
    fontSize: '14px'
  }}>
    <p>© 2024 Globoox Inc. Curating the world's wisdom.</p>
    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '32px' }}>
      {['Terms of Service', 'Privacy Policy', 'Contact Support'].map((link) => (
        <a
          key={link}
          href="#"
          className="footer-link"
          style={{
            color: '#5E6771',
            textDecoration: 'none',
            fontWeight: 500,
            transition: 'color 0.2s ease'
          }}
          onClick={(e) => e.preventDefault()}
        >
          {link}
        </a>
      ))}
    </div>
  </footer>
);

const App = () => {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = globalStyles;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0 40px'
    }}>
      <HeroSection />
      <FeatureGrid />
      <Footer />
    </div>
  );
};

export default App;