'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ─── timing (ms) ──────────────────────────────────────────────────────────────
// Phase 1 — My Books (upload)
const T1_IDLE         = 2400;
const T1_BTN_FLASH    = 80;
const T1_PAUSE_EMPTY  = 1100;
const T1_TAP_FLASH    = 350;
const T1_SPINNER      = 1600;
const T1_PAUSE_FILE   = 900;
const T1_UPLOAD_TAP   = 120;
const T1_UPLOADING    = 2000;
const T1_PAUSE_DONE   = 900;
const T1_DRAWER_CLOSE = 420;
const T1_PAUSE_BOOK   = 600;
const T1_BOOK_REORDER = 700;
const T1_HOLD         = 1800; // держим книгу в сетке, потом тап → ридер

// Phase 2 — Reader (translate)
const T2_IDLE         = 500;
const T2_BOOK_TAP     = 320;
const T2_READER_SKEL  = 950;
const T2_READER_OPEN  = 400;
const T2_READER_IDLE  = 1800;
const T2_LANG_TAP     = 150;
const T2_DROPDOWN     = 300;
const T2_HOVER_STEP   = 280;
const T2_LANG_SELECT  = 180;
const T2_MODAL_APPEAR = 350;
const T2_MODAL_IDLE   = 2000;
const T2_MODAL_TAP    = 150;
const T2_TRANSLATING  = 2400;
const T2_TRANSLATED   = 400;
const T2_HOLD         = 2200; // держим английский текст, потом переходим к Enjoy

// Phase 3 — Enjoy (immersive reading)
const T3_IDLE         = 500;
const T3_TAP_HIDE     = 120;
const T3_IMMERSIVE    = 2000;
const T3_SWIPE        = 320;
const T3_REVEAL_STEP  = 380;
const T3_READ_PAGE2   = 3200;
const T3_READ_PAGE3   = 3200;
const T3_SWIPE_BACK   = 320;
const T3_PAUSE_BACK   = 500;
const T3_READ_PAGE1B  = 3200;
const T3_TAP_SHOW     = 120;
const T3_HOLD         = 1200;
const T3_BACK_TAP     = 180;
const T3_BACK_CLOSE   = 320;
const T3_LIB_SKEL     = 380;

const DRAWER_ZONE_H = 110;

// ─── colours ──────────────────────────────────────────────────────────────────
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
  overlay:      'rgba(0,0,0,0.32)',
  dropdownBg:   '#F4F0E8',
  modalBg:      '#F4F0E8',
};

// ─── books data ───────────────────────────────────────────────────────────────
const EXISTING_BOOKS = [
  { title: 'The Art of War',           author: 'Sun Tzu',        color: '#A0896E', progress: 74 },
  { title: 'Walden',                   author: 'Henry Thoreau',  color: '#6B8C7A', progress: 41 },
  { title: 'The Prince',               author: 'Machiavelli',    color: '#7A8A6E', progress: 88 },
  { title: 'On the Origin of Species', author: 'Charles Darwin', color: '#8A7A6E', progress: 22 },
  { title: 'Thus Spoke Zarathustra',   author: 'Nietzsche',      color: '#7A9BAA', progress: 0  },
];
const NEW_BOOK = { title: 'Meditations', author: 'Marcus Aurelius', color: '#9B8AAB', progress: 0 };

// ─── reader text ──────────────────────────────────────────────────────────────
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

const PAGES = [
  [
    { head: true,  text: 'Meditations — Marcus Aurelius Antoninus' },
    { head: false, text: 'From my grandfather Verus I learned to be gentle and meek, and to refrain from all anger and passion. From the reputation and remembrance of my father, modesty and a manly character. From my mother, piety and beneficence, and abstinence not only from evil deeds, but even from evil thoughts; and further, simplicity in my way of living, far removed from the habits of the rich.' },
    { head: false, text: 'From my great-grandfather, not to have frequented public schools, and to have had good teachers at home, and to know that on such things a man should spend liberally.' },
    { head: false, text: 'From my governor, to be neither of the green nor of the blue party at the games in the Circus, nor a partizan either of the Parmularius or the Scutarius at the gladiators\' fights; from him too I learned endurance of labour, and to want little, and to work with my own hands, and not to meddle with other people\'s affairs.' },
  ],
  [
    { head: false, text: 'From Diognetus, not to busy myself about trifling things, and not to give credit to what was said by miracle-workers and jugglers about incantations and the driving away of daemons and such things.' },
    { head: false, text: 'And not to breed quails for fighting, nor to give myself up passionately to such things. To him I am also indebted for having learned to tolerate freedom of speech.' },
    { head: false, text: 'From Rusticus I received the impression that my character required improvement and discipline; and from him I learned not to be led astray to sophistic emulation, nor to writing on speculative matters, nor to delivering little hortatory orations.' },
    { head: false, text: 'He also taught me to write letters with simplicity, like the letter which Rusticus himself wrote to my father from Sinuessa.' },
    { head: false, text: 'And with respect to those who have offended me by words, or done me wrong, to be easily disposed to be pacified and reconciled, as soon as they have shown a readiness to be reconciled.' },
  ],
  [
    { head: false, text: 'From Apollonius I learned freedom of will and undeviating steadiness of purpose; and to look to nothing else, not even for a moment, except to reason; and to be always the same in sharp pains, on the occasion of the loss of a child, and in long illness.' },
    { head: false, text: 'And to see clearly in a living example that the same man can be both most resolute and yielding, and not peevish in giving his instruction; and to have had before my eyes a man who clearly considered his experience and his skill in expounding philosophical principles as the smallest of his merits.' },
    { head: false, text: 'From Sextus, a benevolent disposition, and the example of a family governed in a fatherly manner, and the idea of living conformably to nature; and gravity without affectation, and to look carefully after the interests of friends.' },
    { head: false, text: 'And to tolerate ignorant persons, and those who form opinions without consideration: he had the power of readily accommodating himself to all.' },
  ],
];

// ─── phase type ───────────────────────────────────────────────────────────────
type Phase =
  // Phase 1 — My Books
  | 'p1-idle'
  | 'p1-btn-flash'
  | 'p1-drawer-empty'
  | 'p1-tap-flash'
  | 'p1-spinner'
  | 'p1-file-ready'
  | 'p1-upload-tap'
  | 'p1-uploading'
  | 'p1-upload-done'
  | 'p1-drawer-closing'
  | 'p1-book-appear'
  | 'p1-book-reorder'
  | 'p1-hold'
  // Phase 2 — Reader
  | 'p2-pre-tap'
  | 'p2-book-tap'
  | 'p2-reader-skeleton'
  | 'p2-reader-open'
  | 'p2-reader-idle'
  | 'p2-lang-tap'
  | 'p2-dropdown-open'
  | 'p2-hover-0' | 'p2-hover-1' | 'p2-hover-2'
  | 'p2-lang-select'
  | 'p2-modal-show'
  | 'p2-modal-idle'
  | 'p2-modal-tap'
  | 'p2-translating'
  | 'p2-translated'
  | 'p2-hold'
  // Phase 3 — Enjoy
  | 'p3-reader-idle'
  | 'p3-tap-hide'
  | 'p3-immersive'
  | 'p3-swipe-1'
  | 'p3-page2-reveal'
  | 'p3-page2-read'
  | 'p3-swipe-2'
  | 'p3-page3-reveal'
  | 'p3-page3-read'
  | 'p3-swipe-3'
  | 'p3-page2b-read'
  | 'p3-swipe-4'
  | 'p3-page1b-read'
  | 'p3-tap-show'
  | 'p3-hold'
  | 'p3-back-tap'
  | 'p3-back-close'
  | 'p3-library-skeleton';

// ─── helpers ──────────────────────────────────────────────────────────────────
function Ripple({ active, color = 'rgba(255,255,255,0.5)', radius = 6, clip = true, duration = 350, x, y, size = '300%' }: {
  active: boolean; color?: string; radius?: number; clip?: boolean; duration?: number;
  x?: number | string; y?: number | string; size?: string;
}) {
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

function Spinner() {
  return (
    <div style={{
      width: 22, height: 22,
      border: `2.5px solid ${C.accentBg}`,
      borderTopColor: C.accent,
      borderRadius: '50%',
      animation: 'contmock-spin 0.75s linear infinite',
      flexShrink: 0,
    }} />
  );
}


function SkelLine({ w = '100%', h = 13, mb = 10 }: { w?: string | number; h?: number; mb?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 4, marginBottom: mb,
      background: 'linear-gradient(90deg, rgba(44,59,45,0.07) 0%, rgba(44,59,45,0.07) 30%, rgba(44,59,45,0.16) 50%, rgba(44,59,45,0.07) 70%, rgba(44,59,45,0.07) 100%)',
      backgroundSize: '200% 100%',
      animation: 'contmock-shimmer 1.4s linear infinite',
    }} />
  );
}

function GlowBorder({ active }: { active: boolean }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: active ? 1 : 0, transition: 'opacity 0.5s ease', zIndex: 42 }}>
      <svg width={320} height={640} viewBox="0 0 320 640" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs>
          <linearGradient id="contmock-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#0f00ff" />
            <stop offset="25%"  stopColor="#ae1b6e" />
            <stop offset="50%"  stopColor="#cf0000" />
            <stop offset="75%"  stopColor="#ff9f10" />
            <stop offset="100%" stopColor="#0f00ff" />
            <animateTransform attributeName="gradientTransform" type="translate" from="-1 -1" to="1 1" dur="1.8s" repeatCount="indefinite" />
          </linearGradient>
          <filter id="contmock-glow-blur"><feGaussianBlur stdDeviation="8" /></filter>
        </defs>
        <rect x={0.5} y={0.5} width={319} height={639} rx={36} ry={36} fill="none"
          stroke="url(#contmock-glow)" strokeWidth="12" filter="url(#contmock-glow-blur)" />
        <rect x={0.5} y={0.5} width={319} height={639} rx={36} ry={36} fill="none"
          stroke="url(#contmock-glow)" strokeWidth="6" filter="url(#contmock-glow-blur)" />
      </svg>
    </div>
  );
}

// ─── upload drawer ────────────────────────────────────────────────────────────
function UploadDrawer({ open, phase, uploadPct }: { open: boolean; phase: Phase; uploadPct: number }) {
  const showEmpty    = phase === 'p1-drawer-empty' || phase === 'p1-tap-flash';
  const showSpinner  = phase === 'p1-spinner';
  const showFile     = phase === 'p1-file-ready' || phase === 'p1-upload-tap' || phase === 'p1-uploading' || phase === 'p1-upload-done';
  const tapFlash     = phase === 'p1-tap-flash';
  const isDone       = phase === 'p1-upload-done';
  const showProgress = phase === 'p1-uploading' || phase === 'p1-upload-done';
  const btnActive    = phase === 'p1-file-ready';
  const btnTap       = phase === 'p1-upload-tap';

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: C.drawerBg,
      borderRadius: '16px 16px 0 0',
      transform: open ? 'translateY(0)' : 'translateY(100%)',
      transition: 'transform 0.38s cubic-bezier(0.22,1,0.36,1)',
      zIndex: 10,
      boxShadow: '0 -2px 20px rgba(0,0,0,0.10)',
      borderTop: `0.5px solid ${C.separator}`,
    }}>
      <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(44,59,45,0.15)', margin: '12px auto 0' }} />
      <div style={{ padding: '12px 16px 4px' }}>
        <div style={{ color: C.text, fontSize: 17, fontWeight: 600, marginBottom: 4 }}>Upload Book</div>
        <div style={{ color: C.textMuted, fontSize: 13 }}>Add an EPUB from your device.</div>
      </div>

      <div style={{ position: 'relative', height: DRAWER_ZONE_H, margin: '12px 16px' }}>
        {/* empty zone */}
        <div style={{ position: 'absolute', inset: 0, opacity: showEmpty ? 1 : 0, transition: 'opacity 0.3s ease', pointerEvents: showEmpty ? 'auto' : 'none' }}>
          <div style={{
            backgroundColor: tapFlash ? C.accentBg : C.drawerInput,
            borderRadius: 12, height: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
            border: `1.5px dashed ${tapFlash ? C.accent : C.separator}`,
            transition: 'background-color 0.3s ease, border-color 0.3s ease',
            position: 'relative', overflow: 'hidden',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={tapFlash ? C.accent : C.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span style={{ color: tapFlash ? C.accent : C.textMuted, fontSize: 13, transition: 'color 0.3s ease' }}>Choose an EPUB file</span>
            <Ripple active={tapFlash} color="rgba(192,90,58,0.15)" radius={12} />
          </div>
        </div>
        {/* spinner */}
        <div style={{ position: 'absolute', inset: 0, opacity: showSpinner ? 1 : 0, transition: 'opacity 0.3s ease', pointerEvents: 'none' }}>
          <div style={{ backgroundColor: C.drawerInput, borderRadius: 12, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <Spinner />
            <span style={{ color: C.textMuted, fontSize: 13 }}>Reading file…</span>
          </div>
        </div>
        {/* file ready */}
        <div style={{ position: 'absolute', inset: 0, opacity: showFile && !showProgress ? 1 : 0, transition: 'opacity 0.4s ease', pointerEvents: 'none' }}>
          <div style={{ backgroundColor: C.drawerInput, borderRadius: 12, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
            <span style={{ color: C.text, fontSize: 13, fontWeight: 500 }}>meditations-aurelius.epub</span>
            <span style={{ color: C.textMuted, fontSize: 11 }}>340 KB · EPUB</span>
          </div>
        </div>
        {/* progress */}
        <div style={{ position: 'absolute', inset: 0, opacity: showProgress ? 1 : 0, transition: 'opacity 0.4s ease', pointerEvents: 'none' }}>
          <div style={{ backgroundColor: C.drawerInput, borderRadius: 12, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '0 20px' }}>
            {isDone
              ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.successGreen} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              : <Spinner />
            }
            <span style={{ color: C.textMuted, fontSize: 12 }}>{isDone ? 'Book added to your library' : 'Processing…'}</span>
            <div style={{ width: '100%', height: 4, borderRadius: 2, backgroundColor: C.progressBg, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${uploadPct}%`, backgroundColor: isDone ? C.successGreen : C.accent, transition: 'width 0.25s linear, background-color 0.3s ease', borderRadius: 2 }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ borderTop: `0.5px solid ${C.separator}`, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, fontWeight: btnActive ? 500 : 400,
          color: btnTap ? 'rgba(192,90,58,0.35)' : btnActive ? C.accent : C.textMuted,
          opacity: btnActive || btnTap ? 1 : 0.4,
          transition: btnTap ? 'color 0.06s ease' : 'color 0.25s ease, opacity 0.25s ease',
          position: 'relative', overflow: 'hidden',
        }}>
          Upload
          <Ripple active={btnTap} color="rgba(192,90,58,0.15)" radius={0} />
        </div>
        <Ripple active={btnTap} color="rgba(192,90,58,0.08)" radius={0} />
      </div>
    </div>
  );
}

// ─── iOS alert ────────────────────────────────────────────────────────────────
function IOSAlert({ visible, tapOK }: { visible: boolean; tapOK: boolean }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: C.overlay,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.25s ease',
      pointerEvents: visible ? 'auto' : 'none',
      zIndex: 50, borderRadius: 36,
    }}>
      <div style={{
        width: 240, backgroundColor: C.modalBg, borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
        transform: visible ? 'scale(1)' : 'scale(0.92)',
        transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1)',
      }}>
        <div style={{ padding: '20px 20px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 8 }}>Translation takes a moment</div>
          <div style={{ fontSize: 12, color: C.textSecond, lineHeight: 1.5 }}>
            The first pages may take about 30 seconds. After that, the rest will keep translating as you read.
          </div>
        </div>
        <div style={{ borderTop: `0.5px solid ${C.separator}` }}>
          <div style={{
            padding: '12px 0', textAlign: 'center', fontSize: 15, fontWeight: 600,
            color: tapOK ? `rgba(192,90,58,0.45)` : C.accent,
            transition: 'color 0.1s ease', position: 'relative', overflow: 'hidden',
          }}>
            OK
            <Ripple active={tapOK} color="rgba(192,90,58,0.15)" radius={0} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── tab bar ──────────────────────────────────────────────────────────────────
function TabBar({ activeTab }: { activeTab: 'books' | 'none' }) {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 56,
      backgroundColor: C.bg, borderTop: `0.5px solid ${C.separator}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-around', zIndex: 5,
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, opacity: 0.35 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
        <span style={{ fontSize: 9, color: C.text, fontWeight: 500 }}>Store</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'books' ? C.accent : C.text} strokeWidth={activeTab === 'books' ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
        <span style={{ fontSize: 9, color: activeTab === 'books' ? C.accent : C.text, fontWeight: activeTab === 'books' ? 600 : 500 }}>My Books</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, opacity: 0.35 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l-.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        <span style={{ fontSize: 9, color: C.text, fontWeight: 500 }}>Settings</span>
      </div>
    </div>
  );
}

// ─── status bar ───────────────────────────────────────────────────────────────
function StatusBar() {
  return (
    <div style={{ position: 'relative', zIndex: 30, boxSizing: 'border-box', backgroundColor: C.statusBar, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px 0' }}>
      <span style={{ color: '#1F2B20', fontSize: 11, lineHeight: 1, fontWeight: 700 }}>9:41</span>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        <div style={{ width: 19, height: 9.5, border: '1.5px solid #1F2B20', borderRadius: 2, position: 'relative', opacity: 0.9 }}>
          <div style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', width: 3, height: 5, backgroundColor: '#1F2B20', borderRadius: '0 1px 1px 0' }} />
          <div style={{ position: 'absolute', inset: 2, right: 3, backgroundColor: '#1F2B20', borderRadius: 0.5 }} />
        </div>
      </div>
    </div>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────
export function AnimatedIPhoneMockup({
  onCycleEnd,
  jumpTo,
  onStepChange,
}: {
  onCycleEnd?: () => void;
  jumpTo?: 0 | 1 | 2 | null;
  onStepChange?: (step: 0 | 1 | 2) => void;
} = {}) {
  const [phase, setPhase]               = useState<Phase>('p1-idle');
  const [uploadPct, setUploadPct]       = useState(0);
  const [showNewBook, setShowNewBook]   = useState(false);
  const [newBookFirst, setNewBookFirst] = useState(false);
  const [scale, setScale]               = useState(1);
  // Phase 3 state
  const [pageIdx, setPageIdx]           = useState(0);
  const [swipeDir, setSwipeDir]         = useState<'left' | 'right' | null>(null);
  const [revealedCount, setRevealedCount] = useState(5);

  const outerRef    = useRef<HTMLDivElement>(null);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef      = useRef<number | null>(null);

  // scale observer
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

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const schedule = useCallback((fn: () => void, delay: number) => {
    timerRef.current = setTimeout(fn, delay);
  }, []);

  const notifyStep = useCallback((p: Phase) => {
    if (!onStepChange) return;
    if (p.startsWith('p1-')) onStepChange(0);
    else if (p.startsWith('p2-')) onStepChange(1);
    else if (p.startsWith('p3-')) onStepChange(2);
  }, [onStepChange]);

  const setPhaseNotify = useCallback((p: Phase) => {
    setPhase(p);
    notifyStep(p);
  }, [notifyStep]);

  const runPhase3 = useCallback((startMode: 'idle' | 'tap-hide' = 'idle') => {
    setPhaseNotify(startMode === 'idle' ? 'p3-reader-idle' : 'p3-tap-hide');
    setPageIdx(0);
    setRevealedCount(5);
    setSwipeDir(null);

    schedule(() => {
      if (startMode === 'idle') {
        setPhaseNotify('p3-tap-hide');
      }
      schedule(() => {
        setPhaseNotify('p3-immersive');
        schedule(() => {
          setRevealedCount(0);
          setSwipeDir('left');
          setPhaseNotify('p3-swipe-1');
          schedule(() => {
            setPageIdx(1);
            setSwipeDir(null);
            setPhaseNotify('p3-page2-reveal');
            [1,2,3,4,5].forEach(i => schedule(() => setRevealedCount(i), i * T3_REVEAL_STEP));
            schedule(() => {
              setPhaseNotify('p3-page2-read');
              schedule(() => {
                setRevealedCount(0);
                setSwipeDir('left');
                setPhaseNotify('p3-swipe-2');
                schedule(() => {
                  setPageIdx(2);
                  setSwipeDir(null);
                  setPhaseNotify('p3-page3-reveal');
                  [1,2,3,4,5].forEach(i => schedule(() => setRevealedCount(i), i * T3_REVEAL_STEP));
                  schedule(() => {
                    setPhaseNotify('p3-page3-read');
                    schedule(() => {
                      setSwipeDir('right');
                      setPhaseNotify('p3-swipe-3');
                      schedule(() => {
                        setPageIdx(1);
                        setRevealedCount(5);
                        setSwipeDir(null);
                        setPhaseNotify('p3-page2b-read');
                        schedule(() => {
                          setSwipeDir('right');
                          setPhaseNotify('p3-swipe-4');
                          schedule(() => {
                            setPageIdx(0);
                            setRevealedCount(5);
                            setSwipeDir(null);
                            setPhaseNotify('p3-page1b-read');
                            schedule(() => {
                              setPhaseNotify('p3-tap-show');
                              schedule(() => {
                                setPhaseNotify('p3-hold');
                                schedule(() => {
                                  setPhaseNotify('p3-back-tap');
                                  schedule(() => {
                                    setPhaseNotify('p3-back-close');
                                    schedule(() => {
                                      setPhaseNotify('p3-library-skeleton');
                                      schedule(() => {
                                        onCycleEnd?.();
                                        runCycle();
                                      }, T3_LIB_SKEL);
                                    }, T3_BACK_CLOSE);
                                  }, T3_BACK_TAP);
                                }, T3_HOLD);
                              }, T3_TAP_SHOW);
                            }, T3_READ_PAGE1B);
                          }, T3_SWIPE_BACK);
                        }, T3_PAUSE_BACK);
                      }, T3_SWIPE_BACK);
                    }, T3_READ_PAGE3);
                  }, 5 * T3_REVEAL_STEP + 400);
                }, T3_SWIPE);
              }, T3_READ_PAGE2);
            }, 5 * T3_REVEAL_STEP + 400);
          }, T3_SWIPE);
        }, T3_IMMERSIVE);
      }, T3_TAP_HIDE);
    }, startMode === 'idle' ? T3_IDLE : T3_TAP_HIDE);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, setPhaseNotify]);

  const runPhase2 = useCallback(() => {
    setPhaseNotify('p2-pre-tap');
    schedule(() => {
      setPhaseNotify('p2-book-tap');
      schedule(() => {
        setPhaseNotify('p2-reader-skeleton');
        schedule(() => {
          setPhaseNotify('p2-reader-open');
          schedule(() => {
            setPhaseNotify('p2-reader-idle');
            schedule(() => {
              setPhaseNotify('p2-lang-tap');
              schedule(() => {
                setPhaseNotify('p2-dropdown-open');
                schedule(() => {
                  setPhaseNotify('p2-hover-0');
                  schedule(() => {
                    setPhaseNotify('p2-hover-1');
                    schedule(() => {
                      setPhaseNotify('p2-hover-2');
                      schedule(() => {
                        setPhaseNotify('p2-lang-select');
                        schedule(() => {
                          setPhaseNotify('p2-modal-show');
                          schedule(() => {
                            setPhaseNotify('p2-modal-idle');
                            schedule(() => {
                              setPhaseNotify('p2-modal-tap');
                              schedule(() => {
                                setPhaseNotify('p2-translating');
                                schedule(() => {
                                  setPhaseNotify('p2-translated');
                                  schedule(() => {
                                    setPhaseNotify('p2-hold');
                                    schedule(() => runPhase3(), T2_HOLD);
                                  }, T2_TRANSLATED);
                                }, T2_TRANSLATING);
                              }, T2_MODAL_TAP);
                            }, T2_MODAL_IDLE);
                          }, T2_MODAL_APPEAR);
                        }, T2_LANG_SELECT);
                      }, T2_HOVER_STEP);
                    }, T2_HOVER_STEP);
                  }, T2_HOVER_STEP);
                }, T2_DROPDOWN);
              }, T2_LANG_TAP);
            }, T2_READER_IDLE);
          }, T2_READER_OPEN);
        }, T2_READER_SKEL);
      }, T2_BOOK_TAP);
    }, T2_IDLE);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, setPhaseNotify]);

  const runPhase1 = useCallback(() => {
    setPhaseNotify('p1-idle');
    setUploadPct(0);
    setShowNewBook(false);
    setNewBookFirst(false);

    schedule(() => {
      setPhaseNotify('p1-btn-flash');
      schedule(() => {
        setPhaseNotify('p1-drawer-empty');
        schedule(() => {
          setPhaseNotify('p1-tap-flash');
          schedule(() => {
            setPhaseNotify('p1-spinner');
            schedule(() => {
              setPhaseNotify('p1-file-ready');
              schedule(() => {
                setPhaseNotify('p1-upload-tap');
                schedule(() => {
                  setPhaseNotify('p1-uploading');
                  const start = performance.now();
                  const animateProgress = (now: number) => {
                    const pct = Math.min(100, ((now - start) / T1_UPLOADING) * 100);
                    setUploadPct(Math.round(pct));
                    if (pct < 100) {
                      rafRef.current = requestAnimationFrame(animateProgress);
                    } else {
                      setPhaseNotify('p1-upload-done');
                      schedule(() => {
                        setPhaseNotify('p1-drawer-closing');
                        schedule(() => {
                          schedule(() => {
                            setPhaseNotify('p1-book-appear');
                            rafRef.current = requestAnimationFrame(() => {
                              rafRef.current = requestAnimationFrame(() => {
                                setNewBookFirst(true);
                                schedule(() => setShowNewBook(true), 200);
                              });
                            });
                            schedule(() => {
                              setPhaseNotify('p1-book-reorder');
                              schedule(() => {
                                setPhaseNotify('p1-hold');
                                schedule(() => runPhase2(), T1_HOLD);
                              }, T1_BOOK_REORDER);
                            }, T1_PAUSE_BOOK);
                          }, T1_DRAWER_CLOSE);
                        }, T1_PAUSE_DONE);
                      }, T1_PAUSE_DONE);
                    }
                  };
                  rafRef.current = requestAnimationFrame(animateProgress);
                }, T1_UPLOAD_TAP);
              }, T1_PAUSE_FILE);
            }, T1_SPINNER);
          }, T1_TAP_FLASH);
        }, T1_PAUSE_EMPTY);
      }, T1_BTN_FLASH);
    }, T1_IDLE);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, setPhaseNotify]);

  const runFromStep = useCallback((step: 0 | 1 | 2) => {
    setUploadPct(0);
    setShowNewBook(false);
    setNewBookFirst(false);

    setPageIdx(0);
    setSwipeDir(null);
    setRevealedCount(5);
    if (step === 0) runPhase1();
    else if (step === 1) runPhase2();
    else runPhase3('idle');
  }, [runPhase1, runPhase2, runPhase3]);

  // external jump handler — instant, no fade
  useEffect(() => {
    if (jumpTo == null) return;
    clearTimers();
    runFromStep(jumpTo);
  }, [jumpTo, clearTimers, runFromStep]);

  const runCycle = useCallback(() => {

    setPageIdx(0);
    setSwipeDir(null);
    setRevealedCount(5);
    runPhase1();
  }, [runPhase1]);

  useEffect(() => {
    runCycle();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── derived state ────────────────────────────────────────────────────────────
  const isPhase1 = phase.startsWith('p1-');
  const isPhase2 = phase.startsWith('p2-');
  const isPhase3 = phase.startsWith('p3-');

  // Phase 1 derived
  // keep phase1 visible during p2-book-tap so no duplicate library flash
  const isPhase1Visible = isPhase1 || phase === 'p2-pre-tap' || phase === 'p2-book-tap';
  const drawerOpen   = isPhase1 && ['p1-drawer-empty','p1-tap-flash','p1-spinner','p1-file-ready','p1-upload-tap','p1-uploading','p1-upload-done'].includes(phase);
  const btnFlash     = phase === 'p1-btn-flash';
  const p1ScrollOffset = drawerOpen ? -60 : 0;
  const shouldRenderNewBook = showNewBook || newBookFirst || !isPhase1;

  // Shared reader derived (phase 2 + 3)
  const isReaderPhase = isPhase2 || isPhase3;
  const showReaderSkel = phase === 'p2-reader-skeleton';
  const dropdownOpen   = ['p2-dropdown-open','p2-hover-0','p2-hover-1','p2-hover-2','p2-lang-select'].includes(phase);
  const langTapped     = phase === 'p2-lang-tap';
  const hoveredIndex   = phase === 'p2-hover-0' ? 0 : phase === 'p2-hover-1' ? 1 : (phase === 'p2-hover-2' || phase === 'p2-lang-select') ? 2 : -1;
  const modalVisible   = ['p2-modal-show','p2-modal-idle','p2-modal-tap'].includes(phase);
  const modalTapOK     = phase === 'p2-modal-tap';
  const isTranslating  = phase === 'p2-translating';
  const isTranslated   = ['p2-translated','p2-hold'].includes(phase);
  const isReaderTranslatePhase = isPhase2 || phase === 'p3-tap-hide';
  const currentLang    = isReaderTranslatePhase ? (isTranslated ? 'EN' : 'GR') : 'EN';
  const textLines      = isTranslated ? ENGLISH_TEXT : GREEK_TEXT;
  const textBlur       = modalVisible || isTranslating;
  const glowActive     = modalVisible || isTranslating;

  // Phase 3 derived
  const chromeVisible = isPhase2 || ['p3-reader-idle','p3-tap-show','p3-hold','p3-back-tap'].includes(phase);
  const p3BackTap = phase === 'p3-back-tap';
  const p3BackClose = phase === 'p3-back-close';
  const p3LibrarySkeleton = phase === 'p3-library-skeleton';
  const isSwiping       = swipeDir !== null && isPhase3;
  const swipeLeft       = swipeDir === 'left';
  const incomingPageIdx = swipeLeft ? (pageIdx + 1) % PAGES.length : (pageIdx - 1 + PAGES.length) % PAGES.length;
  const isRevealing     = phase === 'p3-page2-reveal' || phase === 'p3-page3-reveal';
  const currentPage     = PAGES[pageIdx];
  const showImmersiveTap = phase === 'p3-tap-hide' || phase === 'p3-tap-show';

  // Grid constants
  const GAP = 14, PAD = 16, COLS = 3;
  const cellW = (320 - PAD * 2 - GAP * (COLS - 1)) / COLS;
  const coverH = cellW * (3 / 2);
  const labelH = 36;
  const cellH = coverH + labelH;
  const rowH = cellH + GAP;
  const containerH = 2 * cellH + GAP + 20;
  const slotPos = (idx: number) => ({ left: PAD + (idx % COLS) * (cellW + GAP), top: 4 + Math.floor(idx / COLS) * rowH });

  return (
    <div ref={outerRef} style={{ width: '100%', position: 'relative', height: 668 * scale }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          perspective: '1200px',
          transform: `translateX(-50%) scale(${scale})`,
          transformOrigin: 'top center',
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          style={{
          width: 348,
          height: 668,
          borderRadius: 48,
          padding: 14,
          background: '#1A1F2B',
          boxShadow: '0 30px 60px rgba(0,0,0,0.22), inset 0 0 0 2px #333, inset 0 0 0 4px #111',
          transform: 'rotateX(7deg) rotateY(15deg)',
          transformOrigin: 'top center',
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 18,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 62,
            height: 20,
            background: '#1A1F2B',
            borderRadius: 16,
            zIndex: 100,
          }}
        />
        <div style={{
          position: 'relative',
          width: 320, height: 640,
          borderRadius: 36,
          overflow: 'hidden',
          backgroundColor: C.bg,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
          userSelect: 'none',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}>

        {/* ═══════════════════════════════════════════════════════════════════
            PHASE 1 — My Books
        ═══════════════════════════════════════════════════════════════════ */}
        <div style={{
          position: 'absolute', inset: 0,
          opacity: isPhase1Visible ? 1 : 0,
          pointerEvents: 'none',
          backgroundColor: C.bg,
        }}>
          {/* inner scrollable scene */}
          <div style={{
            position: 'absolute', inset: 0, overflow: 'hidden', backgroundColor: C.bg,
            transform: `translateY(${p1ScrollOffset}px)`,
            transition: 'transform 0.7s cubic-bezier(0.22,1,0.36,1)',
          }}>
            <StatusBar />
            {/* nav header */}
            <div style={{
              height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 16px', backgroundColor: C.header, borderBottom: `0.5px solid ${C.separator}`, position: 'relative',
            }}>
              <span style={{ color: C.text, fontSize: 17, fontWeight: 600 }}>My Books</span>
              <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden' }}>
                <button style={{
                  backgroundColor: btnFlash ? C.accent : C.accentBg,
                  color: btnFlash ? '#fff' : C.accent,
                  border: 'none', borderRadius: 8, padding: '5px 12px',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  transition: btnFlash ? 'background-color 0.08s ease, color 0.08s ease' : 'background-color 0.25s ease, color 0.25s ease',
                }}>+ Add</button>
                <Ripple active={btnFlash} color="rgba(255,255,255,0.4)" radius={8} duration={600} />
              </div>
              <Ripple active={btnFlash} color="rgba(192,90,58,0.08)" radius={0} clip={false} duration={600} x={288} y={22} size="500%" />
            </div>
            {/* filter pills */}
            <div style={{ display: 'flex', gap: 8, padding: '10px 16px', backgroundColor: C.bg }}>
              {['Visible', 'Hidden', 'All'].map((f, i) => (
                <div key={f} style={{
                  padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 500,
                  backgroundColor: i === 0 ? C.accent : 'transparent',
                  color: i === 0 ? '#fff' : C.textSecond,
                  border: i === 0 ? 'none' : `1px solid ${C.separator}`,
                }}>{f}</div>
              ))}
            </div>
            {/* book grid */}
            <div style={{ position: 'relative', height: containerH }}>
              {EXISTING_BOOKS.map((book, bookIdx) => {
                const slot = newBookFirst ? bookIdx + 1 : bookIdx;
                const pos = slotPos(slot);
                return (
                  <div key={book.title} style={{
                    position: 'absolute', width: cellW,
                    left: pos.left, top: pos.top,
                    transition: newBookFirst
                      ? 'left 0.45s cubic-bezier(0.22,1,0.36,1), top 0.45s cubic-bezier(0.22,1,0.36,1)'
                      : 'none',
                  }}>
                    <div style={{
                      width: '100%', aspectRatio: '2/3', borderRadius: 6, backgroundColor: book.color,
                      position: 'relative', overflow: 'hidden', boxShadow: `0 2px 8px ${C.coverShadow}`,
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
                      <div style={{ color: C.text, fontSize: 10, fontWeight: 500, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{book.title}</div>
                      <div style={{ color: C.textMuted, fontSize: 9, marginTop: 2 }}>{book.author}</div>
                    </div>
                  </div>
                );
              })}

              {shouldRenderNewBook && (() => {
                const pos = slotPos(newBookFirst ? 0 : 5);
                return (
                  <div style={{
                    position: 'absolute',
                    width: cellW,
                    left: pos.left,
                    top: pos.top,
                    transform: showNewBook ? 'scale(1)' : 'scale(0)',
                    transformOrigin: 'center center',
                    transition: newBookFirst
                      ? 'left 0.45s cubic-bezier(0.22,1,0.36,1), top 0.45s cubic-bezier(0.22,1,0.36,1), transform 0.35s cubic-bezier(0.34,1.56,0.64,1)'
                      : 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                  }}>
                    <div style={{
                      width: '100%', aspectRatio: '2/3', borderRadius: 6, backgroundColor: NEW_BOOK.color,
                      position: 'relative', overflow: 'hidden', boxShadow: `0 2px 8px ${C.coverShadow}`,
                      transform: phase === 'p2-book-tap' ? 'scale(0.93)' : 'scale(1)',
                      transition: 'transform 0.12s ease-out',
                    }}>
                      <div style={{ position: 'absolute', bottom: 10, left: 7, right: 7 }}>
                        <div style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.7)', marginBottom: 3, width: '88%' }} />
                        <div style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.7)', marginBottom: 3, width: '65%' }} />
                        <div style={{ height: 2, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)', width: '50%' }} />
                      </div>
                      <Ripple active={phase === 'p2-book-tap'} color="rgba(255,255,255,0.5)" radius={6} />
                    </div>
                    <div style={{ marginTop: 5 }}>
                      <div style={{ color: C.text, fontSize: 10, fontWeight: 500, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{NEW_BOOK.title}</div>
                      <div style={{ color: C.textMuted, fontSize: 9, marginTop: 2 }}>{NEW_BOOK.author}</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <TabBar activeTab="books" />

          {/* drawer overlay */}
          <div style={{
            position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.32)',
            opacity: drawerOpen ? 1 : 0, transition: 'opacity 0.38s ease-out',
            pointerEvents: 'none', zIndex: 9,
          }} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            <UploadDrawer open={drawerOpen} phase={phase} uploadPct={uploadPct} />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            READER — Shared for phase 2 and 3
        ═══════════════════════════════════════════════════════════════════ */}
        <div style={{
          position: 'absolute', inset: 0,
          opacity: isReaderPhase && phase !== 'p2-pre-tap' && phase !== 'p2-book-tap' && !p3BackClose ? 1 : 0,
          pointerEvents: 'none',
          backgroundColor: C.bg,
        }}>
          <StatusBar />

          <div style={{
            position: 'absolute',
            top: 22,
            left: 0,
            right: 0,
            height: 12,
            background: 'linear-gradient(to bottom, rgba(244,240,232,0.95) 0%, rgba(244,240,232,0) 100%)',
            pointerEvents: 'none',
            zIndex: 12,
          }} />

          <div style={{
            position: 'absolute', top: 22, left: 0, right: 0,
            height: 44, backgroundColor: C.header, borderBottom: `0.5px solid ${C.separator}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px',
            transform: chromeVisible ? 'translateY(0)' : 'translateY(-44px)',
            opacity: chromeVisible ? 1 : 0,
            transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1), opacity 0.2s ease-out',
            zIndex: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 4, position: 'relative', overflow: 'hidden', borderRadius: 6, padding: '4px 8px' }}>
              <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
                <path d="M7 1L1 6.5L7 12" stroke={p3BackTap ? 'rgba(192,90,58,0.4)' : C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.08s ease' }} />
              </svg>
              <Ripple active={p3BackTap} color="rgba(192,90,58,0.2)" radius={6} duration={300} />
            </div>

            <div style={{ position: 'absolute', left: 40, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.05, gap: 2, maxWidth: 'calc(100% - 106px)' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Meditations</span>
              <span style={{ fontSize: 10, fontWeight: 500, color: C.textMuted }}>Marcus Aurelius</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 2, opacity: langTapped ? 0.5 : 1, transition: 'opacity 0.1s ease', position: 'relative', padding: '4px 6px', borderRadius: 6, overflow: 'hidden' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.accent }}>{currentLang}</span>
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease', opacity: isPhase2 ? 1 : 0.999 }}>
                <path d="M1 1L5 5L9 1" stroke={C.accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <Ripple active={langTapped} />
            </div>

            <Ripple active={langTapped} color="rgba(192,90,58,0.06)" clip={false} duration={600} x={304} y={22} size="500%" />

            {dropdownOpen && (
              <div style={{
                position: 'absolute', top: 42, right: 8, width: 160,
                backgroundColor: C.dropdownBg, borderRadius: 12,
                boxShadow: '0 4px 24px rgba(0,0,0,0.14)', border: `0.5px solid ${C.separator}`,
                overflow: 'hidden', zIndex: 30,
              }}>
                {LANGS.map((lang, i) => (
                  <div key={lang} style={{ position: 'relative' }}>
                    <div style={{
                      padding: '10px 14px', fontSize: 14, color: C.text,
                      backgroundColor: hoveredIndex === i ? C.accentBg : 'transparent',
                      transition: 'background-color 0.15s ease', position: 'relative', overflow: 'hidden',
                    }}>
                      {lang}
                      {i === 2 && <Ripple active={phase === 'p2-lang-select'} color="rgba(192,90,58,0.2)" radius={0} />}
                    </div>
                    {i < LANGS.length - 1 && <div style={{ height: 0.5, backgroundColor: C.separator, marginLeft: 14 }} />}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ position: 'absolute', top: 22 + 44, bottom: 0, left: 0, right: 0, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                width: showImmersiveTap ? '300%' : '0%',
                aspectRatio: '1',
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                backgroundColor: 'rgba(44,59,45,0.06)',
                transition: showImmersiveTap ? 'width 0.7s ease-out, opacity 0.7s ease-out' : 'none',
                opacity: showImmersiveTap ? 0 : 1,
              }} />
            </div>

            {isPhase2 ? (
              <div style={{ position: 'absolute', top: 0, bottom: 36, left: 0, right: 0, overflow: 'hidden', padding: '4px 20px 16px' }}>
                {textLines.map((line, i) => (
                  <p key={`${isTranslated ? 'en' : 'gr'}-${i}`} style={{
                    fontSize: i === 0 ? 13 : 14, fontWeight: i === 0 ? 600 : 400,
                    color: i === 0 ? C.textSecond : C.text, lineHeight: 1.65,
                    marginBottom: i === 0 ? 14 : 10,
                    filter: textBlur ? 'blur(3px)' : 'none',
                    opacity: textBlur ? 0.4 : 1,
                    transition: textBlur ? 'none' : `filter 0.5s ease-out ${i * 0.12}s, opacity 0.5s ease-out ${i * 0.12}s`,
                  }}>{line}</p>
                ))}
                {isTranslating && (
                  <div style={{ position: 'absolute', top: '40%', left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{
                      fontSize: 16, fontWeight: 600, letterSpacing: '0.04em',
                      background: `linear-gradient(90deg, rgba(192,90,58,0.2) 0%, rgba(192,90,58,0.2) 30%, ${C.accent} 50%, rgba(192,90,58,0.2) 70%, rgba(192,90,58,0.2) 100%)`,
                      backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                      animation: 'contmock-shimmer 1.8s linear infinite',
                    }}>Translating...</span>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div style={{
                  position: 'absolute', inset: 0,
                  transform: isSwiping ? (swipeLeft ? 'translateX(-100%)' : 'translateX(100%)') : 'translateX(0)',
                  transition: isSwiping ? `transform ${T3_SWIPE}ms cubic-bezier(0.22,1,0.36,1)` : 'none',
                }}>
                  <div style={{ padding: '4px 20px 16px' }}>
                    {currentPage.map((block, i) => {
                      const blurred = isRevealing && i >= revealedCount;
                      return (
                        <p key={i} style={{
                          fontSize: block.head ? 13 : 14, fontWeight: block.head ? 600 : 400,
                          color: block.head ? C.textSecond : C.text, lineHeight: 1.65,
                          marginBottom: block.head ? 14 : 10,
                          filter: blurred ? 'blur(3px)' : 'none',
                          opacity: blurred ? 0.4 : 1,
                          transition: blurred ? 'none' : 'filter 0.4s ease-out, opacity 0.4s ease-out',
                        }}>{block.text}</p>
                      );
                    })}
                  </div>
                </div>

                {isSwiping && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    transform: swipeLeft ? 'translateX(100%)' : 'translateX(-100%)',
                    animation: `${swipeLeft ? 'contmock-slide-in' : 'contmock-slide-in-right'} ${T3_SWIPE}ms cubic-bezier(0.22,1,0.36,1) forwards`,
                  }}>
                    <div style={{ padding: '4px 20px 16px' }}>
                      {PAGES[incomingPageIdx].map((block, i) => (
                        <p key={i} style={{
                          fontSize: block.head ? 13 : 14, fontWeight: block.head ? 600 : 400,
                          color: block.head ? C.textSecond : C.text, lineHeight: 1.65,
                          marginBottom: block.head ? 14 : 10,
                          filter: revealedCount === 0 ? 'blur(3px)' : 'none',
                          opacity: revealedCount === 0 ? 0.4 : 1,
                        }}>{block.text}</p>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 36,
            backgroundColor: C.bg, borderTop: `0.5px solid ${C.separator}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transform: chromeVisible ? 'translateY(0)' : 'translateY(36px)',
            transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1)', zIndex: 10,
          }}>
            <span style={{ fontSize: 10, color: C.textMuted, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Book I — To Himself</span>
            <span style={{ fontSize: 10, color: C.textMuted, flexShrink: 0 }}>{isPhase2 ? (isTranslated ? '12%' : '0%') : '12%'}</span>
          </div>

          {showReaderSkel && (
            <div style={{ position: 'absolute', inset: 0, backgroundColor: C.bg, zIndex: 20, display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 22, backgroundColor: C.statusBar, flexShrink: 0 }} />
              <div style={{ height: 44, backgroundColor: C.header, borderBottom: `0.5px solid ${C.separator}`, flexShrink: 0 }} />
              <div style={{ flex: 1, padding: '4px 20px 16px' }}>
                <SkelLine w="65%" h={11} mb={18} />
                {[100,100,100,78,100,100,60,100,100,100,85,72,65,100,100,100,78,100,100,60,100,100,100,85,72].map((w, i) => (
                  <SkelLine key={i} w={`${w}%`} h={13} mb={i % 5 === 4 ? 18 : 8} />
                ))}
              </div>
              <div style={{ height: 36, flexShrink: 0, borderTop: `0.5px solid ${C.separator}` }} />
            </div>
          )}

          {p3LibrarySkeleton && (
            <div style={{ position: 'absolute', inset: 0, backgroundColor: C.bg, zIndex: 20, display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 22, backgroundColor: C.statusBar, flexShrink: 0 }} />
              <div style={{ height: 44, backgroundColor: C.header, borderBottom: `0.5px solid ${C.separator}`, flexShrink: 0 }} />
              <div style={{ display: 'flex', gap: 8, padding: '10px 16px' }}>
                {[60, 50, 40].map((w, i) => (
                  <div key={i} style={{
                    width: w, height: 24, borderRadius: 16,
                    background: 'linear-gradient(90deg, rgba(44,59,45,0.07) 0%, rgba(44,59,45,0.07) 30%, rgba(44,59,45,0.16) 50%, rgba(44,59,45,0.07) 70%, rgba(44,59,45,0.07) 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'contmock-shimmer 1.4s linear infinite',
                  }} />
                ))}
              </div>
              {(() => {
                const GAP = 14;
                const PAD = 16;
                const COLS = 3;
                const cellW = Math.floor((320 - PAD * 2 - GAP * (COLS - 1)) / COLS);
                return (
                  <div style={{ padding: '4px 16px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: GAP }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i}>
                        <div style={{
                          width: cellW,
                          height: Math.round(cellW * 1.5),
                          borderRadius: 6,
                          background: 'linear-gradient(90deg, rgba(44,59,45,0.07) 0%, rgba(44,59,45,0.07) 30%, rgba(44,59,45,0.16) 50%, rgba(44,59,45,0.07) 70%, rgba(44,59,45,0.07) 100%)',
                          backgroundSize: '200% 100%',
                          animation: 'contmock-shimmer 1.4s linear infinite',
                        }} />
                        <div style={{ marginTop: 5 }}>
                          <SkelLine w="80%" h={9} mb={4} />
                          <SkelLine w="55%" h={8} mb={0} />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 56, backgroundColor: C.bg, borderTop: `0.5px solid ${C.separator}` }} />
            </div>
          )}

          <IOSAlert visible={modalVisible} tapOK={modalTapOK} />
          <GlowBorder active={glowActive} />
        </div>

        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: 36, zIndex: 15 }}>
          <Ripple active={p3BackTap} color="rgba(192,90,58,0.10)" clip={false} duration={600} x={16} y={33} size="500%" />
        </div>

        <style>{`
          @keyframes contmock-spin { to { transform: rotate(360deg); } }
          @keyframes contmock-shimmer {
            0%   { background-position: 100% 0; }
            100% { background-position: -100% 0; }
          }
          @keyframes contmock-slide-in {
            from { transform: translateX(100%); }
            to   { transform: translateX(0); }
          }
          @keyframes contmock-slide-in-right {
            from { transform: translateX(-100%); }
            to   { transform: translateX(0); }
          }
        `}</style>
        </div>
      </div>
      </div>
    </div>
  );
}
