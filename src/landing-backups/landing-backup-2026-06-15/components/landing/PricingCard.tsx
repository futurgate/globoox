'use client';

import { useState } from 'react';

interface PricingCardProps {
  name: string;
  price: string;
  period: string;
  features: string[];
  buttonText: string;
  buttonType: 'primary' | 'outline';
  featured?: boolean;
}

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        marginRight: '12px',
        flexShrink: 0,
        color: 'var(--primary)',
      }}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function PricingCard({
  name,
  price,
  period,
  features,
  buttonText,
  buttonType,
  featured = false,
}: PricingCardProps) {
  const [hovered, setHovered] = useState(false);

  const cardStyle: React.CSSProperties = featured
    ? {
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '48px 32px',
        boxShadow: '0 12px 40px rgba(var(--primary-rgb, 192, 90, 58), 0.08)',
        border: '2px solid var(--primary)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'transform 0.3s ease',
        transform: 'translateY(-8px)',
      }
    : {
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '48px 32px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
        border: '1px solid rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'transform 0.3s ease',
      };

  const buttonStyle: React.CSSProperties =
    buttonType === 'primary'
      ? {
          display: 'block',
          textAlign: 'center',
          background: hovered ? 'var(--primary-hover)' : 'var(--primary)',
          color: 'white',
          padding: '16px',
          borderRadius: '8px',
          fontWeight: 500,
          textDecoration: 'none',
          transition: 'background 0.2s ease',
          cursor: 'pointer',
          border: 'none',
          fontSize: '16px',
          width: '100%',
        }
      : {
          display: 'block',
          textAlign: 'center',
          padding: '14px',
          borderRadius: '8px',
          border: '1px solid #DED9D2',
          color: 'var(--ink)',
          textDecoration: 'none',
          fontWeight: 500,
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          background: hovered ? '#FDFCFB' : 'transparent',
          fontSize: '16px',
          width: '100%',
          borderColor: hovered ? 'var(--ash)' : '#DED9D2',
        };

  return (
    <>
      <style>{`
        .pricing-card {
          padding: 48px 32px;
        }
        .pricing-card .pricing-card-price {
          font-size: 42px;
        }
        @media (max-width: 639px) {
          .pricing-card {
            padding: 24px 20px;
          }
          .pricing-card .pricing-card-price {
            font-size: 32px;
          }
        }
      `}</style>
    <div className="pricing-card" style={{ ...cardStyle, padding: undefined }}>
      {featured && (
        <div
          style={{
            position: 'absolute',
            top: '-14px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--primary)',
            color: 'white',
            padding: '4px 16px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Most Popular
        </div>
      )}

      <h3
        style={{
          fontFamily: "'Lora', serif",
          fontSize: '24px',
          marginBottom: '8px',
          fontWeight: 400,
          color: 'var(--ink)',
        }}
      >
        {name}
      </h3>

      <div style={{ marginBottom: '32px' }}>
        <span
          style={{
            fontSize: '20px',
            verticalAlign: 'super',
            marginRight: '2px',
            color: 'var(--ink)',
          }}
        >
          $
        </span>
        <span
          className="pricing-card-price"
          style={{
            fontSize: '42px',
            fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
            color: 'var(--ink)',
          }}
        >
          {price}
        </span>
        <span style={{ color: 'var(--ash)', fontSize: '16px' }}>{period}</span>
      </div>

      <ul
        style={{
          listStyle: 'none',
          marginBottom: '40px',
          flexGrow: 1,
          padding: 0,
        }}
      >
        {features.map((feature, idx) => (
          <li
            key={idx}
            style={{
              fontSize: '15px',
              color: 'var(--ash)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <CheckIcon />
            {feature}
          </li>
        ))}
      </ul>

      <button
        style={buttonStyle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => {}}
      >
        {buttonText}
      </button>
    </div>
    </>
  );
}
