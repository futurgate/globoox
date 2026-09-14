'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useEditorialLocale } from './EditorialLocale';
import { getEditorialPricingCopy } from './editorialPricingCopy';
import BetaAccessDialog from './BetaAccessDialog';
import styles from './PricingSection.module.css';

// Approved working pricing copy: billing-entitlements-and-translation-access.md.
// This marketing preview does not infer or change a visitor's entitlement.
export default function PricingSection() {
  const { locale } = useEditorialLocale();
  const copy = getEditorialPricingCopy(locale);
  const [showBeta, setShowBeta] = useState(false);
  const plans = [
    { name: 'Free', price: '$0', period: copy.forever, allowance: copy.allowances[0], action: copy.actions[0] },
    { name: 'Premium', price: '€5.90', period: copy.monthly, allowance: copy.allowances[1], action: copy.actions[1] },
    { name: 'Editorial', price: copy.custom, period: '', allowance: copy.allowances[2], action: copy.actions[2] },
  ];

  return (
    <section id="pricing" className={styles.section} aria-labelledby="pricing-title">
      <div className={styles.introduction}>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h2 id="pricing-title" className={styles.title}>{copy.title}<em>{copy.emphasis}</em></h2>
        <p className={styles.description}>{copy.description}</p>
      </div>

      <div className={styles.tableWrap}>
        <Image
          className={styles.sprig}
          src="/redesign/pricing/sprig.png"
          width={512}
          height={768}
          sizes="110px"
          alt=""
          aria-hidden="true"
        />
        <div className={styles.plans}>
          {plans.map((plan) => (
            <article key={plan.name} className={`${styles.plan} ${plan.name === 'Premium' ? styles.premium : ''}`} aria-labelledby={`pricing-${plan.name.toLowerCase()}`}>
              <h3 id={`pricing-${plan.name.toLowerCase()}`} className={styles.planName}>{plan.name}</h3>
              <div className={styles.priceArea}>
                <p className={`${styles.price} ${plan.name === 'Editorial' ? styles.customPrice : ''}`}>
                  {plan.price}
                </p>
                {plan.period && <p className={styles.period}>{plan.period}</p>}
              </div>
              <p className={styles.allowance}>{plan.allowance}</p>
              {plan.name === 'Premium' ? (
                  <button
                    className={`${styles.action} ${styles.primaryAction}`}
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() => setShowBeta(true)}
                  >
                    {plan.action}
                  </button>
              ) : (
                <Link
                  className={styles.action}
                  href={plan.name === 'Free' ? '/my-books' : 'mailto:support@globoox.co?subject=Globoox%20Editorial'}
                  prefetch={false}
                >
                  {plan.action}
                </Link>
              )}
            </article>
          ))}
        </div>
        <Image
          className={styles.lowerSprig}
          src="/redesign/pricing/free-sprig-v3-b.png"
          width={1536}
          height={1024}
          sizes="168px"
          alt=""
          aria-hidden="true"
        />
      </div>

      <p className={styles.note}>
        <span className={styles.betaDisclosure}>{copy.beta.disclosure}</span>
        {copy.note}
      </p>
      <BetaAccessDialog open={showBeta} onClose={() => setShowBeta(false)} />
    </section>
  );
}
