'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Menu, X } from 'lucide-react';
import { getLandingMessages } from '@/lib/landing-i18n';
import ProductRecording from './ProductRecording';
import HowItWorksSection from './HowItWorksSection';
import QualitySection from './QualitySection';
import TeamSection from './TeamSection';
import LanguagesSection from './LanguagesSection';
import s from './EditorialLanding.module.css';
import posthog from 'posthog-js';
import { readCookieConsent, saveCookieConsent, type CookieConsentChoice } from '@/lib/cookieConsent';

const messages = getLandingMessages('en');
const nav = messages.header.nav.map(({ label, href }) => [label, href]);
const subscribe = () => () => {};

function Wordmark() {
  return <span className={s.wordmark}><Image src="/icon.svg" width={35} height={35} alt="" aria-hidden="true" /><span>Globoox</span></span>;
}

// Reuse the existing consent contract with an isolated presentation. The shared
// before_send gate recognizes this new route before client hydration.
function PreviewConsent() {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [sessionChoice, setSessionChoice] = useState<CookieConsentChoice | null>(null);
  const choice = sessionChoice ?? (hydrated ? readCookieConsent() : null);
  useEffect(() => {
    if (choice === 'accepted') posthog.opt_in_capturing();
    else posthog.opt_out_capturing();
  }, [choice]);
  const choose = (value: CookieConsentChoice) => {
    try { saveCookieConsent(value); } catch { /* Keep the choice for this session. */ }
    setSessionChoice(value);
  };
  if (!hydrated || choice) return null;
  return <aside className={s.consent} aria-label={messages.cookies.title}>
    <div><strong>{messages.cookies.title}</strong><p>{messages.cookies.description}</p></div>
    <div className={s.consentActions}>
      <button type="button" onClick={() => choose('necessary')}>{messages.cookies.necessary}</button>
      <button type="button" onClick={() => choose('accepted')}>{messages.cookies.accept} <Check size={13} /></button>
    </div>
  </aside>;
}

export default function EditorialLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className={s.page}>
    <a href="#main-content" className={s.skipLink}>Skip to content</a>
    <header className={s.header}>
      <Link href="#hero" aria-label="Globoox home"><Wordmark /></Link>
      <nav className={s.desktopNav} aria-label="Main navigation">{nav.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav>
      <div className={s.localeSelect}><label htmlFor="editorial-locale" className={s.srOnly}>{messages.header.languageLabel}</label><select id="editorial-locale" defaultValue="en" onChange={e => { window.location.href = `/${e.target.value}`; }}>{messages.header.languages.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}</select><ChevronDown size={12} aria-hidden="true" /></div>
      <Link href="/my-books" className={s.headerCta}>{messages.header.openApp} <ArrowUpRight size={16} strokeWidth={1.5} /></Link>
      <button type="button" className={s.menuButton} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="editorial-mobile-nav" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
      {menuOpen && <nav id="editorial-mobile-nav" className={s.mobileNav} aria-label="Mobile navigation">{nav.map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}<ArrowUpRight size={15} /></a>)}<Link href="/my-books">{messages.header.openApp} <ArrowRight size={15} /></Link><div className={s.mobileLocales} aria-label={messages.header.languageLabel}>{messages.header.languages.map(l => <Link key={l.value} href={`/${l.value}`} lang={l.value} aria-current={l.value === "en" ? "page" : undefined}>{l.label}</Link>)}</div></nav>}
    </header>

    <main id="main-content">
      <section id="hero" className={s.hero} aria-labelledby="editorial-title">
        <div className={s.heroCopy}>
          <p className={s.eyebrow}>A world of books. Open to you.</p>
          <h1 id="editorial-title">{messages.hero.title.replace("your native language.", "")}<em>your native language.</em></h1>
          
          <div className={s.heroActions}><Link className={s.primaryButton} href="/my-books">{messages.hero.button} <ArrowRight size={17} strokeWidth={1.5} /></Link></div>
        </div>
        <div className={s.productStage}>
          <Image className={s.botanical} src="/redesign/botanical-frame.png" alt="" aria-hidden="true" width={1536} height={1024} priority sizes="100vw" />
          <div className={s.readerWrap}><ProductRecording /></div>
        </div>
        
      </section>

      <HowItWorksSection />
      <QualitySection />

      <LanguagesSection />

      <TeamSection messages={messages.founders} />

      <section id="start" className={s.start} aria-labelledby="start-title">
        <div className={s.startInner}><Image src="/icon.svg" alt="" width={56} height={56} aria-hidden="true" /><h2 id="start-title">{messages.cta.heading}</h2><p>{messages.cta.description}</p><Link href="/my-books" className={s.primaryButton}>{messages.cta.button} <ArrowRight size={17} strokeWidth={1.5} /></Link></div>
        <Image className={s.closingBotanical} src="/redesign/botanical-frame.png" alt="" aria-hidden="true" width={1536} height={1024} sizes="100vw" />
      </section>
    </main>

    <footer className={s.footer}><div className={s.footerTop}><a href="#hero" aria-label="Globoox — back to top"><Wordmark /></a><p>{messages.footer.tagline}</p></div><div className={s.footerBottom}><span>{messages.footer.copyright}</span><a href="#hero" className={s.backTop}>Back to top <ArrowUpRight size={15} /></a></div></footer>
    <PreviewConsent />
  </div>;
}
