import type { Metadata } from 'next';
import { Pricing } from '@/components/landing/Pricing';

export const metadata: Metadata = {
  title: 'Pricing preview — Globoox',
  robots: {
    index: false,
    follow: false,
  },
};

export default function PricingPreviewPage() {
  return (
    <main className="marketing-page" style={{ minHeight: '100vh', background: 'var(--parchment)' }}>
      <Pricing />
    </main>
  );
}
