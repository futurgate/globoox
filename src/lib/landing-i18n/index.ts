export const landingLocales = ['en', 'es', 'fr', 'ru'] as const;

export type LandingLocale = (typeof landingLocales)[number];

export type LandingMessages = {
  metadata: {
    title: string;
    description: string;
    featureList: string[];
    freeOffer: string;
  };
  header: {
    openApp: string;
    nav: Array<{ label: string; href: string }>;
    languageLabel: string;
    languages: Array<{ value: LandingLocale; label: string }>;
  };
  sections: {
    hero: string;
    howItWorks: string;
    quality: string;
    languages: string;
    team: string;
    start: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    button: string;
  };
  usage: {
    label: string;
    heading: string;
    steps: Array<{ step: string; description: string }>;
  };
  quality: {
    label: string;
    heading: string;
    description: string;
  };
  supportedLanguages: {
    label: string;
    heading: string;
    description: string;
    current: string[];
    future: Array<{ label: string; soon: boolean }>;
    soonLabel: string;
    globeAlt: string;
  };
  founders: {
    label: string;
    heading: string;
    description: string;
    linkedinLabel: string;
    items: Array<{
      name: string;
      role: string;
      linkedinText: string;
      theme: 'light' | 'dark';
      initials: string;
      photoSrc?: string;
      linkedinUrl?: string;
    }>;
  };
  cta: {
    heading: string;
    description: string;
    button: string;
    floatingScripts: string[];
  };
  footer: {
    tagline: string;
    terms: string;
    privacy: string;
    legal: string;
    copyright: string;
  };
};

const sharedFounders = [
  {
    name: 'Tatiana Melnikova',
    theme: 'light' as const,
    initials: 'TM',
    photoSrc: '/images/founders/tatiana.webp',
    linkedinUrl: 'https://www.linkedin.com/in/tanya-melnikova-224b3a191/',
  },
  {
    name: 'Anton Lomovski',
    theme: 'dark' as const,
    initials: 'AL',
    photoSrc: '/images/founders/anton.webp',
    linkedinUrl: 'https://www.linkedin.com/in/lomovski/',
  },
  {
    name: 'Kondrat Kondratenko',
    theme: 'light' as const,
    initials: 'KK',
    photoSrc: '/images/founders/kondrat.webp',
    linkedinUrl: 'http://linkedin.com/in/kondrat-kondratenko/',
  },
  {
    name: 'Maxim Ilyichev',
    theme: 'dark' as const,
    initials: 'MI',
    photoSrc: '/images/founders/maxim.webp',
  },
];

const messages: Record<LandingLocale, LandingMessages> = {
  en: {
    metadata: {
      title: 'Globoox',
      description: 'Reading app that instantly translates ebooks into your native language. Upload EPUBs and read in English, French, Spanish, or Russian.',
      featureList: [
        'EPUB ebook upload',
        'AI-powered book translation',
        'English, French, Spanish, German, Russian support',
        'Side-by-side original and translated text',
        'Reading progress sync',
        'Private personal library',
      ],
      freeOffer: 'Free to upload and translate your first book',
    },
    header: {
      openApp: 'Open App',
      nav: [
        { label: 'How it works', href: '#how-it-works' },
        { label: 'Quality', href: '#quality' },
        { label: 'Languages', href: '#languages' },
        { label: 'Team', href: '#team' },
        { label: 'Start reading', href: '#start' },
      ],
      languageLabel: 'Language',
      languages: [
        { value: 'en', label: 'English' },
        { value: 'fr', label: 'Français' },
        { value: 'ru', label: 'Русский' },
      ],
    },
    sections: {
      hero: 'Hero',
      howItWorks: 'How it works',
      quality: 'Translation quality',
      languages: 'Supported languages',
      team: 'Meet the team',
      start: 'Get started',
    },
    hero: {
      eyebrow: '',
      title: 'Globoox — reading app that instantly translates e\u2011books into your native language.',
      button: 'Upload your first book',
    },
    usage: {
      label: 'How it Works',
      heading: 'Three simple steps',
      steps: [
        { step: 'Step 1', description: 'Upload your ebook.' },
        { step: 'Step 2', description: 'Choose your language to translate the book.' },
        { step: 'Step 3', description: 'Enjoy your book!' },
      ],
    },
    quality: {
      label: 'Translation Quality',
      heading: 'Translation You Can Trust',
      description: "Built on an AI engine fine-tuned by expert linguists, our app delivers clear, accurate, and easy-to-read translations that capture the author's true intent.",
    },
    supportedLanguages: {
      label: 'Supported Languages',
      heading: 'Read in English, Spanish, Russian, and French',
      description: 'These four languages are available now, with more European languages, along with Arabic, Chinese, and Hindi, coming soon. Because every book deserves to reach every reader in their mother tongue.',
      current: ['English', 'Spanish', 'Russian', 'French'],
      future: [
        { label: 'German', soon: true },
        { label: 'Portuguese', soon: true },
        { label: 'Italian', soon: true },
        { label: 'Japanese', soon: true },
        { label: 'Korean', soon: true },
        { label: 'and dozens more', soon: false },
      ],
      soonLabel: 'soon',
      globeAlt: 'Globe icon',
    },
    founders: {
      label: 'The People Behind Globoox',
      heading: 'Our greatest strength is our team',
      description: 'We gathered a designer passionate about digital book typography, experts with fundamental linguistic knowledge, and a software engineer with a deep understanding of AI. Together, we are building the future of digital reading, a platform that erases language barriers and unlocks access to the world’s greatest books.',
      linkedinLabel: 'LinkedIn',
      items: [
        { ...sharedFounders[0], role: 'Developer & CTO', linkedinText: "Tatiana's LinkedIn" },
        { ...sharedFounders[1], role: 'CEO', linkedinText: "Anton's LinkedIn" },
        { ...sharedFounders[2], role: 'Designer', linkedinText: "Kondrat's LinkedIn" },
        { ...sharedFounders[3], role: 'Co-founder', linkedinText: "Maxim's LinkedIn" },
      ],
    },
    cta: {
      heading: 'Start reading for free',
      description: 'Upload your EPUB and enjoy it in your language.',
      button: 'Upload your first book',
      floatingScripts: ['Lernen', '学ぶ', 'Essai', 'Наука', 'Arte', 'علم', 'Ler', '철학', 'Bilim', 'Lära', 'विज्ञान'],
    },
    footer: {
      tagline: "We are building the world's first global digital ebook store where any reader can discover, buy, read, and listen to any book in their native language.",
      terms: 'Terms',
      privacy: 'Privacy Policy',
      legal: 'Legal',
      copyright: 'Globoox © 2026',
    },
  },
  es: {
    metadata: {
      title: 'Globoox',
      description: 'Aplicación de lectura que traduce ebooks al instante a tu idioma nativo. Sube EPUBs y lee en inglés, francés, español o ruso.',
      featureList: [
        'Carga de ebooks EPUB',
        'Traducción de libros con IA',
        'Soporte para inglés, francés, español, alemán y ruso',
        'Texto original y traducido en paralelo',
        'Sincronización del progreso de lectura',
        'Biblioteca personal privada',
      ],
      freeOffer: 'Gratis para subir y traducir tu primer libro',
    },
    header: {
      openApp: 'Abrir app',
      nav: [
        { label: 'Cómo funciona', href: '#how-it-works' },
        { label: 'Calidad', href: '#quality' },
        { label: 'Idiomas', href: '#languages' },
        { label: 'Equipo', href: '#team' },
        { label: 'Empezar', href: '#start' },
      ],
      languageLabel: 'Idioma',
      languages: [
        { value: 'en', label: 'English' },
        { value: 'fr', label: 'Français' },
        { value: 'ru', label: 'Русский' },
      ],
    },
    sections: {
      hero: 'Portada',
      howItWorks: 'Cómo funciona',
      quality: 'Calidad de traducción',
      languages: 'Idiomas disponibles',
      team: 'Conoce al equipo',
      start: 'Empieza',
    },
    hero: {
      eyebrow: '',
      title: 'Globoox — app de lectura que traduce e\u2011books al instante a tu idioma nativo',
      button: 'Empieza a leer gratis',
    },
    usage: {
      label: 'Cómo funciona',
      heading: 'Tres pasos simples',
      steps: [
        { step: 'Paso 1', description: 'Sube tu ebook' },
        { step: 'Paso 2', description: 'Elige tu idioma' },
        { step: 'Paso 3', description: 'Disfruta tu libro' },
      ],
    },
    quality: {
      label: 'Calidad de traducción',
      heading: 'Traducciones en las que puedes confiar',
      description: 'Nuestra app se basa en un motor de IA afinado por lingüistas expertos para ofrecer traducciones claras, precisas y fáciles de leer, fieles a la intención original del autor.',
    },
    supportedLanguages: {
      label: 'Idiomas disponibles',
      heading: 'Lee en inglés, español, ruso o francés',
      description: 'Estos cuatro idiomas ya están disponibles. Más idiomas europeos, junto con árabe, chino e hindi, llegarán pronto. Cada libro merece llegar a cada lector en su lengua materna.',
      current: ['Inglés', 'Español', 'Ruso', 'Francés'],
      future: [
        { label: 'Alemán', soon: true },
        { label: 'Portugués', soon: true },
        { label: 'Italiano', soon: true },
        { label: 'Japonés', soon: true },
        { label: 'Coreano', soon: true },
        { label: 'y muchos más', soon: false },
      ],
      soonLabel: 'pronto',
      globeAlt: 'Icono del globo',
    },
    founders: {
      label: 'Conoce al equipo',
      heading: 'El equipo detrás de Globoox.',
      description: 'Construimos Globoox con un equipo multidisciplinario que combina diseño, lenguaje, producto e ingeniería.',
      linkedinLabel: 'LinkedIn',
      items: [
        { ...sharedFounders[0], role: 'Desarrolladora y CTO', linkedinText: 'LinkedIn de Tatiana' },
        { ...sharedFounders[1], role: 'CEO', linkedinText: 'LinkedIn de Anton' },
        { ...sharedFounders[2], role: 'Diseñador', linkedinText: 'LinkedIn de Kondrat' },
        { ...sharedFounders[3], role: 'Cofundador', linkedinText: 'LinkedIn de Maxim' },
      ],
    },
    cta: {
      heading: 'Empieza con tu primer libro',
      description: 'Sube tu EPUB y disfrútalo en tu idioma.',
      button: 'Sube tu primer libro',
      floatingScripts: ['Aprender', '学ぶ', 'Lecture', 'Наука', 'Arte', 'علم', 'Ler', '철학', 'Bilim', 'Lära', 'विज्ञान'],
    },
    footer: {
      tagline: 'Estamos creando la primera tienda digital global de ebooks del mundo, donde cualquier lector pueda descubrir, comprar, leer y escuchar cualquier libro en su idioma nativo.',
      terms: 'Términos',
      privacy: 'Privacidad',
      legal: 'Legal',
      copyright: 'Globoox © 2026',
    },
  },
  fr: {
    metadata: {
      title: 'Globoox',
      description: 'Application de lecture qui traduit instantanément les ebooks dans votre langue maternelle. Importez des EPUB et lisez en\u00A0anglais, français, espagnol ou russe.',
      featureList: [
        'Import d’ebooks EPUB',
        'Traduction de livres par IA',
        'Prise en charge de l’anglais, du français, de l’espagnol, de l’allemand et du russe',
        'Texte original et traduit côte à côte',
        'Synchronisation de la progression de lecture',
        'Bibliothèque personnelle privée',
      ],
      freeOffer: 'Import et traduction de votre premier livre gratuits',
    },
    header: {
      openApp: 'Ouvrir l’app',
      nav: [
        { label: 'Fonctionnement', href: '#how-it-works' },
        { label: 'Qualité', href: '#quality' },
        { label: 'Langues', href: '#languages' },
        { label: 'Équipe', href: '#team' },
        { label: 'Commencer', href: '#start' },
      ],
      languageLabel: 'Langue',
      languages: [
        { value: 'en', label: 'English' },
        { value: 'fr', label: 'Français' },
        { value: 'ru', label: 'Русский' },
      ],
    },
    sections: {
      hero: 'Accueil',
      howItWorks: 'Fonctionnement',
      quality: 'Qualité de traduction',
      languages: 'Langues prises en charge',
      team: 'L’équipe',
      start: 'Commencer',
    },
    hero: {
      eyebrow: '',
      title: 'Globoox — l’appli de lecture qui traduit instantanément vos e\u2011books dans votre langue.',
      button: 'Importer votre premier livre',
    },
    usage: {
      label: 'Comment ça marche ?',
      heading: 'Trois étapes simples',
      steps: [
        { step: 'Étape 1', description: 'Ajoutez votre e\u2011book.' },
        { step: 'Étape 2', description: 'Choisissez la langue de traduction.' },
        { step: 'Étape 3', description: 'Bonne lecture !' },
      ],
    },
    quality: {
      label: 'Qualité de traduction',
      heading: 'Traduction irréprochable et fidèle à l’original',
      description: 'Au cœur de l’application se trouve une puissante IA, calibrée par nos linguistes pour donner vie à\u00A0chaque texte.',
    },
    supportedLanguages: {
      label: 'Langues disponibles',
      heading: 'Lisez en\u00A0anglais, en\u00A0espagnol, en\u00A0russe et en\u00A0français',
      description: 'Vous pouvez dès aujourd’hui lire dans ces 4\u00A0langues. D’autres langues européennes, ainsi que l’arabe, le chinois et l’hindi, seront bientôt ajoutées. Parce que chaque livre mérite de trouver son lecteur.',
      current: ['Anglais', 'Espagnol', 'Russe', 'Français'],
      future: [
        { label: 'Allemand', soon: true },
        { label: 'Portugais', soon: true },
        { label: 'Italien', soon: true },
        { label: 'Japonais', soon: true },
        { label: 'Coréen', soon: true },
        { label: 'et bien d’autres', soon: false },
      ],
      soonLabel: 'bientôt',
      globeAlt: 'Icône globe',
    },
    founders: {
      label: 'Qui sommes-nous ?',
      heading: 'Notre équipe est notre plus grande force',
      description: 'Notre équipe rassemble quatre profils aux expertises complémentaires. Un designer passionné par la typographie du livre numérique, un linguiste, un traducteur polyglotte et une ingénieure avec une profonde maîtrise de l’IA. Ensemble, nous construisons l’avenir de la lecture numérique\u00A0: une plateforme qui efface les barrières de langues et ouvre l’accès aux meilleurs livres du monde.',
      linkedinLabel: 'LinkedIn',
      items: [
        { ...sharedFounders[0], role: 'Développeuse et CTO', linkedinText: 'LinkedIn de Tatiana' },
        { ...sharedFounders[1], role: 'CEO', linkedinText: 'LinkedIn d’Anton' },
        { ...sharedFounders[2], role: 'Designer', linkedinText: 'LinkedIn de Kondrat' },
        { ...sharedFounders[3], role: 'Cofondateur', linkedinText: 'LinkedIn de Maxim' },
      ],
    },
    cta: {
      heading: 'Commencez à lire gratuitement',
      description: 'Ajoutez votre premier EPUB et lisez-le dans votre langue.',
      button: 'Importer votre premier livre',
      floatingScripts: ['Lire', '学ぶ', 'Essai', 'Наука', 'Arte', 'علم', 'Ler', '철학', 'Bilim', 'Lära', 'विज्ञान'],
    },
    footer: {
      tagline: 'Nous créons la première plateforme globale de livres numériques, permettant à chaque lecteur de découvrir, acheter, lire et écouter le livre de son choix dans sa langue maternelle.',
      terms: 'Conditions',
      privacy: 'Confidentialité',
      legal: 'Mentions légales',
      copyright: 'Globoox © 2026',
    },
  },
  ru: {
    metadata: {
      title: 'Globoox',
      description: 'Приложение для чтения, которое мгновенно переводит электронные книги на ваш родной язык. Загружайте EPUB и читайте на английском, французском, испанском или русском.',
      featureList: [
        'Загрузка EPUB-книг',
        'Перевод книг с помощью ИИ',
        'Поддержка английского, французского, испанского, немецкого и русского',
        'Оригинальный и переведённый текст рядом',
        'Синхронизация прогресса чтения',
        'Приватная личная библиотека',
      ],
      freeOffer: 'Бесплатная загрузка и перевод первой книги',
    },
    header: {
      openApp: 'Открыть приложение',
      nav: [
        { label: 'Как это работает', href: '#how-it-works' },
        { label: 'Качество', href: '#quality' },
        { label: 'Языки', href: '#languages' },
        { label: 'Команда', href: '#team' },
        { label: 'Начать читать', href: '#start' },
      ],
      languageLabel: 'Язык',
      languages: [
        { value: 'en', label: 'English' },
        { value: 'fr', label: 'Français' },
        { value: 'ru', label: 'Русский' },
      ],
    },
    sections: {
      hero: 'Главный экран',
      howItWorks: 'Как это работает',
      quality: 'Качество перевода',
      languages: 'Поддерживаемые языки',
      team: 'Команда',
      start: 'Начать',
    },
    hero: {
      eyebrow: '',
      title: 'Globoox — приложение для чтения с\u00A0мгновенным переводом электронных книг на\u00A0ваш язык.',
      button: 'Загрузить первую книгу',
    },
    usage: {
      label: 'Как это работает',
      heading: 'Три простых шага',
      steps: [
        { step: 'Шаг 1', description: 'Загрузите электронную книгу' },
        { step: 'Шаг 2', description: 'Выберите язык перевода.' },
        { step: 'Шаг 3', description: 'Приятного чтения!' },
      ],
    },
    quality: {
      label: 'Качество перевода',
      heading: 'Не просто перевод, а\u00A0живой текст.',
      description: 'В основе приложения — искусственный интеллект, тщательно настроенный экспертами-лингвистами. Текст получается таким, каким его задумал автор.',
    },
    supportedLanguages: {
      label: 'Языки перевода',
      heading: 'Читайте на\u00A0английском, испанском, русском и\u00A0французском',
      description: 'Уже сейчас вы можете читать на\u00A04 языках. Скоро мы добавим больше европейских языков, а\u00A0также арабский, китайский и хинди. Потому что у\u00A0книг не\u00A0должно быть границ.',
      current: ['Английский', 'Испанский', 'Русский', 'Французский'],
      future: [
        { label: 'Немецкий', soon: true },
        { label: 'Португальский', soon: true },
        { label: 'Итальянский', soon: true },
        { label: 'Японский', soon: true },
        { label: 'Корейский', soon: true },
        { label: 'и десятки других', soon: false },
      ],
      soonLabel: 'скоро',
      globeAlt: 'Иконка глобуса',
    },
    founders: {
      label: 'Кто делает Globoox',
      heading: 'Команда — наша главная сила',
      description: 'Мы — это дизайнер-эксперт по\u00A0типографике цифровых книг, лингвист, переводчик-полиглот и\u00A0инженер-разработчик с\u00A0глубоким пониманием ИИ. Вместе мы строим будущее цифрового чтения — платформу, которая стирает языковые барьеры и\u00A0открывает доступ к\u00A0лучшим книгам мира.',
      linkedinLabel: 'LinkedIn',
      items: [
        { ...sharedFounders[0], name: 'Татьяна Мельникова', role: 'Разработчица и CTO', linkedinText: 'LinkedIn Татьяны' },
        { ...sharedFounders[1], name: 'Антон Ломовский', role: 'CEO', linkedinText: 'LinkedIn Антона' },
        { ...sharedFounders[2], name: 'Кондрат Кондратенко', role: 'Дизайнер', linkedinText: 'LinkedIn Кондрата' },
        { ...sharedFounders[3], name: 'Максим Ильичев', role: 'Сооснователь', linkedinText: 'LinkedIn Максима' },
      ],
    },
    cta: {
      heading: 'Начните читать бесплатно',
      description: 'Загрузите свою книгу в\u00A0формате EPUB и\u00A0читайте на\u00A0своём языке.',
      button: 'Загрузить первую книгу',
      floatingScripts: ['Учиться', '学ぶ', 'Essai', 'Наука', 'Arte', 'علم', 'Ler', '철학', 'Bilim', 'Lära', 'विज्ञान'],
    },
    footer: {
      tagline: 'Мы создаём первый в\u00A0мире глобальный цифровой магазин электронных книг, где любой читатель может находить, покупать, читать и\u00A0слушать любую книгу на\u00A0своём родном языке.',
      terms: 'Условия',
      privacy: 'Политика конфиденциальности',
      legal: 'Правовая информация',
      copyright: 'Globoox © 2026',
    },
  },
};

export function isLandingLocale(value: string | null | undefined): value is LandingLocale {
  return typeof value === 'string' && landingLocales.includes(value as LandingLocale);
}

export function getLandingMessages(locale: string): LandingMessages {
  return messages[isLandingLocale(locale) ? locale : 'en'];
}
