import { getLandingMessages } from '@/lib/landing-i18n';
import { authorLandingContent, businessLandingContent } from './content';

export type AuthorLocale = 'ru' | 'fr' | 'en';

const ruMessages = getLandingMessages('ru');
const russianAuthorContent = {
  ...businessLandingContent,
  hero: {
    ...businessLandingContent.hero,
    eyebrow: 'Для авторов',
    opening: 'Продавайте свои книги ',
    emphasis: 'по всему миру',
    subtitle: 'на всех языках и платформах',
    bookLabel: 'Ваша книга — в',
  },
  translation: { ...businessLandingContent.translation, ...authorLandingContent.translation },
  languages: { ...businessLandingContent.languages, headingLines: ['Языки', 'перевода'] },
  example: {
    ...businessLandingContent.example,
    ...authorLandingContent.example,
    label: 'Оригинал и перевод',
    sliderLabel: 'Сравнить оригинал и перевод',
  },
  team: {
    label: ruMessages.founders.label,
    title: ruMessages.founders.heading,
    description: ruMessages.founders.description.split(' Вместе мы строим')[0],
    items: ruMessages.founders.items,
  },
  contact: { ...businessLandingContent.contact, ...authorLandingContent.contact },
  nav: [
    { label: 'Перевод', href: '#translation' },
    { label: 'Языки', href: '#languages' },
    { label: 'Пример', href: '#quality' },
    { label: 'Публикация', href: '#publishing' },
    { label: 'Команда', href: '#team' },
  ],
  ui: {
    skip: 'Перейти к содержанию',
    menu: 'Открыть или закрыть меню',
    noScript: 'Чтобы написать нам, включите JavaScript в браузере.',
    cookies: { ...ruMessages.cookies, description: 'Cookies для работы и аналитики.', necessary: 'Только нужные' },
  },
};

// French editorial source: docs/rfcs/active/authors-publishers-landings/fr-and-logo-alignment-2026-11-13/source-fr.pdf (8 pages).
// Its wording is authoritative for French, including deliberate differences from Russian.
const frenchAuthorContent: typeof russianAuthorContent = {
  ...russianAuthorContent,
  hero: {
    title: 'Vos livres partout dans le monde en toutes langues et sur toutes les plateformes',
    eyebrow: 'Vous êtes auteur\u202f?',
    opening: 'Vos livres ',
    emphasis: 'partout dans le monde',
    subtitle: 'en toutes langues et sur toutes les plateformes',
    description: 'Nous traduisons votre livre et le mettons en vente sur Amazon, Kobo, Litres ou tout autre site de livres numériques.',
    button: 'Nous contacter',
    bookLabel: 'Votre livre — sur',
  },
  translation: {
    title: 'Notre traduction, la clé des lecteurs du monde entier',
    description: 'Notre traduction repose sur notre propre technologie basée sur l’IA, développée avec des linguistes pour la fiction comme pour la non-fiction, du roman de genre à l’essai.',
  },
  languages: {
    ...russianAuthorContent.languages,
    title: 'Langues de traduction',
    headingLines: ['Langues de', 'traduction'],
    currentLabel: 'Déjà disponibles',
    futureLabel: 'Prochainement',
  },
  example: {
    label: 'Qualité de traduction',
    title: 'Traduction irréprochable et fidèle à l’original',
    description: 'Le style, le ton et la terminologie de l’auteur sont préservés avec soin, pour une qualité comparable à celle d’une traduction professionnelle.',
    sliderLabel: 'Comparer l’original et la traduction',
  },
  trial: {
    title: 'Un chapitre offert',
    description: 'Découvrez un chapitre de votre livre dans la langue de votre choix.',
    button: 'Recevoir mon chapitre gratuit',
  },
  process: {
    title: 'Nous prenons en charge tout le parcours de votre livre jusqu’à ses lecteurs',
    steps: [
      { number: '01', title: 'Préparation', description: 'Nous mettons en forme votre livre numérique selon les exigences de chaque plateforme.' },
      { number: '02', title: 'Distribution', description: 'Nous mettons votre livre en vente dans les librairies numériques de votre choix.' },
      { number: '03', title: 'Versements', description: 'Nous collectons les recettes et vous reversons votre part des ventes.' },
    ],
  },
  team: {
    label: 'Qui sommes-nous',
    title: 'Notre force, c’est notre équipe',
    description: 'Notre équipe réunit un designer spécialiste de la typographie des livres numériques, un linguiste, un traducteur polyglotte et une ingénieure développeuse experte en intelligence artificielle.',
    items: getLandingMessages('fr').founders.items.map((member, index) => {
      const name = ['Tatiana Melnikova', 'Anton Lomovski', 'Kondrat Kondratenko', 'Maxim Ilichev'][index];
      return {
        ...member,
        name,
        role: ['CTO', 'CEO', 'Designer', 'Expert linguiste'][index],
        linkedinText: 'LinkedIn',
        linkedinAriaLabel: `${name} sur LinkedIn`,
      };
    }),
  },
  contact: {
    title: 'Votre livre à la rencontre des lecteurs du monde entier',
    button: 'Contacter Globoox',
  },
  nav: [
    { label: 'Traduction', href: '#translation' },
    { label: 'Langues', href: '#languages' },
    { label: 'Exemple', href: '#quality' },
    { label: 'Publication', href: '#publishing' },
    { label: 'Équipe', href: '#team' },
  ],
  ui: {
    skip: 'Aller au contenu',
    menu: 'Ouvrir ou fermer le menu',
    noScript: 'Activez JavaScript dans votre navigateur pour nous écrire.',
    cookies: { ...getLandingMessages('fr').cookies, description: 'Cookies : usage et statistiques.', necessary: 'Essentiels uniquement' },
  },
};

// English editorial source: english-2026-11-13/source-en.pdf in the landing record.
// Slide 7 (Trusted by) stays omitted under the author's existing audience rule.
const englishAuthorContent: typeof russianAuthorContent = {
  ...russianAuthorContent,
  hero: {
    title: 'Sell your books worldwide in every language, on every platform',
    eyebrow: 'For authors',
    opening: 'Sell your books ',
    emphasis: 'worldwide',
    subtitle: 'in every language, on every platform',
    description: 'We translate your work and publish it on Amazon, Kobo, and other major ebook stores.',
    button: 'Get in touch',
    bookLabel: 'Your book — on',
  },
  translation: {
    title: 'Translation that opens your book to readers worldwide',
    description: 'It runs on an AI-based translation system we built in-house with linguists, designed for literary and genre fiction, essays, popular science, and self-help.',
  },
  languages: {
    ...russianAuthorContent.languages,
    title: 'Languages',
    headingLines: ['Languages'],
    currentLabel: 'Available now',
    futureLabel: 'Coming soon',
  },
  example: {
    label: 'Translation quality',
    title: 'Reads as naturally as the original',
    description: 'We preserve your style, voice, and terminology, and the result is comparable to a professional translator’s work.',
    sliderLabel: 'Compare original and translation',
  },
  trial: {
    title: 'One chapter, on us',
    description: 'Send us your book, and we’ll translate one chapter for free.',
    button: 'Get my free chapter',
  },
  process: {
    title: 'We take your book all the way to readers',
    steps: [
      { number: '01', title: 'Production', description: 'We format your files to meet each platform’s requirements.' },
      { number: '02', title: 'Distribution', description: 'We list your title in the stores you choose.' },
      { number: '03', title: 'Royalties', description: 'We collect the sales revenue and pay you your share.' },
    ],
  },
  team: {
    label: 'Who we are',
    title: 'Meet the team',
    description: 'Globoox brings together a designer specializing in ebook typography, a linguist, a multilingual translator, and a software engineer with a deep understanding of AI.',
    items: getLandingMessages('en').founders.items.map((member, index) => ({
      ...member,
      name: ['Tatiana Melnikova', 'Anton Lomovski', 'Kondrat Kondratenko', 'Maxim Ilichev'][index],
      role: ['CTO', 'CEO', 'Head of design', 'Linguist'][index],
      linkedinText: 'LinkedIn',
    })),
  },
  contact: {
    title: 'Readers around the world are waiting for your book',
    button: 'Contact Globoox',
  },
  nav: [
    { label: 'Translation', href: '#translation' },
    { label: 'Languages', href: '#languages' },
    { label: 'Example', href: '#quality' },
    { label: 'Publishing', href: '#publishing' },
    { label: 'Team', href: '#team' },
  ],
  ui: {
    skip: 'Skip to content',
    menu: 'Open or close menu',
    noScript: 'Enable JavaScript in your browser to contact us.',
    cookies: { ...getLandingMessages('en').cookies, description: 'Cookies for site use and analytics.', necessary: 'Essential only' },
  },
};

const authorLandingContentByLocale = { ru: russianAuthorContent, fr: frenchAuthorContent, en: englishAuthorContent };

export function getAuthorLandingContent(locale: AuthorLocale = 'ru') {
  return authorLandingContentByLocale[locale];
}
