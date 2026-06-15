'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, ChevronDown } from 'lucide-react';
import type { LandingLocale } from '@/lib/landing-i18n';
import { useAdaptiveDropdown } from '@/components/ui/useAdaptiveDropdown';

interface LandingHeaderProps {
  navItems?: Array<{ label: string; href: string }>;
  locale: LandingLocale;
  openAppLabel: string;
  languageLabel: string;
  languages: Array<{ value: LandingLocale; label: string }>;
}

export function LandingHeader({
  navItems = [],
  locale,
  openAppLabel,
  languageLabel,
  languages,
}: LandingHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [desktopLanguageMenuOpen, setDesktopLanguageMenuOpen] = useState(false);
  const [mobileLanguageMenuOpen, setMobileLanguageMenuOpen] = useState(false);
  const [activeHref, setActiveHref] = useState<string>('');
  const router = useRouter();
  const pathname = usePathname();
  const languageTriggerRef = useRef<HTMLButtonElement>(null);
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const sectionIds = useMemo(
    () => navItems.filter((item) => item.href.startsWith('#')).map((item) => item.href.slice(1)),
    [navItems]
  );
  const activeLanguageLabel = useMemo(
    () => languages.find((language) => language.value === locale)?.label ?? languages[0]?.label ?? locale,
    [languages, locale]
  );
  const { menuStyle } = useAdaptiveDropdown({
    isOpen: desktopLanguageMenuOpen,
    setIsOpen: setDesktopLanguageMenuOpen,
    triggerRef: languageTriggerRef,
    menuRef: languageMenuRef,
    menuWidth: 224,
    menuHeight: 220,
    gap: 10,
    margin: 12,
  });

  useEffect(() => {
    document.cookie = `landing_locale=${locale}; path=/; max-age=31536000; samesite=lax`;
  }, [locale]);

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
    setDesktopLanguageMenuOpen(false);
    setMobileLanguageMenuOpen(false);
  };

  const handleLanguageChange = (nextLocale: LandingLocale) => {
    if (nextLocale === locale) {
      setDesktopLanguageMenuOpen(false);
      setMobileLanguageMenuOpen(false);
      return;
    }

    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const normalizedPath = pathname?.replace(/^\/(en|es|fr|ru)/, '') || '/landing';
    router.push(`/${nextLocale}${normalizedPath}${hash}`);
    setMenuOpen(false);
    setDesktopLanguageMenuOpen(false);
    setMobileLanguageMenuOpen(false);
  };

  const renderLanguageMenu = (isMobile: boolean) => (
    <div
      style={{
        overflow: 'hidden',
        borderRadius: '20px',
        background: 'var(--parchment)',
        border: '1px solid rgba(44,59,45,0.08)',
        boxShadow: '0 18px 40px rgba(0,0,0,0.12)',
      }}
    >
      {languages.map((language, index) => (
        <div key={language.value}>
          <button
            type="button"
            onClick={() => handleLanguageChange(language.value)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: isMobile ? '14px 18px' : '14px 18px',
              border: 'none',
              background: 'transparent',
              color: 'var(--marketing-text)',
              fontSize: isMobile ? '17px' : '18px',
              lineHeight: 1.2,
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <span>{language.label}</span>
            {language.value === locale ? (
              <Check size={20} style={{ color: 'var(--marketing-accent)', flexShrink: 0 }} />
            ) : (
              <span aria-hidden="true" style={{ width: '20px', flexShrink: 0 }} />
            )}
          </button>
          {index < languages.length - 1 ? (
            <div
              style={{
                height: '1px',
                margin: '0 18px',
                background: 'rgba(44,59,45,0.08)',
              }}
            />
          ) : null}
        </div>
      ))}
    </div>
  );

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
              lineHeight: 1.18,
              display: 'inline-flex',
              alignItems: 'center',
              paddingBottom: '2px',
            }}
          >
            <span className="landing-header-logo-full">Globoox</span>
            <span className="landing-header-logo-compact" style={{ display: 'none' }}>G</span>
          </Link>

          <nav className="landing-header-links" style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
            {navItems.map((item) => (
              <div key={item.href} className="landing-header-nav-item" style={{ display: 'flex', alignItems: 'center' }}>
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
            <div
              className="landing-header-language"
              style={{
                display: 'flex',
                alignItems: 'center',
                marginLeft: '16px',
                position: 'relative',
              }}
            >
              <button
                ref={languageTriggerRef}
                type="button"
                onClick={() => setDesktopLanguageMenuOpen((open) => !open)}
                aria-label={languageLabel}
                aria-haspopup="menu"
                aria-expanded={desktopLanguageMenuOpen}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  color: 'var(--marketing-text-muted)',
                  fontSize: '14px',
                  fontWeight: 500,
                  lineHeight: 1,
                  padding: '10px 14px 10px 16px',
                  minHeight: '40px',
                  whiteSpace: 'nowrap',
                  border: 'none',
                  borderRadius: '18px',
                  background: desktopLanguageMenuOpen ? 'rgba(44,59,45,0.08)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <span>{activeLanguageLabel}</span>
                <ChevronDown
                  aria-hidden="true"
                  size={16}
                  style={{
                    color: 'var(--marketing-text-muted)',
                    transform: desktopLanguageMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 180ms ease',
                    flexShrink: 0,
                  }}
                />
              </button>
              {desktopLanguageMenuOpen ? (
                <div
                  ref={languageMenuRef}
                  className="landing-header-language-dropdown"
                  style={{
                    position: 'fixed',
                    width: '224px',
                    zIndex: 80,
                    top: `${menuStyle.top}px`,
                    left: `${menuStyle.left}px`,
                    transformOrigin: menuStyle.transformOrigin,
                  }}
                >
                  {renderLanguageMenu(false)}
                </div>
              ) : null}
            </div>
          </nav>

          <Link
            href="/my-books"
            className="landing-header-open-app"
            style={{
              color: 'var(--marketing-text)',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600,
              marginLeft: '20px',
              padding: '10px 16px',
              borderRadius: '999px',
              background: 'var(--marketing-accent-soft)',
              textAlign: 'center',
              flexShrink: 0,
            }}
          >
            {openAppLabel}
          </Link>

          <button
            type="button"
            className="landing-header-menu-btn"
            onClick={() => {
              setDesktopLanguageMenuOpen(false);
              setMobileLanguageMenuOpen(false);
              setMenuOpen((v) => !v);
            }}
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
            <div
              className="landing-header-mobile-language-wrap"
              style={{
                display: 'block',
                position: 'relative',
                marginTop: '18px',
                paddingTop: '18px',
                borderTop: '1px solid var(--marketing-border)',
              }}
            >
              <button
                type="button"
                onClick={() => setMobileLanguageMenuOpen((open) => !open)}
                aria-label={languageLabel}
                aria-haspopup="menu"
                aria-expanded={mobileLanguageMenuOpen}
                style={{
                  width: '100%',
                  border: 'none',
                  background: mobileLanguageMenuOpen ? 'rgba(44,59,45,0.08)' : 'transparent',
                  color: 'var(--marketing-text)',
                  fontSize: '15px',
                  fontWeight: 500,
                  padding: '12px 14px 12px 16px',
                  lineHeight: 1.2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: '10px',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{activeLanguageLabel}</span>
                <ChevronDown
                  aria-hidden="true"
                  size={16}
                  style={{
                    color: 'var(--marketing-text-muted)',
                    transform: mobileLanguageMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 180ms ease',
                    flexShrink: 0,
                  }}
                />
              </button>
              {mobileLanguageMenuOpen ? (
                <div
                  className="landing-header-language-dropdown-mobile"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 12px)',
                    left: 0,
                    right: 0,
                    zIndex: 90,
                  }}
                >
                  {renderLanguageMenu(true)}
                </div>
              ) : null}
            </div>
            <Link
              href="/my-books"
              onClick={() => setMenuOpen(false)}
              className="landing-header-open-app-mobile"
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
              {openAppLabel}
            </Link>
          </div>
        )}
      </header>

      <style>{`
        @media (max-width: 904px) {
          .landing-header-nav-item {
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
          .landing-header-open-app {
            margin-left: auto !important;
            margin-right: 12px !important;
          }
          .landing-header-logo-full {
            display: inline !important;
          }
          .landing-header-logo-compact {
            display: none !important;
          }
        }
        .landing-header-language-dropdown,
        .landing-header-language-dropdown-mobile {
          animation: landing-header-dropdown-in 180ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes landing-header-dropdown-in {
          from {
            opacity: 0;
            transform: scale(0.98);
          }
          to {
            opacity: 1;
            transform: scale(1);
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
        @media (min-width: 905px) {
          .landing-header-menu-btn {
            display: none !important;
          }
          .landing-header-nav-item {
            display: flex !important;
          }
          .landing-header-language {
            display: flex !important;
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
        @media (min-width: 905px) {
          .landing-header-mobile-menu {
            display: none !important;
          }
        }
        @media (max-width: 359px) {
          .landing-header-open-app {
            display: none !important;
          }
          .landing-header-open-app-mobile {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}
