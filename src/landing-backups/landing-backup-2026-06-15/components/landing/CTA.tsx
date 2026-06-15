'use client';

import { useState } from 'react';

interface CTAProps {
  heading: string;
  description: string;
  buttonText: string;
  floatingScripts: string[];
}

export function CTA({
  heading,
  description,
  buttonText,
  floatingScripts,
}: CTAProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <section
      className="cta-section"
      style={{
        padding: '240px 0 180px 0',
        textAlign: 'center',
        background: 'var(--ink)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {[
        { text: floatingScripts[0], top: '5%', left: '3%', fontSize: '52px', delay: '0s' },
        { text: floatingScripts[1], top: '18%', right: '5%', fontSize: '64px', delay: '2s' },
        { text: floatingScripts[2], bottom: '15%', left: '6%', fontSize: '44px', delay: '4s' },
        { text: floatingScripts[3], bottom: '25%', right: '14%', fontSize: '58px', delay: '1s' },
        { text: floatingScripts[4], top: '40%', left: '2%', fontSize: '48px', delay: '3s' },
        { text: floatingScripts[5], top: '8%', right: '22%', fontSize: '56px', delay: '5s' },
        { text: floatingScripts[6], bottom: '8%', right: '30%', fontSize: '42px', delay: '0.5s' },
        { text: floatingScripts[7], top: '55%', right: '2%', fontSize: '60px', delay: '3.5s' },
        { text: floatingScripts[8], bottom: '5%', left: '30%', fontSize: '46px', delay: '6s' },
        { text: floatingScripts[9], top: '3%', left: '35%', fontSize: '50px', delay: '1.5s' },
        { text: floatingScripts[10], top: '65%', left: '18%', fontSize: '54px', delay: '4.5s' },
      ].map((item) => (
        <div
          key={`${item.text}-${item.delay}`}
          className="floating-script"
          style={{
            position: 'absolute',
            fontFamily: "'Lora', serif",
            color: 'var(--parchment)',
            opacity: 0.07,
            fontSize: item.fontSize,
            pointerEvents: 'none',
            animation: 'float 8s infinite ease-in-out',
            animationDelay: item.delay,
            ...(item.top ? { top: item.top } : {}),
            ...(item.bottom ? { bottom: item.bottom } : {}),
            ...(item.left ? { left: item.left } : {}),
            ...(item.right ? { right: item.right } : {}),
          }}
        >
          {item.text}
        </div>
      ))}


      <div className="cta-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px', position: 'relative', zIndex: 1 }}>
      <h2
        className="cta-heading"
        style={{
          fontFamily: "'Lora', serif",
          fontWeight: 400,
          letterSpacing: '-0.01em',
          fontSize: '48px',
          marginBottom: '24px',
          color: '#FFFFFF',
        }}
      >
        {heading}
      </h2>
      <p
        style={{
          fontSize: '18px',
          color: 'var(--ash)',
          lineHeight: 1.7,
          marginBottom: '40px',
          maxWidth: '600px',
          margin: '0 auto 40px',
        }}
      >
        {description}
      </p>
      <button
        style={{
          display: 'inline-block',
          background: isHovered ? 'var(--dusk)' : 'var(--parchment)',
          color: 'var(--ink)',
          padding: '16px 32px',
          borderRadius: '8px',
          fontWeight: 600,
          textDecoration: 'none',
          fontSize: '16px',
          transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
          border: '1px solid rgba(244, 240, 232, 0.12)',
          cursor: 'pointer',
          transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
          boxShadow: isHovered
            ? '0 10px 28px rgba(232, 184, 154, 0.28)'
            : '0 1px 0 rgba(255,255,255,0.08) inset, 0 10px 24px rgba(0,0,0,0.12)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => { window.location.href = '/my-books'; }}
      >
        {buttonText}
      </button>
      </div>

      <style>{`
        @media (max-width: 639px) {
          .cta-section {
            padding: 160px 0 120px 0 !important;
          }
          .cta-heading {
            font-size: 36px !important;
          }
          .cta-container {
            padding: 0 20px !important;
          }

        }
        @media (min-width: 640px) and (max-width: 1023px) {
          .cta-section {
            padding: 120px 0 100px 0 !important;
          }
          .floating-script {
            font-size: 36px !important;
          }
        }
      `}</style>
    </section>
  );
}
