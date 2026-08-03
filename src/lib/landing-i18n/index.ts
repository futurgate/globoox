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
    compare: {
      original: {
        lang: string;
        languageLabel: string;
        title: string;
        author: string;
        heading: string;
        paragraphs: string[];
      };
      translated: {
        lang: string;
        languageLabel: string;
        title: string;
        author: string;
        heading: string;
        paragraphs: string[];
      };
    };
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
  cookies: {
    title: string;
    description: string;
    accept: string;
    necessary: string;
  };
};

const sharedFounders = [
  {
    name: 'Tanya Melnikova',
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
    name: 'Maksim Ilichev',
    theme: 'dark' as const,
    initials: 'MI',
    photoSrc: '/images/founders/maxim.webp',
    linkedinUrl: 'https://www.linkedin.com/in/maksim-ilichev-6a48ba12',
  },
];

const qualityCompareText = {
  en: {
    lang: 'en',
    languageLabel: 'EN',
    title: 'The Voyage of the Beagle',
    author: 'Charles Darwin',
    heading: 'The Voyage of the Beagle',
    paragraphs: [
      'After having been twice driven back by heavy southwestern gales, Her Majesty’s ship Beagle, a ten-gun brig, under the command of Captain Fitz Roy, R.N., sailed from Devonport on the 27th of December, 1831. The object of the expedition was to complete the survey of Patagonia and Tierra del Fuego, commenced under Captain King in 1826 to 1830﻿—to survey the shores of Chile, Peru, and of some islands in the Pacific﻿—and to carry a chain of chronometrical measurements round the world. On the 6th of January we reached Teneriffe, but were prevented landing, by fears of our bringing the cholera: the next morning we saw the sun rise behind the rugged outline of the Grand Canary island, and suddenly illuminate the Peak of Teneriffe, whilst the lower parts were veiled in fleecy clouds. This was the first of many delightful days never to be forgotten. On the 16th of January, 1832, we anchored at Porto Praya, in St.\u00A0Jago, the chief island of the Cape de Verd archipelago.',
    ],
  },
  ru: {
    lang: 'ru',
    languageLabel: 'RU',
    title: 'Путешествие на «Бигле»',
    author: 'Чарльз Дарвин',
    heading: 'Путешествие на «Бигле»',
    paragraphs: [
      '27 декабря 1831 года десятипушечный бриг Ее Величества «Бигль» под командованием капитана королевского флота Фицроя покинул Девонпорт, до этого дважды вынужденный возвращаться из-за жестоких юго-западных штормов. Цель экспедиции заключалась в том, чтобы завершить картографирование Патагонии и Огненной Земли, начатое капитаном Кингом в 1826–1830 годах, исследовать побережья Чили, Перу и ряда тихоокеанских островов, а также провести серию хронометрических измерений вокруг земного шара. 6 января мы достигли Тенерифе, однако высадиться нам не разрешили из-за опасений, что экипаж может занести холеру. На следующее утро мы наблюдали, как солнце, взойдя из-за зубчатых очертаний острова Гран-Канария, внезапно озарило Тенерифский пик, тогда как его подножие все еще скрывалось в пелене легких облаков. Это был первый из многих восхитительных дней, навсегда оставшихся в памяти. 16 января 1832 года мы бросили якорь в Порту-Прая на Сантьягу — главном острове архипелага Островов Зеленого Мыса.',
    ],
  },
  fr: {
    lang: 'fr',
    languageLabel: 'FR',
    title: 'Le Voyage du Beagle',
    author: 'Charles Darwin',
    heading: 'Le Voyage du Beagle',
    paragraphs: [
      'Après avoir été contraint de rebrousser chemin à deux reprises face à de violentes tempêtes du sud-ouest, le "Beagle", brick de dix canons de Sa Majesté placé sous le commandement du capitaine Fitz Roy de la Royal Navy, appareilla de Devonport le 27 décembre 1831. L’expédition avait en effet pour but d’achever les relevés de la Patagonie et de la Terre de Feu, initiés sous les ordres du capitaine King entre 1826 et 1830﻿—d’explorer les côtes du Chili, du Pérou ainsi que de quelques îles du Pacifique﻿—et, enfin, d’établir une chaîne de mesures chronométriques à travers le globe. Le 6 janvier, nous atteignîmes Tenerife, or il nous fut interdit d’y débarquer par crainte que nous n’y introduisions le choléra\u00A0: dès le lendemain matin, nous pûmes toutefois observer le soleil poindre derrière les crêtes escarpées de la Grande Canarie pour illuminer soudainement le pic de Tenerife, alors que ses contreforts demeuraient voilés de nuages cotonneux. Cette journée marqua ainsi le prélude d’une longue série d’instants enchanteurs, gravés à jamais dans nos mémoires. Le 16 janvier 1832, nous jetâmes l’ancre à Porto Praya, sur l’île de Santiago, la principale de l’archipel du Cap-Vert.',
    ],
  },
  es: {
    lang: 'es',
    languageLabel: 'ES',
    title: 'El viaje del Beagle',
    author: 'Charles Darwin',
    heading: 'El viaje del Beagle',
    paragraphs: [
      'Después de que los fuertes vendavales del suroeste le obligaran a retroceder en dos ocasiones, el buque de Su Majestad Beagle, un bergantín de diez cañones bajo el mando del capitán Fitz Roy, de la Marina Real, zarpó de Devonport el 27 de diciembre de 1831. El objetivo de la expedición era completar el levantamiento cartográfico de la Patagonia y Tierra del Fuego, comenzado bajo las órdenes del capitán King de 1826 a 1830 —explorar las costas de Chile, Perú y de algunas islas del Pacífico— y llevar a cabo una cadena de mediciones cronométricas alrededor del mundo. El 6 de enero llegamos a Tenerife, pero se nos impidió desembarcar por temor a que introdujéramos el cólera: a la mañana siguiente vimos salir el sol por detrás de la escarpada silueta de la isla de Gran Canaria y cómo iluminaba de repente el pico de Tenerife, mientras las zonas inferiores quedaban ocultas tras unas nubes algodonosas. Este fue el primero de muchos días maravillosos que jamás olvidaremos. El 16 de enero de 1832 fondeamos en Porto Praya, en Santiago, la isla principal del archipiélago de Cabo Verde.',
    ],
  },
  luriaRu: {
    lang: 'ru',
    languageLabel: 'RU',
    title: 'Маленькая книжка о\u00A0большой памяти',
    author: 'Александр\u00A0Лурия',
    heading: 'Замысел',
    paragraphs: [
      'Эта маленькая книжка о\u00A0большой памяти имеет длинную историю. В\u00A0течение почти тридцати лет автор мог систематически наблюдать человека, чья выдающаяся память относилась к\u00A0числу самых сильных, описанных в\u00A0литературе. За\u00A0это время был собран большой материал, позволяющий не\u00A0только изучать основные формы и\u00A0приёмы этой памяти, которая практически не\u00A0имела границ. Приведённые наблюдения позволили, вместе с\u00A0тем, автору описать основные особенности личности этого замечательного человека. В\u00A0отличие от\u00A0других психологов, занимавшихся исследованием выдающейся памяти, автор не\u00A0ограничивался измерением её\u00A0объёма и\u00A0прочности или описанием тех приёмов, которыми его испытуемый пользовался для запоминания и\u00A0воспроизведения материала. Гораздо больше его интересовали другие вопросы. Как сказывается выдающаяся память на\u00A0всех основных сторонах личности человека\u00A0— на\u00A0его мышлении, воображении и\u00A0поведении? Как может измениться внутренний мир человека, его общение с\u00A0другими, его жизненный путь, если одна сторона его психической жизни\u00A0— память\u00A0— получает необычное развитие и\u00A0начинает вызывать изменение всех других сторон его психической деятельности?',
    ],
  },
  luriaEn: {
    lang: 'en',
    languageLabel: 'EN',
    title: 'A Little Book About a Vast Memory',
    author: 'Alexander Luria',
    heading: 'The Premise',
    paragraphs: [
      'This little book about a vast memory has a long history. For nearly thirty years, the author systematically observed a man whose extraordinary memory ranks among the most powerful ever described in the literature. Over this period, the author gathered extensive data. This material made it possible to study the core forms and mechanisms of a memory that knew virtually no bounds. Simultaneously, these observations allowed the author to describe the fundamental personality traits of this remarkable man. Unlike other psychologists studying exceptional memory, the author did not merely measure its capacity and retention. Nor did he simply catalog the techniques his subject used to memorize and recall information. Other questions interested him far more. How does an extraordinary memory affect every major aspect of a person’s personality\u2014their thinking, imagination, and behavior? How might a person’s inner world, their relationships with others, and their life path change when a single facet of their mental life\u2014memory\u2014develops so unusually that it transforms every other aspect of their mental activity?',
    ],
  },
};

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
      compare: {
        original: qualityCompareText.luriaRu,
        translated: qualityCompareText.luriaEn,
      },
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
        { ...sharedFounders[0], role: 'Developer & CTO', linkedinText: "Tanya's LinkedIn" },
        { ...sharedFounders[1], role: 'CEO', linkedinText: "Anton's LinkedIn" },
        { ...sharedFounders[2], role: 'Designer', linkedinText: "Kondrat's LinkedIn" },
        { ...sharedFounders[3], role: 'Linguistics Expert', linkedinText: "Maksim's LinkedIn" },
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
    cookies: {
      title: 'Cookies on Globoox',
      description: 'We use cookies to run the site and improve Globoox.',
      accept: 'Accept all',
      necessary: 'Necessary only',
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
      compare: {
        original: qualityCompareText.en,
        translated: qualityCompareText.es,
      },
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
        { ...sharedFounders[0], role: 'Desarrolladora y CTO', linkedinText: 'LinkedIn de Tanya' },
        { ...sharedFounders[1], role: 'CEO', linkedinText: 'LinkedIn de Anton' },
        { ...sharedFounders[2], role: 'Diseñador', linkedinText: 'LinkedIn de Kondrat' },
        { ...sharedFounders[3], role: 'Experto lingüista', linkedinText: 'LinkedIn de Maksim' },
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
    cookies: {
      title: 'Cookies en Globoox',
      description: 'Usamos cookies para que el sitio funcione y mejorar Globoox.',
      accept: 'Aceptar todas',
      necessary: 'Solo necesarias',
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
      compare: {
        original: qualityCompareText.en,
        translated: qualityCompareText.fr,
      },
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
        { ...sharedFounders[0], role: 'Développeuse et CTO', linkedinText: 'LinkedIn de Tanya' },
        { ...sharedFounders[1], role: 'CEO', linkedinText: 'LinkedIn d’Anton' },
        { ...sharedFounders[2], role: 'Designer', linkedinText: 'LinkedIn de Kondrat' },
        { ...sharedFounders[3], role: 'Expert linguiste', linkedinText: 'LinkedIn de Maksim' },
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
    cookies: {
      title: 'Cookies sur Globoox',
      description: 'Nous utilisons des cookies pour faire fonctionner le site et améliorer Globoox.',
      accept: 'Tout accepter',
      necessary: 'Nécessaires uniquement',
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
      compare: {
        original: qualityCompareText.en,
        translated: qualityCompareText.ru,
      },
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
        { ...sharedFounders[3], name: 'Максим Ильичев', role: 'Эксперт-лингвист', linkedinText: 'LinkedIn Максима' },
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
    cookies: {
      title: 'Cookies в Globoox',
      description: 'Используем cookies для работы сайта и улучшения Globoox.',
      accept: 'Принять все',
      necessary: 'Только необходимые',
    },
  },
};

export function isLandingLocale(value: string | null | undefined): value is LandingLocale {
  return typeof value === 'string' && landingLocales.includes(value as LandingLocale);
}

export function getLandingMessages(locale: string): LandingMessages {
  return messages[isLandingLocale(locale) ? locale : 'en'];
}
