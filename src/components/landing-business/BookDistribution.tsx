import Image from 'next/image';
import styles from './BusinessLandingPage.module.css';

export const distributionDestinations = [
  { name: 'Amazon', image: 'amazon.png', className: styles.amazonLogo, y: 52, width: 160, height: 54 },
  { name: 'Rakuten Kobo', image: 'kobo.png', className: styles.koboLogo, y: 128, width: 160, height: 107 },
  { name: 'Apple Books', image: 'apple-books.png', className: styles.storeIcon, y: 204, width: 48, height: 48, label: <>Apple<br />Books</> },
  { name: 'Google Play Books', image: 'google-play-books.png', className: styles.storeIcon, y: 280, width: 48, height: 48, label: <>Google Play<br />Books</> },
  { name: 'Barnes & Noble / NOOK', image: 'barnes-noble.svg', className: styles.retailerLogo, y: 356, width: 160, height: 22 },
  { name: 'Thalia', image: 'thalia.png', className: styles.retailerLogo, y: 432, width: 160, height: 36 },
  { name: 'Bookshop.org', image: 'bookshop.png', className: styles.storeIcon, y: 508, width: 50, height: 50, label: <span className={styles.bookshopLabel}>Bookshop.org</span> },
];

const destinations = distributionDestinations;

export function BookDistribution() {
  return (
    <div className={styles.distribution}>
      <div className={styles.bookScene} role="img" aria-label={`Ваша книга — в ${destinations.map(store => store.name).join(', ')}`}>
        <svg className={styles.bookThreads} viewBox="0 0 520 560" fill="none" aria-hidden="true">
          {destinations.map(({ name, y }, index) => {
            const path = `M 186 280 C 260 280, 264 ${y}, 350 ${y}`;
            const phase = `${index * -0.7}s`;
            return (
              <g key={name}>
                <path d={path} className={styles.thread} />
                <circle r="3.2" className={styles.threadParticle}>
                  <animateMotion path={path} dur="3s" begin={phase} repeatCount="indefinite" calcMode="linear" />
                  <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.85;1" dur="3s" begin={phase} repeatCount="indefinite" />
                </circle>
                <circle cx="350" cy={y} r="3" className={styles.threadEndpoint} />
              </g>
            );
          })}
        </svg>
        <div className={styles.book} aria-hidden="true">
          <span className={styles.bookLanguage}>GLOBOOX</span>
          <span className={styles.bookTitle}>Ваша<br />книга</span>
        </div>
        {destinations.map(({ name, image, className, y, width, height, label }) => (
          <div key={name} className={styles.marketplace} style={{ top: `${(y - 32) / 560 * 100}%` }} aria-hidden="true">
            <Image src={`/images/marketplaces/${image}`} alt="" width={width} height={height} className={className} unoptimized />
            {label && <span>{label}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
