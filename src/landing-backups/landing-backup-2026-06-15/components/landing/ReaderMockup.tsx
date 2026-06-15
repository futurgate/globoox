'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ─── timing (ms) ─────────────────────────────────────────────────────────────
const T_IDLE          = 1400;  // пауза на библиотеке
const T_BOOK_TAP      = 320;   // scale + ripple
const T_READER_OPEN   = 400;   // transition в reader
const T_READER_IDLE   = 1800;  // читаем
const T_LANG_TAP      = 150;   // тап по кнопке языка
const T_DROPDOWN_OPEN = 300;   // дропдаун открылся
const T_HOVER_STEP    = 280;   // задержка на каждом пункте
const T_LANG_SELECT   = 180;   // тап English
const T_MODAL_APPEAR  = 350;
const T_MODAL_IDLE    = 2000;  // читаем модалку
const T_MODAL_TAP     = 150;
const T_TRANSLATING   = 2400;  // glow + blur
const T_TRANSLATED    = 400;   // текст проявляется
const T_HOLD          = 2200;  // читаем английский
const T_BACK_TAP      = 180;   // подсветка кнопки назад + ripple
const T_READER_SKEL   = 950;   // скелетон ридера при открытии
const T_BACK_CLOSE    = 320;   // reader → library skeleton
const T_LIB_SKEL      = 380;   // скелетон библиотеки при возврате

// ─── colours (forest-light) ──────────────────────────────────────────────────
const C = {
  bg:          '#F4F0E8',
  header:      '#F4F0E8',
  statusBar:   '#F4F0E8',
  separator:   'rgba(44,59,45,0.12)',
  text:        '#2C3B2D',
  textSecond:  'rgba(44,59,45,0.55)',
  textMuted:   'rgba(44,59,45,0.38)',
  accent:      '#C05A3A',
  accentBg:    'rgba(192,90,58,0.1)',
  coverShadow: 'rgba(44,59,45,0.18)',
  progressBg:  'rgba(44,59,45,0.1)',
  coverColor:  '#9B8AAB',
  dropdownBg:  '#F4F0E8',
  modalBg:     '#F4F0E8',
  overlay:     'rgba(0,0,0,0.32)',
};

type Phase =
  | 'library'
  | 'book-tap'
  | 'reader-skeleton'
  | 'reader-open'
  | 'reader-idle'
  | 'lang-tap'
  | 'dropdown-open'
  | 'hover-0' | 'hover-1' | 'hover-2'
  | 'lang-select'
  | 'modal-show'
  | 'modal-idle'
  | 'modal-tap'
  | 'translating'
  | 'translated'
  | 'hold'
  | 'back-tap'
  | 'back-close'
  | 'library-skeleton';

// первый слот — Meditations (новая книга из Step 1), остальные — existing books
const NEW_BOOK = { title: 'Meditations', author: 'Marcus Aurelius', color: '#9B8AAB', progress: 0 };
const EXISTING_BOOKS = [
  { title: 'The Art of War',           author: 'Sun Tzu',        color: '#A0896E', progress: 74 },
  { title: 'Walden',                   author: 'Henry Thoreau',  color: '#6B8C7A', progress: 41 },
  { title: 'The Prince',               author: 'Machiavelli',    color: '#7A8A6E', progress: 88 },
  { title: 'On the Origin of Species', author: 'Charles Darwin', color: '#8A7A6E', progress: 22 },
  { title: 'Thus Spoke Zarathustra',   author: 'Nietzsche',      color: '#7A9BAA', progress: 0  },
];

const LANGS = ['Español', 'Français', 'English', 'Русский'];

const GREEK_TEXT = [
  'Εἰς ἑαυτόν — Μάρκου Αὐρηλίου Ἀντωνίνου',
  'Παρὰ τοῦ πάππου Οὐήρου τὸ ἥμερον καὶ πρᾷον. Παρὰ δὲ τῆς εἰς τὸν πάππον εὐφημίας καὶ μνήμης τὸ αἰδῆμον καὶ ἀρρενωπόν. Παρὰ τῆς μητρὸς τὸ θεοσεβὲς καὶ μεταδοτικὸν καὶ ἀφεκτικὸν οὐ μόνον τοῦ κακοποιεῖν ἀλλὰ καὶ τοῦ ἐπὶ ἐννοίας γίνεσθαι τοιαύτης· ἔτι δὲ τὸ λιτὸν κατὰ τὴν δίαιταν καὶ πόρρω τῆς πλουσιακῆς διαγωγῆς.',
  'Παρὰ τοῦ προπάππου τὸ μὴ εἰς δημοσίας διατριβὰς φοιτῆσαι καὶ τὸ χρῆσθαι διδασκάλοις κατ᾽ οἶκον καὶ τὸ γνῶναι ὅτι εἰς τὰ τοιαῦτα δεῖ ἀφθόνως ἀναλίσκειν.',
  'Παρὰ τοῦ παιδαγωγοῦ τὸ μήτε Πρασιανὸς μήτε Βενετιανὸς γενέσθαι, μήτε Παλμουλάριος μήτε Σκουτάριος· καὶ τὸ καρτερικὸν καὶ ὀλιγοδεὲς καὶ αὐτουργικὸν καὶ ἀπολύπραγμον.',
];

const ENGLISH_TEXT = [
  'Meditations — Marcus Aurelius Antoninus',
  'From my grandfather Verus I learned to be gentle and meek, and to refrain from all anger and passion. From the reputation and remembrance of my father, modesty and a manly character. From my mother, piety and beneficence, and abstinence not only from evil deeds, but even from evil thoughts; and further, simplicity in my way of living, far removed from the habits of the rich.',
  'From my great-grandfather, not to have frequented public schools, and to have had good teachers at home, and to know that on such things a man should spend liberally.',
  'From my governor, to be neither of the green nor of the blue party at the games in the Circus, nor a partizan either of the Parmularius or the Scutarius at the gladiators\' fights; from him too I learned endurance of labour, and to want little, and to work with my own hands, and not to meddle with other people\'s affairs.',
];

// ─── mini book cover ──────────────────────────────────────────────────────────
function MiniCover({ color, progress = 0, tapped = false }: {
  color: string; progress?: number; tapped?: boolean;
}) {
  return (
    <div style={{
      width: '100%',
      aspectRatio: '2/3',
      borderRadius: 6,
      backgroundColor: color,
      position: 'relative',
      overflow: 'hidden',
      boxShadow: `0 2px 8px ${C.coverShadow}`,
      transform: tapped ? 'scale(0.93)' : 'scale(1)',
      transition: 'transform 0.12s ease-out',
    }}>
      <div style={{ position: 'absolute', bottom: 10, left: 7, right: 7 }}>
        <div style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.7)', marginBottom: 3, width: '88%' }} />
        <div style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.7)', marginBottom: 3, width: '65%' }} />
        <div style={{ height: 2, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)', width: '50%' }} />
      </div>
      {progress > 0 && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5, backgroundColor: C.progressBg }}>
          <div style={{ height: '100%', width: `${progress}%`, backgroundColor: C.accent }} />
        </div>
      )}
    </div>
  );
}

// ─── ripple ───────────────────────────────────────────────────────────────────
function Ripple({ active, color = 'rgba(255,255,255,0.35)', radius = 6, clip = true, duration = 350, x, y, size = '300%' }: { active: boolean; color?: string; radius?: number; clip?: boolean; duration?: number; x?: number | string; y?: number | string; size?: string }) {
  const cx = x !== undefined ? x : '50%';
  const cy = y !== undefined ? y : '50%';
  return (
    <div style={{
      position: 'absolute', inset: 0,
      borderRadius: radius,
      pointerEvents: 'none',
      overflow: clip ? 'hidden' : 'visible',
    }}>
      <div style={{
        position: 'absolute',
        top: cy, left: cx,
        width: active ? size : '0%',
        aspectRatio: '1',
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        backgroundColor: color,
        transition: active ? `width ${duration}ms ease-out, opacity ${duration}ms ease-out` : 'none',
        opacity: active ? 0 : 1,
      }} />
    </div>
  );
}

// ─── glow border ─────────────────────────────────────────────────────────────
function GlowBorder({ active, width = 320, height = 640 }: { active: boolean; width?: number; height?: number }) {
  const r = 20; // border-radius виджета
  return (
    <div style={{
      position: 'absolute', inset: 0,
      pointerEvents: 'none',
      opacity: active ? 1 : 0,
      transition: 'opacity 0.5s ease',
      zIndex: 42, // над затемнением (zIndex 40), под модалкой (zIndex 50)
    }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#0f00ff" />
            <stop offset="25%"  stopColor="#ae1b6e" />
            <stop offset="50%"  stopColor="#cf0000" />
            <stop offset="75%"  stopColor="#ff9f10" />
            <stop offset="100%" stopColor="#0f00ff" />
            <animateTransform
              attributeName="gradientTransform"
              type="translate"
              from="-1 -1"
              to="1 1"
              dur="1.8s"
              repeatCount="indefinite"
            />
          </linearGradient>
          <filter id="glowBlur">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>
        {/* широкое размытое свечение */}
        <rect
          x={2} y={2}
          width={width - 4} height={height - 4}
          rx={r} ry={r}
          fill="none"
          stroke="url(#glowGrad)"
          strokeWidth="12"
          filter="url(#glowBlur)"
          opacity="1"
        />
        {/* среднее свечение */}
        <rect
          x={2} y={2}
          width={width - 4} height={height - 4}
          rx={r} ry={r}
          fill="none"
          stroke="url(#glowGrad)"
          strokeWidth="6"
          filter="url(#glowBlur)"
          opacity="1"
        />
      </svg>
    </div>
  );
}

// ─── shimmer skeleton line ────────────────────────────────────────────────────
function SkelLine({ w = '100%', h = 13, mb = 10 }: { w?: string | number; h?: number; mb?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 4, marginBottom: mb,
      background: 'linear-gradient(90deg, rgba(44,59,45,0.07) 0%, rgba(44,59,45,0.07) 30%, rgba(44,59,45,0.16) 50%, rgba(44,59,45,0.07) 70%, rgba(44,59,45,0.07) 100%)',
      backgroundSize: '200% 100%',
      animation: 'readermock-shimmer 1.4s linear infinite',
    }} />
  );
}

function SkelBook({ w = 76 }: { w?: number }) {
  const coverH = Math.round(w * 1.5);
  return (
    <div>
      <div style={{
        width: w, height: coverH, borderRadius: 6,
        background: 'linear-gradient(90deg, rgba(44,59,45,0.07) 0%, rgba(44,59,45,0.07) 30%, rgba(44,59,45,0.16) 50%, rgba(44,59,45,0.07) 70%, rgba(44,59,45,0.07) 100%)',
        backgroundSize: '200% 100%',
        animation: 'readermock-shimmer 1.4s linear infinite',
      }} />
      <div style={{ marginTop: 5 }}>
        <SkelLine w="80%" h={9} mb={4} />
        <SkelLine w="55%" h={8} mb={0} />
      </div>
    </div>
  );
}

// ─── ios alert dialog ─────────────────────────────────────────────────────────
function IOSAlert({ visible, tapOK }: { visible: boolean; tapOK: boolean }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: C.overlay,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.25s ease',
      pointerEvents: visible ? 'auto' : 'none',
      zIndex: 50,
      borderRadius: 20,
    }}>
      <div style={{
        width: 240,
        backgroundColor: C.modalBg,
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
        transform: visible ? 'scale(1)' : 'scale(0.92)',
        transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1)',
      }}>
        <div style={{ padding: '20px 20px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 8 }}>
            Translation takes a moment
          </div>
          <div style={{ fontSize: 12, color: C.textSecond, lineHeight: 1.5 }}>
            The first pages may take about 30 seconds. After that, the rest will keep translating as you read.
          </div>
        </div>
        <div style={{ borderTop: `0.5px solid ${C.separator}` }}>
          <div style={{
            padding: '12px 0',
            textAlign: 'center',
            fontSize: 15,
            fontWeight: 600,
            color: tapOK ? `rgba(192,90,58,0.45)` : C.accent,
            transition: 'color 0.1s ease',
            position: 'relative', overflow: 'hidden',
          }}>
            OK
            <Ripple active={tapOK} color="rgba(192,90,58,0.15)" radius={0} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────
export function ReaderMockup({ onCycleEnd }: { onCycleEnd?: () => void } = {}) {
  const [phase, setPhase]         = useState<Phase>('library');
  const [scale, setScale]         = useState(1);
  const outerRef                  = useRef<HTMLDivElement>(null);
  const timerRef                  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const parent = el.parentElement;
    const target = parent ?? el;
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
    setPhase('library');

    schedule(() => {
      // тап по книге
      setPhase('book-tap');

      schedule(() => {
        // скелетон ридера
        setPhase('reader-skeleton');

        schedule(() => {
          setPhase('reader-open');
          schedule(() => {
          setPhase('reader-idle');

          schedule(() => {
            // тап по кнопке языка
            setPhase('lang-tap');

            schedule(() => {
              setPhase('dropdown-open');

              schedule(() => {
                setPhase('hover-0');
                schedule(() => {
                  setPhase('hover-1');
                  schedule(() => {
                    setPhase('hover-2');
                    schedule(() => {
                      // тап English
                      setPhase('lang-select');
                      schedule(() => {
                        // модалка
                        setPhase('modal-show');
                        schedule(() => {
                          setPhase('modal-idle');
                          schedule(() => {
                            // тап OK
                            setPhase('modal-tap');
                            schedule(() => {
                              // переводим
                              setPhase('translating');
                              schedule(() => {
                                setPhase('translated');
                                schedule(() => {
                                  setPhase('hold');
                                  schedule(() => {
                                    // тап по кнопке назад
                                    setPhase('back-tap');
                                    schedule(() => {
                                      setPhase('back-close');
                                      schedule(() => {
                                        setPhase('library-skeleton');
                                        schedule(() => {
                                          setPhase('library');
                                          schedule(() => {
                                            onCycleEnd?.();
                                            runCycle();
                                          }, T_IDLE);
                                        }, T_LIB_SKEL);
                                      }, T_BACK_CLOSE);
                                    }, T_BACK_TAP);
                                  }, T_HOLD);
                                }, T_TRANSLATED);
                              }, T_TRANSLATING);
                            }, T_MODAL_TAP);
                          }, T_MODAL_IDLE);
                        }, T_MODAL_APPEAR);
                      }, T_LANG_SELECT);
                    }, T_HOVER_STEP);
                  }, T_HOVER_STEP);
                }, T_HOVER_STEP);
              }, T_DROPDOWN_OPEN);
            }, T_LANG_TAP);
          }, T_READER_IDLE);
          }, T_READER_OPEN);
        }, T_READER_SKEL);
      }, T_BOOK_TAP);
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

  // ─── derived state ───────────────────────────────────────────────────────────
  const inReader = phase !== 'library' && phase !== 'book-tap' && phase !== 'back-close' && phase !== 'library-skeleton' && phase !== 'reader-skeleton' && phase !== 'back-tap';
  const showReaderSkeleton = phase === 'reader-skeleton';
  const showLibrarySkeleton = phase === 'library-skeleton';
  const bookTapped = phase === 'book-tap';
  const backTapped = phase === 'back-tap';
  const dropdownOpen = phase === 'dropdown-open' || phase === 'hover-0' || phase === 'hover-1' || phase === 'hover-2' || phase === 'lang-select';
  const langTapped = phase === 'lang-tap';
  const hoveredIndex = phase === 'hover-0' ? 0 : phase === 'hover-1' ? 1 : phase === 'hover-2' ? 2 : phase === 'lang-select' ? 2 : -1;
  const modalVisible = phase === 'modal-show' || phase === 'modal-idle' || phase === 'modal-tap';
  const modalTapOK = phase === 'modal-tap';
  const isTranslating = phase === 'translating';
  const isTranslated = phase === 'translated' || phase === 'hold' || phase === 'back-tap' || phase === 'back-close';
  const currentLang = isTranslated ? 'EN' : 'GR';

  const textLines = isTranslated ? ENGLISH_TEXT : GREEK_TEXT;
  // blur+glow начинается когда появляется модалка
  const textBlur = modalVisible || isTranslating;
  const glowActive = modalVisible || isTranslating;

  return (
    <div ref={outerRef} style={{
      width: '100%',
      position: 'relative',
      height: 640 * scale,
    }}>
      <div style={{
        position: 'absolute',
        top: 0, left: '50%',
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

        {/* ── LIBRARY VIEW ── */}
        <div style={{
          position: 'absolute', inset: 0,
          opacity: (phase === 'library' || phase === 'book-tap') ? 1 : 0,
          transition: 'opacity 0.35s ease-in-out',
          pointerEvents: 'none',
          backgroundColor: C.bg,
        }}>
          {/* status bar */}
          <div style={{ height: 22, backgroundColor: C.statusBar, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px'}}>
            <span style={{ color: C.text, fontSize: 10, fontWeight: 600 }}>9:41</span>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <div style={{ width: 18, height: 9, border: `1.5px solid ${C.text}`, borderRadius: 2, position: 'relative', opacity: 0.6 }}>
                <div style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', width: 3, height: 5, backgroundColor: C.text, borderRadius: '0 1px 1px 0' }} />
                <div style={{ position: 'absolute', inset: 2, right: 3, backgroundColor: C.text, borderRadius: 0.5 }} />
              </div>
            </div>
          </div>

          {/* nav bar */}
          <div style={{ height: 44, backgroundColor: C.header, borderBottom: `0.5px solid ${C.separator}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
            <span style={{ color: C.text, fontSize: 17, fontWeight: 600 }}>My Books</span>
            <div style={{
              backgroundColor: C.accentBg,
              color: C.accent,
              borderRadius: 8,
              padding: '5px 12px',
              fontSize: 13,
              fontWeight: 600,
            }}>+ Add</div>
          </div>

          {/* filter pills */}
          <div style={{ display: 'flex', gap: 8, padding: '10px 16px', backgroundColor: C.bg }}>
            {['Visible', 'Hidden', 'All'].map((f, i) => (
              <div key={f} style={{
                padding: '4px 12px',
                borderRadius: 16,
                fontSize: 12,
                fontWeight: 500,
                backgroundColor: i === 0 ? C.accent : 'transparent',
                color: i === 0 ? '#fff' : C.textSecond,
                border: i === 0 ? 'none' : `1px solid ${C.separator}`,
              }}>{f}</div>
            ))}
          </div>

          {/* book grid — точная копия из MyBooksMockup (конец первой анимации, 6 книг) */}
          <div style={{ padding: '4px 16px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {/* новая книга из Step 1 — первый слот */}
            <div style={{ position: 'relative' }}>
              <MiniCover color={NEW_BOOK.color} progress={NEW_BOOK.progress} tapped={bookTapped} />
              <Ripple active={bookTapped} />
              <div style={{ marginTop: 5 }}>
                <div style={{ color: C.text, fontSize: 10, fontWeight: 500, lineHeight: 1.35,
                  overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {NEW_BOOK.title}
                </div>
                <div style={{ color: C.textMuted, fontSize: 9, marginTop: 2 }}>{NEW_BOOK.author}</div>
              </div>
            </div>
            {EXISTING_BOOKS.map((b) => (
              <div key={b.title}>
                <MiniCover color={b.color} progress={b.progress} />
                <div style={{ marginTop: 5 }}>
                  <div style={{ color: C.text, fontSize: 10, fontWeight: 500, lineHeight: 1.35,
                    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {b.title}
                  </div>
                  <div style={{ color: C.textMuted, fontSize: 9, marginTop: 2 }}>{b.author}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── bottom tab bar ── */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 56,
            backgroundColor: C.bg,
            borderTop: `0.5px solid ${C.separator}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, opacity: 0.35 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              <span style={{ fontSize: 9, color: C.text, fontWeight: 500 }}>Store</span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
              <span style={{ fontSize: 9, color: C.accent, fontWeight: 600 }}>My Books</span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, opacity: 0.35 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              <span style={{ fontSize: 9, color: C.text, fontWeight: 500 }}>Settings</span>
            </div>
          </div>
        </div>

        {/* ── READER VIEW ── */}
        <div style={{
          position: 'absolute', inset: 0,
          opacity: inReader ? 1 : 0,
          transition: 'opacity 0.35s ease-in-out',
          pointerEvents: 'none',
          backgroundColor: C.bg,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* status bar */}
          <div style={{ height: 22, backgroundColor: C.statusBar, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px'}}>
            <span style={{ color: C.text, fontSize: 10, fontWeight: 600 }}>9:41</span>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <div style={{ width: 18, height: 9, border: `1.5px solid ${C.text}`, borderRadius: 2, position: 'relative', opacity: 0.6 }}>
                <div style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', width: 3, height: 5, backgroundColor: C.text, borderRadius: '0 1px 1px 0' }} />
                <div style={{ position: 'absolute', inset: 2, right: 3, backgroundColor: C.text, borderRadius: 0.5 }} />
              </div>
            </div>
          </div>

          {/* reader nav bar */}
          <div style={{ height: 44, backgroundColor: C.header, borderBottom: `0.5px solid ${C.separator}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', position: 'relative' }}>
            {/* back */}
            <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 4, opacity: backTapped ? 0.4 : 1, transition: 'opacity 0.1s ease' }}>
              <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
                <path d="M7 1L1 6.5L7 12" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            {/* title */}
            <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 13, fontWeight: 600, color: C.text }}>Meditations</span>
            {/* lang button */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 2,
              opacity: langTapped ? 0.5 : 1,
              transition: 'opacity 0.1s ease',
              position: 'relative', padding: '4px 6px', borderRadius: 6, overflow: 'hidden',
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.accent }}>{currentLang}</span>
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease' }}>
                <path d="M1 1L5 5L9 1" stroke={C.accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <Ripple active={langTapped} />
            </div>
            <Ripple active={langTapped} color="rgba(192,90,58,0.06)" clip={false} duration={600} x={304} y={22} size="500%" />

            {/* dropdown */}
            {dropdownOpen && (
              <div style={{
                position: 'absolute', top: 42, right: 8,
                width: 160,
                backgroundColor: C.dropdownBg,
                borderRadius: 12,
                boxShadow: '0 4px 24px rgba(0,0,0,0.14)',
                border: `0.5px solid ${C.separator}`,
                overflow: 'hidden',
                zIndex: 30,
              }}>
                {LANGS.map((lang, i) => (
                  <div key={lang} style={{ position: 'relative' }}>
                    <div style={{
                      padding: '10px 14px',
                      fontSize: 14,
                      color: C.text,
                      backgroundColor: hoveredIndex === i ? C.accentBg : 'transparent',
                      transition: 'background-color 0.15s ease',
                      position: 'relative', overflow: 'hidden',
                    }}>
                      {lang}
                      {i === 2 && <Ripple active={phase === 'lang-select'} color="rgba(192,90,58,0.2)" radius={0} />}
                    </div>
                    {i === 2 && <Ripple active={phase === 'lang-select'} color="rgba(192,90,58,0.08)" radius={0} />}
                    {i < LANGS.length - 1 && <div style={{ height: 0.5, backgroundColor: C.separator, marginLeft: 14 }} />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* reader content */}
          <div style={{ flex: 1, padding: '4px 20px 16px', position: 'relative' }}>
            {textLines.map((line, i) => (
              <p key={`${isTranslated ? 'en' : 'gr'}-${i}`} style={{
                fontSize: i === 0 ? 13 : 14,
                fontWeight: i === 0 ? 600 : 400,
                color: i === 0 ? C.textSecond : C.text,
                lineHeight: 1.65,
                marginBottom: i === 0 ? 14 : 10,
                filter: textBlur ? 'blur(3px)' : 'none',
                opacity: textBlur ? 0.4 : 1,
                transition: textBlur
                  ? 'none'
                  : `filter 0.5s ease-out ${i * 0.12}s, opacity 0.5s ease-out ${i * 0.12}s`,
              }}>
                {line}
              </p>
            ))}
            {isTranslating && (
              <div style={{
                position: 'absolute', top: '40%', left: 0, right: 0,
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
                  animation: 'readermock-shimmer 1.8s linear infinite',
                }}>Translating...</span>
              </div>
            )}
          </div>

          {/* reader footer */}
          <div style={{
            height: 36,
            flexShrink: 0,
            borderTop: `0.5px solid ${C.separator}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10,
            backgroundColor: C.bg,
          }}>
            <span style={{ fontSize: 10, color: C.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
              Book I — To Himself
            </span>
            <span style={{ fontSize: 10, color: C.textMuted, flexShrink: 0 }}>
              {isTranslated ? '12%' : '0%'}
            </span>
          </div>
        </div>

        {/* ── MODAL ── */}
        <IOSAlert visible={modalVisible} tapOK={modalTapOK} />

        {/* ── GLOW ── */}
        <GlowBorder active={glowActive} />

        {/* ── READER SKELETON ── */}
        {showReaderSkeleton && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: C.bg, zIndex: 20, display: 'flex', flexDirection: 'column' }}>
            {/* status bar */}
            <div style={{ height: 22, backgroundColor: C.statusBar, flexShrink: 0 }} />
            {/* nav bar */}
            <div style={{ height: 44, backgroundColor: C.header, borderBottom: `0.5px solid ${C.separator}`, flexShrink: 0 }} />
            {/* text lines */}
            <div style={{ flex: 1, padding: '4px 20px 16px' }}>
              <SkelLine w="65%" h={11} mb={18} />
              <SkelLine w="100%" h={13} mb={8} />
              <SkelLine w="100%" h={13} mb={8} />
              <SkelLine w="100%" h={13} mb={8} />
              <SkelLine w="78%" h={13} mb={18} />
              <SkelLine w="100%" h={13} mb={8} />
              <SkelLine w="100%" h={13} mb={8} />
              <SkelLine w="60%" h={13} mb={18} />
              <SkelLine w="100%" h={13} mb={8} />
              <SkelLine w="100%" h={13} mb={8} />
              <SkelLine w="100%" h={13} mb={8} />
              <SkelLine w="85%" h={13} mb={8} />
              <SkelLine w="72%" h={13} mb={8} />
              <SkelLine w="65%" h={13} mb={8} />
              <SkelLine w="100%" h={13} mb={8} />
              <SkelLine w="100%" h={13} mb={8} />
              <SkelLine w="100%" h={13} mb={8} />
              <SkelLine w="78%" h={13} mb={8} />
              <SkelLine w="100%" h={13} mb={8} />
              <SkelLine w="100%" h={13} mb={8} />
              <SkelLine w="60%" h={13} mb={18} />
              <SkelLine w="100%" h={13} mb={8} />
              <SkelLine w="100%" h={13} mb={8} />
              <SkelLine w="100%" h={13} mb={8} />
              <SkelLine w="85%" h={13} mb={8} />
              <SkelLine w="72%" h={13} mb={0} />
            </div>
            {/* footer */}
            <div style={{ height: 36, flexShrink: 0, borderTop: `0.5px solid ${C.separator}` }} />
          </div>
        )}

        {/* ── LIBRARY SKELETON ── */}
        {showLibrarySkeleton && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: C.bg, zIndex: 20, display: 'flex', flexDirection: 'column' }}>
            {/* status bar */}
            <div style={{ height: 22, backgroundColor: C.statusBar, flexShrink: 0 }} />
            {/* nav bar */}
            <div style={{ height: 44, backgroundColor: C.header, borderBottom: `0.5px solid ${C.separator}`, flexShrink: 0 }} />
            {/* filter pills skeleton */}
            <div style={{ display: 'flex', gap: 8, padding: '10px 16px' }}>
              {[60, 50, 40].map((w, i) => (
                <div key={i} style={{ width: w, height: 24, borderRadius: 16,
                  background: 'linear-gradient(90deg, rgba(44,59,45,0.07) 0%, rgba(44,59,45,0.07) 30%, rgba(44,59,45,0.16) 50%, rgba(44,59,45,0.07) 70%, rgba(44,59,45,0.07) 100%)',
                  backgroundSize: '200% 100%', animation: 'readermock-shimmer 1.4s linear infinite',
                }} />
              ))}
            </div>
            {/* book grid skeleton */}
            {(() => {
              const GAP = 14, PAD = 16, COLS = 3;
              const cellW = Math.floor((320 - PAD * 2 - GAP * (COLS - 1)) / COLS);
              return (
                <div style={{ padding: '4px 16px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: GAP }}>
                  {Array.from({ length: 6 }).map((_, i) => <SkelBook key={i} w={cellW} />)}
                </div>
              );
            })()}
            {/* tab bar */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 56, backgroundColor: C.bg, borderTop: `0.5px solid ${C.separator}` }} />
          </div>
        )}

        {/* ── BACK RIPPLE (outside header, full widget) ── */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: 20, zIndex: 15 }}>
          <Ripple active={backTapped} color="rgba(192,90,58,0.10)" clip={false} duration={600} x={16} y={33} size="500%" />
        </div>

        <style>{`
          @keyframes readermock-glow {
            0%   { background-position: 0% 50%; }
            100% { background-position: 300% 50%; }
          }
          @keyframes readermock-shimmer {
            0%   { background-position: 100% 0; }
            100% { background-position: -100% 0; }
          }
        `}</style>
      </div>
    </div>
  );
}
