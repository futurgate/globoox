import type { LandingLocale } from '@/lib/landing-i18n';

const markers: Record<LandingLocale, [string, string, string]> = {
  en: ['instantly', 'into your', 'your native language.'],
  fr: ['traduit instantanément', 'dans votre', 'votre langue.'],
  es: ['traduce', 'a tu idioma', 'tu idioma nativo'],
  ru: ['с\u00a0мгновенным', 'на\u00a0ваш', 'ваш язык.'],
};

/** Layout slices only: joining these parts must reproduce canonical copy exactly. */
export function getEditorialHeroParts(title: string, locale: LandingLocale) {
  const [lead, last, emphasis] = markers[locale].map(marker => title.indexOf(marker));
  if (lead < 0 || last < lead || emphasis < last) {
    return { intro: '', lead: title, connector: '', emphasis: '' };
  }
  return { intro: title.slice(0, lead), lead: title.slice(lead, last), connector: title.slice(last, emphasis), emphasis: title.slice(emphasis) };
}
