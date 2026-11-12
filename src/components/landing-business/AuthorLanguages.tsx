import { getAuthorLandingContent, type AuthorLocale } from './author-locales';
import styles from './AuthorLanguages.module.css';

const languageCodes = ['en', 'fr', 'es', 'ru'];
const futureLanguageCodes = ['de', 'it', 'pt', 'tr', 'zh', 'ja', 'ko', 'ar', 'fa'];

export function AuthorLanguages({ locale = 'ru' }: { locale?: AuthorLocale }) {
  const copy = getAuthorLandingContent(locale);
  return (
    <section id="languages" className={styles.section} aria-labelledby="languages-title">
      <div className={styles.layout}>
        <h2 id="languages-title" className={styles.title}>{copy.languages.headingLines[0]}<br />{copy.languages.headingLines[1]}</h2>
        <div className={styles.groups}>
          <div>
            <h3 className={styles.label}>{copy.languages.currentLabel}</h3>
            <ul className={styles.available}>
              {copy.languages.current.map((language, index) => (
                <li key={language} lang={languageCodes[index]}>{language}</li>
              ))}
            </ul>
          </div>
          <div className={styles.upcoming}>
            <h3 className={styles.label}>{copy.languages.futureLabel}</h3>
            <ul className={styles.future}>
              {copy.languages.future.map((language, index) => (
                <li key={language} lang={futureLanguageCodes[index]}><bdi>{language}</bdi></li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
