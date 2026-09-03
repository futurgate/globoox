# Translation v2 — Reconcile API (bulk fetch по blockIds)

> Status note:
> - Основное решение этого документа **взято в работу**: `POST /api/chapters/:id/blocks/text`.
> - Старый `translate-status` не удален мгновенно, а переведен на ту же серверную логику как legacy compatibility layer.
> - Итоговая серверная и фронтовая трактовка зафиксирована в:
>   `translation-v2-final-implementation-and-deviations.md`

Цель: обеспечить “догоночную” синхронизацию переводов после:
- ухода/возврата (abort стримов),
- прыжков по главам/страницам,
- смены `activeLang`,
без скачивания полного `content` и без зависимости от того, что клиент дослушал стрим.

## TL;DR

Нужен лёгкий endpoint, который умеет:
- принять `{ lang, blockIds }`,
- вернуть только то, что реально готово для target языка:
  - `ok`: тексты для `blockIds`, где `Text[blockId, lang]` существует,
  - `missing`: `blockIds`, где текста ещё нет,
- опционально `pending`: если сервер умеет отличать “в очереди” от “не запрашивалось”.

Это не “статус ради статуса”, это bulk fetch `Text[blockId, lang]`.

Ключевая мысль:
- “готово” = `Text[blockId, lang] != null`
- “не готово” = `Text[blockId, lang] == null`

Никакая отдельная сложная сущность status не нужна. Нужен просто удобный bulk-способ получить target texts по `blockIds`.

## Почему не достаточно `GET /content?lang=XX`

`content?lang=XX`:
- большой payload,
- может возвращать “смешанный снапшот” (часть блоков на target, часть fallback/original/last known text),
- не подходит для частого reconcile по окнам (N блоков вперёд/назад).

Важный контракт Translation v2:
- `/content?lang=XX` не является источником истины для ready-state блока;
- `block.text` из `/content` не должен сам по себе означать “перевод готов”;
- ready-state определяется только наличием `Text[blockId, activeLang]`.

## Предлагаемый контракт (backend)

### `POST /api/chapters/:id/blocks/text`

**Request body:**
```json
{
  "lang": "RU",
  "blockIds": ["..."]
}
```

**Response:**
```json
{
  "chapterId": "…",
  "lang": "RU",
  "ok": [
    { "blockId": "…", "type": "paragraph", "text": "…" },
    { "blockId": "…", "type": "list", "items": ["…"] }
  ],
  "missing": ["…"],
  "pending": ["…"]
}
```

Примечания:
- `type` нужен, чтобы корректно собрать `ContentBlock` на клиенте (text vs items).
- `pending` можно не возвращать, если сервер не различает; тогда достаточно `missing`.

## Прокси через Next.js (globoox_preview)

Фронт должен иметь проксирующий route:
- `src/app/api/chapters/[id]/blocks/text/route.ts` → `requireBackendProxy(request)`

И API клиент:
- `src/lib/api.ts`: `fetchBlockTexts(chapterId, lang, blockIds)`

## IDB-first логика перед endpoint

Перед вызовом reconcile endpoint клиент обязан:
1) построить окно blockIds;
2) проверить локально IndexedDB / in-memory;
3) отбросить blockIds, для которых `Text[blockId, activeLang]` уже есть;
4) отправить на сервер только missing.

Это не optional optimization, а обязательное поведение.

## Клиентская reconcile логика (Reader)

На событиях:
- mount Reader,
- смена `activeLang`,
- jump (TOC/search/slider/link),
- возврат из Library,

делаем:
1) вычислить окно blockIds (видимые + prefetch вперёд/назад),
2) выкинуть те, что уже есть в IDB как `Text[blockId, activeLang]`,
3) дернуть `POST /blocks/text` для оставшихся,
4) сохранить `ok` в IDB (по `(blockId, lang)`),
5) обновить UI: блоки с появившимся `Text[targetLang]` перестают быть pending → blur снимается.

Важно:
- UI не должен показывать “не target” без blur.
- отсутствие `ok` для блока не означает “рендерить пусто”; до прихода target-текста рендерится fallback под blur.

## Окна и приоритеты

Translation v2 фиксирует такие размеры окна:
- `HIGH`: блоки видимой страницы / viewport
- `LOW`: 20 блоков вперёд от reading position
- `EXTRALOW`: 10 блоков назад от reading position
- `MAX_BATCH_SIZE`: 10 блоков на flush

Окна должны уметь перетекать через главы, пока не набрано нужное число blockIds.

## Что нужно проверить, чтобы ничего не сломать

- Стримовый `POST /api/chapters/:id/translate` остаётся (для быстрого “push” результатов), но reconcile должен уметь всё восстановить после abort.
- Старый `translate-status` в текущем виде не должен остаться параллельным источником истины.
- Допустимые варианты:
  - удалить его;
  - переиспользовать под новый bulk contract;
  - оставить старый path временно, но поменять смысл ответа на bulk fetch target texts.

Главное:
- в системе не должно остаться двух конкурирующих моделей “готовности перевода”.
