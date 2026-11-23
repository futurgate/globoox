export const targets: Record<string, string[]> = { RU: ['EN','FR'], EN:['RU'], FR:['EN','RU'] };
export const languages: Record<string,string> = { RU:'Русский', EN:'Английский', FR:'Французский' };

export interface AccountLanguage {
  code: string;
  label: string;
  builtin: boolean;
  hidden: boolean;
  revision: number;
}

export interface LanguageCatalog {
  languages: AccountLanguage[];
  supportedDirections: { sourceLang: string; targetLang: string }[];
}

export const defaultCatalog: LanguageCatalog = {
  languages: Object.entries(languages).map(([code, label]) => ({ code: code.toLowerCase(), label, builtin: true, hidden: false, revision: 0 })),
  supportedDirections: Object.entries(targets).flatMap(([sourceLang, options]) => options.map(targetLang => ({ sourceLang, targetLang }))),
};

export function catalogChoices(catalog: LanguageCatalog, supported: readonly string[], current: string, allowManualGlossary = false) {
  return catalog.languages.flatMap(language => {
    const code = language.code.toUpperCase();
    if (language.hidden && code !== current) return [];
    const available = supported.includes(code);
    if (!allowManualGlossary && language.builtin && !available && code !== current) return [];
    return [{ language, code, available, selectable: available || allowManualGlossary }];
  });
}

export function validLanguageCode(code: string) {
  return /^[a-z]{2,3}(?:-[a-z]{4})?(?:-(?:[a-z]{2}|[0-9]{3}))?$/i.test(code.trim());
}
