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

const defaultSteps = [
  { step: 'Step 1', description: 'Upload your ebook.' },
  { step: 'Step 2', description: 'Choose your language to translate the book.' },
  { step: 'Step 3', description: 'Enjoy your book!' },
];

const CARD_PROGRESS_ANCHORS = {
  enterCenterY: 0.82,
  releaseCenterY: 0.22,
} as const;

const SCREEN_SEQUENCE = [
  { stepIndex: 0, fromProgress: 0, image: () => '/images/how-it-works/1.1.png' },
  {
    stepIndex: 0,
    fromProgress: 0.5,
    image: (locale: LandingLocale) =>
      locale === 'en'
        ? '/images/how-it-works/1.2-es.png'
        : '/images/how-it-works/1.2-en.png',
  },
  {
    stepIndex: 1,
    fromProgress: 0,
    image: (locale: LandingLocale) =>
      locale === 'en'
        ? '/images/how-it-works/2.1-es.png'
        : '/images/how-it-works/2.1-en.png',
  },
  { stepIndex: 1, fromProgress: 0.5, image: () => '/images/how-it-works/2.2.png' },
  {
    stepIndex: 2,
    fromProgress: 0,
    image: (locale: LandingLocale) => {
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
    },
  },
] as const;

function getActiveImageSrc(locale: LandingLocale, stepIndex: number, cardProgress: number) {
  const screen = SCREEN_SEQUENCE
    .filter((item) => item.stepIndex === stepIndex && cardProgress >= item.fromProgress)
    .at(-1);

  return (screen ?? SCREEN_SEQUENCE[0]).image(locale);
}

export function UsageAnimation({
  label = 'How it works',
  heading = 'Three simple steps',
  steps = defaultSteps,
  locale,
}: UsageAnimationProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [activeCardProgress, setActiveCardProgress] = useState(0);
  const renderedSteps = useMemo(() => (steps.length > 0 ? steps : defaultSteps), [steps]);

  useEffect(() => {
    const updatePhase = () => {
      const viewportHeight = window.innerHeight;
      const enterCenterY = viewportHeight * CARD_PROGRESS_ANCHORS.enterCenterY;
      const releaseCenterY = viewportHeight * CARD_PROGRESS_ANCHORS.releaseCenterY;
      const phaseSpan = Math.max(enterCenterY - releaseCenterY, 1);
      let nextStepIndex = 0;

      cardRefs.current.forEach((card, index) => {
        if (!card) {
          return;
        }

        const rect = card.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;

        if (cardCenter <= releaseCenterY) {
          nextStepIndex = Math.min(index + 1, renderedSteps.length - 1);
        }
      });

      const activeCard = cardRefs.current[nextStepIndex];
      const activeRect = activeCard?.getBoundingClientRect();
      const activeCenter = activeRect ? activeRect.top + activeRect.height / 2 : null;
      const cardProgress = activeRect
        ? Math.min(Math.max((enterCenterY - (activeCenter ?? 0)) / phaseSpan, 0), 1)
        : 0;

      setActiveStepIndex(nextStepIndex);
      setActiveCardProgress(cardProgress);
    };

    updatePhase();
    window.addEventListener('scroll', updatePhase, { passive: true });
    window.addEventListener('resize', updatePhase);

    return () => {
      window.removeEventListener('scroll', updatePhase);
      window.removeEventListener('resize', updatePhase);
    };
  }, []);

  const activeImageSrc = getActiveImageSrc(locale, activeStepIndex, activeCardProgress);

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
              fontSize: '48px',
              lineHeight: 1.1,
              color: 'var(--parchment)',
            }}
          >
            {heading}
          </h2>
        </header>

        <div
          className="how-it-works-layout"
          style={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: '348px minmax(0, 1fr)',
            gap: '72px',
            alignItems: 'stretch',
            maxWidth: '800px',
            margin: '0 auto',
          }}
          >
          <div className="how-it-works-side how-it-works-side-left" aria-hidden="true">
            <div className="how-it-works-side-sticky">
              <img
                src="/images/monogram.svg"
                alt=""
                className="how-it-works-side-mark"
              />
            </div>
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

          <div className="how-it-works-cards">
            {renderedSteps.map((step, index) => {
              const isActive = activeStepIndex === index;

              return (
                <article
                  key={step.step}
                  className={`how-it-works-card${isActive ? ' is-active' : ''}`}
                  ref={(node) => {
                    cardRefs.current[index] = node;
                  }}
                >
                  <div className="how-it-works-card-row">
                    <div className="how-it-works-card-copy">
                      <h3 className="how-it-works-card-title">{step.step}</h3>
                      <p className="how-it-works-card-text">{step.description}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="how-it-works-side how-it-works-side-right" aria-hidden="true">
            <div className="how-it-works-side-sticky">
              <img
                src="/images/monogram.svg"
                alt=""
                className="how-it-works-side-mark how-it-works-side-mark-right"
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .how-it-works-cards {
          position: relative;
          z-index: 1;
          padding-top: 28px;
        }

        .how-it-works-card {
          min-height: 70vh;
          display: flex;
          align-items: center;
        }

        .how-it-works-card + .how-it-works-card {
          margin-top: 0;
        }

        .how-it-works-card:last-child {
          margin-bottom: 0;
        }

        .how-it-works-card-row {
          display: block;
          width: min(100%, 760px);
          padding: 18px 0 0;
          border-top: 1px solid rgba(232,184,154,0.24);
        }

        .how-it-works-card-title {
          margin: 0 0 14px;
          font-family: 'Inter', sans-serif;
          font-size: var(--marketing-type-meta-size);
          line-height: var(--marketing-type-meta-line);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--dusk);
          font-weight: 600;
        }

        .how-it-works-card-text {
          margin: 0;
          max-width: 620px;
          font-family: 'Lora', serif;
          font-size: 32px;
          line-height: 1.18;
          color: var(--parchment);
          font-weight: 400;
        }

        .how-it-works-mockup-column {
          position: relative;
          align-self: stretch;
          min-height: 100%;
        }

        .how-it-works-side {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 140px;
          pointer-events: none;
        }

        .how-it-works-side-left {
          right: calc(100% + 24px);
        }

        .how-it-works-side-right {
          left: calc(100% + 24px);
        }

        .how-it-works-side-sticky {
          position: sticky;
          top: 248px;
          display: flex;
          justify-content: center;
        }

        .how-it-works-side-mark {
          height: 382px;
          width: auto;
          opacity: 0.55;
        }

        .how-it-works-side-mark-right {
          transform: scaleX(-1);
        }

        .how-it-works-mockup-sticky {
          position: sticky;
          top: 204px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: calc(100vh - 224px);
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
            grid-template-columns: 348px minmax(0, 1fr) !important;
            gap: 40px !important;
            align-items: stretch !important;
          }

          .how-it-works-cards {
            padding-top: 24px !important;
          }

          .how-it-works-card-title {
            font-size: 13px !important;
            margin-bottom: 12px !important;
          }

          .how-it-works-card-text {
            font-size: 30px !important;
            line-height: 1.18 !important;
          }

          .how-it-works-phone-shell {
            width: 348px !important;
          }

          .how-it-works-side {
            display: none !important;
          }

          .how-it-works-mockup-sticky {
            top: 188px !important;
            min-height: calc(100vh - 208px) !important;
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
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 0 !important;
          }

          .how-it-works-mockup-column {
            grid-area: 1 / 1 !important;
            position: relative !important;
            z-index: 1 !important;
            align-self: start !important;
          }

          .how-it-works-cards {
            grid-area: 1 / 1 !important;
            margin-top: 0 !important;
            padding-top: 24px !important;
            position: relative !important;
            z-index: 2 !important;
          }

          .how-it-works-mockup-sticky {
            position: sticky !important;
            top: 196px !important;
            min-height: 0 !important;
            justify-content: flex-end !important;
          }

          .how-it-works-phone-shell {
            width: min(320px, calc(100vw - 28px)) !important;
            margin-left: auto !important;
            margin-right: 0 !important;
          }

          .how-it-works-card {
            min-height: 60vh !important;
            align-items: center !important;
          }

          .how-it-works-card + .how-it-works-card {
            margin-top: 0 !important;
          }

          .how-it-works-card:last-child {
            margin-bottom: 0 !important;
          }

          .how-it-works-card-row {
            width: clamp(224px, 70vw, 292px) !important;
            min-width: 224px !important;
            max-width: 292px !important;
            margin: 0 auto 0 8px !important;
            padding: 16px 14px 18px 0 !important;
            border-radius: 0 !important;
            border-top: 1px solid rgba(232,184,154,0.24) !important;
            border-right: 0 !important;
            border-bottom: 0 !important;
            border-left: 0 !important;
            background: var(--ink) !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
          }

          .how-it-works-card-title {
            margin: 0 0 10px !important;
            font-size: 13px !important;
            line-height: 1.2 !important;
            letter-spacing: 0.08em !important;
          }

          .how-it-works-card-text {
            font-size: 30px !important;
            line-height: 1.18 !important;
            letter-spacing: 0 !important;
          }
        }
      `}</style>
    </section>
  );
}
