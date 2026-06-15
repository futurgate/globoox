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
    linkedinLabel: string;
    items: Array<{
      name: string;
      role: string;
      note: string;
      theme: 'light' | 'dark';
      initials: string;
      linkedinUrl: string;
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
    name: 'Founder One',
    theme: 'light' as const,
    initials: 'FO',
    linkedinUrl: 'https://www.linkedin.com/in/founder-one',
  },
  {
    name: 'Founder Two',
    theme: 'dark' as const,
    initials: 'FT',
    linkedinUrl: 'https://www.linkedin.com/in/founder-two',
  },
  {
    name: 'Founder Three',
    theme: 'light' as const,
    initials: 'FH',
    linkedinUrl: 'https://www.linkedin.com/in/founder-three',
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
        { value: 'es', label: 'Español' },
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
      eyebrow: 'Introducing Globoox',
      title: 'Globoox — reading app that instantly translates e-books into your native language',
      button: 'Start Reading For Free',
    },
    usage: {
      label: 'How it works',
      heading: 'Three simple steps',
      steps: [
        { step: 'Step 1', description: 'Upload your ebook' },
        { step: 'Step 2', description: 'Choose your language' },
        { step: 'Step 3', description: 'Enjoy your book!' },
      ],
    },
    quality: {
      label: 'Translation Quality',
      heading: 'Translations You Can Trust',
      description: "Built on an AI engine fine-tuned by expert linguists, our app delivers clear, accurate, and easy-to-read translations that capture the author's true intent.",
    },
    supportedLanguages: {
      label: 'Supported Languages',
      heading: 'Read in English, Spanish, Russian, or French',
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
      label: 'Meet the team',
      heading: 'The team behind Globoox.',
      linkedinLabel: 'LinkedIn',
      items: [
        { ...sharedFounders[0], role: 'Product & vision', note: 'Shapes the reading experience and product direction.' },
        { ...sharedFounders[1], role: 'Translation systems', note: 'Leads the translation engine and language quality.' },
        { ...sharedFounders[2], role: 'Library & platform', note: 'Builds the library, sync, and platform layer.' },
      ],
    },
    cta: {
      heading: 'Start with your first book',
      description: 'Upload your EPUB and enjoy it in your language.',
      button: 'Upload Your First Book',
      floatingScripts: ['Lernen', '学ぶ', 'Essai', 'Наука', 'Arte', 'علم', 'Ler', '철학', 'Bilim', 'Lära', 'विज्ञान'],
    },
    footer: {
      tagline: 'We are building a global book platform where any reader can discover, buy, read, and listen to any book in their native language.',
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
        { value: 'es', label: 'Español' },
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
      eyebrow: 'Presentamos Globoox',
      title: 'Globoox — app de lectura que traduce e-books al instante a tu idioma nativo',
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
      linkedinLabel: 'LinkedIn',
      items: [
        { ...sharedFounders[0], role: 'Producto y visión', note: 'Define la experiencia de lectura y la dirección del producto.' },
        { ...sharedFounders[1], role: 'Sistemas de traducción', note: 'Lidera el motor de traducción y la calidad lingüística.' },
        { ...sharedFounders[2], role: 'Biblioteca y plataforma', note: 'Construye la biblioteca, la sincronización y la capa de plataforma.' },
      ],
    },
    cta: {
      heading: 'Empieza con tu primer libro',
      description: 'Sube tu EPUB y disfrútalo en tu idioma.',
      button: 'Sube tu primer libro',
      floatingScripts: ['Aprender', '学ぶ', 'Lecture', 'Наука', 'Arte', 'علم', 'Ler', '철학', 'Bilim', 'Lära', 'विज्ञान'],
    },
    footer: {
      tagline: 'Estamos construyendo una plataforma global de libros donde cualquier lector pueda descubrir, comprar, leer y escuchar cualquier libro en su idioma nativo.',
      terms: 'Términos',
      privacy: 'Privacidad',
      legal: 'Legal',
      copyright: 'Globoox © 2026',
    },
  },
  fr: {
    metadata: {
      title: 'Globoox',
      description: 'Application de lecture qui traduit instantanément les ebooks dans votre langue maternelle. Importez des EPUB et lisez en anglais, français, espagnol ou russe.',
      featureList: [
        "Import d'ebooks EPUB",
        'Traduction de livres par IA',
        "Prise en charge de l'anglais, du français, de l'espagnol, de l'allemand et du russe",
        'Texte original et traduit côte à côte',
        'Synchronisation de la progression de lecture',
        'Bibliothèque personnelle privée',
      ],
      freeOffer: 'Import et traduction de votre premier livre gratuits',
    },
    header: {
      openApp: "Ouvrir l'app",
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
        { value: 'es', label: 'Español' },
        { value: 'fr', label: 'Français' },
        { value: 'ru', label: 'Русский' },
      ],
    },
    sections: {
      hero: 'Accueil',
      howItWorks: 'Fonctionnement',
      quality: 'Qualité de traduction',
      languages: 'Langues prises en charge',
      team: "L'équipe",
      start: 'Commencer',
    },
    hero: {
      eyebrow: 'Découvrez Globoox',
      title: 'Globoox — application de lecture qui traduit instantanément les e-books dans votre langue maternelle',
      button: 'Commencer à lire gratuitement',
    },
    usage: {
      label: 'Fonctionnement',
      heading: 'Trois étapes simples',
      steps: [
        { step: 'Étape 1', description: 'Importez votre ebook' },
        { step: 'Étape 2', description: 'Choisissez votre langue' },
        { step: 'Étape 3', description: 'Profitez de votre livre' },
      ],
    },
    quality: {
      label: 'Qualité de traduction',
      heading: 'Des traductions fiables',
      description: "Notre moteur IA, affiné par des linguistes experts, produit des traductions claires, précises et fluides, fidèles à l'intention de l'auteur.",
    },
    supportedLanguages: {
      label: 'Langues prises en charge',
      heading: 'Lisez en anglais, espagnol, russe ou français',
      description: "Ces quatre langues sont disponibles dès maintenant. D'autres langues européennes, ainsi que l'arabe, le chinois et l'hindi, arriveront bientôt. Chaque livre mérite d'atteindre chaque lecteur dans sa langue maternelle.",
      current: ['Anglais', 'Espagnol', 'Russe', 'Français'],
      future: [
        { label: 'Allemand', soon: true },
        { label: 'Portugais', soon: true },
        { label: 'Italien', soon: true },
        { label: 'Japonais', soon: true },
        { label: 'Coréen', soon: true },
        { label: "et bien d'autres", soon: false },
      ],
      soonLabel: 'bientôt',
      globeAlt: 'Icône globe',
    },
    founders: {
      label: "L'équipe",
      heading: "L'équipe derrière Globoox.",
      linkedinLabel: 'LinkedIn',
      items: [
        { ...sharedFounders[0], role: 'Produit et vision', note: 'Définit l’expérience de lecture et la direction produit.' },
        { ...sharedFounders[1], role: 'Systèmes de traduction', note: 'Pilote le moteur de traduction et la qualité linguistique.' },
        { ...sharedFounders[2], role: 'Bibliothèque et plateforme', note: 'Construit la bibliothèque, la synchronisation et la plateforme.' },
      ],
    },
    cta: {
      heading: 'Commencez avec votre premier livre',
      description: 'Importez votre EPUB et lisez-le dans votre langue.',
      button: 'Importer mon premier livre',
      floatingScripts: ['Lire', '学ぶ', 'Essai', 'Наука', 'Arte', 'علم', 'Ler', '철학', 'Bilim', 'Lära', 'विज्ञान'],
    },
    footer: {
      tagline: 'Nous construisons une plateforme mondiale du livre où chaque lecteur peut découvrir, acheter, lire et écouter n’importe quel livre dans sa langue maternelle.',
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
        { value: 'es', label: 'Español' },
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
      eyebrow: 'Представляем Globoox',
      title: 'Globoox — приложение для чтения, которое мгновенно переводит электронные книги на ваш родной язык',
      button: 'Начать читать бесплатно',
    },
    usage: {
      label: 'Как это работает',
      heading: 'Три простых шага',
      steps: [
        { step: 'Шаг 1', description: 'Загрузите книгу' },
        { step: 'Шаг 2', description: 'Выберите язык' },
        { step: 'Шаг 3', description: 'Наслаждайтесь чтением' },
      ],
    },
    quality: {
      label: 'Качество перевода',
      heading: 'Переводы, которым можно доверять',
      description: 'Наше приложение работает на ИИ-движке, донастроенном лингвистами, и даёт точные, понятные и удобные для чтения переводы, сохраняющие авторский смысл.',
    },
    supportedLanguages: {
      label: 'Поддерживаемые языки',
      heading: 'Читайте на английском, испанском, русском или французском',
      description: 'Эти четыре языка уже доступны. Скоро появятся и другие европейские языки, а также арабский, китайский и хинди. Каждая книга должна дойти до читателя на его родном языке.',
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
      label: 'Команда',
      heading: 'Команда Globoox.',
      linkedinLabel: 'LinkedIn',
      items: [
        { ...sharedFounders[0], role: 'Продукт и видение', note: 'Формирует опыт чтения и направление продукта.' },
        { ...sharedFounders[1], role: 'Системы перевода', note: 'Отвечает за движок перевода и языковое качество.' },
        { ...sharedFounders[2], role: 'Библиотека и платформа', note: 'Развивает библиотеку, синхронизацию и платформенный слой.' },
      ],
    },
    cta: {
      heading: 'Начните с первой книги',
      description: 'Загрузите EPUB и читайте его на своём языке.',
      button: 'Загрузить первую книгу',
      floatingScripts: ['Учиться', '学ぶ', 'Essai', 'Наука', 'Arte', 'علم', 'Ler', '철학', 'Bilim', 'Lära', 'विज्ञान'],
    },
    footer: {
      tagline: 'Мы создаём глобальную книжную платформу, где любой читатель сможет находить, покупать, читать и слушать любые книги на своём родном языке.',
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
