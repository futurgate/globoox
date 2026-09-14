import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { EditorialLocaleProvider } from './EditorialLocale';
import EditorialConsent from './EditorialConsent';
import {
  editorialLegalDraftLabel,
  getEditorialLegalDocument,
  type EditorialLegalKind,
} from './editorialLegalCopy';
import editorial from './EditorialLanding.module.css';
import styles from './EditorialLegalPage.module.css';

export function EditorialLegalPage({ kind }: { kind: EditorialLegalKind }) {
  const document = getEditorialLegalDocument(kind);
  const other = getEditorialLegalDocument(kind === 'terms' ? 'privacy' : 'terms');

  return (
    <EditorialLocaleProvider locale="en">
      <div className={`${editorial.page} ${styles.page}`} lang="en">
        <a href="#legal-content" className={editorial.skipLink}>Skip to document</a>
        <header className={editorial.header}>
          <div className={`${editorial.headerInner} ${styles.headerInner}`}>
            <Link href="/landing-editorial" aria-label="Globoox home" className={editorial.wordmark}>
              <Image src="/icon.svg" width={28} height={28} alt="" aria-hidden="true" />
              <span>Globoox</span>
            </Link>
            <Link href="/landing-editorial" className={styles.backLink}>
              <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
              <span>Back to site</span>
            </Link>
          </div>
        </header>

        <main id="legal-content" className={styles.document}>
          <article aria-labelledby="legal-title">
            <header className={styles.introduction}>
              <p className={styles.status}>{editorialLegalDraftLabel}</p>
              <h1 id="legal-title">{document.title}</h1>
              <p className={styles.summary}>{document.introduction}</p>
            </header>
            <div className={styles.sections}>
              {document.sections.map((section) => (
                <section id={section.id} key={section.id} className={styles.section} aria-labelledby={`${section.id}-title`}>
                  <h2 id={`${section.id}-title`}>{section.heading}</h2>
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {section.items && <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>}
                  {section.contact && (
                    <p className={styles.contact}>
                      {section.contact.label}: <a href={`mailto:${section.contact.email}`}>{section.contact.email}</a>
                    </p>
                  )}
                  {section.pending && (
                    <aside className={styles.pending} aria-label="Details awaiting confirmation">
                      <p className={styles.pendingLabel}>Before publication</p>
                      <ul>{section.pending.map((item) => <li key={item}>{item}</li>)}</ul>
                    </aside>
                  )}
                </section>
              ))}
            </div>
          </article>
          <footer className={styles.footer}>
            <span>English review draft</span>
            <Link href={other.path}>
              {other.title}
              <ArrowRight size={17} strokeWidth={1.5} aria-hidden="true" />
            </Link>
          </footer>
        </main>
        <EditorialConsent />
      </div>
    </EditorialLocaleProvider>
  );
}
