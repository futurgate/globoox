# Content Caching (Client) — Implemented

Цель: чтобы приложение ощущалось “нативным” — минимум сетевых запросов и минимум “loading” при навигации, при этом без залипания на частично переведённом контенте.

## Translation v2 (в работе)

Новая цель: **никогда не показывать “не target язык” без blur** и гарантировать reconcile после ухода/возврата.

См.:
- `docs-for-humans/translation-v2-invariants-and-ui.md`
- `docs-for-humans/translation-v2-reconcile-api.md`
- `docs-for-humans/translation-v2-migration-and-test-checklist.md`

**Важно:** этот документ остаётся источником правды про **структуру** кеша (skeleton + `(blockId, lang)`), но правила “pending/translated/blur/reconcile” для Reader должны читаться из `translation-v2-*`.

## Текущее состояние (как реализовано)

- Контент главы (`GET /api/chapters/:id/content?lang=XX`) кешируется на клиенте **по блокам** (IndexedDB), чтобы partial-переводы не “залипали” целиком.
- Реализация:
  - IndexedDB API: `src/lib/contentCache.ts`
  - Сборка `ContentBlock[]` из кеша: `src/lib/hooks/useChapterContent.ts`
  - Дозапись переводов по мере стрима: `src/lib/hooks/useViewportTranslation.ts`
  - Инвалидация: `useSyncCheck` при изменении `library` scope очищает кеш контента.
  - ⚠️ **Legacy (до Translation v2):** автоперевод в Reader запускается только после серверного snapshot для текущих `(chapterId, lang)` (`hasServerSnapshot`).
    - В Translation v2 семантика “готовности” и reconcile меняются (см. `docs-for-humans/translation-v2-invariants-and-ui.md`).

### 1) Скелет главы (language-agnostic)

Храним:
- `chapterId`
- упорядоченный список блоков: `{ id, position, type, level?, src?, alt?, caption? ... }`

Важно: это структура, которая нужна чтобы собрать страницу сразу.

### 2) Тексты блоков по языкам (language-specific)

Храним отдельно:
- ключ: `(blockId, lang)`
- значение: `text` (для `paragraph/quote/heading`) или `items[]` (для `list`)
- метаданные: `fetchedAt`, (опционально) `updatedAtServer`, `status`

Это идеально совпадает с тем, как сейчас работает перевод:
- `translateBlocksStreaming` возвращает результаты по `blockId` (штучно).
- UI уже умеет мерджить переводы в `displayBlocks` по `id` (`handleBlocksTranslated` в `ReaderView`).

### 3) Сборка `ContentBlock[]` для рендера

На вход: `chapterId`, `lang`.

Алгоритм:
1) Берём “скелет” главы (из IndexedDB, если есть; иначе — сетевой запрос и сохранить скелет).
2) Для каждого блока:
   - подставляем текст для выбранного `lang`, если есть запись `(blockId, lang)` в кеше.
   - если нет — показываем fallback (например оригинал/пусто/blur) и отмечаем как pending.
3) Параллельно: инициируем добор недостающих переводов (через существующий потоковый перевод) и по мере прихода обновляем:
   - UI (`displayBlocks`)
   - IndexedDB запись `(blockId, lang)`

### 4) Правила “freshness” (чтобы не было гонок и залипания)

⚠️ **Legacy (частично):** раздел ниже описывает текущий TTL/“freshness” подход.
Translation v2 вводит reconcile по окну blockIds и строгую семантику pending/blur, поэтому часть правил будет пересмотрена.

Для **оригинального языка**:
- если `book.original_language` известен, можно считать контент “complete” и кешировать смело.

Для **переводных языков**:
- запись `(blockId, lang)` считается свежей, если:
  - она существует, и
  - (опционально) сервер подтвердил версию (ETag/content_version), или
  - TTL не истёк.
- но самое важное: **не считаем “главу целиком свежей”**, если есть pending блоки. Мы обновляем блоки по мере готовности.

### 5) Инвалидация кеша

Минимум (то, что уже есть/легко поддержать):
- При `useSyncCheck`:
  - `library` scope → очистить скелеты/контент (книга удалена/перезалита/переобработана).
  - `settings` scope → обычно не влияет на контент блоков (если только язык по умолчанию).
  - `progress` scope → не должен инвалидировать контент.

Лучшее (если бэк даст версии):
- Инвалидация точечно по `(chapterId, lang)` через версии/ETag.

## Что нужно от бэкенда (минимальные изменения)

Для `GET /api/chapters/:id/content?lang=XX`:

1) **ETag / If-None-Match** (или `content_version`/`content_hash` в body) для “контента на языке”.
   - Фронт сможет получать `304 Not Modified` без payload.
2) Явная семантика готовности перевода:
   - либо на блоках: гарантировать `is_pending` / `isTranslated` (сейчас они есть в типах фронта),
   - либо на уровне ответа: `translation_status: complete|pending` + счётчики pending.

Опционально: эндпоинт “version stamp” на главу:
- `GET /api/chapters/:id/version?lang=XX` → `{ etag/content_hash, status }` чтобы проверять свежесть без скачивания всех блоков.

## Почему это “как нативное”

- Структура главы открывается мгновенно из локального хранилища.
- Переводы подставляются по мере наличия (локальный кеш + стриминг).
- При возврате в приложение не нужно заново скачивать большие JSON массивы.
