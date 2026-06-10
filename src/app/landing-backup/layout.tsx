import { ReactNode } from 'react';
import './landing.css';

export const metadata = {
  title: 'Globoox - The world\'s library, in your native language',
  description: 'Reading app that instantly translates ebooks into your native language with Al. Upload EPUBs and read in English, French, Spanish or Russian',
};

export default function LandingLayout({ children }: { children: ReactNode }) {
  return children;
}
