import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

const styles = {
  root: {
    '--bg-page': '#F7F5F2',
    '--bg-card': '#FFFFFF',
    '--text-primary': '#1A1F2B',
    '--text-secondary': '#5E6771',
    '--accent': '#B25032',
    '--accent-hover': '#963F26',
    '--card-radius': '16px',
    '--container-width': '1100px',
  },
  body: {
    fontFamily: "'Inter', -apple-system, sans-serif",
    backgroundColor: '#F7F5F2',
    color: '#1A1F2B',
    lineHeight: '1.6',
    paddingBottom: '100px',
    minHeight: '100vh',
    WebkitFontSmoothing: 'antialiased',
  },
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '0 40px',
  },
  nav: {
    padding: '40px 0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoText: {
    fontFamily: "'Lora', serif",
    fontSize: '24px',
    fontWeight: '600',
    color: '#1A1F2B',
    textDecoration: 'none',
  },
  navLinks: {
    display: 'flex',
    gap: '32px',
    margin: '0',
  },
  navLink: {
    color: '#5E6771',
    textDecoration: 'none',
    fontWeight: '500',
  },
  navLinkAccent: {
    color: '#B25032',
    textDecoration: 'none',
    fontWeight: '500',
  },
  pricingHeader: {
    textAlign: 'center',
    marginBottom: '60px',
    paddingTop: '40px',
  },
  sectionLabel: {
    textTransform: 'uppercase',
    fontSize: '12px',
    fontWeight: '600',
    color: '#B25032',
    letterSpacing: '0.12em',
    marginBottom: '16px',
    display: 'block',
  },
  h1: {
    fontFamily: "'Lora', serif",
    fontWeight: '400',
    fontSize: '48px',
    marginBottom: '20px',
    color: '#1A1F2B',
  },
  h2: {
    fontFamily: "'Lora', serif",
    fontWeight: '400',
    fontSize: '32px',
    color: '#1A1F2B',
  },
  h3: {
    fontFamily: "'Lora', serif",
    fontWeight: '400',
    color: '#1A1F2B',
  },
  headerP: {
    fontSize: '18px',
    color: '#5E6771',
    maxWidth: '600px',
    margin: '0 auto',
  },
  pricingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '32px',
    marginBottom: '80px',
  },
  priceCard: {
    background: '#FFFFFF',
    borderRadius: '16px',
    padding: '48px 32px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
    border: '1px solid rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    transition: 'transform 0.3s ease',
  },
  priceCardFeatured: {
    background: '#FFFFFF',
    borderRadius: '16px',
    padding: '48px 32px',
    boxShadow: '0 12px 40px rgba(178, 80, 50, 0.08)',
    border: '2px solid #B25032',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    transition: 'transform 0.3s ease',
    transform: 'translateY(-8px)',
  },
  badge: {
    position: 'absolute',
    top: '-14px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#B25032',
    color: 'white',
    padding: '4px 16px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  planName: {
    fontFamily: "'Lora', serif",
    fontSize: '24px',
    marginBottom: '8px',
    fontWeight: '400',
    color: '#1A1F2B',
  },
  planPrice: {
    marginBottom: '32px',
  },
  amount: {
    fontSize: '42px',
    fontWeight: '500',
    fontFamily: "'Inter', sans-serif",
    color: '#1A1F2B',
  },
  currency: {
    fontSize: '20px',
    verticalAlign: 'super',
    marginRight: '2px',
    color: '#1A1F2B',
  },
  period: {
    color: '#5E6771',
    fontSize: '16px',
  },
  featureList: {
    listStyle: 'none',
    marginBottom: '40px',
    flexGrow: '1',
    padding: '0',
  },
  featureItem: {
    fontSize: '15px',
    color: '#5E6771',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
  },
  featureIcon: {
    marginRight: '12px',
    flexShrink: '0',
    color: '#B25032',
  },
  btnOutline: {
    display: 'block',
    textAlign: 'center',
    padding: '14px',
    borderRadius: '8px',
    border: '1px solid #DED9D2',
    color: '#1A1F2B',
    textDecoration: 'none',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    background: 'transparent',
    fontSize: '16px',
    width: '100%',
  },
  btnPrimary: {
    display: 'block',
    textAlign: 'center',
    background: '#B25032',
    color: 'white',
    padding: '16px',
    borderRadius: '8px',
    fontWeight: '500',
    textDecoration: 'none',
    transition: 'background 0.2s ease',
    cursor: 'pointer',
    border: 'none',
    fontSize: '16px',
    width: '100%',
  },
  comparisonTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '40px',
    background: '#FFFFFF',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
    border: '1px solid rgba(0,0,0,0.06)',
  },
  th: {
    textAlign: 'left',
    padding: '24px 32px',
    background: '#FAF9F7',
    fontFamily: "'Lora', serif",
    fontSize: '18px',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
    fontWeight: '400',
    color: '#1A1F2B',
  },
  thAccent: {
    textAlign: 'center',
    padding: '24px 32px',
    background: '#FAF9F7',
    fontFamily: "'Lora', serif",
    fontSize: '18px',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
    fontWeight: '400',
    color: '#B25032',
    width: '20%',
  },
  thCenter: {
    textAlign: 'center',
    padding: '24px 32px',
    background: '#FAF9F7',
    fontFamily: "'Lora', serif",
    fontSize: '18px',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
    fontWeight: '400',
    color: '#1A1F2B',
    width: '20%',
  },
  tdLabel: {
    padding: '20px 32px',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
    fontSize: '15px',
    color: '#1A1F2B',
    fontWeight: '500',
    width: '40%',
  },
  tdData: {
    padding: '20px 32px',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
    fontSize: '15px',
    color: '#5E6771',
    width: '20%',
    textAlign: 'center',
  },
  footer: {
    marginTop: '100px',
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

const CheckIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={styles.featureIcon}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const FeatureItem = ({ text }) => (
  <li style={styles.featureItem}>
    <CheckIcon />
    {text}
  </li>
);

const PricingCard = ({ name, price, period, features, buttonText, buttonType, featured }) => {
  const [hovered, setHovered] = useState(false);

  const cardStyle = featured ? { ...styles.priceCardFeatured } : { ...styles.priceCard };

  const outlineHoverStyle = hovered
    ? { ...styles.btnOutline, background: '#FDFCFB', borderColor: '#5E6771' }
    : styles.btnOutline;

  const primaryHoverStyle = hovered
    ? { ...styles.btnPrimary, background: '#963F26' }
    : styles.btnPrimary;

  return (
    <div style={cardStyle}>
      {featured && <div style={styles.badge}>Most Popular</div>}
      <h3 style={styles.planName}>{name}</h3>
      <div style={styles.planPrice}>
        <span style={styles.currency}>$</span>
        <span style={styles.amount}>{price}</span>
        <span style={styles.period}>{period}</span>
      </div>
      <ul style={styles.featureList}>
        {features.map((feature, idx) => (
          <FeatureItem key={idx} text={feature} />
        ))}
      </ul>
      <button
        style={buttonType === 'primary' ? primaryHoverStyle : outlineHoverStyle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => {}}
      >
        {buttonText}
      </button>
    </div>
  );
};

const ComparisonTable = () => {
  const rows = [
    { label: 'Monthly Book Limit', free: '2 Books', scholar: '15 Books', unlimited: 'No Limit' },
    { label: 'Translation Accuracy', free: 'Standard', scholar: 'High (Nuance™)', unlimited: 'Highest (Creative)' },
    { label: 'Cultural Idiom Support', free: '—', scholar: '✓', unlimited: '✓' },
    { label: 'Device Sync', free: '1 Device', scholar: '3 Devices', unlimited: 'Unlimited' },
    { label: 'Export to e-Reader', free: '—', scholar: '✓', unlimited: '✓' },
    { label: 'Audio-Book Generation', free: '—', scholar: '—', unlimited: '✓' },
  ];

  return (
    <table style={styles.comparisonTable}>
      <thead>
        <tr>
          <th style={{ ...styles.th, width: '40%' }}>Features</th>
          <th style={styles.thCenter}>Free</th>
          <th style={styles.thAccent}>Scholar</th>
          <th style={styles.thCenter}>Unlimited</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={idx}>
            <td style={idx === rows.length - 1 ? { ...styles.tdLabel, borderBottom: 'none' } : styles.tdLabel}>
              {row.label}
            </td>
            <td style={idx === rows.length - 1 ? { ...styles.tdData, borderBottom: 'none' } : styles.tdData}>
              {row.free}
            </td>
            <td style={idx === rows.length - 1 ? { ...styles.tdData, borderBottom: 'none' } : styles.tdData}>
              {row.scholar}
            </td>
            <td style={idx === rows.length - 1 ? { ...styles.tdData, borderBottom: 'none' } : styles.tdData}>
              {row.unlimited}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const Nav = () => (
  <nav style={styles.nav}>
    <a href="/" style={styles.logoText}>Globoox</a>
    <div style={styles.navLinks}>
      <a href="#" style={styles.navLink}>Explore</a>
      <a href="#" style={styles.navLink}>How it works</a>
      <a href="#" style={styles.navLinkAccent}>Log In</a>
    </div>
  </nav>
);

const PricingPage = () => {
  useEffect(() => {
    const link1 = document.createElement('link');
    link1.rel = 'preconnect';
    link1.href = 'https://fonts.googleapis.com';
    document.head.appendChild(link1);

    const link2 = document.createElement('link');
    link2.rel = 'preconnect';
    link2.href = 'https://fonts.gstatic.com';
    link2.crossOrigin = '';
    document.head.appendChild(link2);

    const link3 = document.createElement('link');
    link3.href = 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap';
    link3.rel = 'stylesheet';
    document.head.appendChild(link3);

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
      body { margin: 0; }
      @media (max-width: 900px) {
        .pricing-grid-responsive { grid-template-columns: 1fr !important; }
        .price-card-featured-responsive { transform: none !important; }
        .comparison-table-responsive { display: none !important; }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(link1);
      document.head.removeChild(link2);
      document.head.removeChild(link3);
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div style={styles.body}>
      <div style={styles.container}>
        <Nav />

        <header style={styles.pricingHeader}>
          <span style={styles.sectionLabel}>Investment in Wisdom</span>
          <h1 style={styles.h1}>A plan for every reader.</h1>
          <p style={styles.headerP}>
            From casual discovery to deep academic research, choose the scale of your literary exploration.
          </p>
        </header>

        <div className="pricing-grid-responsive" style={styles.pricingGrid}>
          <PricingCard
            name="Free"
            price="0"
            period=" / forever"
            features={[
              '2 books per month',
              'Standard translation engine',
              'Web reader access',
              'Community support',
            ]}
            buttonText="Current Plan"
            buttonType="outline"
            featured={false}
          />
          <PricingCard
            name="Scholar"
            price="12"
            period=" / month"
            features={[
              '15 books per month',
              'Advanced Nuance™ engine',
              'Export to Kindle/ePub',
              'Priority processing',
            ]}
            buttonText="Start 14-day Trial"
            buttonType="primary"
            featured={true}
          />
          <PricingCard
            name="Unlimited"
            price="29"
            period=" / month"
            features={[
              'Unlimited library',
              'Literary Voice Analysis',
              'Offline mobile access',
              'Personal Librarian AI',
            ]}
            buttonText="Go Unlimited"
            buttonType="outline"
            featured={false}
          />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span style={styles.sectionLabel}>Detailed Comparison</span>
          <h2 style={styles.h2}>Every nuance compared.</h2>
        </div>

        <div className="comparison-table-responsive">
          <ComparisonTable />
        </div>

        <footer style={styles.footer}>
          <p>© 2024 Globoox Inc. Curating the world's wisdom.</p>
          <div style={styles.footerLinks}>
            <a href="#" style={styles.footerLink}>Terms of Service</a>
            <a href="#" style={styles.footerLink}>Privacy Policy</a>
            <a href="#" style={styles.footerLink}>Contact Support</a>
          </div>
        </footer>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <Router basename="/">
      <Routes>
        <Route path="/" element={<PricingPage />} />
      </Routes>
    </Router>
  );
};

export default App;