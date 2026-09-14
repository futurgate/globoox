'use client';

import Image from 'next/image';
import { useEditorialLocale } from './EditorialLocale';
import s from './LanguagesSection.module.css';

const paperSurfaces = ['paper-ivory', 'paper-sage', 'paper-soft', 'paper-ivory'];

function PaperSurface({ name }: { name: string }) {
  return <Image src={`/redesign/language-garden/${name}.png`} alt="" aria-hidden="true" fill sizes="220px" className={s.paper} draggable={false} />;
}

/** Generated paper and botanical artwork, with canonical, selectable HTML labels. */
export default function LanguagesSection() {
  const { messages: { supportedLanguages: messages }, ui } = useEditorialLocale();
  const futureRows = [messages.future.slice(0, 3), messages.future.slice(3)];
  return (
    <section id="languages" className={s.section} aria-labelledby="languages-title">
      <div className={s.layout}>
        <div className={s.copy}>
          <p className={s.label}>{messages.label}</p>
          <h2 id="languages-title" className={s.heading}>{messages.heading}</h2>
          <p className={s.description}>{messages.description}</p>
        </div>
        <div className={s.garden}>
          <div className={s.canopy}>
            <Image src="/redesign/language-garden/tree.png" alt="" aria-hidden="true" fill sizes="420px" className={s.tree} draggable={false} />
            <ul className={s.currentList} aria-label={ui.languages.available}>
              {messages.current.map((language, index) => (
                <li key={language} className={s.currentCard}>
                  <PaperSurface name={paperSurfaces[index % paperSurfaces.length]} />
                  <span>{language}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={s.upcoming}>
            <div className={s.upcomingCopy}>
              <p id="upcoming-languages-title" className={s.soon}>{messages.soonLabel}</p>
              <div role="group" aria-labelledby="upcoming-languages-title">
                {futureRows.map((row, rowIndex) => (
                  <ul key={rowIndex} className={s.futureList}>
                    {row.map((language, index) => (
                      <li key={language.label}>
                        {index > 0 && <span className={s.separator} aria-hidden="true">·</span>}
                        <span>{language.label}</span>
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
            </div>
            <div className={s.seedlingsFrame}>
              <Image src="/redesign/language-garden/seedlings-growth.png" alt="" aria-hidden="true" fill sizes="116px" className={s.seedlings} draggable={false} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
