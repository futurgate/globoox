'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Check } from 'lucide-react';
import posthog from 'posthog-js';
import { readCookieConsent, saveCookieConsent, type CookieConsentChoice } from '@/lib/cookieConsent';
import { useEditorialLocale } from './EditorialLocale';
import s from './EditorialLanding.module.css';

const subscribe = () => () => {};

// Reuse the existing consent contract with an isolated presentation. The shared
// before_send gate recognizes this new route before client hydration.
export default function EditorialConsent() {
  const { messages } = useEditorialLocale();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [sessionChoice, setSessionChoice] = useState<CookieConsentChoice | null>(null);
  const choice = sessionChoice ?? (hydrated ? readCookieConsent() : null);
  useEffect(() => {
    if (choice === 'accepted') posthog.opt_in_capturing();
    else posthog.opt_out_capturing();
  }, [choice]);
  const choose = (value: CookieConsentChoice) => {
    try { saveCookieConsent(value); } catch { /* Keep the choice for this session. */ }
    setSessionChoice(value);
  };
  if (!hydrated || choice) return null;
  return <aside className={s.consent} aria-label={messages.cookies.title} aria-live="polite">
    <div><strong>{messages.cookies.title}</strong><p>{messages.cookies.description}</p></div>
    <div className={s.consentActions}>
      <button type="button" onClick={() => choose('necessary')}>{messages.cookies.necessary}</button>
      <button type="button" onClick={() => choose('accepted')}>{messages.cookies.accept} <Check size={13} /></button>
    </div>
  </aside>;
}

