'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { AnimatedIPhoneMockup } from './AnimatedIPhoneMockup';

interface UsageAnimationProps {
  label?: string;
  heading?: string;
}

const steps = [
  { step: 'Step 1', description: 'Upload your ebook' },
  { step: 'Step 2', description: 'Choose your language' },
  { step: 'Step 3', description: 'Enjoy your book!' },
];

export function UsageAnimation({ label = 'How it works', heading = 'Three simple steps' }: UsageAnimationProps) {
  const [active, setActive] = useState(0);
  const [jumpTo, setJumpTo] = useState<0 | 1 | 2 | null>(null);
  const jumpKeyRef = useRef(0); // increment to re-trigger same-tab jumps
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const scrollToTab = useCallback((index: number) => {
    const container = scrollRef.current;
    const tab = tabRefs.current[index];
    if (!container || !tab) return;
    const containerWidth = container.offsetWidth;
    const tabLeft = tab.offsetLeft;
    const tabWidth = tab.offsetWidth;
    container.scrollTo({
      left: tabLeft - containerWidth / 2 + tabWidth / 2,
      behavior: 'smooth',
    });
  }, []);

  const handleStepChange = useCallback((step: 0 | 1 | 2) => {
    setActive(step);
    requestAnimationFrame(() => scrollToTab(step));
  }, [scrollToTab]);

  const handleTabClick = useCallback((i: number) => {
    jumpKeyRef.current += 1;
    setJumpTo(i as 0 | 1 | 2);
  }, []);

  // scroll to active tab when active changes
  useEffect(() => {
    scrollToTab(active);
  }, [active, scrollToTab]);

  // set spacer widths so first/last tab can be centered
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const updateSpacers = () => {
      const containerWidth = container.offsetWidth;
      const spacers = container.querySelectorAll<HTMLElement>('.threemockups-tab-spacer');
      const firstTab = tabRefs.current[0];
      const lastTab = tabRefs.current[tabRefs.current.length - 1];
      if (spacers[0] && firstTab) spacers[0].style.width = `${containerWidth / 2 - firstTab.offsetWidth / 2}px`;
      if (spacers[1] && lastTab) spacers[1].style.width = `${containerWidth / 2 - lastTab.offsetWidth / 2}px`;
    };
    updateSpacers();
    const ro = new ResizeObserver(updateSpacers);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  return (
    <section className="threemockups-section" style={{ padding: '120px 0', background: 'var(--ink)', overflow: 'hidden' }}>
      <div className="threemockups-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px' }}>

        <div className="threemockups-header" style={{ marginBottom: '80px', textAlign: 'center' }}>
          <span style={{
            textTransform: 'uppercase',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--dusk)',
            letterSpacing: '0.12em',
            marginBottom: '16px',
            display: 'block',
          }}>
            {label}
          </span>
          <h2 className="threemockups-heading" style={{
            fontFamily: 'Lora, serif',
            fontSize: '48px',
            lineHeight: 1.1,
            color: 'var(--parchment)',
            margin: 0,
          }}>
            {heading}
          </h2>
          <div className="threemockups-header-divider" style={{ display: 'none', height: '1px', background: 'rgba(255,255,255,0.1)', marginTop: '48px', maxWidth: '220px', margin: '48px auto 0' }} />
        </div>

        {/* Mobile horizontal tabs — visible only on mobile */}
        <div className="threemockups-mobile-tabs" ref={scrollRef} style={{
          display: 'none',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          marginBottom: '40px',
          marginLeft: '-20px',
          marginRight: '-20px',
          WebkitOverflowScrolling: 'touch',
        }}>
          <div className="threemockups-tabs-inner" style={{ display: 'flex', gap: '0' }}>
            <div className="threemockups-tab-spacer" style={{ flexShrink: 0 }} />
            {steps.map(({ step, description }, i) => (
              <button
                key={i}
                ref={el => { tabRefs.current[i] = el; }}
                onClick={() => handleTabClick(i)}
                style={{
                  flexShrink: 0,
                  height: '80px',
                  padding: '0 28px',
                  border: 'none',
                  borderBottom: active === i ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  transition: 'border-color 0.25s ease',
                }}
              >
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--dusk)',
                }}>
                  {step}
                </span>
                <span style={{
                  fontSize: '19px',
                  fontFamily: 'Lora, serif',
                  color: active === i ? 'var(--parchment)' : 'rgba(244,240,232,0.4)',
                  transition: 'color 0.25s ease',
                  whiteSpace: 'nowrap',
                }}>
                  {description}
                </span>
              </button>
            ))}
            <div className="threemockups-tab-spacer" style={{ flexShrink: 0 }} />
          </div>
        </div>

        <div className="threemockups-center" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0',
        }}>
        {/* Left monogram */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/monogram.svg"
          alt=""
          aria-hidden="true"
          className="threemockups-monogram"
          style={{ height: '382px', flexShrink: 0, opacity: 0.55, marginRight: '48px' }}
        />
        <div className="threemockups-card" style={{
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          background: 'rgba(255,255,255,0.03)',
          padding: '48px',
          display: 'inline-flex',
        }}>
        <div className="threemockups-layout" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '64px',
        }}>
          {/* Mockup */}
          <div className="threemockups-mockup" style={{ flexShrink: 0, width: '360px', display: 'flex', justifyContent: 'center' }}>
            <AnimatedIPhoneMockup jumpTo={jumpTo} onStepChange={handleStepChange} />
          </div>

          {/* Desktop/tablet vertical tabs */}
          <div className="threemockups-vertical-tabs" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {steps.map(({ step, description }, i) => (
              <button
                key={i}
                onClick={() => handleTabClick(i)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '6px',
                  padding: '24px 28px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  backgroundColor: active === i ? 'rgba(255,255,255,0.07)' : 'transparent',
                  borderLeft: active === i ? '2px solid var(--primary)' : '2px solid transparent',
                  transition: 'background-color 0.25s ease',
                }}
              >
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--dusk)',
                  transition: 'color 0.25s ease',
                }}>
                  {step}
                </span>
                <span className="threemockups-tab-label" style={{
                  fontSize: '24px',
                  fontFamily: 'Lora, serif',
                  color: active === i ? 'var(--parchment)' : 'rgba(244,240,232,0.4)',
                  transition: 'color 0.25s ease',
                  whiteSpace: 'nowrap',
                }}>
                  {description}
                </span>
              </button>
            ))}
          </div>{/* /tabs */}
        </div>{/* /layout */}
        </div>{/* /card */}
        {/* Right monogram (mirrored) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/monogram.svg"
          alt=""
          aria-hidden="true"
          className="threemockups-monogram"
          style={{ height: '382px', flexShrink: 0, opacity: 0.55, marginLeft: '48px', transform: 'scaleX(-1)' }}
        />
      </div>{/* /centering flex */}
      </div>{/* /container */}
      <style>{`
        .threemockups-mobile-tabs::-webkit-scrollbar { display: none; }
        @media (max-width: 639px) {
          .threemockups-monogram { display: none !important; }
          .threemockups-section { padding: 60px 0 !important; overflow-x: hidden !important; }
          .threemockups-container { padding: 0 20px !important; }
          .threemockups-heading { font-size: 36px !important; }
          .threemockups-header { margin-bottom: 32px !important; }
          .threemockups-header-divider { display: block !important; }
          .threemockups-center { display: block !important; }
          .threemockups-card { border: none !important; border-radius: 0 !important; background: transparent !important; padding: 0 !important; display: block !important; width: 100% !important; }
          .threemockups-layout { flex-direction: column !important; gap: 24px !important; align-items: stretch !important; width: 100% !important; }
          .threemockups-mockup { width: 100% !important; }
          .threemockups-mockup > div { scale: 0.88; transform-origin: top center !important; }
          .threemockups-tab-label { white-space: normal !important; }
          .threemockups-vertical-tabs { display: none !important; }
          .threemockups-mobile-tabs { display: block !important; }
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          .threemockups-monogram { display: none !important; }
          .threemockups-card { border: none !important; border-radius: 0 !important; background: transparent !important; padding: 0 !important; }
          .threemockups-heading { font-size: 36px !important; }
          .threemockups-layout { gap: 32px !important; }
          .threemockups-mockup { width: 348px !important; }
          .threemockups-header { margin-bottom: 48px !important; }
          .threemockups-header-divider { display: block !important; }
        }
      `}</style>
    </section>
  );
}
