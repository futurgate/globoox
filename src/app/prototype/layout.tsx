import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import { getThemeStyle } from '@/lib/themes';
import './prototype.css';

export const metadata: Metadata = {
  title: 'Прототипы перевода книг · Globoox',
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function PrototypeLayout({ children }: { children: ReactNode }) {
  return (
    <div
      lang="ru"
      className="pt-root"
      style={getThemeStyle('forest-light') as CSSProperties}
    >
      {children}
    </div>
  );
}
