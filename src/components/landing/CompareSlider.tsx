'use client';

import { useRef, useState, useEffect } from 'react';

export interface CompareSliderText {
  lang: string;
  languageLabel: string;
  title: string;
  author: string;
  heading: string;
  paragraphs: string[];
}

interface CompareSliderProps {
  original?: CompareSliderText;
  translated?: CompareSliderText;
  hideStatusBarContent?: boolean;
  statusBarHeight?: number;
  statusBarPadding?: string;
}

const DEFAULT_ORIGINAL: CompareSliderText = {
  lang: 'en',
  languageLabel: 'EN',
  title: 'The Voyage of the Beagle',
  author: 'Charles Darwin',
  heading: 'The Voyage of the Beagle',
  paragraphs: [
    'After having been twice driven back by heavy southwestern gales, Her Majesty’s ship Beagle, a ten-gun brig, under the command of Captain Fitz Roy, R.N., sailed from Devonport on the 27th of December, 1831.',
  ],
};

const DEFAULT_TRANSLATED: CompareSliderText = {
  lang: 'ru',
  languageLabel: 'RU',
  title: 'Путешествие на «Бигле»',
  author: 'Чарльз Дарвин',
  heading: 'Путешествие на «Бигле»',
  paragraphs: [
    '27 декабря 1831 года десятипушечный бриг Ее Величества «Бигль» под командованием капитана королевского флота Фицроя покинул Девонпорт.',
  ],
};

export function CompareSlider({
  original = DEFAULT_ORIGINAL,
  translated = DEFAULT_TRANSLATED,
  hideStatusBarContent = false,
  statusBarHeight = 22,
  statusBarPadding = '12px 24px 0',
}: CompareSliderProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const isDragging = useRef(false);
  const languagePairLabel = `${original.languageLabel}→${translated.languageLabel}`;

  const move = (clientX: number) => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const p = Math.max(0, Math.min(((clientX - rect.left) / rect.width) * 100, 100));
    setPosition(p);
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging.current) move(e.clientX);
    };
    const onMouseUp = () => {
      isDragging.current = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (isDragging.current) move(e.touches[0].clientX);
    };
    const onTouchEnd = () => {
      isDragging.current = false;
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  const readerHeader: React.CSSProperties = {
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    borderBottom: '0.5px solid rgba(44,59,45,0.18)',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    position: 'relative',
  };

  const statusBarBase: React.CSSProperties = {
    height: statusBarHeight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: statusBarPadding,
  };

  return (
    <div style={{ marginTop: '40px', width: '100%' }}>
      <div
        ref={wrapRef}
        onMouseDown={(e) => {
          isDragging.current = true;
          move(e.clientX);
        }}
        onTouchStart={(e) => {
          isDragging.current = true;
          move(e.touches[0].clientX);
        }}
        style={{
          position: 'relative',
          width: '100%',
          height: '240px',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid rgba(0,0,0,0.08)',
          cursor: 'col-resize',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
      >
        {/* Layer 1: Original (left) */}
        <div
          lang={original.lang}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: "'Lora', serif",
            background: '#fcfcfc',
            color: 'var(--ink)',
            hyphens: 'auto',
          }}
        >
          <div style={{ ...statusBarBase, background: '#fcfcfc' }}>
            <span style={{ color: '#2C3B2D', fontSize: 10, fontWeight: 600, visibility: hideStatusBarContent ? 'hidden' : 'visible' }}>9:41</span>
            <div style={{ width: 18, height: 9, border: '1.5px solid #2C3B2D', borderRadius: 2, position: 'relative', opacity: 0.6, visibility: hideStatusBarContent ? 'hidden' : 'visible' }}>
              <div style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', width: 3, height: 5, background: '#2C3B2D', borderRadius: '0 1px 1px 0' }} />
              <div style={{ position: 'absolute', inset: 2, right: 3, background: '#2C3B2D', borderRadius: 0.5 }} />
            </div>
          </div>
          <div style={{ ...readerHeader, color: '#999' }}>
            <svg width="8" height="13" viewBox="0 0 8 13" fill="none"><path d="M7 1L1 6.5L7 12" stroke="#C05A3A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <div style={{ position: 'absolute', left: 40, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.05, gap: 2, maxWidth: 'calc(100% - 106px)' }}>
              <span style={{ color: '#2C3B2D', fontSize: 13, fontWeight: 600 }}>{original.title}</span>
              <span style={{ color: 'rgba(44,59,45,0.62)', fontSize: 10, fontWeight: 500 }}>{original.author}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#C05A3A' }}>{languagePairLabel}</span>
            </div>
          </div>
          <div className="compare-text-pad" style={{ flex: 1, overflow: 'hidden', padding: '28px 32px' }}>
            <div style={{ maxWidth: '480px', margin: '0 auto' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 400, marginBottom: '14px', fontFamily: "'Lora', serif" }}>
                {original.heading}
              </h3>
              {original.paragraphs.map((paragraph, index) => (
                <p
                  key={paragraph}
                  style={{
                    fontSize: '14px',
                    lineHeight: 1.8,
                    marginBottom: index === original.paragraphs.length - 1 ? 0 : '10px',
                  }}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Layer 2: Translation (right, revealed by slider) */}
        <div
          lang={translated.lang}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: "'Lora', serif",
            background: '#fffbf9',
            color: 'var(--primary)',
            clipPath: `inset(0 ${100 - position}% 0 0)`,
            hyphens: 'auto',
          }}
        >
          <div style={{ ...statusBarBase, background: '#fffbf9' }}>
            <span style={{ color: '#2C3B2D', fontSize: 10, fontWeight: 600, visibility: hideStatusBarContent ? 'hidden' : 'visible' }}>9:41</span>
            <div style={{ width: 18, height: 9, border: '1.5px solid #2C3B2D', borderRadius: 2, position: 'relative', opacity: 0.6, visibility: hideStatusBarContent ? 'hidden' : 'visible' }}>
              <div style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', width: 3, height: 5, background: '#2C3B2D', borderRadius: '0 1px 1px 0' }} />
              <div style={{ position: 'absolute', inset: 2, right: 3, background: '#2C3B2D', borderRadius: 0.5 }} />
            </div>
          </div>
          <div style={{ ...readerHeader, color: 'var(--dusk)', borderBottomColor: 'rgba(178,80,50,0.1)' }}>
            <svg width="8" height="13" viewBox="0 0 8 13" fill="none"><path d="M7 1L1 6.5L7 12" stroke="#C05A3A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <div style={{ position: 'absolute', left: 40, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.05, gap: 2, maxWidth: 'calc(100% - 106px)' }}>
              <span style={{ color: '#CB694A', fontSize: 13, fontWeight: 600 }}>{translated.title}</span>
              <span style={{ color: '#d59d8c', fontSize: 10, fontWeight: 500 }}>{translated.author}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#C05A3A' }}>{languagePairLabel}</span>
            </div>
          </div>
          <div className="compare-text-pad" style={{ flex: 1, overflow: 'hidden', padding: '28px 32px' }}>
            <div style={{ maxWidth: '480px', margin: '0 auto' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 400, marginBottom: '14px', fontFamily: "'Lora', serif", color: 'var(--primary)' }}>
                {translated.heading}
              </h3>
              {translated.paragraphs.map((paragraph, index) => (
                <p
                  key={paragraph}
                  style={{
                    fontSize: '14px',
                    lineHeight: 1.8,
                    marginBottom: index === translated.paragraphs.length - 1 ? 0 : '10px',
                  }}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* <span
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            fontSize: '11px',
            fontWeight: '600',
            letterSpacing: '0.05em',
            padding: '4px 10px',
            borderRadius: '4px',
            background: '#eee',
            color: 'var(--ash)',
            zIndex: 5,
          }}
        >
          ORIGINAL ENGLISH
        </span>

        <span
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            fontSize: '11px',
            fontWeight: '600',
            letterSpacing: '0.05em',
            padding: '4px 10px',
            borderRadius: '4px',
            background: '#fdeee9',
            color: 'var(--primary)',
            zIndex: 5,
          }}
        >
          RUSSIAN TRANSLATION
        </span>  */}

        <div
          style={{
            position: 'absolute',
            top: 0,
            left: `${position}%`,
            width: '1px',
            height: '100%',
            background: 'var(--primary)',
            transform: 'translateX(-50%)',
            zIndex: 3,
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${position}%`,
            transform: 'translate(-50%, -50%)',
            width: '36px',
            height: '36px',
            background: 'white',
            border: '1px solid var(--primary)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 4,
            userSelect: 'none',
          }}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--primary)" strokeWidth="2.5">
            <path d="M8 9l-4 3 4 3M16 9l4 3-4 3" />
          </svg>
        </div>
      </div>
      <style>{`
        @media (max-width: 639px) {
          .compare-text-pad { padding-left: 16px !important; padding-right: 16px !important; }
        }
        @media (min-width: 1024px) {
          .compare-text-pad h3 { font-size: 20px !important; }
          .compare-text-pad p { font-size: 15px !important; }
        }
      `}</style>
    </div>
  );
}
