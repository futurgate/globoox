import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import TranslationSurface from '../prototype/_components/TranslationSurface';
import LiveWorkspace from './_components/LiveWorkspace';
import './studio.css';

export const metadata: Metadata = {
  title: 'Кабинет перевода · Globoox',
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <TranslationSurface><LiveWorkspace />{children}</TranslationSurface>;
}
