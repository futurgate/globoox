'use client';

import { useState } from 'react';
import { SectionLabel } from './SectionLabel';

interface HeroProps {
  variant?: 'centered' | 'split';
  withBooks?: boolean;
  title: string;
  subtitle: string;
  titleClassName?: string;
}

function BookSpine({
  title,
  author,
  height,
  bg,
  textColor,
  className,
  active = false,
  baseZ = 1,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  title: string;
  author?: string;
  height: number;
  bg: string;
  textColor?: string;
  className?: string;
  active?: boolean;
  baseZ?: number;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  return (
    <div
      className="spine-wrap"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'relative',
        flexShrink: 0,
        zIndex: active ? 100 : baseZ,
        cursor: 'pointer',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div className="spine-shadow" />
      <div
        className={`spine-hover ${className || ''}`}
        style={{
          width: '58px',
          height: `${height}px`,
          background: bg,
          borderRadius: '4px',
          borderLeft: '3px solid rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '20px 0',
          transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
          position: 'relative',
          zIndex: 1,
          transform: active ? 'translateY(-12px) scale(1.04)' : undefined,
          boxShadow: active ? '12px 22px 34px rgba(0,0,0,0.22), 4px 8px 12px rgba(0,0,0,0.12)' : '6px 12px 20px rgba(0,0,0,0.18), 2px 4px 6px rgba(0,0,0,0.10)',
        }}
      >
        {/* Блик — выпуклость корешка */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(90deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 30%, rgba(0,0,0,0.0) 60%, rgba(0,0,0,0.12) 100%)',
            zIndex: 1,
          }}
        />
        <div
          className="spine-text-flow"
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            lineHeight: 1.1,
            margin: '0 auto',
            transform: 'rotate(180deg)',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <span
            className="spine-title"
            style={{
              fontFamily: "'Lora', serif",
              fontSize: '17.5px',
              color: textColor || 'var(--ink-80)',
              fontWeight: textColor ? 450 : 500,
              opacity: textColor ? 1 : 1,
            }}
          >
            {title}
          </span>
          {author ? (
            <>
              <br />
              <span
                className="spine-author"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                  fontSize: '12px',
                  color: textColor ? 'rgba(232,169,150,0.68)' : 'rgba(44,59,45,0.62)',
                  fontWeight: 400,
                }}
              >
                {author}
              </span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FloatingScript({ children, style }: { children: React.ReactNode; style: React.CSSProperties }) {
  return (
    <div
      style={{
        position: 'absolute',
        fontFamily: "'Lora', serif",
        color: 'var(--primary)',
        opacity: 0.15,
        fontSize: '31px',
        pointerEvents: 'none',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Hero({ variant = 'centered', withBooks = false, title, subtitle, titleClassName }: HeroProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [activeSpine, setActiveSpine] = useState<number | null>(null);
  const [hoveredSpine, setHoveredSpine] = useState<number | null>(null);

  const responsiveStyles = `
    .spine-wrap {
      z-index: 1;
      transition: z-index 0s linear;
    }
    .spine-wrap:hover {
      z-index: 20;
      transition-delay: 0s;
    }
    .spine-wrap:hover .spine-hover {
      transform: translateY(-12px) scale(1.04);
      box-shadow: 12px 22px 34px rgba(0,0,0,0.22), 4px 8px 12px rgba(0,0,0,0.12);
    }
    /* Split variant */
    @media (max-width: 639px) {
      .hero-split {
        overflow-x: visible !important;
        padding: 40px 20px !important;
      }
      .hero-split-inner {
        grid-template-columns: 1fr !important;
        gap: 18px !important;
        min-height: auto !important;
      }
      .hero-split-inner > * {
        min-width: 0 !important;
      }
      .hero-split-text {
        text-align: center !important;
        align-items: center !important;
        order: 2 !important;
      }
      .hero-books-section {
        order: 1 !important;
        width: 100% !important;
        min-width: 0 !important;
      }
      .hero-split-h1 {
        font-size: 36px !important;
      }
      .hero-split-p {
        font-size: 17px !important;
        margin-bottom: 8px !important;        
      }
      .hero-split-btn {
        padding: 14px 28px !important;
        font-size: 15px !important;
      }
      .hero-books-section {
        max-height: 300px !important;
        overflow: visible !important;
      }
      .hero-books-blob {
        height: 300px !important;
        width: min(100%, 360px) !important;
        margin: 0 auto !important;
      }
      .hero-books-row {
        gap: 0px !important;
        transform: rotate(90deg) !important;
        transform-origin: center center !important;
      }
      .hero-books-row .spine-wrap:nth-child(1) {
        transform: translateY(-8px) !important;
      }
      .hero-books-row .spine-wrap:nth-child(2) {
        transform: translateY(4px) !important;
      }
      .hero-books-row .spine-wrap:nth-child(3) {
        transform: translateY(-2px) !important;
      }
      .hero-books-row .spine-wrap:nth-child(4) {
        transform: translateY(10px) !important;
      }
      .hero-books-row .spine-wrap:nth-child(5) {
        transform: translateY(-5px) !important;
      }
      .spine-text-flow {
        line-height: 0.9 !important;
      }
      .spine-hover {
        width: 44px !important;
      }
      .spine-hover .spine-title {
        font-size: 16px !important;
      }
      .spine-h-416 { height: 233px !important; }
      .spine-h-364 { height: 204px !important; }
      .spine-h-442 { height: 247px !important; }
      .spine-evolution { height: 255px !important; }
      .spine-desiguales { height: 240px !important; }
      /* Centered variant */
      .hero-centered {
        padding: 40px 20px !important;
        min-height: auto !important;
      }
      .hero-centered-h1 {
        font-size: 36px !important;
      }
      .hero-centered-p {
        font-size: 17px !important;
      }
      .hero-centered-btn {
        padding: 14px 28px !important;
        font-size: 15px !important;
      }
    }
    @media (min-width: 640px) and (max-width: 1023px) {
      .hero-split {
        overflow-x: visible !important;
        padding: 50px 32px !important;
      }
      .hero-split-inner {
        grid-template-columns: 1fr !important;
        gap: 40px !important;
      }
      .hero-split-text {
        text-align: center !important;
        align-items: center !important;
        order: 2 !important;
      }
      .hero-books-section {
        order: 1 !important;
        width: 100% !important;
        min-width: 0 !important;
      }
      .hero-split-h1 {
        font-size: 48px !important;
      }
      .hero-split-btn {
        padding: 16px 34px !important;
      }
      .hero-books-section {
        max-height: 400px !important;
      }
      .hero-books-blob {
        height: 400px !important;
        width: 100% !important;
      }
      .hero-books-row {
        gap: 0 !important;
        transform: rotate(90deg) !important;
        transform-origin: center center !important;
      }
      .hero-books-row .spine-wrap:nth-child(1) {
        transform: translateY(-10px) !important;
      }
      .hero-books-row .spine-wrap:nth-child(2) {
        transform: translateY(6px) !important;
      }
      .hero-books-row .spine-wrap:nth-child(3) {
        transform: translateY(-3px) !important;
      }
      .hero-books-row .spine-wrap:nth-child(4) {
        transform: translateY(4px) !important;
      }
      .hero-books-row .spine-wrap:nth-child(5) {
        transform: translateY(-7px) !important;
      }
      .spine-text-flow {
        line-height: 1.15 !important;
      }
      .spine-h-416 { height: 333px !important; }
      .spine-h-364 { height: 291px !important; }
      .spine-h-442 { height: 354px !important; }
      .spine-evolution { height: 364px !important; }
      .spine-desiguales { height: 372px !important; }
      .spine-hover .spine-title { font-size: 16px !important; }
      /* Centered variant */
      .hero-centered {
        padding: 60px 32px !important;
      }
      .hero-centered-h1 {
        font-size: 48px !important;
      }
      .hero-centered-btn {
        padding: 16px 34px !important;
      }
    }
    @media (min-width: 1024px) {
      .hero-split {
        padding-top: 0px !important;
        padding-bottom: 0px !important;
      }
      .hero-books-row {
        gap: 0 !important;
        transform: rotate(90deg) !important;
        transform-origin: center center !important;
      }
      .hero-books-row .spine-wrap:nth-child(1) {
        transform: translateY(-12px) !important;
      }
      .hero-books-row .spine-wrap:nth-child(2) {
        transform: translateY(8px) !important;
      }
      .hero-books-row .spine-wrap:nth-child(3) {
        transform: translateY(-4px) !important;
      }
      .hero-books-row .spine-wrap:nth-child(4) {
        transform: translateY(6px) !important;
      }
      .hero-books-row .spine-wrap:nth-child(5) {
        transform: translateY(-8px) !important;
      }
      .spine-desiguales {
        height: 420px !important;
      }
    }
    @media (min-width: 1280px) {
      .spine-hover .spine-title {
        font-size: 18px !important;
      }
      .spine-hover .spine-author {
        font-size: 13px !important;
      }
    }
  `;

  if (variant === 'split' && withBooks) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: responsiveStyles }} />
        <section
          className="hero-split"
          style={{
            padding: '60px 40px',
            width: '100%',
            background: 'var(--parchment)',
          }}
        >
          <div className="hero-split-inner" style={{ maxWidth: '1120px', margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '90vh', alignItems: 'center', gap: '60px' }}>
            <div
              className="hero-split-text"
              style={{
                textAlign: 'left' as const,
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start' as const,
              }}
            >
            <SectionLabel>Introducing Globoox</SectionLabel>
            <h1
              className={`hero-split-h1 ${titleClassName || ''}`}
              style={{
                fontSize: titleClassName ? undefined : '64px',
                lineHeight: 1.1,
                marginBottom: '28px',
                fontWeight: 500,
                fontFamily: "'Lora', serif",
                color: 'var(--ink)',
              }}
            >
              {title}
            </h1>
            <p
              className="hero-split-p"
              style={{
                fontSize: '20px',
                color: 'var(--ash)',
                marginBottom: '44px',
                maxWidth: '520px',
              }}
            >
              {subtitle}
            </p>
            <button
              className="btn-primary-hover hero-split-btn"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={() => { window.location.href = '/my-books'; }}
              style={{
                display: 'inline-block',
                background: isHovered ? 'var(--primary-hover)' : 'var(--primary)',
                color: 'white',
                padding: '18px 40px',
                borderRadius: '8px',
                fontWeight: 500,
                fontSize: '16px',
                transition: 'all 0.2s ease',
                border: 'none',
                cursor: 'pointer',
                boxShadow: `0 4px 14px ${isHovered ? 'rgba(163, 77, 50, 0.25)' : 'rgba(var(--primary-rgb, 192, 90, 58), 0.25)'}`,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Start Reading For Free
            </button>
            </div>

            <div
              className="hero-books-section"
              style={{
                position: 'relative',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'visible',
              }}
            >
              <div
                className="hero-books-blob"
                style={{
                  position: 'relative',
                  width: '130%',
                  height: '650px',
                  background: 'rgba(var(--primary-rgb, 192, 90, 58), 0.03)',
                  borderRadius: '260px 52px 260px 52px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  perspective: '1000px',
                }}
              >
              <FloatingScript style={{ top: '15%', left: '10%', animation: 'float 8s infinite ease-in-out' }}>
                科学
              </FloatingScript>
              <FloatingScript
                style={{ bottom: '20%', right: '15%', animation: 'float 8s infinite ease-in-out', animationDelay: '2s', fontSize: '42px' }}
              >
                Biographie
              </FloatingScript>
              <FloatingScript style={{ top: '25%', right: '20%', animation: 'float 8s infinite ease-in-out', animationDelay: '4s' }}>
                علم النفس
              </FloatingScript>
              <FloatingScript style={{ bottom: '10%', left: '25%', animation: 'float 8s infinite ease-in-out', animationDelay: '1s' }}>
                Memoir
              </FloatingScript>
              <div className="hero-books-row" style={{ display: 'flex', gap: '16px', transform: 'rotate(5deg)', alignItems: 'flex-end' }}>
                <BookSpine
                  title="Nexus"
                  author="Yuval Noah Harari"
                  height={360}
                  bg="var(--parchment-light)"
                  className="spine-h-416 spine-long-title"
                  baseZ={1}
                  active={activeSpine === 0 || hoveredSpine === 0}
                  onClick={() => setActiveSpine((prev) => (prev === 0 ? null : 0))}
                  onMouseEnter={() => setHoveredSpine(0)}
                  onMouseLeave={() => setHoveredSpine(null)}
                />
                <BookSpine
                  title="Эволюция Человека"
                  author="Александр Марков"
                  height={396}
                  bg="var(--parchment-light)"
                  className="spine-evolution spine-long-title spine-longest-title"
                  baseZ={2}
                  active={activeSpine === 1 || hoveredSpine === 1}
                  onClick={() => setActiveSpine((prev) => (prev === 1 ? null : 1))}
                  onMouseEnter={() => setHoveredSpine(1)}
                  onMouseLeave={() => setHoveredSpine(null)}
                />
                <BookSpine
                  title="Globoox Engine"
                  height={384}
                  bg="var(--ink)"
                  textColor="#E8A996"
                  className="spine-h-442"
                  baseZ={3}
                  active={activeSpine === 2 || hoveredSpine === 2}
                  onClick={() => setActiveSpine((prev) => (prev === 2 ? null : 2))}
                  onMouseEnter={() => setHoveredSpine(2)}
                  onMouseLeave={() => setHoveredSpine(null)}
                />
                <BookSpine
                  title="Desiguales"
                  author="Diego Castañeda Garza"
                  height={308}
                  bg="var(--parchment-light)"
                  className="spine-h-364 spine-desiguales spine-long-title spine-longest-title"
                  baseZ={4}
                  active={activeSpine === 3 || hoveredSpine === 3}
                  onClick={() => setActiveSpine((prev) => (prev === 3 ? null : 3))}
                  onMouseEnter={() => setHoveredSpine(3)}
                  onMouseLeave={() => setHoveredSpine(null)}
                />
                <BookSpine
                  title="Manet, le secret"
                  author="Sophie Chauveau"
                  height={360}
                  bg="var(--parchment-light)"
                  className="spine-h-416 spine-long-title"
                  baseZ={5}
                  active={activeSpine === 4 || hoveredSpine === 4}
                  onClick={() => setActiveSpine((prev) => (prev === 4 ? null : 4))}
                  onMouseEnter={() => setHoveredSpine(4)}
                  onMouseLeave={() => setHoveredSpine(null)}
                />
              </div>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  // Centered variant (default)
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: responsiveStyles }} />
      <section
        className="hero-centered"
        style={{
          padding: '80px 40px',
          width: '100%',
          background: 'var(--parchment)',
        }}
      >
        <div style={{ maxWidth: '1120px', margin: '0 auto', width: '100%', minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <SectionLabel>Introducing Globoox</SectionLabel>
          <h1
            className={`hero-centered-h1 ${titleClassName || ''}`}
            style={{
              fontFamily: "'Lora', serif",
              fontWeight: 400,
              letterSpacing: '-0.01em',
              fontSize: titleClassName ? undefined : '56px',
              lineHeight: 1.1,
              marginBottom: '24px',
              maxWidth: '900px',
              }}
          >
            {title}
          </h1>
          <p
            className="hero-centered-p"
            style={{
              fontSize: '20px',
              color: 'var(--ash)',
              marginBottom: '40px',
              maxWidth: '600px',
            }}
          >
            {subtitle}
          </p>
          <button
            className="hero-centered-btn"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => { window.location.href = '/my-books'; }}
            style={{
              display: 'inline-block',
              background: isHovered ? 'var(--primary-hover)' : 'var(--primary)',
              color: 'white',
              padding: '16px 32px',
              borderRadius: '8px',
              fontWeight: 500,
              textDecoration: 'none',
              fontSize: '16px',
              transition: 'background 0.2s ease',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Start Reading For Free
          </button>
        </div>
      </section>
    </>
  );
}
