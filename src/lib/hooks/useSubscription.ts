'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSubscription, type SubscriptionResponse } from '@/lib/api';

/**
 * Fetches the current user's subscription snapshot from /api/subscription.
 * Returns { subscription, isPro, loading, refresh }.
 */
export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSubscription();
      setSubscription(data);
    } catch {
      // Fail closed to "free" — the backend is the real gate.
      setSubscription({ tier: null, status: null, renewsAt: null, endsAt: null, isPro: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    subscription,
    isPro: subscription?.isPro ?? false,
    loading,
    refresh,
  };
}
