# Translation / Sync Transition Summary (Mar 8)

Этот документ нужен как сводка поверх мар-7 документов:

- что именно уже было доведено;
- что уже можно считать новой базой;
- что еще остается transitional.

## 1. Translation v2

### Финальная модель

- source of truth для готовности блока на языке:
  - наличие target text для `(blockId, lang)`
- `/content?lang=X`
  - snapshot/fallback loader
  - не source of truth для ready-state
- `POST /api/chapters/:id/blocks/text`
  - основной reconcile path
- `POST /translate`
  - stream/push path

### Фронтенд

Сделано:

- Reader не принимает primary решения по голому `block.text`;
- fallback никогда не записывается как target text;
- `blocks/text` используется как reconcile;
- stale `pending -> missing -> retry` path добавлен;
- recovery больше не должен терять missing blocks после stale pending cleanup;
- frontend decision-making сузили до `targetLangReady`.

### Бэкенд

Сделано:

- `blocks/text` и `translate-status` сидят на общем helper;
- stale pending cleanup реализован;
- server-side persist path чище, чем раньше;
- no separate alternative truth для ready-state на сервере.

## 1.1. Reader Metadata + TOC Translations

Поверх основного block translation path был добавлен отдельный слой для `reader metadata + TOC`:

- book title
- book author
- chapter titles

Цель:

- перестать держать их как три случайных разных UI-потока;
- привести их к общему contract:
  - translated value exists -> ready
  - no translated value -> fallback under blur
  - local cache reuse
  - server-side cache/persist where possible
  - dedupe in-flight requests

Что сделано:

- chapter titles и book metadata теперь считаются частью одного `reader metadata + TOC translation` surface;
- на фронте добавлен отдельный hook layer:
  - `src/lib/hooks/useReaderMetadataTranslations.ts`
- runtime path теперь может идти одним bundle-запросом:
  - `POST /api/books/:id/reader-metadata/translate`
- bundle включает:
  - `title`
  - `author`
  - `chapterTitles[]`
- результат bundle кэшируется в IDB как одна сущность, а не как два разрозненных кэша
- backend использует:
  - уже сохранённые `chapters.translations`
  - server-side cache для `book metadata`
  - и, если нужно, один LLM вызов для missing частей bundle

Важно:

- это еще не буквальное переиспользование block text pipeline;
- но это уже abstraction layer того же класса:
  - cache
  - ready/pending semantics
  - fallback rendering
  - reuse on reload/open

Итог:

- block text остается самым зрелым translation path;
- chapter titles и book metadata теперь живут как один logical bundle, а не как два разрозненных механизма.

## 2. Reading position

Сделано:

- exact fragment restore;
- font size change restore;
- Library -> return restore;
- startup restore по local anchor;
- cache restore больше не должен обходить local anchor restore;
- startup path Reader учитывает local `anchor.chapterId`.

Итог:

- reading position теперь хранится и в local persisted store;
- и в cached/server reading-position path;
- restore должен работать и после reload.

## 3. Pagination

Сделано:

- hidden pagination probe был приближен к реальному page root;
- убран вредный post-render rescue, который мутировал fragments на глазах;
- IDB `chapter_layout` cache добавлен;
- Reader использует:
  - memory cache
  - потом IDB layout cache
  - потом fresh hidden pass

Текущее состояние:

- correctness pagination сильно лучше, чем до pass;
- layout reuse уже работает;
- stable prefix + background tail еще не доведены как отдельный этап.

## 4. Offline-like behavior

Важно:

- полноценного offline mode нет;
- но есть `offline-first cache reuse`.

Это означает:

- cached book meta может подняться локально;
- cached chapter content может подняться локально;
- cached chapter layout может подняться локально;
- reading position хранится локально;
- но новая книга/новый перевод без сети не гарантируются.

Для reader metadata + TOC это теперь тоже частично верно:

- translated bundle (`title + author + chapter titles`) может подниматься из IDB;
- server-side cache для metadata уменьшает повторные LLM calls.

## 5. Что еще остается transitional

1. compat fields `isTranslated` / `is_pending`
- уже не primary truth;
- но еще живут как compat payload.

2. legacy server endpoints
- `translate-status`
- `content-version`
- `translate-range`

3. old IDB migration layer
- `STORE_CHAPTER_CONTENT_V1`

4. possible old frontend surface in `globoox`
- Nuxt/Vue reader/upload UI
- `epubjs` path

5. reader metadata + TOC translations
- bundle-модель уже есть;
- но это еще не полностью общий server abstraction layer уровня block text.

## 6. Что считать новой базой

После этого перехода базой считать:

- Reader + Translation logic живет в `globoox_preview`;
- `Text[blockId, lang]` — truth;
- `blocks/text` — reconcile;
- `translate` — push;
- `targetLangReady` — primary frontend ready flag;
- reading position и layout cache уже интегрированы в новую модель;
- reader metadata + TOC translations (book meta + chapter titles) теперь живут как один bundle и по единому translation contract, а не как полностью отдельные ad-hoc flows.
