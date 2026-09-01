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
    '--card-radius': '12px',
    '--container-width': '1200px',
    '--shelf-color': '#E8E4DF',
  },
  body: {
    fontFamily: "'Inter', -apple-system, sans-serif",
    backgroundColor: '#F7F5F2',
    color: '#1A1F2B',
    lineHeight: '1.6',
    minHeight: '100vh',
    WebkitFontSmoothing: 'antialiased',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px',
  },
  topNav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 0',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
    marginBottom: '40px',
  },
  logo: {
    fontFamily: "'Lora', serif",
    fontSize: '24px',
    fontWeight: '700',
    color: '#1A1F2B',
    textDecoration: 'none',
  },
  navLinks: {
    display: 'flex',
    gap: '32px',
  },
  navLink: {
    textDecoration: 'none',
    color: '#5E6771',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
  },
  navLinkActive: {
    textDecoration: 'none',
    color: '#B25032',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
  },
  dashboardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: '60px',
  },
  sectionLabel: {
    textTransform: 'uppercase',
    fontSize: '12px',
    fontWeight: '600',
    color: '#B25032',
    letterSpacing: '0.12em',
    marginBottom: '8px',
    display: 'block',
  },
  h1: {
    fontFamily: "'Lora', serif",
    fontSize: '42px',
    fontWeight: '500',
    marginBottom: '8px',
  },
  searchContainer: {
    position: 'relative',
    width: '320px',
  },
  searchInput: {
    width: '100%',
    padding: '14px 20px 14px 45px',
    background: '#FFFFFF',
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: '30px',
    fontFamily: "'Inter', sans-serif",
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  searchIcon: {
    position: 'absolute',
    left: '18px',
    top: '50%',
    transform: 'translateY(-50%)',
    opacity: '0.4',
  },
  shelfRow: {
    marginBottom: '80px',
    position: 'relative',
  },
  shelfTitle: {
    fontFamily: "'Lora', serif",
    fontSize: '24px',
    marginBottom: '30px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  shelfGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '40px',
    position: 'relative',
    zIndex: '2',
  },
  bookCard: {
    display: 'flex',
    flexDirection: 'column',
    cursor: 'pointer',
    transition: 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)',
  },
  bookCoverBase: {
    width: '100%',
    aspectRatio: '2/3',
    borderRadius: '4px 12px 12px 4px',
    position: 'relative',
    boxShadow: '8px 12px 24px rgba(0,0,0,0.12)',
    overflow: 'hidden',
    borderLeft: '4px solid rgba(0,0,0,0.1)',
  },
  coverContent: {
    padding: '24px 16px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.05) 100%)',
  },
  bookTitle: {
    fontFamily: "'Lora', serif",
    fontSize: '18px',
    lineHeight: '1.3',
    fontWeight: '600',
  },
  bookAuthor: {
    fontSize: '13px',
    color: '#5E6771',
    marginTop: '4px',
  },
  bookAuthorDark: {
    fontSize: '13px',
    color: '#A0A9B5',
    marginTop: '4px',
  },
  langBadge: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: 'rgba(26, 31, 43, 0.85)',
    backdropFilter: 'blur(4px)',
    color: 'white',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    letterSpacing: '0.05em',
  },
  progressContainer: {
    marginTop: '16px',
  },
  progressBar: {
    height: '4px',
    background: 'rgba(0,0,0,0.05)',
    borderRadius: '2px',
    marginBottom: '8px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#B25032',
    borderRadius: '2px',
  },
  progressText: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#5E6771',
    fontWeight: '500',
  },
  shelfLine: {
    position: 'absolute',
    bottom: '-15px',
    left: '-20px',
    right: '-20px',
    height: '12px',
    background: '#E8E4DF',
    borderRadius: '2px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
    zIndex: '1',
  },
  btnAdd: {
    background: '#B25032',
    color: 'white',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    boxShadow: '0 4px 12px rgba(178, 80, 50, 0.3)',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    border: 'none',
    flexShrink: 0,
  },
  avatar: {
    width: '32px',
    height: '32px',
    background: '#ddd',
    borderRadius: '50%',
  },
  footer: {
    marginTop: '100px',
    textAlign: 'center',
    color: '#5E6771',
    fontSize: '13px',
  },
  cover1: { backgroundColor: '#E2E8F0' },
  cover2: { backgroundColor: '#1A1F2B', color: '#D48B77' },
  cover3: { backgroundColor: '#F1E9DB' },
  cover4: { backgroundColor: '#DFE7E2' },
};

const BookCard = ({ cover, lang, title, author, progress, progressLabel, timeLabel, isDark }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        ...styles.bookCard,
        transform: hovered ? 'translateY(-10px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ ...styles.bookCoverBase, ...cover }}>
        <span style={styles.langBadge}>{lang}</span>
        <div style={styles.coverContent}>
          <div>
            <div style={{ ...styles.bookTitle, color: isDark ? '#D48B77' : undefined }}>{title}</div>
            <div style={isDark ? styles.bookAuthorDark : styles.bookAuthor}>{author}</div>
          </div>
          <div></div>
        </div>
      </div>
      <div style={styles.progressContainer}>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }}></div>
        </div>
        <div style={styles.progressText}>
          <span>{progressLabel}</span>
          <span>{timeLabel}</span>
        </div>
      </div>
    </div>
  );
};

const LibraryPage = () => {
  const [searchValue, setSearchValue] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [addHovered, setAddHovered] = useState(false);
  const [activeNav, setActiveNav] = useState('Library');

  const navItems = ['Library', 'Discover', 'Translator', 'Settings'];

  const currentlyReading = [
    {
      id: 1,
      cover: styles.cover2,
      lang: 'RU → EN',
      title: 'Crime and Punishment',
      author: 'Fyodor Dostoevsky',
      progress: 64,
      progressLabel: '64% read',
      timeLabel: '2h left',
      isDark: true,
    },
    {
      id: 2,
      cover: styles.cover3,
      lang: 'FR → EN',
      title: 'In Search of Lost Time',
      author: 'Marcel Proust',
      progress: 12,
      progressLabel: '12% read',
      timeLabel: '48h left',
      isDark: false,
    },
    {
      id: 3,
      cover: styles.cover1,
      lang: 'ES → EN',
      title: 'One Hundred Years of Solitude',
      author: 'Gabriel García Márquez',
      progress: 88,
      progressLabel: '88% read',
      timeLabel: '45m left',
      isDark: false,
    },
  ];

  const completed = [
    {
      id: 4,
      cover: styles.cover4,
      lang: 'JP → EN',
      title: 'The Wind-Up Bird Chronicle',
      author: 'Haruki Murakami',
      progress: 100,
      progressLabel: 'Completed',
      timeLabel: 'Jan 2024',
      isDark: false,
    },
    {
      id: 5,
      cover: styles.cover1,
      lang: 'DE → EN',
      title: 'The Metamorphosis',
      author: 'Franz Kafka',
      progress: 100,
      progressLabel: 'Completed',
      timeLabel: 'Dec 2023',
      isDark: false,
    },
  ];

  const filterBooks = (books) => {
    if (!searchValue.trim()) return books;
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(searchValue.toLowerCase()) ||
        b.author.toLowerCase().includes(searchValue.toLowerCase())
    );
  };

  const filteredCurrent = filterBooks(currentlyReading);
  const filteredCompleted = filterBooks(completed);

  return (
    <div style={styles.body}>
      <div style={styles.container}>
        <nav style={styles.topNav}>
          <span style={styles.logo}>Globoox</span>
          <div style={styles.navLinks}>
            {navItems.map((item) => (
              <button
                key={item}
                style={activeNav === item ? styles.navLinkActive : styles.navLink}
                onClick={() => setActiveNav(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={styles.avatar}></div>
          </div>
        </nav>

        <header style={styles.dashboardHeader}>
          <div>
            <span style={styles.sectionLabel}>Welcome back</span>
            <h1 style={styles.h1}>Your Private Library</h1>
          </div>
          <div style={styles.searchContainer}>
            <svg
              style={styles.searchIcon}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              style={{
                ...styles.searchInput,
                borderColor: searchFocused ? '#B25032' : 'rgba(0,0,0,0.08)',
              }}
              placeholder="Search your collection..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>
        </header>

        <div style={styles.shelfRow}>
          <div style={styles.shelfTitle}>
            <span>Currently Reading</span>
            <button
              style={{
                ...styles.btnAdd,
                transform: addHovered ? 'scale(1.1)' : 'scale(1)',
                background: addHovered ? '#963F26' : '#B25032',
              }}
              title="Upload new book"
              onMouseEnter={() => setAddHovered(true)}
              onMouseLeave={() => setAddHovered(false)}
              onClick={() => {}}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          <div style={styles.shelfGrid}>
            {filteredCurrent.map((book) => (
              <BookCard key={book.id} {...book} />
            ))}
          </div>
          <div style={styles.shelfLine}></div>
        </div>

        <div style={styles.shelfRow}>
          <div style={styles.shelfTitle}>Completed</div>
          <div style={styles.shelfGrid}>
            {filteredCompleted.map((book) => (
              <BookCard key={book.id} {...book} />
            ))}
          </div>
          <div style={styles.shelfLine}></div>
        </div>

        <footer style={styles.footer}>
          <p>Showing 5 of 12 books in your library</p>
        </footer>
      </div>
    </div>
  );
};

const App = () => {
  useEffect(() => {
    const link1 = document.createElement('link');
    link1.rel = 'preconnect';
    link1.href = 'https://fonts.googleapis.com';
    document.head.appendChild(link1);

    const link2 = document.createElement('link');
    link2.rel = 'preconnect';
    link2.href = 'https://fonts.gstatic.com';
    link2.crossOrigin = 'true';
    document.head.appendChild(link2);

    const link3 = document.createElement('link');
    link3.rel = 'stylesheet';
    link3.href =
      'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap';
    document.head.appendChild(link3);

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
      body { background-color: #F7F5F2; }
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
    <Router basename="/">
      <Routes>
        <Route path="/" element={<LibraryPage />} />
        <Route path="*" element={<LibraryPage />} />
      </Routes>
    </Router>
  );
};

export default App;