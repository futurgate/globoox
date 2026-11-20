import type { Metadata } from 'next';
import LiveWorkspace from '../_components/LiveWorkspace';

export const metadata: Metadata = {
  title: 'Кабинет перевода · Globoox',
  robots: { index: false, follow: false },
};

export default function WorkspacePage() {
  return <LiveWorkspace />;
}
