"use client";

import Image from "next/image";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, Maximize2, Minus, Plus, X } from "lucide-react";
import { getLandingMessages } from "@/lib/landing-i18n";
import styles from "./HowItWorksSection.module.css";

const { usage } = getLandingMessages("en");
const screenshots = [
  {
    src: "/images/how-it-works/1.1.webp",
    alt: "Globoox library with the Upload Book dialog open and the option to choose an EPUB file.",
  },
  {
    src: "/images/how-it-works/2.1-en.webp",
    alt: "The Voyage of the Beagle in Globoox, with the language menu showing English, Russian, Spanish and French.",
  },
  {
    src: "/images/how-it-works/3-en-es.webp",
    alt: "The Spanish translation of The Voyage of the Beagle displayed in the Globoox reader.",
  },
] as const;

/** Original copy and untouched product screenshots in a directly selectable walkthrough. */
export default function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const screenshot = screenshots[activeStep];
  const step = usage.steps[activeStep];

  function navigateSteps(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (index + 1) % screenshots.length;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = (index + screenshots.length - 1) % screenshots.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = screenshots.length - 1;
    else return;

    event.preventDefault();
    setActiveStep(next);
    tabRefs.current[next]?.focus();
  }

  function openScreenshot() {
    setZoomed(false);
    dialogRef.current?.showModal();
    viewerRef.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }

  return (
    <section id="how-it-works" className={styles.section} aria-labelledby={`${id}-title`}>
      <div className={styles.layout}>
        <div className={styles.explanation}>
          <p className={styles.label}>{usage.label}</p>
          <h2 id={`${id}-title`} className={styles.title}>{usage.heading}</h2>

          <div className={styles.steps} role="tablist" aria-label={usage.label} aria-orientation="vertical">
            {usage.steps.map((item, index) => (
              <button
                key={item.step}
                ref={(node) => { tabRefs.current[index] = node; }}
                id={`${id}-step-${index}`}
                className={styles.stepButton}
                type="button"
                role="tab"
                aria-selected={activeStep === index}
                aria-controls={`${id}-screen`}
                tabIndex={activeStep === index ? 0 : -1}
                onClick={() => setActiveStep(index)}
                onKeyDown={(event) => navigateSteps(event, index)}
              >
                <span className={styles.stepCopy}>
                  <span className={styles.stepLabel}>{item.step}</span>
                  <span className={styles.description}>{item.description}</span>
                </span>
                <ArrowRight className={styles.stepArrow} size={23} strokeWidth={1.4} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>

        <div
          id={`${id}-screen`}
          className={styles.productStage}
          role="tabpanel"
          aria-labelledby={`${id}-step-${activeStep}`}
          tabIndex={0}
        >
          <div className={styles.screenshotFrame}>
            <Image
              key={screenshot.src}
              src={screenshot.src}
              alt={screenshot.alt}
              width={788}
              height={1705}
              sizes="(max-width: 1050px) 280px, 316px"
              className={styles.screenshot}
            />
          </div>
          <button type="button" className={styles.viewButton} onClick={openScreenshot} aria-haspopup="dialog">
            <Maximize2 size={13} strokeWidth={1.4} aria-hidden="true" />
            View screenshot
          </button>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={`${id}-dialog-title`}
        onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current?.close(); }}
        onClose={() => setZoomed(false)}
      >
        <div className={styles.dialogContent}>
          <div className={styles.dialogToolbar}>
            <h3 id={`${id}-dialog-title`} className={styles.dialogTitle}>{step.description}</h3>
            <div className={styles.viewerControls}>
              <button
                type="button"
                className={styles.zoomButton}
                aria-pressed={zoomed}
                aria-label={zoomed ? "Fit screenshot width" : "Zoom screenshot to original size"}
                onClick={() => setZoomed((value) => !value)}
              >
                {zoomed ? <Minus size={15} strokeWidth={1.4} aria-hidden="true" /> : <Plus size={15} strokeWidth={1.4} aria-hidden="true" />}
                <span>{zoomed ? "Fit width" : "Zoom in"}</span>
              </button>
              <button type="button" className={styles.closeButton} onClick={() => dialogRef.current?.close()} aria-label="Close screenshot">
                <X size={19} strokeWidth={1.4} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div ref={viewerRef} className={styles.viewer} tabIndex={0} role="region" aria-label="Screenshot, scroll to explore">
            <Image
              src={screenshot.src}
              alt={screenshot.alt}
              width={788}
              height={1705}
              sizes={zoomed ? "788px" : "440px"}
              className={`${styles.dialogImage} ${zoomed ? styles.zoomedImage : ""}`}
            />
          </div>
        </div>
      </dialog>
    </section>
  );
}
