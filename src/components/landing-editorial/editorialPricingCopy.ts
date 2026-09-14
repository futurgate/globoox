import type { LandingLocale } from '@/lib/landing-i18n';

type PricingCopy = {
  navigation: string;
  eyebrow: string;
  title: string;
  emphasis: string;
  description: string;
  forever: string;
  monthly: string;
  custom: string;
  allowances: [string, string, string];
  actions: [string, string, string];
  note: string;
  beta: { title: string; description: string; disclosure: string; continue: string; opening: string; close: string; dismiss: string };
};

const copy: Record<LandingLocale, PricingCopy> = {
  en: {
    navigation: 'Pricing', eyebrow: 'Reading without borders', title: 'A plan for ', emphasis: 'every reader',
    description: 'From the occasional reader to the professional editor, find the plan that fits how you read.',
    forever: '/ forever', monthly: '/ month', custom: 'Custom pricing',
    allowances: ['2 books per month', '6 books per month', 'Unlimited books'],
    actions: ['Start for free', 'Get Started', 'Contact Us'],
    note: 'Book allowances use a rolling 30-day reading window, starting when you first open a translated book.',
    beta: {
      title: 'Globoox is in beta',
      description: 'We’re not collecting payments during the beta. You can start reading for free.',
      disclosure: 'During beta, we don’t collect payments.',
      continue: 'Go to my library', opening: 'Opening your library…', close: 'Close', dismiss: 'Keep exploring',
    },
  },
  fr: {
    navigation: 'Tarifs', eyebrow: 'Lire sans frontières', title: 'Une formule pour ', emphasis: 'chaque lecteur',
    description: 'Du lecteur occasionnel au professionnel de l’édition, trouvez la formule adaptée à votre lecture.',
    forever: '/ pour toujours', monthly: '/ mois', custom: 'Tarif sur mesure',
    allowances: ['2 livres par mois', '6 livres par mois', 'Livres illimités'],
    actions: ['Commencer gratuitement', 'Commencer', 'Nous contacter'],
    note: 'Les quotas de livres s’appliquent sur une période glissante de 30 jours, à compter de la première ouverture d’un livre traduit.',
    beta: {
      title: 'Globoox est en bêta',
      description: 'Aucun paiement n’est demandé pendant la bêta. Vous pouvez commencer à lire gratuitement.',
      disclosure: 'Aucun paiement n’est demandé pendant la bêta.',
      continue: 'Accéder à ma bibliothèque', opening: 'Ouverture de votre bibliothèque…', close: 'Fermer', dismiss: 'Continuer la visite',
    },
  },
  es: {
    navigation: 'Precios', eyebrow: 'Lectura sin fronteras', title: 'Un plan para ', emphasis: 'cada lector',
    description: 'Desde el lector ocasional hasta el editor profesional, encuentra el plan que se adapte a tu forma de leer.',
    forever: '/ para siempre', monthly: '/ mes', custom: 'Precio a medida',
    allowances: ['2 libros al mes', '6 libros al mes', 'Libros ilimitados'],
    actions: ['Empezar gratis', 'Empezar', 'Contactar'],
    note: 'Los límites de libros se aplican a un período móvil de 30 días, a partir de la primera vez que abres un libro traducido.',
    beta: {
      title: 'Globoox está en beta',
      description: 'No cobramos durante la beta. Puedes empezar a leer gratis.',
      disclosure: 'Durante la beta no cobramos.',
      continue: 'Ir a mi biblioteca', opening: 'Abriendo tu biblioteca…', close: 'Cerrar', dismiss: 'Seguir explorando',
    },
  },
  ru: {
    navigation: 'Тарифы', eyebrow: 'Чтение без границ', title: 'Тариф для ', emphasis: 'каждого читателя',
    description: 'Для тех, кто читает время от времени, и для профессиональных редакторов — выберите подходящий тариф.',
    forever: '/ навсегда', monthly: '/ месяц', custom: 'По запросу',
    allowances: ['2 книги в месяц', '6 книг в месяц', 'Без ограничения книг'],
    actions: ['Начать бесплатно', 'Начать', 'Связаться с нами'],
    note: 'Лимит книг действует в течение 30 дней с момента первого открытия переведённой книги.',
    beta: {
      title: 'Globoox сейчас в бете',
      description: 'Во время беты мы не взимаем плату. Можно начать читать бесплатно.',
      disclosure: 'Во время беты мы не взимаем плату.',
      continue: 'Перейти в библиотеку', opening: 'Открываем библиотеку…', close: 'Закрыть', dismiss: 'Остаться на сайте',
    },
  },
};

export const getEditorialPricingCopy = (locale: LandingLocale): PricingCopy => copy[locale];
