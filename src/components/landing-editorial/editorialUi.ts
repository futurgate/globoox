import type { LandingLocale } from '@/lib/landing-i18n';

type EditorialUi = {
  navigation: { skipToContent: string; home: string; main: string; mobile: string; open: string; close: string; backToTop: string };
  recording: {
    devices: { desktop: string; tablet: string; phone: string };
    figureLabel: string; chooseDevice: string; videoLabel: (device: string) => string;
    description: string; error: string;
  };
  walkthrough: { screenshotAlts: [string, string, string] };
  quality: {
    hideTranslation: string; showTranslation: string; collapseExcerpt: string; readFullExcerpt: string;
    originalExcerpt: (language: string) => string; translatedExcerpt: (language: string) => string;
    comparisonLabel: string; comparisonInstructions: string;
    comparisonValue: (position: number, originalLanguage: string, translatedLanguage: string) => string;
  };
  languages: { available: string };
};

const languageNames: Record<LandingLocale, Record<string, string>> = {
  en: { en: 'English', es: 'Spanish', fr: 'French', ru: 'Russian' },
  es: { en: 'inglés', es: 'español', fr: 'francés', ru: 'ruso' },
  fr: { en: 'anglais', es: 'espagnol', fr: 'français', ru: 'russe' },
  ru: { en: 'английском', es: 'испанском', fr: 'французском', ru: 'русском' },
};
const language = (locale: LandingLocale, code: string) => languageNames[locale][code] ?? code;

/** UI added by the editorial design. Canonical marketing copy stays in landing-i18n. */
const editorialUi: Record<LandingLocale, EditorialUi> = {
  en: {
    navigation: { skipToContent: 'Skip to content', home: 'Globoox home', main: 'Main navigation', mobile: 'Mobile navigation', open: 'Open navigation', close: 'Close navigation', backToTop: 'Back to top' },
    recording: {
      devices: { desktop: 'Desktop', tablet: 'Tablet', phone: 'Phone' },
      figureLabel: 'Globoox product recordings', chooseDevice: 'Choose a device recording',
      videoLabel: (device) => `${device} recording of Globoox`,
      description: 'Silent screen recording of the actual Globoox app. A reader views Alexis de Tocqueville’s Democracy in America in French, chooses a reading language, and views translated text. The language menu offers English, Russian, Spanish and French. Use the device tabs to view the desktop, tablet or phone recording. Playback starts automatically without sound. Native playback controls are available if the browser blocks autoplay.',
      error: 'This recording could not load. Please choose another device.',
    },
    walkthrough: {
      screenshotAlts: [
        'Globoox library with the Upload Book dialog open and the option to choose an EPUB file.',
        'The Spanish edition of The Voyage of the Beagle in Globoox, with the reading language menu open.',
        'The English translation of The Voyage of the Beagle displayed in the Globoox reader.',
      ],
    },
    quality: {
      hideTranslation: 'Hide translation', showTranslation: 'Show translation', collapseExcerpt: 'Collapse excerpt', readFullExcerpt: 'Read full excerpt',
      originalExcerpt: (code) => `Original ${language('en', code)} excerpt`,
      translatedExcerpt: (code) => `Translated ${language('en', code)} excerpt`,
      comparisonLabel: 'Original and translated excerpt comparison',
      comparisonInstructions: 'Drag left or right to compare the original and translation. Use the arrow keys, Home or End when the comparison handle is focused.',
      comparisonValue: (position, original, translated) => `${Math.round(position)}% original ${language('en', original)}, ${Math.round(100 - position)}% ${language('en', translated)} translation`,
    },
    languages: { available: 'Available languages' },
  },
  es: {
    navigation: { skipToContent: 'Saltar al contenido', home: 'Inicio de Globoox', main: 'Navegación principal', mobile: 'Navegación móvil', open: 'Abrir navegación', close: 'Cerrar navegación', backToTop: 'Volver arriba' },
    recording: {
      devices: { desktop: 'Ordenador', tablet: 'Tableta', phone: 'Teléfono' },
      figureLabel: 'Demostraciones de Globoox', chooseDevice: 'Elige un dispositivo para la demostración',
      videoLabel: (device) => `Demostración de Globoox: ${device}`,
      description: 'Grabación sin sonido de la aplicación real de Globoox. Un lector abre La democracia en América de Alexis de Tocqueville en francés, elige un idioma de lectura y ve el texto traducido. El menú ofrece inglés, ruso, español y francés. Usa las pestañas para ver la grabación de ordenador, tableta o teléfono. La reproducción comienza automáticamente sin sonido. Si el navegador bloquea la reproducción automática, aparecen los controles nativos.',
      error: 'No se pudo cargar esta grabación. Elige otro dispositivo.',
    },
    walkthrough: {
      screenshotAlts: [
        'Biblioteca de Globoox con el diálogo para subir un libro abierto y la opción de elegir un archivo EPUB.',
        'La edición inglesa de El viaje del Beagle en Globoox, con el menú de idiomas de lectura abierto.',
        'La traducción al español de El viaje del Beagle en el lector de Globoox.',
      ],
    },
    quality: {
      hideTranslation: 'Ocultar traducción', showTranslation: 'Mostrar traducción', collapseExcerpt: 'Contraer fragmento', readFullExcerpt: 'Leer el fragmento completo',
      originalExcerpt: (code) => `Fragmento original en ${language('es', code)}`,
      translatedExcerpt: (code) => `Fragmento traducido al ${language('es', code)}`,
      comparisonLabel: 'Comparación del fragmento original y la traducción',
      comparisonInstructions: 'Arrastra a izquierda o derecha para comparar el original y la traducción. Con el control de comparación enfocado, usa las flechas, Inicio o Fin.',
      comparisonValue: (position, original, translated) => `${Math.round(position)}% del original en ${language('es', original)}, ${Math.round(100 - position)}% de la traducción al ${language('es', translated)}`,
    },
    languages: { available: 'Idiomas disponibles' },
  },
  fr: {
    navigation: { skipToContent: 'Aller au contenu', home: 'Accueil de Globoox', main: 'Navigation principale', mobile: 'Navigation mobile', open: 'Ouvrir la navigation', close: 'Fermer la navigation', backToTop: 'Retour en haut' },
    recording: {
      devices: { desktop: 'Ordinateur', tablet: 'Tablette', phone: 'Téléphone' },
      figureLabel: 'Démonstrations de Globoox', chooseDevice: 'Choisissez un appareil pour la démonstration',
      videoLabel: (device) => `Démonstration de Globoox : ${device}`,
      description: 'Enregistrement sans son de la véritable application Globoox. Un lecteur ouvre De la démocratie en Amérique d’Alexis de Tocqueville en français, choisit une langue de lecture et consulte le texte traduit. Le menu propose l’anglais, le russe, l’espagnol et le français. Les onglets permettent de choisir l’enregistrement sur ordinateur, tablette ou téléphone. La lecture démarre automatiquement sans son. Si le navigateur bloque la lecture automatique, les commandes natives sont disponibles.',
      error: 'Cet enregistrement n’a pas pu être chargé. Choisissez un autre appareil.',
    },
    walkthrough: {
      screenshotAlts: [
        'Bibliothèque Globoox avec la fenêtre d’ajout d’un livre ouverte et l’option de choisir un fichier EPUB.',
        'L’édition anglaise du Voyage du Beagle dans Globoox, avec le menu des langues de lecture ouvert.',
        'La traduction française du Voyage du Beagle dans le lecteur Globoox.',
      ],
    },
    quality: {
      hideTranslation: 'Masquer la traduction', showTranslation: 'Afficher la traduction', collapseExcerpt: 'Réduire l’extrait', readFullExcerpt: 'Lire l’extrait complet',
      originalExcerpt: (code) => `Extrait original en ${language('fr', code)}`,
      translatedExcerpt: (code) => `Extrait traduit en ${language('fr', code)}`,
      comparisonLabel: 'Comparaison de l’extrait original et de sa traduction',
      comparisonInstructions: 'Faites glisser vers la gauche ou la droite pour comparer l’original et la traduction. Lorsque le curseur de comparaison est sélectionné, utilisez les flèches, Début ou Fin.',
      comparisonValue: (position, original, translated) => `${Math.round(position)}% de l’original en ${language('fr', original)}, ${Math.round(100 - position)}% de la traduction en ${language('fr', translated)}`,
    },
    languages: { available: 'Langues disponibles' },
  },
  ru: {
    navigation: { skipToContent: 'Перейти к содержимому', home: 'Главная Globoox', main: 'Основная навигация', mobile: 'Мобильная навигация', open: 'Открыть меню', close: 'Закрыть меню', backToTop: 'Наверх' },
    recording: {
      devices: { desktop: 'Компьютер', tablet: 'Планшет', phone: 'Телефон' },
      figureLabel: 'Демонстрации Globoox', chooseDevice: 'Выберите устройство для демонстрации',
      videoLabel: (device) => `Демонстрация Globoox: ${device}`,
      description: 'Запись работы настоящего приложения Globoox без звука. Читатель открывает «Демократию в Америке» Алексиса де Токвиля на французском, выбирает язык чтения и просматривает перевод. В меню доступны английский, русский, испанский и французский. Вкладки переключают запись для компьютера, планшета и телефона. Видео запускается автоматически без звука. Если браузер блокирует автозапуск, доступны стандартные элементы управления.',
      error: 'Не удалось загрузить запись. Выберите другое устройство.',
    },
    walkthrough: {
      screenshotAlts: [
        'Библиотека Globoox с открытым окном загрузки книги и выбором файла EPUB.',
        'Английское издание «Путешествия на „Бигле“» в Globoox с открытым меню выбора языка чтения.',
        'Русский перевод «Путешествия на „Бигле“» в читалке Globoox.',
      ],
    },
    quality: {
      hideTranslation: 'Скрыть перевод', showTranslation: 'Показать перевод', collapseExcerpt: 'Свернуть отрывок', readFullExcerpt: 'Читать отрывок целиком',
      originalExcerpt: (code) => `Оригинальный отрывок на ${language('ru', code)}`,
      translatedExcerpt: (code) => `Переведённый отрывок на ${language('ru', code)}`,
      comparisonLabel: 'Сравнение оригинала и перевода',
      comparisonInstructions: 'Перетаскивайте разделитель влево или вправо, чтобы сравнить оригинал и перевод. Когда разделитель в фокусе, используйте стрелки, Home или End.',
      comparisonValue: (position, original, translated) => `${Math.round(position)}% оригинала на ${language('ru', original)}, ${Math.round(100 - position)}% перевода на ${language('ru', translated)}`,
    },
    languages: { available: 'Доступные языки' },
  },
};

export const getEditorialUi = (locale: LandingLocale) => editorialUi[locale];

/** Three real screens from the canonical walkthrough, without its interim animation phases. */
export function getEditorialWalkthroughScreens(locale: LandingLocale) {
  const finalScreen = locale === 'en' ? '3-es-en' : `3-en-${locale}`;
  const sources = ['1.1', locale === 'en' ? '2.1-es' : '2.1-en', finalScreen];
  return sources.map((name, index) => ({
    src: `/images/how-it-works/${name}.webp`,
    alt: editorialUi[locale].walkthrough.screenshotAlts[index],
  }));
}
