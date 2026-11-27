import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Прототипы перевода книг · Globoox',
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export { default } from './_components/TranslationSurface';
