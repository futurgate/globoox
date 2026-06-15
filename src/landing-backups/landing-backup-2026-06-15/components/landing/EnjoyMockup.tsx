'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ─── timing (ms) ─────────────────────────────────────────────────────────────
const T_IDLE          = 1400;  // reader открыт, chrome виден
const T_TAP_HIDE      = 120;   // тап — chrome скрывается
const T_IMMERSIVE     = 2000;  // читаем без chrome
const T_SWIPE         = 320;   // анимация свайпа
const T_REVEAL_STEP   = 380;   // задержка между снятием blur с каждого абзаца
const T_READ_PAGE2    = 3200;  // читаем страницу 2
const T_SWIPE2        = 320;
const T_READ_PAGE3    = 3200;  // читаем страницу 3
const T_SWIPE3        = 320;   // свайп назад страница 3 → 2
const T_PAUSE_BACK    = 500;   // пауза между двумя свайпами назад
const T_SWIPE4        = 320;   // свайп назад страница 2 → 1
const T_READ_PAGE1B   = 3200;  // читаем «первую» снова
const T_TAP_SHOW      = 120;   // тап — chrome возвращается
const T_HOLD          = 1200;

// ─── colours (forest-light) ──────────────────────────────────────────────────
const C = {
  bg:         '#F4F0E8',
  header:     '#F4F0E8',
  statusBar:  '#F4F0E8',
  separator:  'rgba(44,59,45,0.12)',
  text:       '#2C3B2D',
  textSecond: 'rgba(44,59,45,0.55)',
  textMuted:  'rgba(44,59,45,0.38)',
  accent:     '#C05A3A',
};

// ─── ripple ───────────────────────────────────────────────────────────────────
function TapRipple({ active }: { active: boolean }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: active ? '300%' : '0%', aspectRatio: '1',
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        backgroundColor: 'rgba(44,59,45,0.06)',
        transition: active ? 'width 0.7s ease-out, opacity 0.7s ease-out' : 'none',
        opacity: active ? 0 : 1,
      }} />
    </div>
  );
}

// ─── pages of English text ────────────────────────────────────────────────────
const PAGES = [
  // page 1 — точная копия из ReaderMockup (translated state)
  [
    { head: true,  text: 'Meditations — Marcus Aurelius Antoninus' },
    { head: false, text: 'From my grandfather Verus I learned to be gentle and meek, and to refrain from all anger and passion. From the reputation and remembrance of my father, modesty and a manly character. From my mother, piety and beneficence, and abstinence not only from evil deeds, but even from evil thoughts; and further, simplicity in my way of living, far removed from the habits of the rich.' },
    { head: false, text: 'From my great-grandfather, not to have frequented public schools, and to have had good teachers at home, and to know that on such things a man should spend liberally.' },
    { head: false, text: 'From my governor, to be neither of the green nor of the blue party at the games in the Circus, nor a partizan either of the Parmularius or the Scutarius at the gladiators\' fights; from him too I learned endurance of labour, and to want little, and to work with my own hands, and not to meddle with other people\'s affairs.' },
  ],
  // page 2
  [
    { head: false, text: 'From Diognetus, not to busy myself about trifling things, and not to give credit to what was said by miracle-workers and jugglers about incantations and the driving away of daemons and such things.' },
    { head: false, text: 'And not to breed quails for fighting, nor to give myself up passionately to such things. To him I am also indebted for having learned to tolerate freedom of speech.' },
    { head: false, text: 'From Rusticus I received the impression that my character required improvement and discipline; and from him I learned not to be led astray to sophistic emulation, nor to writing on speculative matters, nor to delivering little hortatory orations.' },
    { head: false, text: 'He also taught me to write letters with simplicity, like the letter which Rusticus himself wrote to my father from Sinuessa.' },
    { head: false, text: 'And with respect to those who have offended me by words, or done me wrong, to be easily disposed to be pacified and reconciled, as soon as they have shown a readiness to be reconciled.' },
  ],
  // page 3
  [
    { head: false, text: 'From Apollonius I learned freedom of will and undeviating steadiness of purpose; and to look to nothing else, not even for a moment, except to reason; and to be always the same in sharp pains, on the occasion of the loss of a child, and in long illness.' },
    { head: false, text: 'And to see clearly in a living example that the same man can be both most resolute and yielding, and not peevish in giving his instruction; and to have had before my eyes a man who clearly considered his experience and his skill in expounding philosophical principles as the smallest of his merits.' },
    { head: false, text: 'From Sextus, a benevolent disposition, and the example of a family governed in a fatherly manner, and the idea of living conformably to nature; and gravity without affectation, and to look carefully after the interests of friends.' },
    { head: false, text: 'And to tolerate ignorant persons, and those who form opinions without consideration: he had the power of readily accommodating himself to all.' },
  ],
];

type Phase =
  | 'reader-idle'
  | 'tap-hide'
  | 'immersive'
  | 'swipe-1'
  | 'page2-reveal'
  | 'page2-read'
  | 'swipe-2'
  | 'page3-reveal'
  | 'page3-read'
  | 'swipe-3'
  | 'page2b-read'
  | 'swipe-4'
  | 'page1b-read'
  | 'tap-show'
  | 'hold';

export function EnjoyMockup({ onCycleEnd }: { onCycleEnd?: () => void } = {}) {
  const [phase, setPhase]             = useState<Phase>('reader-idle');
  const [scale, setScale]             = useState(1);
  const [pageIdx, setPageIdx]         = useState(0);       // 0-2
  const [swipeDir, setSwipeDir]       = useState<'left' | 'right' | null>(null); // анимация свайпа
  const [revealedCount, setRevealedCount] = useState(5);  // сколько абзацев без blur (5 = все)

  const outerRef  = useRef<HTMLDivElement>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const target = el.parentElement ?? el;
    const update = () => {
      const w = target.getBoundingClientRect().width;
      if (w > 0) setScale(Math.min(1, w / 320));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(target);
    return () => ro.disconnect();
  }, []);

  const schedule = useCallback((fn: () => void, delay: number) => {
    timerRef.current = setTimeout(fn, delay);
  }, []);

  const runCycle = useCallback(() => {
    setPhase('reader-idle');
    setPageIdx(0);
    setRevealedCount(5);
    setSwipeDir(null);

    schedule(() => {
      setPhase('tap-hide');
      schedule(() => {
        setPhase('immersive');
        schedule(() => {
          // свайп → страница 2
          setRevealedCount(0);
          setSwipeDir('left');
          setPhase('swipe-1');
          schedule(() => {
            setPageIdx(1);
            setSwipeDir(null);
            setPhase('page2-reveal');
            [1, 2, 3, 4, 5].forEach((i) => {
              schedule(() => setRevealedCount(i), i * T_REVEAL_STEP);
            });
            schedule(() => {
              setPhase('page2-read');
              schedule(() => {
                // свайп → страница 3
                setRevealedCount(0);
                setSwipeDir('left');
                setPhase('swipe-2');
                schedule(() => {
                  setPageIdx(2);
                  setSwipeDir(null);
                  setPhase('page3-reveal');
                  [1, 2, 3, 4, 5].forEach((i) => {
                    schedule(() => setRevealedCount(i), i * T_REVEAL_STEP);
                  });
                  schedule(() => {
                    setPhase('page3-read');
                    schedule(() => {
                      // свайп назад → страница 2
                      setSwipeDir('right');
                      setPhase('swipe-3');
                      schedule(() => {
                        setPageIdx(1);
                        setRevealedCount(5);
                        setSwipeDir(null);
                        setPhase('page2b-read');
                        schedule(() => {
                          // свайп назад → страница 1
                          setSwipeDir('right');
                          setPhase('swipe-4');
                          schedule(() => {
                            setPageIdx(0);
                            setRevealedCount(5);
                            setSwipeDir(null);
                            setPhase('page1b-read');
                            schedule(() => {
                              setPhase('tap-show');
                              schedule(() => {
                                setPhase('hold');
                                schedule(() => {
                                  onCycleEnd?.();
                                  runCycle();
                                }, T_HOLD);
                              }, T_TAP_SHOW);
                            }, T_READ_PAGE1B);
                          }, T_SWIPE4);
                        }, T_PAUSE_BACK);
                      }, T_SWIPE3);
                    }, T_READ_PAGE3);
                  }, 5 * T_REVEAL_STEP + 400);
                }, T_SWIPE2);
              }, T_READ_PAGE2);
            }, 5 * T_REVEAL_STEP + 400);
          }, T_SWIPE);
        }, T_IMMERSIVE);
      }, T_TAP_HIDE);
    }, T_IDLE);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule]);

  useEffect(() => {
    runCycle();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── derived ─────────────────────────────────────────────────────────────────
  const chromeVisible = phase === 'reader-idle' || phase === 'tap-hide' || phase === 'tap-show' || phase === 'hold';
  const isSwiping = swipeDir !== null;
  const swipeLeft = swipeDir === 'left';
  // при свайпе назад показываем предыдущую страницу
  const incomingPageIdx = swipeLeft
    ? (pageIdx + 1) % PAGES.length
    : (pageIdx - 1 + PAGES.length) % PAGES.length;
  const isRevealing = phase === 'page2-reveal' || phase === 'page3-reveal';
  const currentPage = PAGES[pageIdx];

  return (
    <div ref={outerRef} style={{ width: '100%', position: 'relative', height: 640 * scale }}>
      <div style={{
        position: 'absolute', top: 0, left: '50%',
        width: 320, height: 640,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: C.bg,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
        userSelect: 'none',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        transform: `translateX(-50%) scale(${scale})`,
        transformOrigin: 'top center',
      }}>

        {/* ── STATUS BAR ── */}
        <div style={{ height: 22, backgroundColor: C.statusBar, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
          <span style={{ color: C.text, fontSize: 10, fontWeight: 600 }}>9:41</span>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <div style={{ width: 18, height: 9, border: `1.5px solid ${C.text}`, borderRadius: 2, position: 'relative', opacity: 0.6 }}>
              <div style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', width: 3, height: 5, backgroundColor: C.text, borderRadius: '0 1px 1px 0' }} />
              <div style={{ position: 'absolute', inset: 2, right: 3, backgroundColor: C.text, borderRadius: 0.5 }} />
            </div>
          </div>
        </div>

        {/* ── HEADER ── */}
        <div style={{
          height: 44,
          backgroundColor: C.header,
          borderBottom: `0.5px solid ${C.separator}`,
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px',
          transform: chromeVisible ? 'translateY(0)' : 'translateY(-66px)',
          transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
          position: 'relative', zIndex: 10,
        }}>
          {/* back */}
          <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
            <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
              <path d="M7 1L1 6.5L7 12" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {/* title */}
          <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 13, fontWeight: 600, color: C.text }}>Meditations</span>
          {/* lang */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.accent }}>EN</span>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
              <path d="M1 1L5 5L9 1" stroke={C.accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div style={{
          position: 'absolute',
          top: 22 + 44,
          bottom: 0,
          left: 0, right: 0,
          overflow: 'hidden',
        }}>
          <TapRipple active={phase === 'tap-hide' || phase === 'tap-show'} />
          {/* swipe container */}
          <div style={{
            position: 'absolute', inset: 0,
            transform: isSwiping ? (swipeLeft ? 'translateX(-100%)' : 'translateX(100%)') : 'translateX(0)',
            transition: isSwiping ? `transform ${T_SWIPE}ms cubic-bezier(0.22,1,0.36,1)` : 'none',
          }}>
            <div style={{ padding: '4px 20px 16px' }}>
              {currentPage.map((block, i) => {
                const blurred = isRevealing && i >= revealedCount;
                return (
                  <p key={i} style={{
                    fontSize: block.head ? 13 : 14,
                    fontWeight: block.head ? 600 : 400,
                    color: block.head ? C.textSecond : C.text,
                    lineHeight: 1.65,
                    marginBottom: block.head ? 14 : 10,
                    filter: blurred ? 'blur(3px)' : 'none',
                    opacity: blurred ? 0.4 : 1,
                    transition: blurred ? 'none' : 'filter 0.4s ease-out, opacity 0.4s ease-out',
                    position: 'relative',
                  }}>
                    {block.text}
                  </p>
                );
              })}
              {/* translating label */}
              {isRevealing && revealedCount < 2 && (
                <div style={{
                  position: 'absolute', top: '42%', left: 0, right: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none',
                }}>
                  <span style={{
                    fontSize: 16,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    background: `linear-gradient(90deg, rgba(192,90,58,0.2) 0%, rgba(192,90,58,0.2) 30%, ${C.accent} 50%, rgba(192,90,58,0.2) 70%, rgba(192,90,58,0.2) 100%)`,
                    backgroundSize: '200% 100%',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    animation: 'enjoymock-shimmer 1.8s linear infinite',
                  }}>Translating...</span>
                </div>
              )}
            </div>
          </div>

          {/* incoming page */}
          {isSwiping && (
            <div style={{
              position: 'absolute', inset: 0,
              transform: swipeLeft ? 'translateX(100%)' : 'translateX(-100%)',
              animation: `${swipeLeft ? 'enjoymock-slide-in' : 'enjoymock-slide-in-right'} ${T_SWIPE}ms cubic-bezier(0.22,1,0.36,1) forwards`,
            }}>
              <div style={{ padding: '4px 20px 16px' }}>
                {PAGES[incomingPageIdx].map((block, i) => (
                  <p key={i} style={{
                    fontSize: block.head ? 13 : 14,
                    fontWeight: block.head ? 600 : 400,
                    color: block.head ? C.textSecond : C.text,
                    lineHeight: 1.65,
                    marginBottom: block.head ? 14 : 10,
                    filter: revealedCount === 0 ? 'blur(3px)' : 'none',
                    opacity: revealedCount === 0 ? 0.4 : 1,
                  }}>
                    {block.text}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 36,
          backgroundColor: C.bg,
          borderTop: `0.5px solid ${C.separator}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          transform: chromeVisible ? 'translateY(0)' : 'translateY(36px)',
          transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
          zIndex: 10,
        }}>
          <span style={{ fontSize: 10, color: C.textMuted, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Book I — To Himself
          </span>
          <span style={{ fontSize: 10, color: C.textMuted, flexShrink: 0 }}>12%</span>
        </div>

        <style>{`
          @keyframes enjoymock-slide-in {
            from { transform: translateX(100%); }
            to   { transform: translateX(0); }
          }
          @keyframes enjoymock-slide-in-right {
            from { transform: translateX(-100%); }
            to   { transform: translateX(0); }
          }
          @keyframes enjoymock-shimmer {
            0%   { background-position: 100% 0; }
            100% { background-position: -100% 0; }
          }
        `}</style>
      </div>
    </div>
  );
}
