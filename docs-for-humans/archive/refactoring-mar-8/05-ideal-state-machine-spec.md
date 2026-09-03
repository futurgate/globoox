# Ideal Translation State Machine Spec

Этот документ фиксирует целевую архитектуру state machine для Reader/Translation на будущее.

Документ не описывает “что уже идеально реализовано сейчас”.
Он описывает:

- каким должен быть целевой state-machine слой;
- как должны разделяться ответственности фронта и бэка;
- какие recovery semantics нужны;
- какие классы багов этот слой должен устранять.

Главная цель:

- не плодить отдельные “истины” в UI, cache assembly, paginator и merge-layer;
- держать один контракт между frontend и backend;
- считать pending/ready через source truth, а не через случайные derived objects.

---

## 1. Почему это нужно

Текущая система уже намного лучше ранней версии patch-а, но всё ещё хрупка в одной конкретной точке:

- данные переводов и их готовность логически живут в одном месте;
- но UI и derived structures иногда копируют эти флаги в другие block-shaped объекты;
- на границах слоёв часть state может потеряться.

Пример реального бага:

- перевод списка уже был готов;
- список при пагинации разбился на item-fragments;
- fragment’ы потеряли `targetLangReady`;
- UI продолжал считать их pending и оставлял blur.

Это не был баг recovery.
Это был баг разделения истины и derived representations.

Следовательно, целевая state machine должна:

- быть отдельным слоем;
- иметь один контракт состояний;
- не позволять paginator/merge/cache-слоям придумывать свои отдельные истины;
- уметь восстанавливать состояние после abort/reload/return;
- делать derived state через selectors, а не через слепое копирование флагов.

---

## 2. Главный принцип

Нужно разделить:

1. `Data truth`
2. `Runtime orchestration`
3. `Derived UI state`

### 2.1. Data truth

Это то, что реально означает “перевод готов”.

Примеры:

- для block text:
  - есть `Text[blockId, lang]`
- для reader metadata + TOC bundle:
  - есть `ReaderMetadataBundle[bookId, lang]`

### 2.2. Runtime orchestration

Это логика:

- когда запускать reconcile;
- когда запускать translate;
- как переживать abort;
- как не допускать duplicate storm;
- как retry/recovery должны вести себя по времени.

### 2.3. Derived UI state

Это уже то, что показывает интерфейс:

- blur / no blur;
- pending label;
- show fallback;
- show translated text.

Derived UI state не должен становиться ещё одной истиной.

---

## 3. Целевая backend state machine

Backend machine отвечает за truth уровня данных и background completion semantics.

### 3.1. Backend responsibilities

Бэк должен быть единственным источником истины для:

- `missing`
- `pending`
- `ready`
- `stale pending`

Бэк не должен быть источником истины для:

- blur
- pagination
- page readability
- active page visuals

### 3.2. Target entity types

Целевая модель должна одинаково описывать несколько сущностей:

1. `block_text`
2. `reader_metadata_bundle`

В будущем можно добавить и другие, но именно так, как сущности state-machine слоя, а не как ad hoc endpoint’ы.

### 3.3. Minimal backend states

Для любой translation entity:

- `missing`
  - target payload отсутствует
- `pending`
  - translation job принята и ещё не стала terminal
- `ready`
  - target payload сохранён и доступен
- `stale_pending`
  - pending завис и должен быть очищен или переведён в retryable path

Опционально позже:

- `failed_terminal`
  - если понадобится явный error state вместо возврата обратно в `missing`

### 3.4. Required backend transitions

Для любой entity:

1. `missing -> pending`
2. `pending -> ready`
3. `pending -> stale_pending`
4. `stale_pending -> missing`
5. `stale_pending -> pending`
   если сервер сам умеет retry

Главное:

- backend не должен оставлять “вечный pending”.

### 3.5. Backend API contract

Для каждой entity backend в идеале должен иметь:

1. `reconcile/fetch-ready`
2. `translate/enqueue`

То есть:

- сначала можно спросить, что уже готово;
- и только missing части запускать в translate.

Цель:

- не заставлять фронт каждый раз заново переводить то, что уже готово;
- не путать fetch existing state и command to translate.

### 3.6. Backend recovery requirements

Backend должен гарантировать:

- stream disconnect не делает `ready` ложным;
- result, который уже был сохранён, всегда можно снова получить через reconcile;
- stale pending не висит бесконечно;
- один и тот же missing entity может безопасно retry-иться.

Желательная, но пока не обязательная цель:

- durable queue / worker model, чтобы translation completion переживал смерть процесса.

### 3.7. Почему backend machine нужна отдельно

Без отдельного backend state-machine слоя:

- фронт вынужден угадывать, что считать missing/pending/ready;
- появляются альтернативные истины;
- recovery становится частично “на глаз”.

---

## 4. Целевая frontend state machine

Frontend machine отвечает не за server truth, а за orchestration и projection в UI.

### 4.1. Frontend responsibilities

Фронт должен отвечать за:

- memory cache;
- IDB cache;
- reconcile scheduling;
- translate scheduling;
- abort handling;
- retry throttling;
- pending/ready selectors для UI.

Фронт не должен сам придумывать:

- что считать ready при отсутствии server/local truth;
- отдельный pseudo-truth внутри paginator fragments;
- альтернативную truth-модель на основе `block.text` или подобного поля.

### 4.2. Frontend state layers

На фронте должно быть явное разделение слоёв:

1. `Local truth cache`
   - memory
   - IDB

2. `Runtime orchestration state`
   - inflight requests
   - recovery queue
   - retry cooldowns
   - abort state

3. `Derived render state`
   - pending
   - ready
   - readable
   - blur/no blur

### 4.3. Required frontend entity contract

Для каждой translation entity фронт в идеале должен уметь:

1. `readLocal(entityKey)`
2. `reconcileRemote(entityKey)`
3. `enqueueTranslate(entityKey)`
4. `selectReady(entityKey)`
5. `selectPending(entityKey)`
6. `selectFallback(entityKey)`

Это важнее, чем конкретная реализация.

### 4.4. Required frontend transitions

Независимо от entity type:

1. `unknown -> local_ready`
2. `unknown -> local_missing`
3. `local_missing -> reconciling`
4. `reconciling -> ready`
5. `reconciling -> pending`
6. `reconciling -> missing`
7. `missing -> translating`
8. `translating -> ready`
9. `translating -> recovery_pending`
10. `recovery_pending -> ready`
11. `recovery_pending -> missing`

Это не обязательно должны быть буквальные enum-ы в одном reducer.
Но этот lifecycle должен быть описуем и одинаков для сущностей.

### 4.5. Critical frontend selectors

Именно selectors должны быть canonical входом для UI.

Примеры:

- `getTranslationEntityId(renderedBlock)`
- `isEntityReady(entityKey)`
- `isEntityPending(entityKey)`
- `shouldBlurEntity(entityKey)`
- `getVisibleText(entityKey)`

Важно:

- UI не должен напрямую доверять случайным полям на fragment/block clone.

### 4.6. Why selectors matter

Пока UI читает состояние прямо с derived block object:

- paginator может потерять флаг;
- merge-layer может переписать его;
- cache assembly может собрать новый object shape;
- и в итоге blur/pending будет неверным.

Если же UI всегда спрашивает selector по `parentId ?? id`:

- derived block может быть новым объектом;
- но truth всё равно останется привязана к source entity.

### 4.7. Frontend recovery requirements

Фронт должен гарантировать:

- abort не теряет уже начатый server-side result permanently;
- return/reload может добрать готовое через reconcile;
- failed recovery не создаёт infinite retry storm;
- translated content не может “исчезнуть”, если уже есть в local truth cache;
- derived layers не ломают ready-state.

### 4.8. Frontend layout boundary rule

Критически важное правило:

- translation state не должен копироваться как доверенная истина в pagination/layout fragments.

Допустимо:

- fragment знает `parentId`

Нежелательно:

- fragment живёт как самостоятельный источник `targetLangReady`

Если флаг на fragment всё же есть, он должен считаться только как mirror/cache и не быть canonical.

---

## 5. Entity model on the frontend

Целевая abstraction layer должна работать не с “произвольными компонентами”, а с translation entities.

### 5.1. Current practical entities

1. `block_text`

Key:

- `blockId + lang`

Truth:

- наличие target text

2. `reader_metadata_bundle`

Key:

- `bookId + lang`

Truth:

- наличие готового bundle:
  - title
  - author
  - chapterTitles[]

### 5.2. Why bundle is right for TOC + title + author

Это один UI-блок по смыслу:

- один общий blur;
- один общий pending label;
- one-shot readiness expectation.

Следовательно, bundle — более правильная entity, чем много мелких title entities.

---

## 6. Recommended file structure for the future

### 6.1. Backend

Целевой слой:

- `server/utils/translation-machine/`

Примерно:

- `entity-contract.ts`
- `block-text-machine.ts`
- `reader-metadata-machine.ts`
- `reconcile.ts`
- `pending-cleanup.ts`

Важно не название папки, а отделение логики machine от endpoint handlers.

Endpoint’ы должны стать thin wrappers.

### 6.2. Frontend

Целевой слой:

- `src/lib/translation-machine/`

Примерно:

- `entity-keys.ts`
- `selectors.ts`
- `local-truth.ts`
- `reconcile.ts`
- `recovery.ts`
- `runtime-state.ts`
- `block-text-adapter.ts`
- `reader-metadata-adapter.ts`

UI должен потреблять:

- selectors
- small hooks wrapping selectors/orchestration

А не raw ad hoc flags из разных слоёв.

---

## 7. Practical migration strategy

Это не нужно делать “одним большим переписыванием”.

### Stage 1

Сначала нужно:

- перестать принимать decisions по derived fragment flags;
- перевести pending/ready для rendered blocks на selectors по source entity.

Это уже сильно уменьшит хрупкость.

### Stage 2

Затем:

- централизовать reconcile/recovery selectors;
- отделить runtime orchestration state от UI components.

### Stage 3

Потом:

- привести `reader metadata bundle` и `block text` к одному abstraction contract.

### Stage 4

Только после этого:

- вычищать старые compat fields;
- убирать transitional duplication.

---

## 8. What this architecture should prevent

Целевая state machine должна предотвращать следующие классы багов:

1. Перевод уже готов, но blur не снялся.
2. Stream оборвался, а UI не может позже догнать ready result.
3. Paginator fragment потерял ready-state и стал отдельной ложной истиной.
4. Return/reload запускает лишний translate вместо reconcile existing result.
5. Pending завис бесконечно и фронт бесконечно ретраит без stop condition.
6. Bundle-перевод TOC/title/author ведёт себя не так, как text-block path.

---

## 9. Short target definition

Идеальная архитектура должна быть такой:

- backend machine:
  - знает truth и terminal transitions
- frontend machine:
  - знает local truth, orchestration и selectors
- paginator/layout:
  - не создают свою отдельную translation truth
- UI:
  - всегда читает derived state только через canonical selectors

Если коротко:

- одна истина;
- один контракт;
- разные adapters для разных сущностей;
- никаких самостоятельных “мини-state-machines” внутри fragments, pagination и cache assembly.
