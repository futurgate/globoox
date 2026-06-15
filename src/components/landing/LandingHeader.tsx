'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

interface LandingHeaderProps {
  navItems?: Array<{ label: string; href: string }>;
}

const landingLanguages = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'ru', label: 'Русский' },
];

export function LandingHeader({ navItems = [] }: LandingHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeHref, setActiveHref] = useState<string>('');
  const [activeLanguage, setActiveLanguage] = useState('en');
  const sectionIds = useMemo(
    () => navItems.filter((item) => item.href.startsWith('#')).map((item) => item.href.slice(1)),
    [navItems]
  );

  useEffect(() => {
    if (sectionIds.length === 0) return;

    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const initialHash = window.location.hash;
    const initialHref =
      initialHash && sectionIds.includes(initialHash.slice(1)) ? initialHash : `#${sections[0].id}`;
    const frameId = window.requestAnimationFrame(() => {
      setActiveHref(initialHref);
    });

    const updateActiveSection = () => {
      const scrollAnchor = window.scrollY + 180;
      const firstSectionTop = sections[0].offsetTop;
      if (scrollAnchor < firstSectionTop) {
        setActiveHref('');
        return;
      }

      let currentId = sections[0].id;

      for (const section of sections) {
        if (section.offsetTop <= scrollAnchor) {
          currentId = section.id;
        } else {
          break;
        }
      }

      setActiveHref(`#${currentId}`);
    };

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
    };
  }, [sectionIds]);

  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const hero = document.getElementById('hero');
    if (!hero) return;

    event.preventDefault();
    hero.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', '#hero');
    setActiveHref('');
    setMenuOpen(false);
  };

  return (
    <>
      <header
        style={{
          position: 'fixed',
          top: '12px',
          left: 0,
          right: 0,
          zIndex: 40,
          padding: '0px 16px 0',
          overflow: 'visible',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 8px 8px 20px',
            borderRadius: '28px',
            backdropFilter: 'blur(14px)',
              background: 'var(--marketing-surface-bg)',
              border: '1px solid var(--marketing-border)',
            boxShadow: '0 12px 28px rgba(0,0,0,0.08)',
          }}
        >
          <Link
            href="#hero"
            onClick={handleLogoClick}
            className="landing-header-logo"
            style={{
              fontFamily: "'Lora', serif",
              fontSize: '22px',
              color: 'var(--marketing-text)',
              textDecoration: 'none',
              fontWeight: 500,
              letterSpacing: '-0.02em',
            }}
          >
            <span className="landing-header-logo-full">Globoox</span>
            <span className="landing-header-logo-compact" style={{ display: 'none' }}>G</span>
          </Link>

          <nav className="landing-header-links" style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
            {navItems.map((item) => (
              <div key={item.href} style={{ display: 'flex', alignItems: 'center' }}>
                <a
                  href={item.href}
                  aria-current={activeHref === item.href ? 'true' : undefined}
                  style={{
                    color: activeHref === item.href ? 'var(--marketing-text)' : 'var(--marketing-text-muted)',
                    textDecorationLine: activeHref === item.href ? 'underline' : 'none',
                    textDecorationColor: 'var(--marketing-accent)',
                    textDecorationThickness: '2px',
                    textUnderlineOffset: '6px',
                    fontSize: '14px',
                    fontWeight: activeHref === item.href ? 600 : 500,
                    padding: '0 18px',
                  }}
                >
                  {item.label}
                </a>
              </div>
            ))}
            <label
              className="landing-header-language"
              style={{
                display: 'flex',
                alignItems: 'center',
                marginLeft: '16px',
                position: 'relative',
              }}
            >
              <select
                value={activeLanguage}
                onChange={(event) => setActiveLanguage(event.target.value)}
                aria-label="Select language"
                style={{
                  border: 'none',
                  background: 'transparent',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  color: 'var(--marketing-text-muted)',
                  fontSize: '14px',
                  fontWeight: 500,
                  lineHeight: 1,
                  padding: '8px 22px 8px 18px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {landingLanguages.map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  width: '8px',
                  height: '8px',
                  borderRight: '1.5px solid var(--marketing-text-muted)',
                  borderBottom: '1.5px solid var(--marketing-text-muted)',
                  transform: 'translateY(-70%) rotate(45deg)',
                  pointerEvents: 'none',
                }}
              />
            </label>
            <a
              href="/my-books"
              className="landing-header-open-app"
              style={{
                color: 'var(--marketing-text)',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 600,
                marginLeft: '28px',
                padding: '10px 16px',
                borderRadius: '999px',
                background: 'var(--marketing-accent-soft)',
                textAlign: 'center',
              }}
            >
              Open App
            </a>
          </nav>

          <button
            type="button"
            className="landing-header-menu-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle navigation"
            style={{
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              width: '44px',
              height: '44px',
              borderRadius: '0',
              border: 'none',
              background: 'transparent',
              color: 'var(--marketing-text)',
              cursor: 'pointer',
              padding: 0,
              position: 'relative',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: 'relative',
                width: '18px',
                height: '18px',
                display: 'block',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: menuOpen ? '8px' : '3px',
                  height: '2px',
                  borderRadius: '999px',
                  background: 'var(--marketing-text)',
                  transform: menuOpen ? 'rotate(45deg)' : 'none',
                  transition: 'transform 180ms ease, top 180ms ease, opacity 180ms ease',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: '8px',
                  height: '2px',
                  borderRadius: '999px',
                  background: 'var(--marketing-text)',
                  opacity: menuOpen ? 0 : 1,
                  transition: 'opacity 180ms ease',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: menuOpen ? '8px' : '13px',
                  height: '2px',
                  borderRadius: '999px',
                  background: 'var(--marketing-text)',
                  transform: menuOpen ? 'rotate(-45deg)' : 'none',
                  transition: 'transform 180ms ease, top 180ms ease',
                }}
              />
            </span>
          </button>
        </div>

        {menuOpen && navItems.length > 0 && (
          <div
            className="landing-header-mobile-menu"
            style={{
              position: 'absolute',
              top: 'calc(100% + 12px)',
              left: '8px',
              right: '8px',
              display: 'none',
              flexDirection: 'column',
              gap: '0',
              padding: '22px 20px 24px',
              borderRadius: '20px',
              background: 'var(--marketing-overlay-bg)',
              border: '1px solid var(--marketing-border)',
              boxShadow: '0 18px 40px rgba(0,0,0,0.12)',
            }}
          >
            {navItems.map((item, index) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                aria-current={activeHref === item.href ? 'true' : undefined}
                style={{
                  color: activeHref === item.href ? 'var(--marketing-text)' : 'var(--marketing-text-muted)',
                  textDecorationLine: activeHref === item.href ? 'underline' : 'none',
                  textDecorationColor: 'var(--marketing-accent)',
                  textDecorationThickness: '2px',
                  textUnderlineOffset: '6px',
                  fontSize: '15px',
                  fontWeight: activeHref === item.href ? 600 : 500,
                  padding: '14px 0',
                  borderBottom: index < navItems.length - 1 ? '1px solid var(--marketing-border)' : 'none',
                }}
              >
                {item.label}
              </a>
            ))}
            <label
              style={{
                display: 'flex',
                position: 'relative',
                marginTop: '18px',
                paddingTop: '18px',
                borderTop: '1px solid var(--marketing-border)',
              }}
            >
              <select
                value={activeLanguage}
                onChange={(event) => setActiveLanguage(event.target.value)}
                aria-label="Select language"
                style={{
                  width: '100%',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  border: 'none',
                  borderRadius: '0',
                  background: 'transparent',
                  color: 'var(--marketing-text)',
                  fontSize: '15px',
                  fontWeight: 500,
                  padding: '0 18px 0 0',
                  lineHeight: 1.2,
                  outline: 'none',
                }}
              >
                {landingLanguages.map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  right: '4px',
                  top: 'calc(50% + 9px)',
                  width: '8px',
                  height: '8px',
                  borderRight: '1.5px solid var(--marketing-text-muted)',
                  borderBottom: '1.5px solid var(--marketing-text-muted)',
                  transform: 'translateY(-70%) rotate(45deg)',
                  pointerEvents: 'none',
                }}
              />
            </label>
            <a
              href="/my-books"
              onClick={() => setMenuOpen(false)}
              style={{
                color: 'white',
                textDecoration: 'none',
                fontSize: '15px',
                fontWeight: 600,
                padding: '12px 16px',
                marginTop: '22px',
                borderRadius: '12px',
                background: 'var(--marketing-accent)',
                textAlign: 'center',
              }}
            >
              Open App
            </a>
          </div>
        )}
      </header>

      <style>{`
        @media (max-width: 769px) {
          .landing-header-links {
            display: none !important;
          }
          .landing-header-language {
            display: none !important;
          }
          .landing-header-menu-btn {
            display: inline-flex !important;
          }
          .landing-header-mobile-menu {
            display: flex !important;
          }
          .landing-header-logo-full {
            display: inline !important;
          }
          .landing-header-logo-compact {
            display: none !important;
          }
        }
        @media (min-width: 770px) and (max-width: 839px) {
          .landing-header-logo-full {
            display: none !important;
          }
          .landing-header-logo-compact {
            display: inline !important;
          }
        }
        @media (min-width: 840px) {
          .landing-header-logo-full {
            display: inline !important;
          }
          .landing-header-logo-compact {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
