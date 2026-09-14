'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowRight, ArrowUp, ArrowUpRight, ChevronDown, Menu, X } from 'lucide-react';
import { type LandingLocale } from '@/lib/landing-i18n';
import ProductRecording from './ProductRecording';
import { SECTION_NAVIGATION_END, useSectionNavigation } from './useSectionNavigation';
import { useActiveSection } from './useActiveSection';
import { EditorialLocaleProvider, useEditorialLocale } from './EditorialLocale';
import { getEditorialPricingCopy } from './editorialPricingCopy';
import { getEditorialHeroParts } from './editorialHeroCopy';
import HowItWorksSection from './HowItWorksSection';
import QualitySection from './QualitySection';
import TeamSection from './TeamSection';
import LanguagesSection from './LanguagesSection';
import PricingSection from './PricingSection';
import s from './EditorialLanding.module.css';
import EditorialConsent from './EditorialConsent';

const subscribeToHash = (listener: () => void) => {
  window.addEventListener('hashchange', listener);
  window.addEventListener('popstate', listener);
  window.addEventListener(SECTION_NAVIGATION_END, listener);
  return () => {
    window.removeEventListener('hashchange', listener);
    window.removeEventListener('popstate', listener);
    window.removeEventListener(SECTION_NAVIGATION_END, listener);
  };
};

function Wordmark() {
  return <span className={s.wordmark}><Image src="/icon.svg" width={28} height={28} alt="" aria-hidden="true" /><span>Globoox</span></span>;
}

export default function EditorialLanding({ locale = 'en', navigationMode = 'preview' }: { locale?: LandingLocale; navigationMode?: 'preview' | 'published' }) {
  return <EditorialLocaleProvider locale={locale}><EditorialLandingContent navigationMode={navigationMode} /></EditorialLocaleProvider>;
}

function EditorialLandingContent({ navigationMode }: { navigationMode: 'preview' | 'published' }) {
  const { locale, messages, ui } = useEditorialLocale();
  const languages = messages.header.languages.some(language => language.value === 'es')
    ? messages.header.languages
    : [...messages.header.languages.slice(0, 1), { value: 'es' as const, label: 'Español' }, ...messages.header.languages.slice(1)];
  const nav = messages.header.nav.flatMap(({ label, href }) =>
    href === '#start' ? [[getEditorialPricingCopy(locale).navigation, '#pricing'], [label, href]] : [[label, href]]
  );
  const hero = getEditorialHeroParts(messages.hero.title, locale);
  const [menuOpen, setMenuOpen] = useState(false);
  const { pageRef, navigateSection } = useSectionNavigation(() => setMenuOpen(false));
  const activeHref = useActiveSection(pageRef);
  const hash = useSyncExternalStore(subscribeToHash, () => window.location.hash, () => '');
  const localePath = (value: LandingLocale) => `${navigationMode === 'preview' ? '/landing-editorial' : ''}/${value}${hash}`;

  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1101px)');
    const resetMenu = () => { if (wide.matches) setMenuOpen(false); };
    wide.addEventListener('change', resetMenu);
    return () => wide.removeEventListener('change', resetMenu);
  }, []);

  useEffect(() => {
    const previousLang = document.documentElement.lang;
    document.documentElement.lang = locale;
    document.cookie = `landing_locale=${locale}; path=/; max-age=31536000; SameSite=Lax`;
    return () => { document.documentElement.lang = previousLang; };
  }, [locale]);

  return <div ref={pageRef} className={s.page} lang={locale}>
    <a href="#main-content" className={s.skipLink}>{ui.navigation.skipToContent}</a>
    <header className={s.header}>
      <div className={s.headerInner}>
      <Link href="#hero" aria-label={ui.navigation.home} onClick={(event) => navigateSection(event, "#hero")}><Wordmark /></Link>
      <nav className={s.desktopNav} aria-label={ui.navigation.main}>{nav.map(([label, href]) => <a key={href} href={href} aria-current={activeHref === href ? 'location' : undefined} onClick={(event) => navigateSection(event, href)}>{label}</a>)}</nav>
      <div className={s.localeSelect}><label htmlFor="editorial-locale" className={s.srOnly}>{messages.header.languageLabel}</label><select id="editorial-locale" value={locale} onPointerDown={e => { e.currentTarget.dataset.pointerFocus = "true"; }} onKeyDown={e => { if (e.key === "Escape" && e.currentTarget.dataset.pointerFocus) e.currentTarget.blur(); else delete e.currentTarget.dataset.pointerFocus; }} onBlur={e => { delete e.currentTarget.dataset.pointerFocus; }} onChange={e => { window.location.href = localePath(e.target.value as LandingLocale); }}>{languages.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}</select><ChevronDown size={12} aria-hidden="true" /></div>
      <Link href="/my-books" className={s.headerCta}>{messages.header.openApp} <ArrowUpRight size={16} strokeWidth={1.5} /></Link>
      <button type="button" className={s.menuButton} aria-label={menuOpen ? ui.navigation.close : ui.navigation.open} aria-expanded={menuOpen} aria-controls="editorial-mobile-nav" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
      {menuOpen && <nav id="editorial-mobile-nav" className={s.mobileNav} aria-label={ui.navigation.mobile}>{nav.map(([label, href]) => <a key={href} href={href} aria-current={activeHref === href ? 'location' : undefined} onClick={(event) => navigateSection(event, href)}>{label}<ArrowUpRight size={15} /></a>)}<Link href="/my-books">{messages.header.openApp} <ArrowRight size={15} /></Link><div className={s.mobileLocales} aria-label={messages.header.languageLabel}>{languages.map(l => <Link key={l.value} href={localePath(l.value)} lang={l.value} aria-current={l.value === locale ? 'page' : undefined}>{l.label}</Link>)}</div></nav>}
      </div>
    </header>

    <main id="main-content">
      <section id="hero" className={s.hero} aria-labelledby="editorial-title">
        <div className={s.heroCopy}>
          <h1 id="editorial-title">
            <span className={s.heroIntro}>{hero.intro}</span>
            <span className={s.heroLead}>
              <span className={s.heroLeadCopy}>{hero.lead}</span>
              <span className={s.heroLastLine}>{hero.connector}<em>{hero.emphasis}</em></span>
            </span>
          </h1>
          
          <div className={s.heroActions}><Link className={s.primaryButton} href="/my-books">{messages.hero.button}</Link></div>
        </div>
        <div className={s.productStage}>
          <div className={s.readerWrap}><ProductRecording /></div>
        </div>
        
      </section>

      <HowItWorksSection />
      <QualitySection />

      <LanguagesSection />

      <TeamSection messages={messages.founders} />

      <PricingSection />

      <section id="start" className={s.start} aria-labelledby="start-title">
        <div className={s.startInner}><Image src="/icon.svg" alt="" width={56} height={56} aria-hidden="true" /><h2 id="start-title">{messages.cta.heading}</h2><p>{messages.cta.description}</p><Link href="/my-books" className={s.primaryButton}>{messages.cta.button}</Link></div>
      </section>
    </main>

    <footer className={s.footer}><div className={s.footerTop}><p>{messages.footer.tagline}</p></div><div className={s.footerBottom}><span>{messages.footer.copyright}</span><nav className={s.legalLinks} aria-label={messages.footer.legal}><Link href="/landing-editorial/legal/terms">{messages.footer.terms}</Link><Link href="/landing-editorial/legal/privacy">{messages.footer.privacy}</Link></nav><a href="#hero" className={s.backTop} onClick={(event) => navigateSection(event, "#hero")}>{ui.navigation.backToTop} <ArrowUp size={18} strokeWidth={1.5} aria-hidden="true" /></a></div></footer>
    <EditorialConsent />
  </div>;
}
