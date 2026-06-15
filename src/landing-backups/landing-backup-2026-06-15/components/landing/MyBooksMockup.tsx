'use client';

import { useEffect, useRef, useState } from 'react';

// ─── timing (ms) ─────────────────────────────────────────────────────────────
const T_IDLE            = 2400;
const T_BTN_FLASH       = 80;    // одно мигание кнопки Add
const T_PAUSE_EMPTY     = 1100;  // смотрим на пустой drawer
const T_TAP_FLASH       = 350;   // вспышка зоны выбора
const T_SPINNER         = 1600;  // спиннер
const T_PAUSE_FILE      = 900;   // пауза на файле — кнопка Upload активна
const T_UPLOAD_TAP      = 120;   // flash кнопки Upload перед стартом
const T_UPLOADING       = 2000;  // прогресс 0→100
const T_PAUSE_DONE      = 900;   // пауза на чекмарке
const T_DRAWER_CLOSE    = 420;
const T_PAUSE_BOOK      = 600;
const T_HOLD            = 2600;
const T_FADE_OUT        = 1000;
const T_FADE_IN         = 800;

// высота зоны выбора файла — фиксирована чтобы drawer не скакал
const DRAWER_ZONE_H = 110;

type Phase =
  | 'idle'
  | 'btn-flash'
  | 'drawer-empty'
  | 'tap-flash'
  | 'spinner'
  | 'file-ready'
  | 'upload-tap'
  | 'uploading'
  | 'upload-done'
  | 'drawer-closing'
  | 'book-appear'
  | 'book-reorder'
  | 'hold'
  | 'fade-out'
  | 'fade-in';

// ─── colours (forest-light) ───────────────────────────────────────────────────
const C = {
  bg:           '#F4F0E8',
  header:       '#F4F0E8',
  statusBar:    '#F4F0E8',
  separator:    'rgba(44,59,45,0.18)',
  text:         '#2C3B2D',
  textSecond:   'rgba(44,59,45,0.6)',
  textMuted:    'rgba(44,59,45,0.55)',
  accent:       '#C05A3A',
  accentBg:     'rgba(192,90,58,0.1)',
  drawerBg:     '#F4F0E8',
  drawerInput:  'rgba(44,59,45,0.07)',
  coverShadow:  'rgba(44,59,45,0.18)',
  progressBg:   'rgba(44,59,45,0.1)',
  successGreen: '#4A9B6F',
};

// ─── mock books ───────────────────────────────────────────────────────────────
const EXISTING_BOOKS = [
  { title: 'The Art of War',           author: 'Sun Tzu',         color: '#A0896E', progress: 74 },
  { title: 'Walden',                   author: 'Henry Thoreau',   color: '#6B8C7A', progress: 41 },
  { title: 'The Prince',               author: 'Machiavelli',     color: '#7A8A6E', progress: 88 },
  { title: 'On the Origin of Species', author: 'Charles Darwin',  color: '#8A7A6E', progress: 22 },
  { title: 'Thus Spoke Zarathustra',   author: 'Nietzsche',       color: '#7A9BAA', progress: 0  },
];
const NEW_BOOK = { title: 'Meditations', author: 'Marcus Aurelius', color: '#9B8AAB' };

// ─── mini book cover ──────────────────────────────────────────────────────────

// ─── ripple ───────────────────────────────────────────────────────────────────
function Ripple({ active, color = 'rgba(255,255,255,0.5)', radius = 6, clip = true, duration = 350, x, y, size = '300%' }: { active: boolean; color?: string; radius?: number; clip?: boolean; duration?: number; x?: number | string; y?: number | string; size?: string }) {
  const cx = x !== undefined ? x : '50%';
  const cy = y !== undefined ? y : '50%';
  return (
    <div style={{ position: 'absolute', inset: 0, borderRadius: radius, pointerEvents: 'none', overflow: clip ? 'hidden' : 'visible' }}>
      <div style={{
        position: 'absolute', top: cy, left: cx,
        width: active ? size : '0%', aspectRatio: '1',
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        backgroundColor: color,
        transition: active ? `width ${duration}ms ease-out, opacity ${duration}ms ease-out` : 'none',
        opacity: active ? 0 : 1,
      }} />
    </div>
  );
}

// ─── spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{
      width: 22, height: 22,
      border: `2.5px solid ${C.accentBg}`,
      borderTopColor: C.accent,
      borderRadius: '50%',
      animation: 'mybooksmock-spin 0.75s linear infinite',
      flexShrink: 0,
    }} />
  );
}

// ─── upload drawer ────────────────────────────────────────────────────────────
function UploadDrawer({ open, phase, uploadPct }: {
  open: boolean; phase: Phase; uploadPct: number;
}) {
  const showEmpty       = phase === 'drawer-empty' || phase === 'tap-flash';
  const showSpinner     = phase === 'spinner';
  const showFile        = phase === 'file-ready' || phase === 'upload-tap' || phase === 'uploading' || phase === 'upload-done';
  const tapFlash        = phase === 'tap-flash';
  const isDone          = phase === 'upload-done';
  const uploadBtnActive = phase === 'file-ready';
  const uploadBtnTap    = phase === 'upload-tap';
  // во время загрузки зона показывает спиннер/прогресс вместо файла
  const showProgress    = phase === 'uploading' || phase === 'upload-done';

  return (
    <div style={{
      position: 'absolute',
      bottom: 0, left: 0, right: 0,
      backgroundColor: C.drawerBg,
      borderRadius: '16px 16px 0 0',
      transform: open ? 'translateY(0)' : 'translateY(100%)',
      transition: 'transform 0.38s cubic-bezier(0.22,1,0.36,1)',
      zIndex: 10,
      boxShadow: '0 -2px 20px rgba(0,0,0,0.10)',
      borderTop: `0.5px solid ${C.separator}`,
    }}>
      {/* drag handle */}
      <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(44,59,45,0.15)', margin: '12px auto 0' }} />

      {/* title + description */}
      <div style={{ padding: '12px 16px 4px' }}>
        <div style={{ color: C.text, fontSize: 17, fontWeight: 600, marginBottom: 4 }}>Upload Book</div>
        <div style={{ color: C.textMuted, fontSize: 13 }}>Add an EPUB from your device.</div>
      </div>

      {/* ── file zone: фиксированная высота, слои через absolute ── */}
      <div style={{ position: 'relative', height: DRAWER_ZONE_H, margin: '12px 16px' }}>

        {/* слой 1: пустое + tap-flash */}
        <div style={{
          position: 'absolute', inset: 0,
          opacity: showEmpty ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: showEmpty ? 'auto' : 'none',
        }}>
          <div style={{
            backgroundColor: tapFlash ? C.accentBg : C.drawerInput,
            borderRadius: 12,
            height: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 8,
            border: `1.5px dashed ${tapFlash ? C.accent : C.separator}`,
            transition: 'background-color 0.3s ease, border-color 0.3s ease',
            position: 'relative', overflow: 'hidden',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke={tapFlash ? C.accent : C.textMuted}
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: 'stroke 0.3s ease' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span style={{ color: tapFlash ? C.accent : C.textMuted, fontSize: 13, transition: 'color 0.3s ease' }}>
              Choose an EPUB file
            </span>
            <Ripple active={tapFlash} color="rgba(192,90,58,0.15)" radius={12} />
          </div>
        </div>

        {/* слой 2: спиннер */}
        <div style={{
          position: 'absolute', inset: 0,
          opacity: showSpinner ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none',
        }}>
          <div style={{
            backgroundColor: C.drawerInput,
            borderRadius: 12,
            height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          }}>
            <Spinner />
            <span style={{ color: C.textMuted, fontSize: 13 }}>Reading file…</span>
          </div>
        </div>

        {/* слой 3: файл выбран — иконка FileText + имя (до начала загрузки) */}
        <div style={{
          position: 'absolute', inset: 0,
          opacity: showFile && !showProgress ? 1 : 0,
          transition: 'opacity 0.4s ease',
          pointerEvents: 'none',
        }}>
          <div style={{
            backgroundColor: C.drawerInput,
            borderRadius: 12,
            height: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {/* FileText icon */}
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.textMuted}
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <span style={{ color: C.text, fontSize: 13, fontWeight: 500 }}>meditations-aurelius.epub</span>
            <span style={{ color: C.textMuted, fontSize: 11 }}>340 KB · EPUB</span>
          </div>
        </div>

        {/* слой 4: загрузка — спиннер/чекмарк + прогресс-бар */}
        <div style={{
          position: 'absolute', inset: 0,
          opacity: showProgress ? 1 : 0,
          transition: 'opacity 0.4s ease',
          pointerEvents: 'none',
        }}>
          <div style={{
            backgroundColor: C.drawerInput,
            borderRadius: 12,
            height: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '0 20px',
          }}>
            {isDone
              ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke={C.successGreen} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              : <Spinner />
            }
            <span style={{ color: C.textMuted, fontSize: 12 }}>
              {isDone ? 'Book added to your library' : 'Processing…'}
            </span>
            <div style={{ width: '100%', height: 4, borderRadius: 2, backgroundColor: C.progressBg, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${uploadPct}%`,
                backgroundColor: isDone ? C.successGreen : C.accent,
                transition: 'width 0.25s linear, background-color 0.3s ease',
                borderRadius: 2,
              }} />
            </div>
          </div>
        </div>

      </div>

      {/* ── footer: separator + Upload button ── */}
      <div style={{ borderTop: `0.5px solid ${C.separator}`, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          height: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17,
          fontWeight: uploadBtnActive ? 500 : 400,
          color: uploadBtnTap
            ? 'rgba(192,90,58,0.35)'
            : uploadBtnActive ? C.accent : C.textMuted,
          opacity: uploadBtnActive || uploadBtnTap ? 1 : 0.4,
          transition: uploadBtnTap ? 'color 0.06s ease' : 'color 0.25s ease, opacity 0.25s ease',
          position: 'relative', overflow: 'hidden',
        }}>
          Upload
          <Ripple active={uploadBtnTap} color="rgba(192,90,58,0.15)" radius={0} />
        </div>
        <Ripple active={uploadBtnTap} color="rgba(192,90,58,0.08)" radius={0} />
      </div>
    </div>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────
export function MyBooksMockup({ onCycleEnd }: { onCycleEnd?: () => void } = {}) {
  const [phase, setPhase]             = useState<Phase>('idle');
  const [uploadPct, setUploadPct]     = useState(0);
  const [showNewBook, setShowNewBook] = useState(false);
  const [newBookFirst, setNewBookFirst] = useState(false);
  const [fadeOpacity, setFadeOpacity] = useState(0);
  const [scale, setScale]             = useState(1);
  const outerRef                      = useRef<HTMLDivElement>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef   = useRef<number | null>(null);

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

  const schedule = (fn: () => void, delay: number) => {
    timerRef.current = setTimeout(fn, delay);
  };

  const runCycle = () => {
    setPhase('idle');
    setUploadPct(0);
    setShowNewBook(false);
    setNewBookFirst(false);
    setFadeOpacity(0);

    schedule(() => {
      // кнопка мигает один раз
      setPhase('btn-flash');

      schedule(() => {
        // сразу drawer выезжает пустым
        setPhase('drawer-empty');

        schedule(() => {
          // пауза в пустом drawer
          setPhase('tap-flash');

          schedule(() => {
            // спиннер
            setPhase('spinner');

              schedule(() => {
                // файл готов
                setPhase('file-ready');

                schedule(() => {
                  // flash кнопки Upload
                  setPhase('upload-tap');
                  schedule(() => {
                    // загрузка
                    setPhase('uploading');
                    const start = performance.now();
                    const animateProgress = (now: number) => {
                      const pct = Math.min(100, ((now - start) / T_UPLOADING) * 100);
                      setUploadPct(Math.round(pct));
                      if (pct < 100) {
                        rafRef.current = requestAnimationFrame(animateProgress);
                      } else {
                        setPhase('upload-done');
                        schedule(() => {
                          setPhase('drawer-closing');
                          schedule(() => {
                            schedule(() => {
                              setPhase('book-appear');

                              // дать браузеру отрендерить existing на старых позициях,
                              // потом сдвинуть их через CSS transition
                              rafRef.current = requestAnimationFrame(() => {
                                rafRef.current = requestAnimationFrame(() => {
                                  setNewBookFirst(true);
                                  schedule(() => {
                                    setShowNewBook(true);
                                  }, 200);
                                });
                              });

                              schedule(() => {
                                setPhase('hold');
                                schedule(() => {
                                  setPhase('fade-out');
                                  let op = 0;
                                  const step = 16 / T_FADE_OUT;
                                  const fadeOut = () => {
                                    op = Math.min(1, op + step);
                                    setFadeOpacity(op);
                                    if (op < 1) {
                                      rafRef.current = requestAnimationFrame(fadeOut);
                                    } else {
                                      setPhase('fade-in');
                                      setUploadPct(0);
                                      setShowNewBook(false);
                                      setNewBookFirst(false);
                                      let op2 = 1;
                                      const stepIn = 16 / T_FADE_IN;
                                      schedule(() => {
                                        const fadeIn = () => {
                                          op2 = Math.max(0, op2 - stepIn);
                                          setFadeOpacity(op2);
                                          if (op2 > 0) {
                                            rafRef.current = requestAnimationFrame(fadeIn);
                                          } else {
                                            onCycleEnd?.();
                                            runCycle();
                                          }
                                        };
                                        rafRef.current = requestAnimationFrame(fadeIn);
                                      }, 80);
                                    }
                                  };
                                  rafRef.current = requestAnimationFrame(fadeOut);
                                }, T_HOLD);
                              }, 700);
                            }, T_PAUSE_BOOK);
                          }, T_DRAWER_CLOSE);
                        }, T_PAUSE_DONE);
                      }
                    };
                    rafRef.current = requestAnimationFrame(animateProgress);
                  }, T_UPLOAD_TAP);
              }, T_PAUSE_FILE);
            }, T_SPINNER);
          }, T_TAP_FLASH);
        }, T_PAUSE_EMPTY);
      }, T_BTN_FLASH); // drawer выезжает сразу после вспышки
    }, T_IDLE);
  };

  useEffect(() => {
    runCycle();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drawerOpen = phase === 'drawer-empty' || phase === 'tap-flash' || phase === 'spinner'
    || phase === 'file-ready' || phase === 'upload-tap' || phase === 'uploading' || phase === 'upload-done';
  const btnFlash   = phase === 'btn-flash';
  const scrollOffset = drawerOpen ? -60 : 0;

  return (
    <div ref={outerRef} style={{
      width: '100%',
      position: 'relative',
      height: 640 * scale,
    }}>
    <div style={{
      position: 'absolute',
      top: 0,
      left: '50%',
      width: 320,
      height: 640,
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: C.bg,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
      userSelect: 'none',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      transform: `translateX(-50%) scale(${scale})`,
      transformOrigin: 'top center',
    }}>

      {/* ── inner scene ── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        backgroundColor: C.bg,
        transform: `translateY(${scrollOffset}px)`,
        transition: 'transform 0.7s cubic-bezier(0.22,1,0.36,1)',
      }}>
        {/* status bar */}
        <div style={{
          height: 22,
          backgroundColor: C.statusBar,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
        }}>
          <span style={{ color: C.text, fontSize: 10, fontWeight: 600 }}>9:41</span>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <div style={{ width: 18, height: 9, border: `1.5px solid ${C.text}`, borderRadius: 2, position: 'relative', opacity: 0.6 }}>
              <div style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', width: 3, height: 5, backgroundColor: C.text, borderRadius: '0 1px 1px 0' }} />
              <div style={{ position: 'absolute', inset: 2, right: 3, backgroundColor: C.text, borderRadius: 0.5 }} />
            </div>
          </div>
        </div>

        {/* nav header */}
        <div style={{
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          backgroundColor: C.header,
          borderBottom: `0.5px solid ${C.separator}`,
          position: 'relative',
        }}>
          <span style={{ color: C.text, fontSize: 17, fontWeight: 600 }}>My Books</span>
          <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden' }}>
            <button style={{
              backgroundColor: btnFlash ? C.accent : C.accentBg,
              color: btnFlash ? '#fff' : C.accent,
              border: 'none',
              borderRadius: 8,
              padding: '5px 12px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: btnFlash
                ? 'background-color 0.08s ease, color 0.08s ease'
                : 'background-color 0.25s ease, color 0.25s ease',
            }}>
              + Add
            </button>
            <Ripple active={btnFlash} color="rgba(255,255,255,0.4)" radius={8} duration={600} />
          </div>
          <Ripple active={btnFlash} color="rgba(192,90,58,0.08)" radius={0} clip={false} duration={600} x={288} y={22} size="500%" />
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

        {/* book grid — абсолютное позиционирование для анимации сдвига */}
        {(() => {
          const GAP = 14;
          const PAD = 16;
          const COLS = 3;
          const cellW = (320 - PAD * 2 - GAP * (COLS - 1)) / COLS; // ~76px
          const coverH = cellW * (3 / 2); // aspect 2/3
          const labelH = 36; // текст под обложкой
          const cellH = coverH + labelH;
          const rowH = cellH + GAP;
          const rows = 2;
          const containerH = rows * cellH + (rows - 1) * GAP + 20; // +20 bottom padding

          // порядок слотов: 0..5, каждый → {col, row}
          const slotPos = (idx: number) => ({
            left: PAD + (idx % COLS) * (cellW + GAP),
            top: 4 + Math.floor(idx / COLS) * rowH,
          });

          // все 6 книг: Meditations + 5 existing
          const ALL_BOOKS = [
            { key: 'new', color: NEW_BOOK.color, title: NEW_BOOK.title, author: NEW_BOOK.author, progress: 0, isNew: true },
            ...EXISTING_BOOKS.map(b => ({ key: b.title, color: b.color, title: b.title, author: b.author, progress: b.progress, isNew: false })),
          ];

          // позиция каждой книги зависит от фазы:
          // до reorder: new=slot5 (невидима до showNewBook), existing=slots 0-4
          // после reorder: new=slot0, existing=slots 1-5
          const bookSlot = (bookIdx: number) => newBookFirst ? bookIdx : (bookIdx === 0 ? 5 : bookIdx - 1);

          return (
            <div style={{ position: 'relative', height: containerH, margin: '0 0 0 0' }}>
              {ALL_BOOKS.map((book, bookIdx) => {
                const slot = bookSlot(bookIdx);
                const pos = slotPos(slot);
                const isNew = book.isNew;
                const visible = isNew ? showNewBook : true;
                return (
                  <div
                    key={book.key}
                    style={{
                      position: 'absolute',
                      width: cellW,
                      left: pos.left,
                      top: pos.top,
                      opacity: isNew ? 1 : 1,
                      transform: isNew ? (visible ? 'scale(1)' : 'scale(0)') : undefined,
                      transformOrigin: 'center center',
                      transition: isNew
                        ? 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)'
                        : newBookFirst
                          ? 'left 0.45s cubic-bezier(0.22,1,0.36,1), top 0.45s cubic-bezier(0.22,1,0.36,1)'
                          : 'none',
                    }}
                  >
                    <div style={{
                      width: '100%',
                      aspectRatio: '2/3',
                      borderRadius: 6,
                      backgroundColor: book.color,
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow: `0 2px 8px ${C.coverShadow}`,
                    }}>
                      <div style={{ position: 'absolute', bottom: 10, left: 7, right: 7 }}>
                        <div style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.7)', marginBottom: 3, width: '88%' }} />
                        <div style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.7)', marginBottom: 3, width: '65%' }} />
                        <div style={{ height: 2, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)', width: '50%' }} />
                      </div>
                      {book.progress > 0 && (
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5, backgroundColor: C.progressBg }}>
                          <div style={{ height: '100%', width: `${book.progress}%`, backgroundColor: C.accent }} />
                        </div>
                      )}
                    </div>
                    <div style={{ marginTop: 5 }}>
                      <div style={{ color: C.text, fontSize: 10, fontWeight: 500, lineHeight: 1.35,
                        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {book.title}
                      </div>
                      <div style={{ color: C.textMuted, fontSize: 9, marginTop: 2 }}>{book.author}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* ── bottom tab bar ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 56,
        backgroundColor: C.bg,
        borderTop: `0.5px solid ${C.separator}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        zIndex: 5,
      }}>
        {/* Store */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, opacity: 0.35 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          <span style={{ fontSize: 9, color: C.text, fontWeight: 500 }}>Store</span>
        </div>
        {/* My Books — active */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          <span style={{ fontSize: 9, color: C.accent, fontWeight: 600 }}>My Books</span>
        </div>
        {/* Settings */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, opacity: 0.35 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <span style={{ fontSize: 9, color: C.text, fontWeight: 500 }}>Settings</span>
        </div>
      </div>

      {/* ── drawer overlay ── */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.32)',
        opacity: drawerOpen ? 1 : 0,
        transition: 'opacity 0.38s ease-out',
        pointerEvents: 'none',
        zIndex: 9,
      }} />

      {/* ── drawer ── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <UploadDrawer open={drawerOpen} phase={phase} uploadPct={uploadPct} />
      </div>

      {/* ── fade overlay ── */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundColor: C.bg,
        opacity: fadeOpacity,
        pointerEvents: 'none',
      }} />

      <style>{`
        @keyframes mybooksmock-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
    </div>
  );
}
