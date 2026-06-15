import { CSSProperties } from 'react';

interface SectionLabelProps {
  children: React.ReactNode;
  style?: CSSProperties;
}

export function SectionLabel({ children, style = {} }: SectionLabelProps) {
  return (
    <span
      style={{
        textTransform: 'uppercase',
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--marketing-accent)',
        letterSpacing: '0.12em',
        marginBottom: '16px',
        display: 'block',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
