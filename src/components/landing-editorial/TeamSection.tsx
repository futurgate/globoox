import Image from 'next/image';
import type { LandingMessages } from '@/lib/landing-i18n';
import s from './TeamSection.module.css';

type TeamSectionProps = {
  messages: LandingMessages['founders'];
};

export default function TeamSection({ messages }: TeamSectionProps) {
  return (
    <section id="team" className={s.section} aria-labelledby="team-title">
      <div className={s.container}>
        <div className={s.intro}>
          <div>
            <p className={s.label}>{messages.label}</p>
            <h2 id="team-title" className={s.heading}>{messages.heading}</h2>
          </div>
          <p className={s.description}>{messages.description}</p>
        </div>

        <div className={s.grid}>
          {messages.items.map((person) => (
            <article className={s.card} key={person.name}>
              <div className={s.portrait}>
                {person.photoSrc ? (
                  <Image
                    src={person.photoSrc}
                    alt={person.name}
                    fill
                    sizes="78px"
                  />
                ) : (
                  <span>{person.initials}</span>
                )}
              </div>
              <div className={s.identity}>
                <h3 className={s.name}>{person.name}</h3>
                <p className={s.role}>{person.role}</p>
                {person.linkedinUrl && (
                  <a
                    className={s.profileLink}
                    href={person.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${person.name} on LinkedIn`}
                  >
                    <Image
                      src="/images/icon-linkedin.svg"
                      width={20}
                      height={20}
                      alt=""
                      aria-hidden="true"
                    />
                    <span>{person.linkedinText}</span>
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
