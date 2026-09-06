"use client";

import { useId, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff } from "lucide-react";
import { getLandingMessages, type LandingMessages } from "@/lib/landing-i18n";
import styles from "./QualitySection.module.css";

const { quality } = getLandingMessages("en");
type Passage = LandingMessages["quality"]["compare"]["original"];

function Excerpt({ passage, expanded, boundary, id }: { passage: Passage; expanded: boolean; boundary: string; id: string }) {
  return (
    <div id={id} className={styles.prose}>
      {passage.paragraphs.map((paragraph, index) => {
        // Slice the canonical text without trimming, normalizing whitespace,
        // rewriting punctuation or replacing the remaining passage with a summary.
        const boundaryIndex = paragraph.indexOf(boundary);
        const cutoff = index === 0 ? (boundaryIndex < 0 ? paragraph.length : boundaryIndex + boundary.length) : 0;
        return (
          <p key={paragraph} className={styles.excerpt} hidden={index > 0 && !expanded}>
            {paragraph.slice(0, cutoff)}<span className={styles.remainder} hidden={!expanded}>{paragraph.slice(cutoff)}</span>
          </p>
        );
      })}
    </div>
  );
}

/** A shared expansion state preserves the complete original comparison copy. */
export default function QualitySection() {
  const [showOriginal, setShowOriginal] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const { original, translated } = quality.compare;

  return (
    <section id="quality" className={styles.section} aria-labelledby={`${id}-title`}>
      <div className={styles.container}>
        <div className={styles.introduction}>
          <div>
            <p className={styles.label}>{quality.label}</p>
            <h2 className={styles.title} id={`${id}-title`}>{quality.heading}</h2>
          </div>
          <p className={styles.description}>{quality.description}</p>
        </div>

        <div className={`${styles.book} ${showOriginal ? "" : styles.translationOnly}`}>
          <div className={styles.bookToolbar}>
            <button
              className={styles.originalToggle}
              type="button"
              aria-pressed={showOriginal}
              aria-controls={`${id}-original`}
              onClick={() => setShowOriginal((value) => !value)}
            >
              {showOriginal ? <Eye size={17} strokeWidth={1.4} aria-hidden="true" /> : <EyeOff size={17} strokeWidth={1.4} aria-hidden="true" />}
              Show original
            </button>
          </div>

          <div className={styles.pages}>
            <article id={`${id}-original`} className={styles.passage} lang={original.lang} hidden={!showOriginal} aria-label="Original Russian excerpt">
              <header className={styles.bookMetadata}>
                <p className={styles.bookTitle}>{original.title}</p>
                <p className={styles.author}>{original.author}</p>
                <span className={styles.language}>{original.languageLabel}</span>
              </header>
              <h3 className={styles.chapter}>{original.heading}</h3>
              <Excerpt passage={original} expanded={expanded} boundary="литературе." id={`${id}-original-excerpt`} />
            </article>

            <article className={styles.passage} lang={translated.lang} aria-label="Translated English excerpt">
              <header className={styles.bookMetadata}>
                <p className={styles.bookTitle}>{translated.title}</p>
                <p className={styles.author}>{translated.author}</p>
                <span className={styles.language}>{translated.languageLabel}</span>
              </header>
              <h3 className={styles.chapter}>{translated.heading}</h3>
              <Excerpt passage={translated} expanded={expanded} boundary="in the literature." id={`${id}-translated-excerpt`} />
            </article>
          </div>
        </div>

        <button
          className={styles.expandButton}
          type="button"
          aria-expanded={expanded}
          aria-controls={`${id}-original-excerpt ${id}-translated-excerpt`}
          onClick={() => setExpanded((value) => !value)}
        >
          <span>{expanded ? "Collapse excerpt" : "Read full excerpt"}</span>
          {expanded ? <ArrowUp size={17} strokeWidth={1.4} aria-hidden="true" /> : <ArrowDown size={17} strokeWidth={1.4} aria-hidden="true" />}
        </button>
      </div>
    </section>
  );
}
