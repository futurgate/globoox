import { getLandingMessages } from '@/lib/landing-i18n';
import { authorLandingContent, businessLandingContent } from './content';

export type AuthorLocale = 'ru' | 'fr';

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

export function getAuthorLandingContent(locale: AuthorLocale = 'ru') {
  return locale === 'fr' ? frenchAuthorContent : russianAuthorContent;
}
