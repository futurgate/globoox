import Image from 'next/image';
import { BusinessEmailButton } from './BusinessEmailButton';
import { businessLandingContent as copy } from './content';
import shared from './BusinessLandingPage.module.css';
import styles from './AuthorConversionSections.module.css';

export function AuthorTrialSection() {
  return (
    <section id="trial" className={styles.trial} aria-labelledby="trial-title">
      <div className={styles.trialFrame}>
        <div className={styles.trialCopy}>
          <h2 id="trial-title" className={styles.title}>{copy.trial.title}</h2>
          <p>{copy.trial.description}</p>
          <BusinessEmailButton className={shared.button} intent="trial">
            {copy.trial.button}
          </BusinessEmailButton>
        </div>
        <Image
          src="/images/business-sections/trial-book-chapter.png"
          alt=""
          width={1254}
          height={1254}
          sizes="(max-width: 760px) 90vw, 43vw"
          className={styles.trialImage}
        />
      </div>
    </section>
  );
}

export function AuthorContactSection() {
  return (
    <section id="contact" className={styles.contact} aria-labelledby="contact-title">
      <div className={styles.contactInner}>
        <div className={styles.contactCopy}>
          <h2 id="contact-title" className={styles.title}>{copy.contact.title}</h2>
          <BusinessEmailButton className={`${shared.button} ${styles.contactButton}`}>
            {copy.contact.button}
          </BusinessEmailButton>
          <noscript><p className={shared.contactNote}>Чтобы написать нам, включите JavaScript в браузере.</p></noscript>
        </div>
        <Image
          src="/images/business-sections/contact-book-arcs.png"
          alt=""
          width={1254}
          height={1254}
          sizes="(max-width: 760px) 90vw, 43vw"
          className={styles.contactImage}
        />
      </div>
    </section>
  );
}
