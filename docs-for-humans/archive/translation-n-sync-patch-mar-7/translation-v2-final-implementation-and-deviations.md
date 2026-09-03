# Translation v2 — Final Implementation, Deviations, and Patch Notes

Этот файл является **итоговым документом** по Translation v2 для текущей реализации.

Если есть конфликт между ранними доками в этой папке и этим файлом, ориентироваться нужно на **этот файл**.

Связанные документы:
- `translation-v2-invariants-and-ui.md`
- `translation-v2-reconcile-api.md`
- `translation-v2-migration-and-test-checklist.md`

## Зачем появился этот файл

Изначальные доки зафиксировали правильное направление:
- `Text[blockId, lang]` как источник истины,
- fallback under blur,
- bulk reconcile,
- block-based windows.

Но в реальном коде по ходу внедрения выяснилось:
- старый `ContentBlock` API слишком долго тащил смешанную legacy-модель;
- `/content?lang=X` по контракту оставался mixed snapshot;
- старые флаги (`isTranslated`, `is_pending`) нельзя было убрать мгновенно без слишком большого объема переписывания.

Поэтому реализация пошла не “идеальным зеленым полем”, а через **переходную, но уже рабочую модель**, которая:
- синхронизирует основной source of truth;
- убирает главный баг-класс “не target без blur”;
- оставляет часть legacy surface area только как derived/compat слой.

## Что решили оставить из исходных доков

Эти решения остались без изменений:

1. Source of truth:
- готовность языка определяется только наличием `Text[blockId, activeLang]`.

2. UI:
- без blur показывается только target text;
- если target text нет, рендерится fallback под blur;
- пустых блоков быть не должно.

3. Reconcile:
- нужен отдельный bulk endpoint `POST /api/chapters/:id/blocks/text`;
- клиент перед запросом сначала проверяет local IDB/in-memory.

4. Приоритеты:
- `HIGH`: видимые блоки;
- `LOW`: 20 блоков вперед;
- `EXTRALOW`: 10 блоков назад;
- `MAX_BATCH_SIZE = 10`.

5. Миграция:
- однократный `DB_VERSION` bump и очистка translation/content stores.

## От чего решили отойти

### 1. Не стали полностью ломать текущий `ContentBlock` shape за один патч

Идеальная модель в доках:
- skeleton
- fallback отдельно
- `Text[blockId, lang]` отдельно
- полностью derived state

Что сделали фактически:
- в IDB skeleton теперь хранит fallback (`fallbackText` / `fallbackItems`);
- target text по-прежнему хранится отдельно по `(blockId, lang)`;
- при assemble в UI-модель возвращается обычный `ContentBlock`, но:
  - `text/items` берутся из target text, если он есть;
  - иначе берутся из fallback;
  - `isTranslated` / `is_pending` становятся derived от наличия target text.

Почему:
- это дало рабочий результат быстрее;
- позволило не переписывать весь paginator/UI слой разом;
- снизило риск массивного регресса по Reader.

Минус:
- `ContentBlock` в рантайме пока остается transitional shape, а не “чистая идеальная модель”.

### 2. Не стали сразу удалять старый `translate-status`

Идеальный вариант из доков:
- убрать старый endpoint совсем.

Что сделали фактически:
- фронт больше не использует `translate-status` как основной reconcile path;
- на бэке `translate-status` переведен на **тот же helper**, что и новый `blocks/text`, чтобы не было расхождения логики.

Почему:
- это быстрее и безопаснее для перехода;
- не ломает возможные старые вызовы/ручные инструменты сразу;
- устраняет дублирующуюся серверную логику уже сейчас.

Итог:
- старый endpoint остается как legacy compatibility layer;
- новой истиной для Reader считается `blocks/text`.

### 3. Не стали сразу переписывать `/content?lang=X` в “идеально чистый” snapshot API

Идея в ранних доках:
- `/content` не должен быть источником истины для ready-state.

Это осталось верным.

Что сделали фактически:
- backend `content.get.ts` оставили как mixed snapshot endpoint;
- фронт перестал принимать решения о blur/ready только по “в `block.text` что-то есть”;
- запись в IDB защищена от ошибки “fallback записали как target”.

Почему:
- это устраняет критичный пользовательский баг без тяжелого рефактора server snapshot layer;
- позволяет двигаться итеративно.

Минус:
- `/content` все еще не идеален концептуально;
- но он больше не должен ломать Translation v2 при корректной фронтовой интерпретации.

## Что именно реализовано в коде

### Frontend (`globoox_preview`)

1. Новый API client:
- `fetchBlockTexts(chapterId, lang, blockIds)` в `src/lib/api.ts`

2. Новый Next proxy:
- `src/app/api/chapters/[id]/blocks/text/route.ts`

3. IDB migration:
- `DB_VERSION` увеличен;
- content/translation cache очищается однократно;
- skeleton теперь хранит fallback content.

4. IDB assemble:
- если target text есть -> блок ready;
- если target text нет -> блок собирается с fallback и `is_pending`;
- fallback не должен записываться как target text.
- frontend cache write path теперь пишет target text только если `targetLangReady === true`.

5. Reader:
- pending для UI считается по отсутствию target text;
- frontend runtime normalizes `/content` payload в `targetLangReady`, чтобы primary decision-making не зависел от `isTranslated`;
- reconcile вызывается для current/high + prefetch windows;
- windows переведены на block-based логику;
- есть межглавный добор blockIds через IDB-first.
- visible-window orchestration использует `2 + rest`:
  - первые 2 translatable блока видимой страницы идут в `HIGH`;
  - остальные видимые блоки идут следом, не блокируя first-visible translation.

6. Translation hook:
- recovery и reconcile используют `blocks/text`, а не `translate-status`.

7. Reader metadata + TOC translations:
- chapter titles и book metadata внутри Reader приведены к общей pending/ready модели;
- этот слой больше не рендерится как набор независимых translation hacks;
- runtime path теперь может идти одним bundle-запросом:
  - `POST /api/books/:id/reader-metadata/translate`
- bundle включает:
  - `title`
  - `author`
  - `chapterTitles[]`
- bundle имеет:
  - local cache reuse,
  - in-flight dedupe,
  - единые pending semantics.
- на фронте это вынесено в отдельный hook:
  - `src/lib/hooks/useReaderMetadataTranslations.ts`

8. TOC drawer pending UX:
- не используется blur по отдельным строкам;
- drawer content имеет один общий pending state;
- cover и close button не блюрятся;
- переводимый content drawer (book title, author, chapter subtitle, chapter list) блюрится как единый слой;
- поверх него висит один centered `Translating...` тем же мерцающим стилем, что и в text blocks;
- blur снимается только когда готовы и book metadata, и chapter titles.

### Backend (`globoox`)

1. Новый endpoint:
- `server/api/chapters/[id]/blocks/text.post.ts`

2. Общий helper:
- `server/utils/block-texts.ts`

3. Старый endpoint приведен к той же логике:
- `server/api/chapters/[id]/translate-status.post.ts`

4. Pending recovery:
- `blocks/text` и `translate-status` не держат `pending` бесконечно;
- stale `pending_translations` rows очищаются и трактуются как `missing`;
- это позволяет фронту безопасно переинициировать перевод после abandon/abort сценариев.

5. Persist path:
- `translate.post.ts` использует service-role data path для server-side persistence и cleanup;
- это снижает риск того, что уже принятая команда на перевод останется в полу-состоянии из-за клиентского disconnect.

6. Reader metadata bundle path:
- добавлен bundle endpoint:
  - `server/api/books/[id]/reader-metadata/translate.post.ts`
- он возвращает одним payload:
  - book title
  - author
  - chapter titles
- backend использует:
  - уже сохранённые `chapters.translations`
  - server-side persistent cache для book metadata через `translation_cache`
  - и при необходимости один LLM вызов для missing частей bundle

Это подтягивает reader metadata + TOC ближе к общему Translation v2 contract:
- reconcile/reuse first
- translate only missing
- cache/persist
- не долбить LLM и не держать разрозненные paths

## Финальная рабочая модель

На практике система сейчас должна пониматься так:

1. Reader открывает snapshot главы через `/content`.
2. Snapshot гарантирует, что блоки не пустые.
3. UI не считает snapshot source of truth для готовности языка.
4. Истина готовности:
- local `(blockId, activeLang)` text exists
- или после reconcile/stream этот text появляется
5. Если target text нет:
- рендерится fallback под blur;
- блок попадает в reconcile/translate path.

6. Если стрим был оборван:
- фронт на возврате делает reconcile через `blocks/text`;
- если сервер уже успел сохранить target text, вернётся `ok`;
- если translation task реально ещё в работе, вернётся `pending`;
- если старый `pending` застрял и протух, backend очистит его и вернёт `missing`;
- recovery loop на фронте теперь не просто забывает такие блоки, а запускает background retry translate и продолжает добирать результат через тот же `blocks/text` + stream path.

Практический контракт в текущей реализации:
- если приложение живо, abandoned translate request должен дойти либо через background completion сервера, либо через recovery retry на фронте;
- если серверный процесс умирает полностью во время перевода, durable queue всё ещё отсутствует, поэтому абсолютная гарантия completion между перезапусками процесса не заявляется;
- но вечный `pending` и потерянный `missing` в обычном runtime path больше не являются нормальным состоянием.

## Reader metadata + TOC

Дополнительно к block translation сейчас действует отдельный, но уже выровненный contract для Reader metadata + TOC.

### Что входит в этот слой

- book title
- book author
- chapter titles

### Library vs Reader

Важно:

- в Library остается canonical/original book identity;
- внутри Reader title/author/toc показываются на `activeLang`.

То есть:

- Library = original metadata
- Reader = active-language projection

### Pending semantics

Если `activeLang !== originalLanguage`:

- translated book title/author отсутствуют -> original metadata показываются под blur;
- translated chapter titles отсутствуют -> original titles показываются под blur в TOC;
- один общий pending state управляет всем TOC drawer content.

### Server-side maturity level

Reader metadata + TOC пока не буквально используют block translation pipeline.

Но текущая модель уже сознательно выровнена в ту же сторону:

- local cache
- server-side persistence/cache where possible
- in-flight dedupe
- ready/pending based on existence
- bundle-style translation/reconcile for the whole reader metadata surface

Текущее состояние по зрелости:

1. block text
- самый зрелый path

2. reader metadata + TOC
- один logical bundle path
- chapter titles переиспользуют `chapters.translations`
- book metadata переиспользует server-side persistent cache через `translation_cache`

Следующий логичный этап, если система будет развиваться дальше:

- довести этот bundle до полностью общего reconcile-first abstraction layer уровня block text.

## Локальные замеры latency (localhost, Mar 7)

Измерения делались на локальном backend stream `POST /api/chapters/:id/translate` с дополнительным preflight/postflight через `POST /blocks/text`.

Скрипт:
- `globoox/scripts/measure-translate-latency.ts`

Метрики:
- `TTFB` — время до HTTP response / first stream chunk
- `TTFT` — время до первого `status=ok`
- `DONE` — время до `translate_done`

### Cache hit

1 block, `FR`, cache hit:
- `TTFB ≈ 510 ms`
- `TTFT ≈ 511 ms`
- `DONE ≈ 511 ms`

3 blocks, `FR`, all cache hit:
- `TTFB ≈ 534 ms`
- `TTFT ≈ 535 ms`
- `DONE ≈ 535 ms`

### Cold miss

1 block, `ES`, LLM miss:
- `TTFB ≈ 33.3 s`
- `TTFT ≈ 33.3 s`
- `DONE ≈ 33.6 s`

3 blocks, `ES`, one LLM batch:
- `TTFB ≈ 31.8 s`
- `TTFT ≈ 31.8 s`
- `DONE ≈ 32.1 s`

Вывод:
- узкое место — не streaming transport, а latency одного LLM batch;
- для cold miss время до первого видимого перевода почти совпадало со временем завершения batch;
- поэтому фронтовая orchestration была сдвинута в сторону более раннего first-visible result:
  - первые 2 translatable visible blocks получают `HIGH`,
  - remainder of visible page идёт следом,
  - `LOW/EXTRALOW` по-прежнему остаются отдельным prefetch path.

## Что еще осталось transitional

Это не блокирует текущий патч, но архитектурно пока не идеально:

1. `ContentBlock` shape все еще legacy-friendly.
2. `/content?lang=X` остается mixed snapshot endpoint.
3. `isTranslated` / `is_pending` еще живут как поля совместимости, хотя уже должны мыслиться как strictly derived.

## Что считать финальным решением на сегодня

Финальное решение на сегодня такое:

1. Source of truth:
- `Text[blockId, lang]`

2. Snapshot:
- `/content` нужен для быстрого и непустого рендера

3. Reconcile:
- `POST /blocks/text`

4. UI:
- target text -> no blur
- no target text -> fallback under blur

5. Cache:
- IDB-first, target text отдельно от fallback

## Что делать дальше, если будет следующий этап

Если захотим довести систему до “совсем чистой” архитектуры, следующий этап:

1. сделать единый display model builder для Reader;
2. убрать `isTranslated/is_pending` из общего runtime shape там, где они больше не нужны даже как compat payload;
3. решить, нужен ли legacy `translate-status` вообще;
4. при желании упростить `/content` контракт.

Но для текущего патча это уже не обязательный блокер.
