import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

const customStyles = {
  root: {
    '--bg-page': '#F7F5F2',
    '--bg-card': '#FFFFFF',
    '--text-primary': '#1A1F2B',
    '--text-secondary': '#5E6771',
    '--accent': '#B25032',
    '--accent-hover': '#963F26',
    '--card-radius': '12px',
    '--container-width': '1100px',
  },
  body: {
    fontFamily: "'Inter', -apple-system, sans-serif",
    backgroundColor: '#F7F5F2',
    color: '#1A1F2B',
    lineHeight: '1.6',
    WebkitFontSmoothing: 'antialiased',
  },
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '40px 40px',
  },
  sectionLabel: {
    textTransform: 'uppercase',
    fontSize: '12px',
    fontWeight: '600',
    color: '#B25032',
    letterSpacing: '0.1em',
    marginBottom: '12px',
    display: 'block',
  },
  hero: {
    minHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    padding: '80px 0',
  },
  heroH1: {
    fontFamily: "'Lora', serif",
    fontWeight: '400',
    letterSpacing: '-0.01em',
    fontSize: '56px',
    lineHeight: '1.1',
    marginBottom: '24px',
    maxWidth: '900px',
    color: '#1A1F2B',
  },
  heroSub: {
    fontSize: '20px',
    color: '#5E6771',
    marginBottom: '40px',
    maxWidth: '600px',
  },
  btnPrimary: {
    display: 'inline-block',
    background: '#B25032',
    color: 'white',
    padding: '16px 32px',
    borderRadius: '8px',
    fontWeight: '500',
    textDecoration: 'none',
    fontSize: '16px',
    transition: 'background 0.2s ease',
    border: 'none',
    cursor: 'pointer',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gap: '24px',
    marginBottom: '100px',
  },
  card: {
    background: '#FFFFFF',
    borderRadius: '12px',
    padding: '48px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)',
    border: '1px solid rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  cardLarge: {
    gridColumn: 'span 7',
  },
  cardSmall: {
    gridColumn: 'span 5',
  },
  cardFull: {
    gridColumn: 'span 12',
  },
  cardH2: {
    fontFamily: "'Lora', serif",
    fontWeight: '400',
    letterSpacing: '-0.01em',
    fontSize: '32px',
    marginBottom: '16px',
    color: '#1A1F2B',
  },
  cardP: {
    color: '#5E6771',
    fontSize: '17px',
  },
  processList: {
    margin: '24px 0 0 20px',
    color: '#5E6771',
  },
  processListItem: {
    marginBottom: '12px',
    paddingLeft: '8px',
  },
  compareContainer: {
    marginTop: '40px',
    width: '100%',
  },
  compareWrap: {
    position: 'relative',
    width: '100%',
    height: '240px',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid rgba(0,0,0,0.08)',
    cursor: 'col-resize',
  },
  compareLayerBase: {
    position: 'absolute',
    inset: '0',
    padding: '32px',
    fontSize: '15px',
    lineHeight: '1.8',
    fontFamily: "'Lora', serif",
  },
  compareOrig: {
    background: '#fcfcfc',
    color: '#1A1F2B',
  },
  compareTrans: {
    background: '#fffbf9',
    color: '#B25032',
  },
  compareDivider: {
    position: 'absolute',
    top: '0',
    width: '1px',
    height: '100%',
    background: '#B25032',
    transform: 'translateX(-50%)',
    zIndex: '3',
  },
  compareHandle: {
    position: 'absolute',
    top: '50%',
    width: '36px',
    height: '36px',
    background: 'white',
    border: '1px solid #B25032',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '4',
    boxShadow: '0 4px 12px rgba(178, 80, 50, 0.2)',
    transform: 'translate(-50%, -50%)',
  },
  compareBadgeBase: {
    position: 'absolute',
    bottom: '16px',
    fontSize: '11px',
    fontWeight: '600',
    letterSpacing: '0.05em',
    padding: '4px 10px',
    borderRadius: '4px',
    zIndex: '5',
  },
  badgeOrig: {
    left: '16px',
    background: '#eee',
    color: '#666',
  },
  badgeTrans: {
    right: '16px',
    background: '#fdeee9',
    color: '#B25032',
  },
  priceTag: {
    fontFamily: "'Lora', serif",
    fontSize: '56px',
    fontWeight: '700',
    margin: '16px 0',
    color: '#1A1F2B',
  },
  ctaSection: {
    padding: '120px 0',
    textAlign: 'center',
  },
  ctaH2: {
    fontFamily: "'Lora', serif",
    fontWeight: '400',
    letterSpacing: '-0.01em',
    fontSize: '48px',
    marginBottom: '24px',
    color: '#1A1F2B',
  },
  footer: {
    marginTop: '60px',
    padding: '60px 0',
    textAlign: 'center',
    borderTop: '1px solid rgba(0,0,0,0.05)',
    color: '#5E6771',
    fontSize: '14px',
  },
  footerLinks: {
    marginTop: '20px',
    display: 'flex',
    justifyContent: 'center',
    gap: '32px',
  },
  footerLink: {
    color: '#5E6771',
    textDecoration: 'none',
    fontWeight: '500',
  },
};

const CompareSlider = () => {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const wrapRef = useRef(null);

  const move = (clientX) => {
    if (!wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    const p = Math.max(0, Math.min(((clientX - r.left) / r.width) * 100, 100));
    setSliderPos(p);
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    move(e.clientX);
  };

  const handleTouchStart = (e) => {
    setIsDragging(true);
    move(e.touches[0].clientX);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) move(e.clientX);
    };
    const handleMouseUp = () => setIsDragging(false);
    const handleTouchMove = (e) => {
      if (isDragging) move(e.touches[0].clientX);
    };
    const handleTouchEnd = () => setIsDragging(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  return (
    <div style={customStyles.compareContainer}>
      <div
        ref={wrapRef}
        style={customStyles.compareWrap}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div style={{ ...customStyles.compareLayerBase, ...customStyles.compareOrig }}>
          <span>About 70,000 years ago, organisms belonging to the species Homo sapiens started to form even larger and more complex structures called cultures. The subsequent development of these human cultures is called history.</span>
        </div>
        <div
          style={{
            ...customStyles.compareLayerBase,
            ...customStyles.compareTrans,
            clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
          }}
        >
          <span>Около 70 000 лет назад организмы, принадлежащие к виду Homo sapiens, начали формировать ещё более крупные и сложные структуры, называемые культурами. Последующее развитие этих культур называется историей.</span>
        </div>
        <span style={{ ...customStyles.compareBadgeBase, ...customStyles.badgeOrig }}>ORIGINAL ENGLISH</span>
        <span style={{ ...customStyles.compareBadgeBase, ...customStyles.badgeTrans }}>RUSSIAN TRANSLATION</span>
        <div style={{ ...customStyles.compareDivider, left: `${sliderPos}%` }}></div>
        <div style={{ ...customStyles.compareHandle, left: `${sliderPos}%` }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#B25032" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l-4 3 4 3M16 9l4 3-4 3" />
          </svg>
        </div>
      </div>
    </div>
  );
};

const HomePage = () => {
  const [btnHovered, setBtnHovered] = useState(false);
  const [ctaBtnHovered, setCtaBtnHovered] = useState(false);

  return (
    <div style={customStyles.body}>
      <div style={customStyles.container}>
        {/* Hero */}
        <header style={customStyles.hero}>
          <span style={customStyles.sectionLabel}>Introducing Globoox</span>
          <h1 style={customStyles.heroH1}>The world's library, in your native language.</h1>
          <p style={customStyles.heroSub}>
            Instantly translate any e-book and experience stories with the nuance and depth they were meant to be read.
          </p>
          <button
            style={{
              ...customStyles.btnPrimary,
              background: btnHovered ? '#963F26' : '#B25032',
            }}
            onMouseEnter={() => setBtnHovered(true)}
            onMouseLeave={() => setBtnHovered(false)}
          >
            Start Reading Free
          </button>
        </header>

        {/* Feature Grid */}
        <div style={customStyles.featureGrid}>
          {/* The Method - small */}
          <div style={{ ...customStyles.card, ...customStyles.cardSmall }}>
            <div>
              <span style={customStyles.sectionLabel}>The Method</span>
              <h2 style={customStyles.cardH2}>Seamless by design.</h2>
              <ol style={customStyles.processList}>
                <li style={customStyles.processListItem}>Upload your manuscript</li>
                <li style={customStyles.processListItem}>Select your destination language</li>
                <li style={customStyles.processListItem}>Begin your literary journey</li>
              </ol>
            </div>
          </div>

          {/* Advanced Engine - large dark */}
          <div style={{ ...customStyles.card, ...customStyles.cardLarge, background: '#1A1F2B', color: 'white' }}>
            <div>
              <span style={{ ...customStyles.sectionLabel, color: '#D48B77' }}>Advanced Engine</span>
              <h2 style={{ ...customStyles.cardH2, color: 'white' }}>Thought-for-thought translation.</h2>
              <p style={{ ...customStyles.cardP, color: '#A0A9B5' }}>
                We move beyond literal substitution. Our engine preserves the author's voice, cultural idioms, and the emotional resonance of every passage.
              </p>
            </div>
          </div>

          {/* Quality Assurance - full */}
          <div style={{ ...customStyles.card, ...customStyles.cardFull }}>
            <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 40px' }}>
              <span style={customStyles.sectionLabel}>Quality Assurance</span>
              <h2 style={customStyles.cardH2}>Preserving the narrative.</h2>
              <p style={customStyles.cardP}>
                Experience the fidelity of our translations compared to original texts. Drag the slider to compare.
              </p>
            </div>
            <CompareSlider />
          </div>

          {/* Privacy First - large */}
          <div style={{ ...customStyles.card, ...customStyles.cardLarge }}>
            <div>
              <span style={customStyles.sectionLabel}>Privacy First</span>
              <h2 style={customStyles.cardH2}>Your library, kept private.</h2>
              <p style={customStyles.cardP}>
                We respect the sanctity of your personal collection. Files are processed securely, encrypted at rest, and never stored beyond the translation window.
              </p>
            </div>
          </div>

          {/* Pricing - small */}
          <div style={{ ...customStyles.card, ...customStyles.cardSmall, textAlign: 'center', borderColor: '#B25032' }}>
            <div>
              <span style={customStyles.sectionLabel}>Premium Access</span>
              <h2 style={customStyles.cardH2}>Simple pricing.</h2>
              <div style={customStyles.priceTag}>
                $4.99
                <span style={{ fontSize: '18px', color: '#5E6771', fontWeight: '400' }}> / month</span>
              </div>
              <p style={{ fontSize: '15px', color: '#5E6771' }}>
                Includes unlimited translations and cloud sync across all your reading devices.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <section style={customStyles.ctaSection}>
          <h2 style={customStyles.ctaH2}>Begin your first chapter free.</h2>
          <p style={{ ...customStyles.heroSub, margin: '0 auto 40px' }}>
            No commitment required. We'll translate your first three books with our compliments.
          </p>
          <button
            style={{
              ...customStyles.btnPrimary,
              background: ctaBtnHovered ? '#963F26' : '#B25032',
            }}
            onMouseEnter={() => setCtaBtnHovered(true)}
            onMouseLeave={() => setCtaBtnHovered(false)}
          >
            Get Started — It's Free
          </button>
        </section>

        {/* Footer */}
        <footer style={customStyles.footer}>
          <p>© 2024 Globoox Inc. Curating the world's wisdom.</p>
          <div style={customStyles.footerLinks}>
            <a href="#" style={customStyles.footerLink}>Terms of Service</a>
            <a href="#" style={customStyles.footerLink}>Privacy Policy</a>
            <a href="#" style={customStyles.footerLink}>Contact Support</a>
          </div>
        </footer>
      </div>
    </div>
  );
};

const App = () => {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
      body { background-color: #F7F5F2; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <Router basename="/">
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </Router>
  );
};

export default App;