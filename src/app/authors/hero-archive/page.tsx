import type { Metadata } from 'next';
import Link from 'next/link';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { CookieBanner } from '@/components/landing/CookieBanner';
import { HeroConcept } from '@/components/landing-business/HeroConcept';
import { OriginalBusinessHero } from '@/components/landing-business/OriginalBusinessHero';
import { getLandingMessages } from '@/lib/landing-i18n';
import shared from '@/components/landing-business/BusinessLandingPage.module.css';
import styles from './page.module.css';
import '@/components/landing/landing.css';

export const metadata: Metadata = {
  title: 'Архив первых экранов для авторов — Globoox',
  description: 'Сохранённые варианты первого экрана лендинга для авторов.',
  robots: { index: false, follow: false },
};

export default function AuthorsHeroArchivePage() {
  const messages = getLandingMessages('ru');

  return (
    <div className={`marketing-page ${shared.page}`} lang="ru">
      <a className={shared.skipLink} href="#business-main">Перейти к содержанию</a>
      <LandingHeader
        navItems={[{ label: 'Вернуться к лендингу', href: '/authors' }]}
        locale="ru"
        showLanguageSelector={false}
        showOpenApp={false}
        logoHref="/authors"
        menuLabel="Открыть или закрыть меню"
      />
      <main id="business-main">
        <div className={styles.intro}>
          <p className={styles.label}>Архив первых экранов</p>
          <p>Здесь сохранены исходный вариант и концепция 05. На лендинге для авторов используется концепция 04.</p>
          <Link href="/authors">Вернуться к выбранному варианту</Link>
          <p className={styles.originalLabel}>Исходный вариант · сохранён в архиве</p>
        </div>
        <div className={styles.original}>
          <OriginalBusinessHero audience="authors" />
        </div>
        <HeroConcept concept="05" />
      </main>
      <CookieBanner messages={messages.cookies} />
    </div>
  );
}
