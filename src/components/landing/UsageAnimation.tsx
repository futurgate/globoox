'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { PhoneImageFrame } from '@/components/landing/DeviceShowcase';
import type { LandingLocale } from '@/lib/landing-i18n';

interface UsageAnimationProps {
  label?: string;
  heading?: string;
  steps?: Array<{ step: string; description: string }>;
  locale: LandingLocale;
}

type UsagePhase = 0 | 1 | 2 | 3 | 4;

const defaultSteps = [
  { step: 'Step 1', description: 'Upload your ebook.' },
  { step: 'Step 2', description: 'Choose your language to translate the book.' },
  { step: 'Step 3', description: 'Enjoy your book!' },
];

function getPhaseImage(locale: LandingLocale, phase: UsagePhase) {
  if (phase === 0) {
    return '/images/how-it-works/1.png';
  }

  if (phase === 1) {
    return locale === 'en'
      ? '/images/how-it-works/2.1-es.png'
      : '/images/how-it-works/2.1-en.png';
  }

  if (phase === 2) {
    return locale === 'en'
      ? '/images/how-it-works/2.2-es.png'
      : '/images/how-it-works/2.2-en.png';
  }

  if (phase === 3) {
    return '/images/how-it-works/2.3.png';
  }

  if (locale === 'es') {
    return '/images/how-it-works/3-en-es.png';
  }

  if (locale === 'fr') {
    return '/images/how-it-works/3-en-fr.png';
  }

  if (locale === 'ru') {
    return '/images/how-it-works/3-en-ru.png';
  }

  return '/images/how-it-works/3-es-en.png';
}

function getTextStepIndex(phase: UsagePhase) {
  if (phase === 0 || phase === 1) {
    return 0;
  }

  if (phase === 4) {
    return 2;
  }

  return 1;
}

export function UsageAnimation({
  label = 'How it works',
  heading = 'Three simple steps',
  steps = defaultSteps,
  locale,
}: UsageAnimationProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [activePhase, setActivePhase] = useState<UsagePhase>(0);
  const renderedSteps = useMemo(() => (steps.length > 0 ? steps : defaultSteps), [steps]);

  useEffect(() => {
    const element = sectionRef.current;

    if (!element) {
      return;
    }

    const updatePhase = () => {
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const totalScrollable = Math.max(element.offsetHeight - viewportHeight, 1);
      const consumed = Math.min(Math.max(-rect.top, 0), totalScrollable);
      const progress = consumed / totalScrollable;
      const nextPhase = Math.min(4, Math.floor(progress * 5)) as UsagePhase;
      setActivePhase(nextPhase);
    };

    updatePhase();
    window.addEventListener('scroll', updatePhase, { passive: true });
    window.addEventListener('resize', updatePhase);

    return () => {
      window.removeEventListener('scroll', updatePhase);
      window.removeEventListener('resize', updatePhase);
    };
  }, []);

  const activeStepIndex = getTextStepIndex(activePhase);
  const activeImageSrc = getPhaseImage(locale, activePhase);

  return (
    <section
      ref={sectionRef}
      className="how-it-works-section"
      style={{
        position: 'relative',
        background: 'var(--ink)',
        padding: '0 0 200px',
      }}
    >
      <div
        className="how-it-works-wrap"
        style={{
          width: 'min(1240px, calc(100vw - 80px))',
          margin: '0 auto',
        }}
      >
        <header
          className="how-it-works-head"
          style={{
            textAlign: 'center',
            marginBottom: '40px',
          }}
        >
          <span
            style={{
              display: 'block',
              marginBottom: '14px',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--dusk)',
            }}
          >
            {label}
          </span>
          <h2
            className="how-it-works-heading"
            style={{
              margin: 0,
              fontFamily: "'Lora', serif",
              fontSize: '68px',
              lineHeight: 0.98,
              color: 'var(--parchment)',
            }}
          >
            {heading}
          </h2>
        </header>

        <div
          className="how-it-works-layout"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 348px',
            gap: '72px',
            alignItems: 'stretch',
          }}
        >
          <div className="how-it-works-cards">
            {renderedSteps.map((step, index) => {
              const isActive = activeStepIndex === index;

              return (
                <article
                  key={step.step}
                  className={`how-it-works-card${isActive ? ' is-active' : ''}`}
                >
                  <div className="how-it-works-card-row">
                    <div className="how-it-works-card-number">{index + 1}</div>
                    <div className="how-it-works-card-copy">
                      <h3 className="how-it-works-card-title">{step.step}</h3>
                      <p className="how-it-works-card-text">{step.description}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="how-it-works-mockup-column">
            <div className="how-it-works-mockup-sticky">
              <div className="how-it-works-visual-glow" aria-hidden="true" />
              <div className="how-it-works-phone-shell">
                <PhoneImageFrame
                  className="how-it-works-phone-frame"
                  imageSrc={activeImageSrc}
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .how-it-works-cards {
          position: relative;
          z-index: 1;
          padding-top: 236px;
        }

        .how-it-works-card {
          min-height: 72vh;
          display: flex;
          align-items: center;
        }

        .how-it-works-card + .how-it-works-card {
          margin-top: 18vh;
        }

        .how-it-works-card:last-child {
          margin-bottom: 120vh;
        }

        .how-it-works-card-row {
          display: grid;
          grid-template-columns: 92px minmax(0, 1fr);
          gap: 28px;
          align-items: start;
          width: min(100%, 760px);
          padding: 0;
        }

        .how-it-works-card-number {
          width: 76px;
          height: 76px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid rgba(232,184,154,0.78);
          color: var(--dusk);
          font-size: 30px;
          font-weight: 700;
          line-height: 1;
        }

        .how-it-works-card-title {
          margin: 0 0 14px;
          font-size: 14px;
          line-height: 1.2;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--dusk);
          font-weight: 600;
        }

        .how-it-works-card-text {
          margin: 0;
          max-width: 620px;
          font-family: inherit;
          font-size: 36px;
          line-height: 1.08;
          letter-spacing: -0.03em;
          color: var(--parchment);
          font-weight: 500;
        }

        .how-it-works-mockup-column {
          position: relative;
          align-self: stretch;
          min-height: 100%;
        }

        .how-it-works-mockup-sticky {
          position: sticky;
          top: 228px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: calc(100vh - 248px);
        }

        .how-it-works-head {
          position: sticky;
          top: 0;
          z-index: 4;
          padding: 88px 0 28px;
          background: var(--ink);
        }

        .how-it-works-visual-glow {
          position: absolute;
          inset: 8% -10%;
          border-radius: 50%;
          background: radial-gradient(circle at center, rgba(244,240,232,0.08) 0%, rgba(244,240,232,0.03) 36%, rgba(244,240,232,0) 70%);
          filter: blur(20px);
        }

        .how-it-works-phone-shell {
          position: relative;
          width: 348px;
          max-width: 100%;
          aspect-ratio: 454 / 876;
          z-index: 1;
        }

        .how-it-works-phone-frame {
          inset: 0;
          width: 100%;
        }

        @media (max-width: 1199px) {
          .how-it-works-heading {
            font-size: 56px !important;
          }

          .how-it-works-head {
            padding: 72px 0 24px !important;
          }

          .how-it-works-layout {
            grid-template-columns: minmax(0, 1fr) 360px !important;
            gap: 40px !important;
            align-items: stretch !important;
          }

          .how-it-works-cards {
            padding-top: 208px !important;
          }

          .how-it-works-card-title {
            font-size: 13px !important;
            margin-bottom: 12px !important;
          }

          .how-it-works-card-text {
            font-size: 30px !important;
          }

          .how-it-works-card-number {
            width: 60px !important;
            height: 60px !important;
            font-size: 24px !important;
          }

          .how-it-works-card-row {
            grid-template-columns: 74px minmax(0, 1fr) !important;
            gap: 20px !important;
          }

          .how-it-works-phone-shell {
            width: 348px !important;
          }

          .how-it-works-mockup-sticky {
            top: 196px !important;
            min-height: calc(100vh - 216px) !important;
          }
        }

        @media (max-width: 767px) {
          .how-it-works-section {
            padding: 0 0 112px !important;
          }

          .how-it-works-wrap {
            width: calc(100vw - 24px) !important;
          }

          .how-it-works-head {
            margin-bottom: 8px !important;
            padding: 56px 0 18px !important;
          }

          .how-it-works-heading {
            font-size: 36px !important;
          }

          .how-it-works-layout {
            display: flex !important;
            flex-direction: column !important;
            gap: 24px !important;
          }

          .how-it-works-mockup-column {
            position: sticky !important;
            top: 126px !important;
            z-index: 1 !important;
            order: 1 !important;
          }

          .how-it-works-cards {
            order: 2 !important;
            margin-top: -220px !important;
            padding-top: 180px !important;
            position: relative !important;
            z-index: 2 !important;
          }

          .how-it-works-mockup-sticky {
            position: relative !important;
            top: auto !important;
            min-height: auto !important;
            justify-content: center !important;
          }

          .how-it-works-phone-shell {
            width: min(320px, calc(100vw - 28px)) !important;
          }

          .how-it-works-card {
            min-height: 62vh !important;
            align-items: flex-end !important;
          }

          .how-it-works-card + .how-it-works-card {
            margin-top: 8vh !important;
          }

          .how-it-works-card:last-child {
            margin-bottom: 90vh !important;
          }

          .how-it-works-card-row {
            grid-template-columns: 40px minmax(0, 1fr) !important;
            gap: 14px !important;
            width: 100% !important;
            padding: 18px 18px 20px !important;
            border-radius: 28px !important;
            background: rgba(26,28,24,0.9) !important;
            border: 1px solid rgba(244,240,232,0.16) !important;
            box-shadow: 0 18px 48px rgba(0,0,0,0.28) !important;
            backdrop-filter: blur(12px) !important;
          }

          .how-it-works-card-number {
            width: auto !important;
            height: auto !important;
            border: 0 !important;
            color: var(--dusk) !important;
            font-size: 28px !important;
            justify-content: flex-start !important;
            align-items: flex-start !important;
            padding-top: 2px !important;
          }

          .how-it-works-card-title {
            margin: 0 0 10px !important;
            font-size: 13px !important;
            line-height: 1.2 !important;
            letter-spacing: 0.08em !important;
          }

          .how-it-works-card-text {
            font-size: 28px !important;
            line-height: 1.08 !important;
            letter-spacing: -0.03em !important;
          }
        }
      `}</style>
    </section>
  );
}
