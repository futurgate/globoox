# Translation v2 — Инварианты и UI (Reader)

> Status note:
> - Этот документ **остается актуальным** по инвариантам и UI-правилам.
> - Но реализация пошла через переходный compat-слой, а не через полный одномоментный рефактор модели блока.
> - Финальная трактовка того, что именно оставили, что заменили и как это реализовано в коде:
>   `translation-v2-final-implementation-and-deviations.md`

Документ фиксирует **железобетонные правила** отображения текста при переводах и требования к данным, чтобы не было “EN без blur при выбранном RU/FR/ES”, и чтобы уход/возврат в Library не ломал состояние.

Связанные документы:
- `docs-for-humans/content-caching-plan.md` — текущий IndexedDB кеш (скелет + тексты по `(blockId, lang)`).
- `docs-for-humans/api-architecture.md` — прокси `/api/*` через Next.

## TL;DR

- В Reader выбран `activeLang` (селектор языка).
- Для каждого блока существует `Text[blockId, lang]` (может быть `null`).
- Для каждого блока также существует `fallbackText` / `fallbackItems` — это **любой последний известный валидный текст** блока. Не обязательно original/source; это может быть и текст другого языка.
- **Без blur показываем только `Text[blockId, activeLang]` (если он не null).**
- Если `Text[blockId, activeLang] == null`:
  - блок **никогда не пустой**: показываем **fallback** (любой “последний известный” текст) **под blur**;
  - блок **обязательно** попадает в очередь перевода (с приоритетами).
- “Готовность” = наличие `Text[blockId, activeLang]`, а не факт “в block.text что-то лежит”.

## Термины

- `activeLang` — язык в селекторе ридера (`ReaderView`).
- `fallbackText` — любой доступный текст, который можно показать под blur, пока не появился `Text[blockId, activeLang]`.
- `Text[blockId, lang]` — текст/список для конкретного блока и языка (на клиенте это IndexedDB `STORE_BLOCK_TEXT` и/или in-memory).
- `pending` — “для `activeLang` текста нет”.
- `ready` — “для `activeLang` текст есть”.

## Минимальная модель данных блока

Translation v2 требует мыслить блоком так:

- `block skeleton`:
  - `id`
  - `position`
  - `type`
  - `metadata`
- `fallbackText` / `fallbackItems`
- `Text[blockId, lang]`
- вычисляемое `pendingForActiveLang`

Важно:
- `block.text` / `block.items` как одиночное поле не является источником истины о готовности языка;
- `isTranslated` / `is_pending` не являются source of truth для target-языка;
- source of truth ровно один: существует ли `Text[blockId, activeLang]`.

## Инварианты (обязательные)

### I1. Отображение языка

Для каждого блока:
- если `Text[blockId, activeLang] != null` → показываем его **без blur**;
- иначе → показываем `fallbackText` **под blur**.

Запрещено:
- показывать нецелевой текст без blur;
- иметь “пустой блок” (пустой DOM/дырки вместо текста).

### I2. Pending не зависит от “какой-то строки”

`pendingForActiveLang = (Text[blockId, activeLang] == null)`

Нельзя выводить pending/ready из:
- наличия `block.text`;
- `block.isTranslated` без привязки к `activeLang`;
- эвристик по буквам/алфавитам.

### I3. Fallback никогда не записывается как target

Если под blur показывается fallback (EN/последний язык), его нельзя класть/считать как `Text[blockId, activeLang]`.

Иначе система начинает “думать, что переведено” и перестаёт догонять перевод.

### I4. Пустых блоков не бывает вообще

Если `Text[blockId, activeLang] == null`, это не повод рендерить пустую строку, пустой список, пустой DOM или дыру в лэйауте.

Нужно рендерить:
- `Text[blockId, activeLang]`, если он есть;
- иначе `fallbackText` / `fallbackItems` под blur.

### I5. `/content?lang=X` не является источником истины о ready-state

`GET /content?lang=X` может использоваться как снимок skeleton + fallback + target text where available.

Но решение:
- blur / unblur,
- pending / ready,
- enqueue / reconcile

не должно опираться на “в `block.text` что-то пришло”.

Оно должно опираться только на `Text[blockId, activeLang]`.

## State Machine и Guards

Это не абстракция “ради архитектуры”, а формализация правил выше.

### Состояния блока

1. `fallback_only`
- `Text[blockId, activeLang] == null`
- рендерится `fallbackText` под blur
- блок еще не отправлен в очередь

2. `pending`
- `Text[blockId, activeLang] == null`
- рендерится `fallbackText` под blur
- блок уже находится в in-flight / queued переводе или reconcile

3. `ready`
- `Text[blockId, activeLang] != null`
- рендерится target text без blur

Отдельное состояние `stale` для блока не требуется. Для Translation v2 достаточно одного сигнала: есть target text или нет.

### Guards

- `showUnblurred = Text[blockId, activeLang] != null`
- `showBlurred = Text[blockId, activeLang] == null`
- `enqueueTranslate = Text[blockId, activeLang] == null && block is translatable`
- `reconcileFetch = window contains blockIds where Text[blockId, activeLang] == null`
- `neverEmpty = render(Text[blockId, activeLang] ?? fallbackText)`

### Переходы

- `mount Reader`:
  - если `Text[blockId, activeLang]` уже есть локально → `ready`
  - иначе `fallback_only`, затем enqueue/reconcile → `pending`
- `stream result` / `reconcile result`:
  - запись `Text[blockId, activeLang]` → переход в `ready`
- `activeLang changed`:
  - предыдущее `ready` для старого языка не означает `ready` для нового;
  - для нового языка блок заново оценивается только по `Text[blockId, newLang]`
- `return from Library` / `jump`:
  - состояние восстанавливается локально, затем добирается reconcile без зависимости от того, дослушал ли клиент старый стрим

## UI-правило blur

Blur должен включаться только по `pendingForActiveLang`, а не по “внутренним” флагам.

Текущая реализация blur в UI:
- `src/components/Reader/ContentBlockRenderer.tsx` получает `isPending`.

Translation v2 требует:
- `isPending` вычислять как `Text[blockId, activeLang] == null`.

Следствие:
- нельзя включать/выключать blur напрямую по `block.is_pending`;
- нельзя снимать blur только потому, что в блоке уже лежит fallback текст;
- нельзя считать блок “готовым”, если есть текст другого языка.

## Очередь перевода (на уровне поведения)

Правило: если блок отображается под blur для `activeLang`, значит пользователь уже “хочет” этот перевод → блок должен быть запрошен согласно приоритетам.

Приоритеты (план):
1) **HIGH**: блоки видимой страницы/viewport.
2) **LOW**: окно вперёд от reading position на **20 блоков**.
3) **EXTRALOW**: окно назад от reading position на **10 блоков**.

Окна должны “перетекать” через главы (если текущая глава короткая).

Пояснение:
- текущая страница может и дальше использовать уже существующий расчет видимых блоков как источник HIGH-priority;
- но prefetch окна для LOW / EXTRALOW считаются в **блоках**, а не в страницах;
- перед любым походом на сервер клиент сначала сверяется с IDB / in-memory и отбрасывает blockIds, для которых `Text[blockId, activeLang]` уже есть.

## Уход/возврат и abort

Переход в Library/другие страницы может обрывать стрим/запросы перевода. Translation v2 не должен зависеть от того, что клиент “дослушал” стрим до конца.

Требование:
- на входе в Reader выполняется reconcile;
- при смене `activeLang` выполняется reconcile;
- при jump (TOC/search/slider/link) выполняется reconcile;
- при возврате из Library выполняется reconcile;
- reconcile сначала смотрит локальный кэш `(blockId, activeLang)`, потом запрашивает только missing.

## Что убрать из старой ментальной модели

Нельзя больше рассуждать так:
- “если в `block.text` что-то есть, значит блок готов”;
- “если `isTranslated === true`, значит blur не нужен”;
- “если `/content?lang=X` вернул строку, значит это target text”;
- “если стрим был abort, значит блок точно не дойдет”.

Правильная ментальная модель только одна:
- `Text[blockId, activeLang] != null` → ready;
- иначе fallback under blur + enqueue/reconcile.
