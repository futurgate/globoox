import React, { useEffect } from 'react';

const customStyles = {
  root: {
    '--bg-page': '#F7F5F2',
    '--bg-card': '#FFFFFF',
    '--text-primary': '#1A1F2B',
    '--text-secondary': '#5E6771',
    '--accent': '#B25032',
    '--accent-hover': '#963F26',
    '--card-radius': '12px',
    '--container-width': '1200px',
  },
  body: {
    fontFamily: "'Inter', -apple-system, sans-serif",
    backgroundColor: '#F7F5F2',
    color: '#1A1F2B',
    lineHeight: '1.6',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    WebkitFontSmoothing: 'antialiased',
  },
  responsiveView: {
    width: '100%',
    maxWidth: '1280px',
    height: '100%',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '40px',
    padding: '80px',
    alignItems: 'center',
  },
  deviceColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  labelGroup: {
    marginBottom: '60px',
  },
  sectionLabel: {
    textTransform: 'uppercase',
    fontSize: '12px',
    fontWeight: '600',
    color: '#B25032',
    letterSpacing: '0.12em',
    marginBottom: '12px',
    display: 'block',
  },
  h2: {
    fontFamily: "'Lora', serif",
    fontSize: '32px',
    fontWeight: '500',
    color: '#1A1F2B',
  },
  macbookContainer: {
    perspective: '1200px',
    transformStyle: 'preserve-3d',
    transform: 'scale(0.95)',
  },
  macbook: {
    position: 'relative',
    transform: 'rotateY(10deg)',
  },
  macbookLid: {
    width: '520px',
    height: '340px',
    background: '#C8C4BC',
    borderRadius: '16px 16px 4px 4px',
    padding: '8px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    position: 'relative',
  },
  macbookScreen: {
    width: '100%',
    height: '100%',
    background: '#1A1F2B',
    borderRadius: '10px',
    overflow: 'hidden',
    position: 'relative',
  },
  macbookBase: {
    width: '580px',
    height: '18px',
    background: '#B8B4AC',
    marginLeft: '-30px',
    borderRadius: '2px 2px 12px 12px',
    position: 'relative',
    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
  },
  iphoneContainer: {
    perspective: '1200px',
    transformStyle: 'preserve-3d',
  },
  iphone: {
    position: 'relative',
    width: '280px',
    height: '580px',
    background: '#1A1F2B',
    borderRadius: '44px',
    padding: '12px',
    boxShadow: '0 30px 60px rgba(0,0,0,0.15), inset 0 0 0 2px #333, inset 0 0 0 4px #111',
    transform: 'rotateY(-10deg)',
  },
  iphoneScreen: {
    width: '100%',
    height: '100%',
    background: '#F7F5F2',
    borderRadius: '34px',
    overflow: 'hidden',
    position: 'relative',
    border: '1px solid rgba(0,0,0,0.05)',
  },
  iphoneDynamicIsland: {
    position: 'absolute',
    top: '14px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '68px',
    height: '22px',
    background: '#000',
    borderRadius: '16px',
    zIndex: '100',
  },
  appInterface: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(135deg, #F7F5F2 0%, #EDE9E3 100%)',
  },
  appHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px 20px 12px',
    background: 'rgba(255,255,255,0.6)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
  },
  appLogo: {
    fontFamily: "'Lora', serif",
    fontSize: '16px',
    fontWeight: '600',
    color: '#B25032',
  },
  appContent: {
    padding: '16px',
    flex: '1',
    overflowY: 'auto',
  },
  mobileHeader: {
    paddingTop: '50px',
    flexDirection: 'column',
    gap: '12px',
    alignItems: 'flex-start',
  },
  mobileNavDots: {
    display: 'flex',
    gap: '4px',
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#DED9D2',
  },
  dotActive: {
    background: '#B25032',
    width: '18px',
    borderRadius: '3px',
    height: '6px',
  },
  uploadZone: {
    border: '2px dashed rgba(178, 80, 50, 0.25)',
    borderRadius: '12px',
    padding: '32px 16px',
    textAlign: 'center',
    background: 'rgba(178, 80, 50, 0.02)',
    marginBottom: '16px',
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: 'white',
    borderRadius: '10px',
    border: '1px solid rgba(0,0,0,0.05)',
    marginBottom: '8px',
  },
  fileIcon: {
    width: '32px',
    height: '40px',
    background: 'linear-gradient(135deg, #B25032 0%, #963F26 100%)',
    borderRadius: '3px 6px 6px 3px',
    flexShrink: 0,
  },
  fileInfoDiv: {
    fontSize: '12px',
    fontWeight: '600',
  },
  fileInfoSpan: {
    fontSize: '10px',
    color: '#5E6771',
  },
  btnFab: {
    position: 'absolute',
    bottom: '40px',
    right: '20px',
    width: '56px',
    height: '56px',
    background: '#B25032',
    borderRadius: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(178, 80, 50, 0.3)',
    color: 'white',
  },
};

const FileItem = ({ name, subtitle }) => (
  <div style={customStyles.fileItem}>
    <div style={customStyles.fileIcon}></div>
    <div>
      <div style={customStyles.fileInfoDiv}>{name}</div>
      <span style={customStyles.fileInfoSpan}>{subtitle}</span>
    </div>
  </div>
);

const MacbookScreen = () => (
  <div style={customStyles.appInterface}>
    <div style={customStyles.appHeader}>
      <div style={customStyles.appLogo}>Globoox</div>
      <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#5E6771' }}>
        <span style={{ color: '#B25032' }}>Library</span>
        <span>Explore</span>
        <span>Settings</span>
      </div>
    </div>
    <div style={customStyles.appContent}>
      <div style={customStyles.uploadZone}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B25032" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
        </svg>
        <p style={{ fontSize: '13px', marginTop: '8px' }}>Drop to translate</p>
      </div>
      <FileItem name="War and Peace.epub" subtitle="Russian → English" />
      <FileItem name="The Odyssey.pdf" subtitle="Greek → English" />
    </div>
  </div>
);

const IphoneScreen = () => (
  <div style={customStyles.appInterface}>
    <div style={{ ...customStyles.appHeader, ...customStyles.mobileHeader }}>
      <div style={customStyles.appLogo}>Globoox</div>
      <div style={{ fontSize: '20px', fontFamily: "'Lora', serif", fontWeight: '500' }}>My Library</div>
    </div>
    <div style={customStyles.appContent}>
      <FileItem name="Anna Karenina" subtitle="84% Translated" />
      <FileItem name="Les Misérables" subtitle="Ready to read" />
      <FileItem name="Don Quixote" subtitle="Spanish → English" />
    </div>
    <div style={customStyles.btnFab}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </div>
    <div style={customStyles.mobileNavDots}>
      <div style={customStyles.dotActive}></div>
      <div style={customStyles.dot}></div>
      <div style={customStyles.dot}></div>
    </div>
  </div>
);

const App = () => {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        -webkit-font-smoothing: antialiased;
      }

      html, body, #root {
        height: 100%;
        width: 100%;
      }

      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }

      .floating {
        animation: float 5s ease-in-out infinite;
      }

      .floating-delayed {
        animation: float 5s ease-in-out infinite;
        animation-delay: -2.5s;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div style={customStyles.body}>
      <div style={customStyles.responsiveView}>

        {/* Desktop Column */}
        <div style={customStyles.deviceColumn}>
          <div style={customStyles.labelGroup}>
            <span style={customStyles.sectionLabel}>Desktop Experience</span>
            <h2 style={customStyles.h2}>Focus &amp; Immersion</h2>
          </div>

          <div className="floating" style={customStyles.macbookContainer}>
            <div style={customStyles.macbook}>
              <div style={customStyles.macbookLid}>
                <div style={customStyles.macbookScreen}>
                  <MacbookScreen />
                </div>
              </div>
              <div style={customStyles.macbookBase}></div>
            </div>
          </div>
        </div>

        {/* Mobile Column */}
        <div style={customStyles.deviceColumn}>
          <div style={customStyles.labelGroup}>
            <span style={customStyles.sectionLabel}>Mobile Experience</span>
            <h2 style={customStyles.h2}>Read Anywhere</h2>
          </div>

          <div className="floating-delayed" style={customStyles.iphoneContainer}>
            <div style={customStyles.iphone}>
              <div style={customStyles.iphoneDynamicIsland}></div>
              <div style={customStyles.iphoneScreen}>
                <IphoneScreen />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;