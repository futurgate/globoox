import { BusinessEmailButton } from './BusinessEmailButton';
import { BookDistribution } from './BookDistribution';
import { businessLandingContent as copy } from './content';
import styles from './BusinessLandingPage.module.css';

/** The original hero remains live for publishers and available in the authors archive. */
export function OriginalBusinessHero({ audience }: { audience: 'authors' | 'publishers' }) {
  const [heroOpening, heroEnding] = copy.hero.title.split('по всему миру');
  const isAuthors = audience === 'authors';

  return (
    <section id="hero" className={styles.hero} aria-labelledby="business-title">
      <div className={`${styles.container} ${styles.heroGrid}`}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{isAuthors ? 'Для авторов' : 'Для издателей'}</p>
          <h1 id="business-title">
            {heroOpening}<em>по всему миру</em>{' '}
            <span className={styles.heroSubtitle}>{heroEnding.trimStart()}</span>
          </h1>
          <p className={styles.lead}>{copy.hero.description}</p>
          <BusinessEmailButton className={styles.button}>{copy.hero.button}</BusinessEmailButton>
        </div>
        <BookDistribution />
      </div>
    </section>
  );
}
