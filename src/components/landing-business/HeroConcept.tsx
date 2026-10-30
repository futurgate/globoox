import Image from 'next/image';
import { BusinessEmailButton } from './BusinessEmailButton';
import { distributionDestinations } from './BookDistribution';
import { businessLandingContent as copy } from './content';
import shared from './BusinessLandingPage.module.css';
import styles from './HeroConcept.module.css';

/** Selected authors hero, with labeled comparison mode retained for archived concepts. */
export function HeroConcept({ concept, primary = false }: { concept: '04' | '05'; primary?: boolean }) {
  const ruled = concept === '04';
  const [opening, ending] = copy.hero.title.split('по всему миру');
  const sceneHeight = ruled ? 820 : 740;
  const titleId = primary ? 'business-title' : `hero-concept-${concept}-title`;
  const Heading = primary ? 'h1' : 'h2';

  return (
    <section id={primary ? 'hero' : `hero-concept-${concept}`} data-hero-concept={concept} className={`${styles.section} ${ruled ? styles.ruled : styles.poster}${primary ? ` ${styles.primary}` : ''}`} aria-labelledby={titleId}>
      {!primary && <div className={styles.version}>
        <span>Концепция {concept}</span>
        <span>{ruled ? 'Три колонки' : 'Диагональная композиция'}</span>
      </div>}
      <div className={styles.layout}>
        <div className={styles.copy}>
          <div className={styles.headline}>
            <p className={styles.eyebrow}>Для авторов</p>
            <Heading id={titleId} className={styles.heading}>
              {opening}<em>по всему миру</em>{' '}
              <span className={styles.subtitle}>{ending.trimStart()}</span>
            </Heading>
          </div>
          <div className={styles.description}>
            <p>{copy.hero.description}</p>
            <BusinessEmailButton className={shared.button}>{copy.hero.button}</BusinessEmailButton>
          </div>
        </div>

        <div className={styles.diagram} role="img" aria-label={`Ваша книга — в ${distributionDestinations.map(store => store.name).join(', ')}`}>
          <svg className={styles.threads} viewBox={`0 0 800 ${sceneHeight}`} fill="none" aria-hidden="true">
            {distributionDestinations.map(({ name }, index) => {
              const y = (ruled ? 100 : 65) + index * 100;
              const endX = ruled ? 550 : 610;
              const path = ruled
                ? `M 390 ${225 + index * 62} C 465 ${225 + index * 62}, 465 ${y}, ${endX} ${y}`
                : `M 360 ${340 + index * 42} C 520 ${340 + index * 42}, 520 ${y}, ${endX} ${y}`;
              const phase = `${index * -0.7}s`;
              return (
                <g key={name}>
                  <path d={path} className={styles.thread} />
                  <circle r="3.4" className={styles.dot}>
                    <animateMotion path={path} dur="3s" begin={phase} repeatCount="indefinite" calcMode="linear" />
                    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.85;1" dur="3s" begin={phase} repeatCount="indefinite" />
                  </circle>
                  <circle cx={endX} cy={y} r="3" className={styles.endpoint} />
                </g>
              );
            })}
          </svg>
          <Image
            src={`/images/business-hero/book-concept-${concept}.png`}
            alt=""
            width={ruled ? 1024 : 1145}
            height={ruled ? 1536 : 1374}
            className={styles.book}
            sizes="(max-width: 900px) 60vw, 36vw"
            priority={primary}
          />
          {distributionDestinations.map(({ name, image, width, height }, index) => (
            <div key={name} className={styles.marketplace} style={{ top: `${((ruled ? 100 : 65) + index * 100) / sceneHeight * 100}%` }} aria-hidden="true">
              <Image src={`/images/marketplaces/${image}`} alt="" width={width} height={height} className={styles.logo} data-logo={image} unoptimized />
              {['apple-books.png', 'google-play-books.png', 'bookshop.png'].includes(image) && <span>{name}</span>}
              {image === 'barnes-noble.svg' && <span className={styles.nookLabel}>NOOK</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
