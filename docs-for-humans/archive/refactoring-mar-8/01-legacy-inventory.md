# Legacy / Dead Surface Inventory (Mar 8)

Ниже перечислено всё, что по итогам текущего расследования выглядит как:

- реально мертвое;
- почти наверняка legacy;
- transitional;
- либо архитектурно старое, но еще не доказано как безопасное к удалению.

## 1. `globoox_preview`

### 1.1. Почти наверняка мертвое

#### `src/lib/hooks/useEpubParser.ts`

Файл:
- `/Users/user/Documents/github/globoox_preview/src/lib/hooks/useEpubParser.ts`

Что видно:
- в `globoox_preview/src` usage не найден;
- текущий Reader не использует `epubjs`;
- текущая книга/глава открывается через API + cached chapter content, а не через client-side EPUB parsing.

Почему это выглядит как dead code:
- это похоже на хвост старого client-side EPUB flow;
- в текущем Next Reader surface это не участвует.

Сопутствующий кандидат:
- dependency `epubjs` в `/Users/user/Documents/github/globoox_preview/package.json`

Текущий статус:
- `strong removal candidate`

Риск:
- low, но перед удалением все равно нужно:
  - grep usage;
  - убедиться, что никакой upload/import flow в preview repo на него не опирается.

### 1.2. Transitional, но еще нужное

#### Compat fields `targetLangReady` / `isTranslated` / `is_pending`

Файлы:
- `/Users/user/Documents/github/globoox_preview/src/lib/api.ts`
- `/Users/user/Documents/github/globoox_preview/src/lib/translationState.ts`
- `/Users/user/Documents/github/globoox_preview/src/lib/contentCache.ts`
- `/Users/user/Documents/github/globoox_preview/src/lib/hooks/useViewportTranslation.ts`

Состояние сейчас:
- frontend primary logic уже сузили до `targetLangReady`;
- `isTranslated` / `is_pending` оставлены как compat-derived shape.

Вывод:
- это уже не primary truth;
- но это еще не “мертвый код”, потому что shape пока живет в runtime и payload.

Статус:
- `keep for now`

#### Legacy IDB migration layer

Файлы:
- `/Users/user/Documents/github/globoox_preview/src/lib/contentCache.ts`

Сущности:
- `STORE_CHAPTER_CONTENT_V1`
- `makeLegacyChapterKey`
- on-demand migration branch в `getCachedChapterContent()`

Вывод:
- это legacy, но не доказано безопасным к удалению для старых локальных баз.

Статус:
- `keep for now`

### 1.3. Legacy runtime/API surface

#### Frontend proxy `translate-status`

Файл:
- `/Users/user/Documents/github/globoox_preview/src/app/api/chapters/[id]/translate-status/route.ts`

Что видно:
- current Reader frontend path его не использует;
- scripts/smoke тоже считают `translate` отдельно от `translate-status`.

Вывод:
- для текущего app runtime выглядит лишним;
- но удаление должно идти вместе с backend endpoint decision.

Статус:
- `candidate for removal after staged check`

## 2. `globoox`

### 2.1. Не “мертвое” технически, но похоже на legacy frontend слой

Если `globoox` по целевой архитектуре должен быть backend repo, тогда весь этот пласт выглядит как старый Nuxt/Vue frontend:

#### Pages / UI

- `/Users/user/Documents/github/globoox/pages/index.vue`
- `/Users/user/Documents/github/globoox/pages/reader/[id].vue`
- `/Users/user/Documents/github/globoox/pages/settings.vue`
- `/Users/user/Documents/github/globoox/pages/store.vue`
- `/Users/user/Documents/github/globoox/pages/profile.vue`
- `/Users/user/Documents/github/globoox/pages/help.vue`
- `/Users/user/Documents/github/globoox/pages/auth/login.vue`
- `/Users/user/Documents/github/globoox/pages/auth/confirm.vue`

#### Frontend state/composables

- `/Users/user/Documents/github/globoox/stores/books.ts`
- `/Users/user/Documents/github/globoox/stores/settings.ts`
- `/Users/user/Documents/github/globoox/composables/useAuth.ts`
- `/Users/user/Documents/github/globoox/composables/useBookUpload.ts`
- `/Users/user/Documents/github/globoox/composables/useChapterTranslations.ts`
- `/Users/user/Documents/github/globoox/composables/useReadingProgress.ts`
- `/Users/user/Documents/github/globoox/composables/useTranslation.ts`
- `/Users/user/Documents/github/globoox/composables/useEpubParser.ts`

#### Nuxt/Vue runtime

- `/Users/user/Documents/github/globoox/nuxt.config.ts`
- `vue`, `vue-router`, `pinia`, `nuxt` в `/Users/user/Documents/github/globoox/package.json`

Что это значит:
- это не dead code “по файлам”;
- это большой legacy frontend surface, если новый продуктовый frontend уже живет в `globoox_preview`.

Статус:
- `architectural legacy candidate`

### 2.2. EPUB.js в `globoox`

Файлы:
- `/Users/user/Documents/github/globoox/pages/reader/[id].vue`
- `/Users/user/Documents/github/globoox/composables/useEpubParser.ts`
- `/Users/user/Documents/github/globoox/stores/books.ts`

Dependency:
- `epubjs` в `/Users/user/Documents/github/globoox/package.json`

Вывод:
- это живое использование внутри старого Nuxt frontend;
- если старый frontend больше не нужен, то и этот слой становится removal candidate;
- если хотя бы upload/parser UI там все еще нужен, удалять нельзя.

Статус:
- `depends on architectural decision`

## 3. Server/API legacy surface

### 3.1. `translate-status`

Файл:
- `/Users/user/Documents/github/globoox/server/api/chapters/[id]/translate-status.post.ts`

Что известно:
- current frontend runtime его не использует;
- endpoint переведен на тот же helper, что `blocks/text`;
- может быть нужен как compat/external path.

Статус:
- `likely removable later, not safe to delete blindly`

### 3.2. `content-version`

Файл:
- `/Users/user/Documents/github/globoox/server/api/chapters/[id]/content-version.get.ts`

Что известно:
- current frontend runtime его не использует;
- в OpenAPI все еще описан.

Статус:
- `likely legacy`

### 3.3. `translate-range`

Файл:
- `/Users/user/Documents/github/globoox/server/api/chapters/[id]/translate-range.post.ts`

Что известно:
- current frontend runtime его не использует;
- в docs/OpenAPI остался;
- может быть нужен только historical/manual tooling.

Статус:
- `likely legacy`

## 4. Что уже не считать “дохлятиной”

Ниже вещи, которые могут выглядеть как дублирование, но пока это нормальная часть системы:

### `paginationCache` + `chapter_layout`

Файлы:
- `/Users/user/Documents/github/globoox_preview/src/components/Reader/ReaderView.tsx`
- `/Users/user/Documents/github/globoox_preview/src/lib/contentCache.ts`

Почему не лишнее:
- memory cache нужен для same-session возврата;
- IDB нужен для reload/remount.

### `/content` + `/blocks/text` + `/translate`

Это не legacy и не дублирование:
- `/content` — snapshot/fallback;
- `/blocks/text` — reconcile truth path;
- `/translate` — push/stream path.

### Vue/Nuxt runtime в `globoox`

Это не “мертвое” само по себе.
Это старый frontend слой, который станет removal candidate только если принято решение, что:

- `globoox` = backend-only repo;
- весь продуктовый frontend окончательно переехал в `globoox_preview`.

## 5. Suggested Removal Order

### Pass A: низкий риск

1. Проверить и удалить:
- `globoox_preview/src/lib/hooks/useEpubParser.ts`
- `epubjs` из `globoox_preview/package.json`

### Pass B: средний риск

1. staged-disable:
- frontend proxy `translate-status`
- backend `translate-status`
- `content-version`
- `translate-range`

2. Если runtime/external usage не подтвержден:
- удалить endpoints;
- почистить OpenAPI и docs.

### Pass C: высокий риск / архитектурный

1. Принять решение:
- нужен ли вообще Nuxt/Vue frontend в `globoox`

2. Если не нужен:
- удалять целыми пластами:
  - `pages/*.vue`
  - `stores/*`
  - frontend composables
  - `epubjs`
  - `vue`
  - `vue-router`
  - `pinia`
  - возможно сам Nuxt runtime, если repo становится backend-only не только логически, но и технически.

## 6. Bottom line

Да, прошлый проход не нашел всю дохлятину.

Главное, что было пропущено:

1. маленький, почти явный хвост в `globoox_preview`
- `useEpubParser.ts`
- `epubjs`

2. большой старый frontend-пласт в `globoox`
- он не dead code “по исполнению”,
- но очень похож на legacy архитектурный слой.
