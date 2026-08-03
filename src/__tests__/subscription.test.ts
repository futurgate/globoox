import { describe, it, expect } from 'vitest';
import { getSubscriptionView } from '@/lib/subscription';
import type { SubscriptionResponse } from '@/lib/api';

const DAY = 24 * 60 * 60 * 1000;
const future = () => new Date(Date.now() + 30 * DAY).toISOString();

function sub(partial: Partial<SubscriptionResponse>): SubscriptionResponse {
  return {
    tier: null,
    status: null,
    renewsAt: null,
    endsAt: null,
    isPro: false,
    limit: 2,
    periodDays: 30,
    ...partial,
  };
}

describe('getSubscriptionView', () => {
  it('free (no subscription) → Upgrade CTA, Free plan label', () => {
    const v = getSubscriptionView(null);
    expect(v.isPro).toBe(false);
    expect(v.cta).toBe('upgrade');
    expect(v.planLabel).toBe('Free · 2 books every 30 days');
  });

  it('free honors snapshot limit/period', () => {
    expect(getSubscriptionView(sub({ isPro: false, limit: 2, periodDays: 30 })).planLabel).toBe(
      'Free · 2 books every 30 days'
    );
  });

  it('free honors custom fallback options when snapshot omits them', () => {
    const bare = { tier: null, status: null, renewsAt: null, endsAt: null, isPro: false } as SubscriptionResponse;
    expect(getSubscriptionView(bare, { freeBooks: 5, periodDays: 7 }).planLabel).toBe(
      'Free · 5 books every 7 days'
    );
  });

  it('not-pro snapshot → Upgrade CTA', () => {
    const v = getSubscriptionView(sub({ status: 'past_due', tier: null, isPro: false }));
    expect(v.cta).toBe('upgrade');
    expect(v.isPro).toBe(false);
  });

  it('active Premium → Manage CTA, capped quota label', () => {
    const v = getSubscriptionView(
      sub({ tier: 'premium', status: 'active', isPro: false, limit: 6, periodDays: 30 })
    );
    expect(v.isPro).toBe(false);
    expect(v.cta).toBe('manage');
    expect(v.planLabel).toBe('Premium · 6 books every 30 days');
  });

  it('premium snapshot missing limit infers the premium cap (not unlimited)', () => {
    const bare = { tier: 'premium', status: 'active', renewsAt: null, endsAt: null, isPro: false } as SubscriptionResponse;
    const v = getSubscriptionView(bare, { premiumBooks: 6, periodDays: 30 });
    expect(v.planLabel).toBe('Premium · 6 books every 30 days');
    expect(v.cta).toBe('manage');
  });

  it('cancelled-in-grace Premium → Manage CTA with ends date', () => {
    const v = getSubscriptionView(
      sub({ tier: 'premium', status: 'cancelled', isPro: false, endsAt: future() })
    );
    expect(v.cta).toBe('manage');
    expect(v.planLabel).toMatch(/^Premium · ends /);
  });

  it('active Pro → Manage CTA with renews date', () => {
    const v = getSubscriptionView(
      sub({ tier: 'pro', status: 'active', isPro: true, limit: null, renewsAt: '2026-08-01T00:00:00Z' })
    );
    expect(v.isPro).toBe(true);
    expect(v.cta).toBe('manage');
    expect(v.planLabel).toMatch(/^Pro · renews /);
  });

  it('cancelled-in-grace Pro → Manage CTA with ends date', () => {
    const v = getSubscriptionView(
      sub({ tier: 'pro', status: 'cancelled', isPro: true, limit: null, endsAt: future() })
    );
    expect(v.cta).toBe('manage');
    expect(v.planLabel).toMatch(/^Pro · ends /);
  });

  it('Pro with no dates → still Manage, graceful label', () => {
    const v = getSubscriptionView(sub({ tier: 'pro', status: 'active', isPro: true, limit: null }));
    expect(v.cta).toBe('manage');
    expect(v.planLabel).toBe('Pro · unlimited');
  });
});
