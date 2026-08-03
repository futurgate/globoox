'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PricingCard } from '@/components/landing/PricingCard';
import PageHeader from '@/components/ui/PageHeader';
import { useAuth } from '@/lib/hooks/useAuth';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { createCheckout, getBillingPortal } from '@/lib/api';

const PRO_PRICE_USD = process.env.NEXT_PUBLIC_PRO_PRICE_USD || '20';
const FREE_BOOK_LIMIT = 3;

export default function PricingFuture() {
  const router = useRouter();
  const { isAuthenticated, isAlpha } = useAuth();
  const { isPro, loading } = useSubscription();
  const [busy, setBusy] = useState<'checkout' | 'portal' | null>(null);

  const handleUpgrade = async () => {
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
    setBusy('checkout');
    try {
      const redirectUrl =
        typeof window !== 'undefined' ? `${window.location.origin}/settings` : undefined;
      const { url } = await createCheckout(redirectUrl);
      window.location.href = url;
    } catch {
      setBusy(null);
    }
  };

  const handleManage = async () => {
    setBusy('portal');
    try {
      const { url } = await getBillingPortal();
      window.location.href = url;
    } catch {
      setBusy(null);
    }
  };

  // Alpha users already have unlimited access without paying.
  const proButtonText = isPro
    ? busy === 'portal'
      ? 'Opening…'
      : 'Manage subscription'
    : busy === 'checkout'
      ? 'Redirecting…'
      : isAlpha
        ? 'Alpha (unlimited)'
        : 'Upgrade to Pro';

  return (
    <div className="min-h-screen bg-[var(--app-shell-bg)] pb-[calc(60px+env(safe-area-inset-bottom))] text-[var(--app-text)]">
      <PageHeader title="Pricing" />

      <div className="container max-w-4xl mx-auto px-4 sm:px-6 pt-[calc(1rem+env(safe-area-inset-top)+76px)] pb-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold mb-2">Choose your plan</h1>
          <p className="text-sm text-[var(--app-text-muted)]">
            {isPro
              ? 'You’re on Pro — unlimited translations.'
              : `Free covers ${FREE_BOOK_LIMIT} books. Go Pro for unlimited.`}
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 24,
            maxWidth: 720,
            margin: '0 auto',
          }}
        >
          <PricingCard
            name="Free"
            price="0"
            period=" / forever"
            features={[
              `${FREE_BOOK_LIMIT} books`,
              'Real-time AI translation',
              'EN · FR · ES · RU',
              'Web reader access',
            ]}
            buttonText={isPro ? 'Free plan' : 'Current plan'}
            buttonType="outline"
            disabled
          />

          <PricingCard
            name="Pro"
            price={PRO_PRICE_USD}
            period=" / month"
            features={[
              'Unlimited books',
              'Real-time AI translation',
              'EN · FR · ES · RU',
              'Cancel anytime',
            ]}
            buttonText={proButtonText}
            buttonType="primary"
            featured
            disabled={loading || isAlpha || busy !== null}
            onButtonClick={isPro ? handleManage : handleUpgrade}
          />
        </div>
      </div>
    </div>
  );
}
