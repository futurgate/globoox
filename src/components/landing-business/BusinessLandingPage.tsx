import { LandingHeader } from '@/components/landing/LandingHeader';
import { SupportedLanguages } from '@/components/landing/SupportedLanguages';
import { QualityAssuranceV2 } from '@/components/landing/QualityAssuranceV2';
import { FoundersSection } from '@/components/landing/FoundersSection';
import { Footer } from '@/components/landing/Footer';
import { CookieBanner } from '@/components/landing/CookieBanner';
import { getLandingMessages } from '@/lib/landing-i18n';
import { BusinessEmailButton } from './BusinessEmailButton';
import { HeroConcept } from './HeroConcept';
import { OriginalBusinessHero } from './OriginalBusinessHero';
import { AuthorContactSection, AuthorTrialSection } from './AuthorConversionSections';
import { AuthorLanguages } from './AuthorLanguages';
import { businessLandingContent as copy } from './content';
import styles from './BusinessLandingPage.module.css';
import '@/components/landing/landing.css';

const navItems = [
  { label: 'Перевод', href: '#translation' },
  { label: 'Языки', href: '#languages' },
  { label: 'Пример', href: '#quality' },
  { label: 'Публикация', href: '#publishing' },
  { label: 'Команда', href: '#team' },
];

export function BusinessLandingPage({ audience }: { audience: 'authors' | 'publishers' }) {
  const messages = getLandingMessages('ru');
  const isAuthors = audience === 'authors';
  const authorTeamDescription = messages.founders.description.split(' Вместе мы строим')[0];

  return (
    <div className={`marketing-page ${styles.page}`} lang="ru">
      <a className={styles.skipLink} href="#business-main">Перейти к содержанию</a>
      <LandingHeader
        navItems={navItems}
        locale="ru"
        showLanguageSelector={false}
        showOpenApp={false}
        logoHref="/ru"
        menuLabel="Открыть или закрыть меню"
      />

      <main id="business-main">
        {isAuthors ? <HeroConcept concept="04" primary /> : <OriginalBusinessHero audience={audience} />}

        <section id="translation" className={styles.translation} aria-labelledby="translation-title">
          <div className={`${styles.container} ${styles.translationGrid}`}>
            <h2 id="translation-title" className={styles.heading}>{copy.translation.title}</h2>
            <p className={styles.lead}>{copy.translation.description}</p>
          </div>
        </section>

        {isAuthors ? <AuthorLanguages /> : <section id="languages" aria-label={copy.languages.title}>
          <SupportedLanguages
            label={copy.languages.currentLabel}
            heading={copy.languages.title}
            description={copy.languages.current.join(' · ')}
            currentLangs={copy.languages.current}
            futureLangs={copy.languages.future.map((label) => ({ label, soon: true }))}
            soonLabel={copy.languages.futureLabel}
            globeAlt={messages.supportedLanguages.globeAlt}
          />
        </section>}

        <section id="quality" aria-label={copy.example.title}>
          <QualityAssuranceV2
            label="Оригинал и перевод"
            heading={copy.example.title}
            description="Сдвиньте разделитель, чтобы сравнить текст на английском и русском."
            compare={messages.quality.compare}
            sliderLabel="Сравнить оригинал и перевод"
          />
        </section>

        {isAuthors ? <AuthorTrialSection /> : <section id="trial" className={styles.trial} aria-labelledby="trial-title">
          <div className={`${styles.container} ${styles.trialInner}`}>
            <div>
              <h2 id="trial-title" className={styles.heading}>{copy.trial.title}</h2>
              <p>{copy.trial.description}</p>
            </div>
            <BusinessEmailButton className={styles.button} intent="trial">{copy.trial.button}</BusinessEmailButton>
          </div>
        </section>}

        <section id="publishing" className={styles.publishing} aria-labelledby="publishing-title">
          <div className={styles.container}>
            <h2 id="publishing-title" className={styles.heading}>{copy.process.title}</h2>
            <ol className={styles.steps}>
              {copy.process.steps.map((step) => (
                <li key={step.number}>
                  <span className={styles.stepNumber} aria-hidden="true">{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {!isAuthors && <section className={styles.partners} aria-labelledby="partners-title">
          <div className={styles.container}>
            <h2 id="partners-title" className={styles.eyebrow}>{copy.partners.title}</h2>
            <ul className={styles.partnerNames}>
              {copy.partners.names.map((partner) => <li key={partner}>{partner}</li>)}
            </ul>
            <p>{copy.partners.description}</p>
          </div>
        </section>}

        <section id="team" className={isAuthors ? undefined : styles.team} aria-label={copy.team.title}>
          <FoundersSection
            label={isAuthors ? messages.founders.label : 'Globoox'}
            heading={isAuthors ? messages.founders.heading : copy.team.title}
            description={isAuthors ? authorTeamDescription : ''}
            items={isAuthors ? messages.founders.items : copy.team.members.map((member) => ({ ...member, theme: 'light' as const }))}
          />
          {!isAuthors && <div className={`${styles.container} ${styles.advisors}`}><p>{copy.team.advisors}</p></div>}
        </section>

        {isAuthors ? <AuthorContactSection /> : <section id="contact" className={styles.contact} aria-labelledby="contact-title">
          <div className={styles.container}>
            <h2 id="contact-title" className={styles.heading}>{copy.contact.title}</h2>
            <BusinessEmailButton className={styles.button}>{copy.contact.button}</BusinessEmailButton>
            <noscript><p className={styles.contactNote}>Чтобы написать нам, включите JavaScript в браузере.</p></noscript>
          </div>
        </section>}
      </main>

      <Footer
        legalLabel={messages.footer.legal}
        termsLabel={messages.footer.terms}
        privacyLabel={messages.footer.privacy}
        copyright={messages.footer.copyright}
        insetDivider={isAuthors}
      />
      <CookieBanner messages={{ ...messages.cookies, description: 'Cookies для работы и аналитики.', necessary: 'Только нужные' }} />
    </div>
  );
}
