export const COOKIE_CONSENT_KEY = 'globoox_cookie_consent';
export const COOKIE_CONSENT_TTL_MS = 24 * 60 * 60 * 1000;

export type CookieConsentChoice = 'accepted' | 'necessary';

type StoredCookieConsent = {
  choice: CookieConsentChoice;
  decidedAt: number;
};

export function readCookieConsent(): CookieConsentChoice | null {
  try {
    const rawConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!rawConsent) return null;

    const storedConsent = JSON.parse(rawConsent) as Partial<StoredCookieConsent>;
    const choice = storedConsent.choice;
    const isKnownChoice = choice === 'accepted' || choice === 'necessary';
    const age = Date.now() - Number(storedConsent.decidedAt);

    if (!isKnownChoice || !Number.isFinite(age) || age < 0 || age >= COOKIE_CONSENT_TTL_MS) {
      return null;
    }

    return choice;
  } catch {
    return null;
  }
}

export function saveCookieConsent(choice: CookieConsentChoice) {
  const consent: StoredCookieConsent = {
    choice,
    decidedAt: Date.now(),
  };

  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
}

export function hasFreshAnalyticsConsent() {
  return readCookieConsent() === 'accepted';
}
