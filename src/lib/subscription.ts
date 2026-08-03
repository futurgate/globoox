import type { SubscriptionResponse } from '@/lib/api';

export interface SubscriptionView {
  /** True only for an active unlimited Pro plan (Premium is paid but capped). */
  isPro: boolean;
  /** Short plan line for the settings card, e.g. "Free · 2 books every 30 days". */
  planLabel: string;
  /** Which button the settings card shows. `upgrade` is a mock CTA until payments ship. */
  cta: 'upgrade' | 'manage';
}

interface SubscriptionViewOptions {
  /** Free-plan book cap, used when the snapshot omits `limit`. */
  freeBooks?: number;
  /** Rolling-period length, used when the snapshot omits `periodDays`. */
  periodDays?: number;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** e.g. "2 books every 30 days" or "Unlimited". */
function quota(limit: number | null, periodDays: number): string {
  if (limit == null) return 'Unlimited';
  return `${limit} book${limit === 1 ? '' : 's'} every ${periodDays} days`;
}

/**
 * Derive the settings display from the subscription snapshot. Pure (no I/O) so it
 * can be unit-tested without rendering.
 *
 * - Free → "Free · N books every P days", mock "Upgrade" CTA.
 * - Premium (paid, capped) → "Premium · N books every P days", "Manage" CTA.
 * - Pro (paid, unlimited) → "Pro · renews {date}", "Manage" CTA.
 * - Cancelled (either paid tier, still in grace) → "… · ends {date}", "Manage" CTA.
 */
export function getSubscriptionView(
  sub: SubscriptionResponse | null | undefined,
  opts: SubscriptionViewOptions = {}
): SubscriptionView {
  const periodDays = sub?.periodDays ?? opts.periodDays ?? 30;
  const freeBooks = opts.freeBooks ?? 2;
  const tier = sub?.tier ?? null;
  const limit = sub?.limit === undefined ? (tier ? null : freeBooks) : sub.limit;
  const q = quota(limit, periodDays);

  // Pro — active unlimited paid plan.
  if (sub?.isPro) {
    if (sub.status === 'cancelled') {
      const ends = formatDate(sub.endsAt);
      return { isPro: true, planLabel: ends ? `Pro · ends ${ends}` : 'Pro · cancelling', cta: 'manage' };
    }
    const renews = formatDate(sub.renewsAt);
    return { isPro: true, planLabel: renews ? `Pro · renews ${renews}` : 'Pro · unlimited', cta: 'manage' };
  }

  // Premium — paid but capped.
  if (tier === 'premium') {
    if (sub?.status === 'cancelled') {
      const ends = formatDate(sub.endsAt);
      return { isPro: false, planLabel: ends ? `Premium · ends ${ends}` : 'Premium · cancelling', cta: 'manage' };
    }
    return { isPro: false, planLabel: `Premium · ${q}`, cta: 'manage' };
  }

  // Free.
  return { isPro: false, planLabel: `Free · ${q}`, cta: 'upgrade' };
}
