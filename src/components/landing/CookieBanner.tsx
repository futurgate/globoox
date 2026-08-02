'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import posthog from 'posthog-js';
import {
  type CookieConsentChoice,
  readCookieConsent,
  saveCookieConsent,
} from '@/lib/cookieConsent';

export interface CookieBannerMessages {
  title: string;
  description: string;
  accept: string;
  necessary: string;
}

const subscribeToHydration = () => () => {};

export function CookieBanner({ messages }: { messages: CookieBannerMessages }) {
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const [sessionConsent, setSessionConsent] = useState<CookieConsentChoice | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const consent = sessionConsent ?? (isHydrated ? readCookieConsent() : null);
  const isPreview = isHydrated
    && new URLSearchParams(window.location.search).get('cookie-preview') === '1';

  useEffect(() => {
    if (consent === 'accepted') {
      posthog.opt_in_capturing();
    } else {
      posthog.opt_out_capturing();
    }
  }, [consent]);

  const saveConsent = (consent: CookieConsentChoice) => {
    try {
      saveCookieConsent(consent);
    } catch {
      // Keep the choice for this session even when storage is unavailable.
    }

    if (consent === 'accepted') {
      posthog.opt_in_capturing();
    } else {
      posthog.opt_out_capturing();
    }

    setSessionConsent(consent);
    setIsDismissed(true);
  };

  if (!isHydrated || isDismissed || (consent && !isPreview)) return null;

  return (
    <aside
      className="cookie-banner"
      aria-label={messages.title}
      aria-live="polite"
    >
      <div className="cookie-banner__copy">
        <h2>{messages.title}</h2>
        <p>{messages.description}</p>
      </div>
      <div className="cookie-banner__actions">
        <button
          type="button"
          className="cookie-banner__button cookie-banner__button--secondary"
          onClick={() => saveConsent('necessary')}
        >
          {messages.necessary}
        </button>
        <button
          type="button"
          className="cookie-banner__button cookie-banner__button--primary"
          onClick={() => saveConsent('accepted')}
        >
          {messages.accept}
        </button>
      </div>
    </aside>
  );
}
