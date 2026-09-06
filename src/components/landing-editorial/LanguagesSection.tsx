import Image from 'next/image';
import { getLandingMessages } from '@/lib/landing-i18n';
import s from './LanguagesSection.module.css';

const { supportedLanguages: messages } = getLandingMessages('en');
const paperSurfaces = ['paper-ivory', 'paper-sage', 'paper-soft', 'paper-ivory'];

function PaperSurface({ name }: { name: string }) {
  return <Image src={`/redesign/language-garden/${name}.png`} alt="" aria-hidden="true" fill sizes="220px" className={s.paper} draggable={false} />;
}

/** Generated paper and botanical artwork, with canonical, selectable HTML labels. */
export default function LanguagesSection() {
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
            <Image src="/redesign/language-garden/tree.png" alt="" aria-hidden="true" fill sizes="460px" className={s.tree} draggable={false} />
            <ul className={s.currentList} aria-label="Available languages">
              {messages.current.map((language, index) => (
                <li key={language} className={s.currentCard}>
                  <PaperSurface name={paperSurfaces[index % paperSurfaces.length]} />
                  <span>{language}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={s.upcoming}>
            <p id="upcoming-languages-title" className={s.soon}>{messages.soonLabel}</p>
            <Image src="/redesign/language-garden/seedlings.png" alt="" aria-hidden="true" width={2172} height={724} sizes="440px" className={s.seedlings} draggable={false} />
            <ul className={s.futureList} aria-labelledby="upcoming-languages-title">
              {messages.future.map(language => (
                <li key={language.label} className={`${s.futureCard} ${language.soon ? '' : s.moreCard}`}>
                  <PaperSurface name={language.soon ? 'paper-mini' : 'paper-mini-wide'} />
                  <span>{language.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
