import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

const customStyles = {
  root: {
    '--bg-page': '#F7F5F2',
    '--bg-card': '#FFFFFF',
    '--text-primary': '#1A1F2B',
    '--text-secondary': '#5E6771',
    '--accent': '#B25032',
    '--accent-hover': '#963F26',
    '--border-light': 'rgba(0,0,0,0.06)',
    '--reader-font-size': '18px',
  },
  readerNav: {
    height: '72px',
    background: '#FFFFFF',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    zIndex: 100,
    position: 'relative',
    flexShrink: 0,
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  backBtn: {
    color: '#5E6771',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'color 0.2s',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
  },
  bookTitle: {
    fontFamily: "'Lora', serif",
    fontSize: '18px',
    fontWeight: 500,
    borderLeft: '1px solid rgba(0,0,0,0.06)',
    paddingLeft: '20px',
    marginLeft: '4px',
  },
  navCenter: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    background: '#F0EEEA',
    padding: '4px',
    borderRadius: '100px',
  },
  fontControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: '#F0EEEA',
    padding: '4px 12px',
    borderRadius: '8px',
  },
  fontBtn: {
    background: 'none',
    border: 'none',
    color: '#5E6771',
    cursor: 'pointer',
    padding: '4px 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s',
  },
  brandMinimal: {
    fontFamily: "'Lora', serif",
    color: '#B25032',
    fontWeight: 700,
    letterSpacing: '0.5px',
    fontSize: '14px',
    opacity: 0.8,
  },
  readerMain: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    overflow: 'hidden',
    background: '#FAF9F7',
  },
  readerMainSingle: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '1fr',
    overflow: 'hidden',
    background: '#FAF9F7',
  },
  textPane: {
    height: '100%',
    overflowY: 'auto',
    padding: '80px 10%',
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(0,0,0,0.1) transparent',
  },
  paneOriginal: {
    borderRight: '1px solid rgba(0,0,0,0.06)',
    background: '#FFFFFF',
  },
  paneTranslated: {
    background: '#FDFCFB',
  },
  paneLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#B25032',
    marginBottom: '40px',
    fontWeight: 700,
    display: 'block',
    opacity: 0.6,
  },
  contentBody: {
    fontFamily: "'Lora', serif",
    lineHeight: 1.8,
    color: '#1A1F2B',
    maxWidth: '600px',
    margin: '0 auto',
  },
  translatedText: {
    color: '#4A4F5C',
  },
  paragraph: {
    marginBottom: '32px',
    position: 'relative',
    transition: 'background 0.2s, box-shadow 0.2s',
  },
  paragraphActive: {
    background: 'rgba(178, 80, 50, 0.03)',
    boxShadow: '-15px 0 0 rgba(178, 80, 50, 0.1)',
  },
  syncMarker: {
    position: 'absolute',
    left: '-30px',
    top: '6px',
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    background: '#B25032',
    opacity: 0,
    transition: 'opacity 0.3s',
  },
  syncMarkerVisible: {
    opacity: 0.4,
  },
};

const originalParagraphs = [
  <>
    ἄνδρα μοι ἔννεπε, μοῦσα, πολύτροπον, ὃς μάλα πολλὰ<br />
    πλάγχθη, ἐπεὶ Τροίης ἱερὸν πτολίεθρον ἔπερσεν·<br />
    πολλῶν δ᾽ ἀνθρώπων ἴδεν ἄστεα καὶ νόον ἔγνω,<br />
    πολλὰ δ᾽ ὅ γ᾽ ἐν πόντῳ πάθεν ἄλγεα ὃν κατὰ θυμόν,<br />
    ἀρνύμενος ἥν τε ψυχὴν καὶ νόστον ἑταίρων.
  </>,
  <>
    ἀλλ᾽ οὐδ᾽ ὣς ἑτάρους ἐρρύσατο, ἱέμενός περ·<br />
    αὐτῶν γὰρ σφετέρῃσιν ἀτασθαλίῃσιν ὄλοντο,<br />
    νήπιοι, οἳ κατὰ βοῦς Ὑπερίονος Ἠελίοιο<br />
    ἤσθιον· αὐτὰρ ὁ τοῖσιν ἀφείλετο νόστιμον ἦμαρ.
  </>,
  <>
    τῶν ἁμόθεν γε, θεά, θύγατερ Διός, εἰπὲ καὶ ἡμῖν.
  </>,
];

const translatedParagraphs = [
  'Tell me, O Muse, of the man of many devices, who wandered full many ways after he had sacked the sacred citadel of Troy. Many were the men whose cities he saw and whose mind he learned of, and many the woes he suffered in his heart upon the sea, seeking to win his own life and the return of his comrades.',
  'Yet even so he saved not his comrades, though he desired it sore; for through their own blind folly they perished—fools, who devoured the kine of Helios Hyperion; but he took from them the day of their returning.',
  'Of these things, goddess, daughter of Zeus, beginning where thou wilt, tell thou even unto us.',
];

const ViewToggle = ({ activeView, onChange }) => {
  const views = ['Original', 'Side-by-Side', 'Translation'];
  return (
    <div style={customStyles.navCenter}>
      {views.map((view) => {
        const isActive = activeView === view;
        return (
          <button
            key={view}
            onClick={() => onChange(view)}
            style={{
              padding: '6px 20px',
              borderRadius: '100px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: 'none',
              background: isActive ? '#FFFFFF' : 'transparent',
              color: isActive ? '#1A1F2B' : '#5E6771',
              boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            {view}
          </button>
        );
      })}
    </div>
  );
};

const Paragraph = ({ index, activeIndex, onHover, onLeave, children, isTranslated, fontSize }) => {
  const isActive = activeIndex === index;
  return (
    <div
      style={{
        ...customStyles.paragraph,
        ...(isActive ? customStyles.paragraphActive : {}),
        fontSize: fontSize,
      }}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={onLeave}
    >
      <div
        style={{
          ...customStyles.syncMarker,
          ...(isActive ? customStyles.syncMarkerVisible : {}),
        }}
      />
      {children}
    </div>
  );
};

const TextPane = ({ label, paragraphList, activeIndex, onHover, onLeave, paneStyle, isTranslated, fontSize }) => {
  return (
    <section style={{ ...customStyles.textPane, ...paneStyle }}>
      <span style={customStyles.paneLabel}>{label}</span>
      <article
        style={{
          ...customStyles.contentBody,
          ...(isTranslated ? customStyles.translatedText : {}),
        }}
      >
        {paragraphList.map((content, i) => (
          <Paragraph
            key={i}
            index={i}
            activeIndex={activeIndex}
            onHover={onHover}
            onLeave={onLeave}
            isTranslated={isTranslated}
            fontSize={fontSize}
          >
            {content}
          </Paragraph>
        ))}
      </article>
    </section>
  );
};

const App = () => {
  const [activeView, setActiveView] = useState('Side-by-Side');
  const [activeIndex, setActiveIndex] = useState(null);
  const [fontSize, setFontSize] = useState(18);
  const [backHover, setBackHover] = useState(false);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
      body { font-family: 'Inter', sans-serif; overflow: hidden; }
      .text-pane-scroll::-webkit-scrollbar { width: 6px; }
      .text-pane-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const handleHover = (index) => setActiveIndex(index);
  const handleLeave = () => setActiveIndex(null);

  const showOriginal = activeView === 'Original' || activeView === 'Side-by-Side';
  const showTranslated = activeView === 'Translation' || activeView === 'Side-by-Side';
  const isSideBySide = activeView === 'Side-by-Side';

  const mainStyle = isSideBySide
    ? customStyles.readerMain
    : customStyles.readerMainSingle;

  return (
    <Router basename="/">
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          backgroundColor: '#F7F5F2',
          color: '#1A1F2B',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Nav */}
        <nav style={customStyles.readerNav}>
          <div style={customStyles.navLeft}>
            <button
              style={{
                ...customStyles.backBtn,
                color: backHover ? '#B25032' : '#5E6771',
              }}
              onMouseEnter={() => setBackHover(true)}
              onMouseLeave={() => setBackHover(false)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Library
            </button>
            <span style={customStyles.bookTitle}>The Odyssey — Homer</span>
          </div>

          <ViewToggle activeView={activeView} onChange={setActiveView} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={customStyles.fontControls}>
              <button
                style={{ ...customStyles.fontBtn, fontSize: '18px' }}
                title="Decrease font size"
                onClick={() => setFontSize(prev => Math.max(12, prev - 1))}
                onMouseEnter={e => e.currentTarget.style.color = '#B25032'}
                onMouseLeave={e => e.currentTarget.style.color = '#5E6771'}
              >
                A-
              </button>
              <button
                style={{ ...customStyles.fontBtn, fontSize: '22px' }}
                title="Increase font size"
                onClick={() => setFontSize(prev => Math.min(30, prev + 1))}
                onMouseEnter={e => e.currentTarget.style.color = '#B25032'}
                onMouseLeave={e => e.currentTarget.style.color = '#5E6771'}
              >
                A+
              </button>
            </div>
            <span style={customStyles.brandMinimal}>GLOBOOX</span>
          </div>
        </nav>

        {/* Main */}
        <main style={mainStyle}>
          {showOriginal && (
            <TextPane
              label="Ancient Greek Original"
              paragraphList={originalParagraphs}
              activeIndex={activeIndex}
              onHover={handleHover}
              onLeave={handleLeave}
              paneStyle={isSideBySide ? customStyles.paneOriginal : { ...customStyles.paneOriginal, borderRight: 'none', background: '#FFFFFF' }}
              isTranslated={false}
              fontSize={`${fontSize}px`}
            />
          )}
          {showTranslated && (
            <TextPane
              label="English — Globoox Engine"
              paragraphList={translatedParagraphs}
              activeIndex={activeIndex}
              onHover={handleHover}
              onLeave={handleLeave}
              paneStyle={customStyles.paneTranslated}
              isTranslated={true}
              fontSize={`${fontSize}px`}
            />
          )}
        </main>
      </div>
    </Router>
  );
};

export default App;