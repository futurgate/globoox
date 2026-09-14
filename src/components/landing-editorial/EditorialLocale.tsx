'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { getLandingMessages, type LandingLocale } from '@/lib/landing-i18n';
import { getEditorialUi } from './editorialUi';

export function getEditorialLocaleData(locale: LandingLocale) {
  return { locale, messages: getLandingMessages(locale), ui: getEditorialUi(locale) };
}

const EditorialLocaleContext = createContext<ReturnType<typeof getEditorialLocaleData> | null>(null);

export function EditorialLocaleProvider({ locale, children }: { locale: LandingLocale; children?: ReactNode }) {
  const value = useMemo(() => getEditorialLocaleData(locale), [locale]);
  return <EditorialLocaleContext.Provider value={value}>{children}</EditorialLocaleContext.Provider>;
}

export function useEditorialLocale() {
  const value = useContext(EditorialLocaleContext);
  if (!value) throw new Error('Editorial components require EditorialLocaleProvider.');
  return value;
}
