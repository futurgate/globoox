---
type: reference-and-proposal
status: current-contract-with-proposed-extension
owner: library
last_verified: 2026-09-16
backend_proposal_status: not-implemented
implementation:
  - src/lib/api.ts
  - src/lib/useBooks.ts
  - src/lib/useBooksState.ts
  - src/lib/libraryReadingState.ts
  - src/app/(app)/my-books/page.tsx
  - src/app/(app)/api/_proxy.ts
  - src/lib/hooks/useSyncCheck.ts
  - src/lib/contentCache.ts
  - src/lib/store.ts
  - src/components/Reader/ReaderView.tsx
---

# Контракт библиотеки: как работает сейчас и что нужно от сервера

**Назначение:** точная передача контракта следующему frontend/backend-агенту. Этот документ не является описанием уже реализованного серверного snapshot. Разделы «Предлагается» — проект контракта, а не доступные API. Запрос пользователя на текущую стабилизацию интерфейса не превращает эти предложения в сделанный backend.

## 1. Границы проверки и статус

| Вопрос | Ответ / степень доказанности |
| --- | --- |
| Что проверено непосредственно | TypeScript-модели и потребители API в этом frontend; Next.js proxy; локальные кеши; алгоритмы синхронизации/сохранения позиции. Это **контракт, который потребляет клиент**, а не аудит серверной БД. |
| Что доступно из runtime | [Диагностика 15 сентября](../../rfcs/active/library-loading-stability-2026-09-16/audit-2026-09-15.md) описывает гостевую библиотеку из 6 книг на dev. Там наблюдались `x-authenticated: false`, около 2,84 МБ тела списка и около 4,9 с запроса. Это отдельные гостевые лабораторные прогоны, не SLA и не доказательство поведения любой пользовательской библиотеки. |
| Чего здесь нет | Доступа к исходникам текущего удалённого backend, его транзакциям, индексам, SQL, точному правилу сортировки и гарантиям момента фиксации timestamp. Нельзя приписывать им поведение только из комментариев frontend. |
| Текущая frontend-реализация | На 16 сентября стабилизация `my-books/page.tsx`, `useBooks.ts`, progress queue и scoped metadata реализована локально; итоговый build/deploy проверяется отдельно. [Implementation record и QA](../../rfcs/active/library-loading-stability-2026-09-16/README.md) описывает текущие исходники и ограничения доказательств. Последовательности, явно помеченные **baseline до этой правки**, сохранены для объяснения причин, а не как утверждение, что прежний баг остаётся в итоговом UI. |
| Статус предлагаемого сервера | **НЕ РЕАЛИЗОВАН.** `last_read_at`, согласованный серверный порядок, `snapshot_version`, cursor, подтверждённая identity ответа и описанные ниже сообщения v2 пока не входят в потребляемый frontend-контракт. |
| Что сохранить | Старые JSON/NDJSON ответы, приватность/права, `active`/`hidden`/удаление, реальные данные и все существующие документы. Этот файл добавлен отдельно; старые RFC и billing-документы не изменялись. |

Связанные материалы: [действующая архитектура API/sync](api-and-sync.md), [исторический RFC server snapshot](../../rfcs/active/my-books-server-snapshot.md), [offline-first RFC](../../rfcs/active/offline-first-sync.md). Утверждения старого RFC о backend требуют повторной проверки в его репозитории; здесь они не считаются свежим серверным доказательством.

> Пути к исходникам ниже — от корня frontend-репозитория. Неизменяемая копия исходной диагностики хранится по `docs/rfcs/active/library-loading-stability-2026-09-16/audit-2026-09-15.md`: тело сохранено байт в байт, перед ним добавлен frontmatter с SHA-256. Исходный исследовательский файл сохранён отдельно.

## 2. As-is: маршруты и HTTP-контракт

| ID | Операция клиента | Запрос | Что клиент ожидает | Scope / ограничения / точный источник |
| --- | --- | --- | --- | --- |
| A01 | Список JSON, `fetchBooks` | `GET /api/books?status=active` либо `status=all`; параметр может отсутствовать | JSON-массив `ApiBook[]`, **не** `{items: [...]}` | Browser использует относительный `/api`; `src/lib/api.ts: fetchBooks`. Список заполняет `bookByIdCache` и best-effort `book_meta` с literal scope `guest`; hook дополнительно пишет настоящий scoped cache. |
| A02 | Список потоком, `fetchBooksStreaming` | `GET /api/books?status=...&stream=1`, browser `Accept: application/x-ndjson` | Строки NDJSON `{"type":"books","items":[...]}`; при другом Content-Type — fallback на JSON `ApiBook[]` | `api.ts: fetchBooksStreaming`. `onBatch` получает **текущий batch**, не весь накопленный список, плюс `isFirst`; Promise возвращает весь накопленный список после EOF. |
| A03 | Share/curated доступ | К каждому пути, начинающемуся на `/api/books`, добавляется `share=<token>`, если localStorage хранит токен | Та же shape ответов; разрешённый curated набор определяется сервером | `api.ts: getShareToken`, `withShareToken`, `getGuestScopeKey`. Токен — секрет доступа; не писать его в документацию/метрики как открытый scope. Для потока query собирается отдельно с тем же токеном. |
| A04 | Получить одну книгу, `fetchBook(id)` | Фактически `GET /api/books`, затем `.find(id)` в клиенте | Один `ApiBook`; если ID отсутствует — `Error('Book not found')` | Хотя Next.js route `GET /api/books/{id}` существует, helper обходит его из-за несовместимости некоторых backend deployments. Это ещё один потребитель старого массива, который нельзя сломать общей заменой JSON на envelope. |
| A05 | Создать metadata книги | `POST /api/books` с `{title, author?, cover_url?, source_language?}` | `ApiBook` | `api.ts: createBook`. Это не полный upload-processing pipeline; upload EPUB использует отдельные операции. Не выдавать metadata POST за весь импорт. |
| A06 | Archive / Restore | `PATCH /api/books/{id}` с `{status:'hidden'}` / `{status:'active'}`; также поддержаны `title?`, `author?` | `ApiBook` | `api.ts: updateBook`; hook оптимистично обновляет карточку и кеш, при ошибке откатывает. Archive не равен DELETE. |
| A07 | Удалить книгу | `DELETE /api/books/{id}` | `{success:boolean}` | `api.ts: deleteBook`; hook оптимистично удаляет из списка, откатывает при ошибке. В используемом list-контракте нет tombstone/cursor delta. |
| A08 | Позиция чтения | `GET /api/books/{id}/reading-position` | `ReadingPosition` | `api.ts: fetchReadingPosition(bookId, signal?, scopeKey='guest')`; отдельный 30 с memory cache. В frontend-правке 16 сентября ключ изменён с одного `bookId` на `scopeKey::bookId`; `saveReadingPosition` инвалидирует/обновляет тот же scoped key. HTTP-контракт не меняется. Caller должен передать реальный scope; default `guest` сам identity не определяет. |
| A09 | Сохранить позицию | `PUT /api/books/{id}/reading-position`, JSON `SaveReadingPositionRequest` | `SaveReadingPositionResponse`; `persisted` проверяется отдельно от HTTP успеха | `api.ts: saveReadingPosition`; Reader вызывает для authenticated user. Детали в разделе5. |
| A10 | Проверить версии scopes | `GET /api/sync/status` | `{account_version:string|null, scopes:{library:string|null, progress:string|null, settings:string|null}}` | `api.ts: fetchSyncStatus`; `useSyncCheck` трактует scope values как даты и сравнивает `new Date(server)>new Date(local)`. Сейчас это не opaque version protocol. |
| A11 | Смена выбранного языка книги | `PATCH /api/books/{id}/language` с `{selected_language:lang.toUpperCase()}` | `ApiBook` | `api.ts: updateBookLanguage`; не должна искусственно означать «книгу читали», если пользователь не начал чтение. Точная серверная связь с updated/sync timestamps здесь не проверена. |

### Формы данных, которые реально объявлены у клиента

```ts
interface ApiBook {
  id: string
  title: string
  author: string | null
  cover_url: string | null
  original_language: string | null
  available_languages: string[]
  selected_language?: string | null
  status: string
  created_at: string
  is_own?: boolean
}

interface ReadingPosition {
  book_id: string
  chapter_id: string | null
  block_id: string | null
  block_position: number | null
  sentence_index?: number | null
  total_blocks?: number | null
  lang: string | null
  updated_at: string | null
}

interface SaveReadingPositionRequest {
  chapter_id: string
  block_id?: string | null
  block_position?: number | null
  sentence_index?: number | null
  lang?: string | null
  updated_at_client?: string
}

interface SaveReadingPositionResponse {
  success: boolean
  persisted: boolean
  reason?: 'stale_client'
  book_id?: string
  chapter_id?: string
  block_id?: string | null
  block_position?: number | null
  content_version?: number
  total_blocks?: number
  updated_at?: string
}
```

Это TypeScript-декларации, а не строгая runtime-валидация всего ответа. У `ApiBook` **нет** `last_read_at`, позиции, `rank`, `snapshot_version`, `next_cursor` или cover width/height. `cover_url` может содержать inline data URI: именно такой тяжёлый payload наблюдался в гостевом runtime. Клиент не может рассчитывать, что это всегда отдельный HTTP URL.

## 3. As-is: scope, auth и stream

| ID | Участок | Проверенное поведение | Последствие / чего это не гарантирует |
| --- | --- | --- | --- |
| B01 | Scope страницы | User ID при `isAuthenticated && user.id`, иначе `getGuestScopeKey()` → `guest` или `share:<token>` | Scope кеша и реальная серверная identity не одно и то же. До завершения auth нельзя считать предполагаемый guest scope подтверждённой личностью. |
| B02 | Выбор status в hook | Текущая страница передаёт явное `isAuthenticated`; `true` → `status=all`, `false` → `active`. При отсутствии опции совместимый fallback исключает `guest` и `share:*` из authenticated-like scopes | Baseline использовал только `scopeKey !== 'guest'` и ошибочно относил `share:*` к authenticated-like. Исправление локальное: backend всё равно обязан проверять права; параметр `all` не даёт гостю чужих книг. |
| B03 | Browser token | Browser helper ищет access token, кеширует около 3 с, добавляет Bearer к local API | Сам по себе этот Bearer не доказывает, что удалённый backend получил ту же сессию. |
| B04 | Proxy identity | `_proxy.ts` заново читает cookie-session Supabase; Bearer к backend формирует из неё | Входящий browser Authorization не пересылается буквально. Возможна временная несогласованность browser/session-cookie; точная частота не измерена. |
| B05 | Диагностика auth | JSON/stream responses от proxy имеют `x-authenticated` и `x-data-source: backend` | `x-authenticated` отражает наличие session в proxy, не подтверждение backend principal/subject. Обычный JSON helper лишь предупреждает при `false`; текущая streaming функция не возвращает headers вызывающему hook. |
| B06 | Сохранённый auth retry | После первого сетевого результата authenticated scope hook делает ещё один JSON fetch через 1200 мс, даже если первый успешен. Ранний usable список уже показывается; guest/share retry не выполняют | Это frontend workaround, **не серверный контракт и не обязательная задержка UI**. Текущая стабилизация сохраняет его до исправления auth end to end, но отменяет применение устаревшего request/scope; не воспроизводить unconditional retry в новом серверном протоколе. |
| B07 | NDJSON parsing | Каждый непустой line парсится отдельно; невалидный JSON пропускается; неизвестный `type` пропускается | Текущее silent skip не доказывает целостность потока. `books` добавляются без version/sequence validation; `type:'error'` бросает Error с `message`. |
| B08 | Конец потока | EOF завершает Promise; завершающая строка без `\n` также обрабатывается | Обязательного `complete` сообщения нет. Чистый ранний EOF невозможно отличить от корректно законченного списка только по текущей shape. HTTP/network ошибка выявляется, но отсутствие tail по смыслу — не обязательно. |
| B09 | Batch semantics | Первая строка `type:'books'` вызывает `onBatch(items,true)`; следующие false; batches накапливаются в массив | Длина первого batch и глобальный серверный порядок **не определены в этом frontend-контракте**. Комментарий «head before tail server query» — намерение, не доказательство backend реализации. |
| B10 | NDJSON proxy | При response Content-Type, содержащем `ndjson` или `event-stream`, передаёт `res.body` без `await json`, добавляет `Cache-Control:no-cache` и `X-Accel-Buffering:no` | Proxy умеет passthrough SSE, но list parser умеет **NDJSON, а не SSE `data:` framing**. Для библиотеки использовать NDJSON. |
| B11 | Proxy headers / abort | Пересылает path/query/method/body; входящий `Accept`, version headers и `request.signal` сейчас не прокидываются в backend fetch | Negotiation нового контракта по query дойдёт; negotiation исключительно по Accept потребует явного изменения proxy. Browser abort не гарантирует остановку backend работы. |
| B12 | Cache policy | `/api/books*` исключены из общего 2 с GET response cache/in-flight dedupe; список имеет отдельный 5 мин SWR cache; position — 30 с | Memory/IDB/position freshness различны. Очистка одного слоя не означает атомарную публикацию всего UI. |

### Шесть книг — ограничение интерфейса, не пагинация сервера

Baseline `BOOKS_BATCH_SIZE=6`: frontend сортирует/фильтрует **весь уже полученный массив**, показывает первые `visibleCount`, затем увеличивает count на 6 через IntersectionObserver (`rootMargin:240px`). Запрос списка не содержит `limit=6`, `offset`, `page` или `cursor`; stream продолжает приносить tail независимо от видимой шестёрки.

Следовательно:

- показ 6 карточек не доказывает получение только 6 объектов по сети;
- книга из позднего batch может попасть в первую шестёрку после клиентской сортировки;
- локальная сортировка доступного префикса не доказывает, что он содержит **глобальные** 6 последних книг;
- отменить tail и считать остаток отсутствующим нельзя: в старом контракте нет continuation cursor;
- новый серверный `head_limit` должен быть отдельной явно описанной возможностью, а не переименованием текущего `visibleCount`.

## 4. As-is: откуда берётся Recently Read

| Источник | Реальная семантика / запись | Что можно и нельзя из него выводить |
| --- | --- | --- |
| `ApiBook.created_at` | Время создания книги по payload | Recently Added; не последнее чтение. Может быть стабильным fallback для никогда не открывавшихся книг, но это должно быть одинаковым явно выбранным правилом. |
| Server `ReadingPosition.updated_at` | Timestamp, присланный GET/PUT позиции | Клиент использует как свежесть сохранённого anchor и иногда как last-read proxy. Серверную точную семантику момента записи/чтения не проверили. Это **не объявленное отдельное `last_read_at`**. |
| IDB `position.updated_at` | Последнее известное поле позиции; может происходить от сервера или локального pending anchor | Нельзя все IDB values объявлять серверными: Reader до запроса записывает туда локальный `anchor.updatedAt`. |
| IDB `updatedAt` | Дополнительная клиентская метка записи/касания; `touchCachedLastRead` может обновлять её без позиции | Не использовать как доказанное глобальное чтение. Хранить происхождение события отдельно при новом контракте. |
| Zustand `progress[id].lastRead` | `touchLastRead`/`updateProgress` устанавливают local wall clock `now` | Это локальное наблюдение открытия/прогресса. До server acknowledgement другие устройства о нём не знают. |
| Baseline `updateServerProgress` | Также устанавливал `lastRead=now` при фоновой гидратации | Семантический дефект: время получения server progress не равно чтению. Текущая frontend-правка больше не записывает `now` из revalidation; не переносить прежнюю семантику на backend. |
| Frontend-уточнение 16 сентября | Новые `localLastReadAt` + `localLastReadScope` отделяют локальное действие от `serverUpdatedAt` + `serverProgressScope`; фоновый `updateServerProgress` сохраняет прежний `lastRead`, для новой строки берёт серверный timestamp вместо `now` | Это клиентские metadata, не новые поля server API. Страница доверяет новым scoped timestamps только в соответствующем scope. Legacy `lastRead`, у которого есть `serverUpdatedAt`, не считается самостоятельным чтением: старое значение мог создать sync. У старых записей без происхождения нельзя восстановить гарантированную identity задним числом. |
| `CachedLibraryViewSnapshot` | `{order, effectiveLastReadByBookId, computedAt, fetchedAt}`, scope+view в ключе | Snapshot UI-порядка, не server snapshot/version. В baseline восстановление использовало преимущественно `order`, а sorter менялся при `progressHydrated`; это причина возможных A→B→A перестановок. |
| Server `/sync/status.scopes.progress` | Глобальный timestamp изменения progress scope аккаунта | Сигнал invalidation. Не last-read каждой книги и не готовый порядок библиотеки. |

Baseline sorter выбирал первое валидное значение по приоритету `server_updated_at → idb_updated_at → Zustand.lastRead`, а не максимальную **подходящую по смыслу** метку. Поэтому более старый server timestamp мог перекрывать только что произошедшее локальное чтение. Простая замена на `max` помогает лишь после разделения реального события и времени синхронизации: ошибочно записанное `lastRead=now` тоже станет ложным максимумом.

Baseline server revalidation выбирала из исходного `books` первые `visibleCount+6` ID, волнами по 4 GET, и публиковала собранные результаты после всех волн. Теперь очередь выбирает этот prefix после текущей фильтрации/сортировки; новые ID дополняют очередь, не отменяя начатые GET. Concurrency остаётся 4, результаты публикуются после drained sweep; scope/progress version/unmount прекращают применение старой очереди. Это всё ещё не получение recency всех книг и не гарантия финального глобального Recently Read. Новые серверные поля и серверный порядок этой frontend-работой не добавлены.

## 5. As-is: сохранение позиции и `stale_client`

| Шаг | Проверено в клиенте | Ограничение |
| --- | --- | --- |
| Локальный anchor | `ReaderView.saveAnchor` создаёт логическую позицию chapter/block/sentence с `updatedAt=new Date().toISOString()` | Номер визуальной страницы не является долговечным anchor. Время зависит от часов устройства. |
| Частота | Сохранения примерно раз в 1 с; последнее pending таймера flush на pagehide/beforeunload/hidden и cleanup | Это throttle/flush текущего anchor, не гарантированная доставка offline очереди. Обычный fetch при уходе страницы может не завершиться. |
| Перед PUT | `storeSetAnchor`; для authenticated — scoped IDB position с `pendingAnchor` | Локальная позиция остаётся доступна даже при ошибке сети. |
| PUT | Отправляются chapter/block/position/sentence/lang и `updated_at_client=anchor.updatedAt` | Сейчас нет отдельного `expected_position_version`, `event_id`, `device_id` или формализованного compare-and-set token. Нельзя считать `updated_at_client` доказанным CAS revision. |
| `persisted:true` | Helper может заполнить 30 с position cache; Reader синхронизирует anchor timestamp по `response.updated_at`, записывает IDB без pendingAnchor | Подтверждение хранения определяется `persisted`, а не только HTTP 200/`success`. Точный server conflict algorithm требует backend-проверки. |
| `persisted:false, reason:'stale_client'` | Helper заранее удалил memory cache; Reader делает GET актуальной позиции, затем обновляет локальный anchor/IDB при наличии валидных полей | Смысл, предполагаемый клиентом: сервер считает свою позицию новее и отверг запись. Не «попробовать тот же payload до успеха» и не «передвинуть клиента вперёд на максимум страницы». |
| Гонка при ответе | `lastAnchorRef` корректируется лишь если blockId ещё совпадает с исходным; серверный `total_blocks` может обновить progress | Одна проверка blockId не задаёт полную линейную упорядоченность событий разных устройств. Не обещать, что любой обратный по времени ответ безопасен во всех сценариях. |
| Ошибка сети | Reader сохраняет local fallback, catch не делает rollback | В изученном пути нет подтверждённого durable outbox с event IDs/retry/ack. `pendingAnchor` в IDB сам по себе не является реализованным replay-протоколом; отдельного автоматического обхода/replay этих записей в изученном коде не обнаружено. |

`stale_client` относится к конфликту **позиции**, не к тому, произошло ли позднее реальное чтение. Пользователь может открыть книгу и остаться на том же block, перечитать раннюю главу или читать офлайн: прогресс не обязан численно расти, а last-read событие всё равно может быть новым.

## 6. As-is: sync timestamps

`useSyncCheck` делает best-effort GET на mount и возвращение visible вкладки; минимальный интервал 30 с действует внутри текущего экземпляра hook. Проверка пропускается до Zustand hydration; timestamp следующей попытки ставится до самого запроса. Network errors не выводятся как ошибка библиотеки.

| Scope | Что делает текущий клиент при более новом timestamp | Что не гарантируется |
| --- | --- | --- |
| `library` | Очищает memory books cache, best-effort persisted list/meta и chapter content caches | Сам `invalidateBooksCache` не равен явному fetch/React update. В текущем `useBooks` отдельной подписки на `syncVersions.library` нет; cache invalidation не считать гарантией мгновенного обновления уже смонтированного списка. |
| `progress` | Очищает 30 с memory position cache и IDB positions, обновляет store версии | Это coarse invalidation, не набор изменившихся book IDs и не атомарный snapshot списка+progress. |
| `settings` | Запоминает более новую метку | Нет доказанного fetch/apply settings pipeline из этой проверки. |
| `account_version` | Если falsy/null, hook завершает проверку | Комментарий описывает guest→null; runtime всех auth/guest разновидностей этим документом не тестировался. Значение не используется как snapshot страницы. |

Текущий `isNewer` сравнивает parseable timestamps. Если будущий backend заменит их на UUID/hash/counter-string без изменения клиента, такой клиент перестанет правильно определять «новее». **Новый opaque snapshot token надо добавить отдельным полем**, сохранив legacy date fields до миграции.

## 7. To-be: минимальное расширение для быстрого и стабильного первого экрана

**Предлагается, не реализовано.** Цель — получить корректный серверный head вместе с данными для порядка, показать его немедленно и доставлять tail постепенно. Не ждать загрузки всей библиотеки, всех обложек и N reading-position GET перед первыми карточками.

### Основная таблица as-is → to-be

| ID | Сейчас | Требуемое совместимое расширение | Проверяемая гарантия / владелец |
| --- | --- | --- | --- |
| T01 | Массив книг без declared sort | Опциональный v2 query `library_contract=2`; server `sort`/`direction` с documented tie-break | Legacy query без opt-in сохраняет старую shape. Backend сортирует разрешённый полный набор **до выбора head**. |
| T02 | `status=active/all` + local hidden filter | В v2 отдельный `visibility=visible|hidden|all`, согласованный с текущими effective visibility rules; legacy `status` сохраняется | Сервер фильтрует до limit, не выдаёт скрытые карточки внутри visible head. Правила `status !== hidden` vs `active` должны быть проверены по backend, не угаданы. |
| T03 | First batch неизвестной длины/порядка | `head_limit=6` для первого экрана; head определён как первые 6 **или меньше, если меньше доступно** | Эти 6 глобально первые в snapshot, не произвольные первые записи БД. Head не ждёт сериализации tail/всех cover blobs. |
| T04 | Для сортировки нужны per-book positions | В каждый v2 item добавить `last_read_at:string|null`, а при необходимости компактный `reading_progress` | Первый экран не требует fanout GET для определения порядка. GET reading-position остаётся для точного Reader restore. |
| T05 | Server updated_at смешивается с чтением | `last_read_at` = последнее принятое сервером **реальное reader activity/open** событие по определённой ниже политике | Metadata edit, list GET, position GET, sync, cache hydration не обновляют last_read_at. `null` = server не знает принятого события, не «время сейчас». |
| T06 | Head и tail могут отражать разное состояние | `snapshot_version` opaque token + query/scope fingerprint; единая последовательность на всё перечисление | Все batches/cursors относятся к одному порядку. Изменение progress посередине не вставляет новую книгу перед уже выданным head данного snapshot. |
| T07 | EOF считается успехом без маркера | V2 `meta`, `books` с sequence/offset/phase и обязательный `complete` либо `error` | Сетевая тишина/ранний EOF не превращают частичный список в полный. Уже показанный валидный head можно оставить, но состояние остаётся partial/retryable. |
| T08 | Все книги передаются сразу; UI6 лишь slice | В v2 два явных режима: полный streamed enumeration по умолчанию и опциональный cursor paging | При streaming первый head доставляется сразу, tail фоном. При paging limit/cursor реально ограничивают ответ; legacy клиенты продолжают получать полный массив/stream. |
| T09 | Auth retry после каждого first result | До первого v2 meta server/proxy подтверждают действительную identity; при несовпадении ожидаемого auth user — явная ошибка/refresh auth | Нельзя показать guest fallback как личную библиотеку. Retry только по определённому recoverable auth/network condition с лимитом, не на всякий случай + 1200 мс. |
| T10 | Inline base64 cover без размеров | Добавить компактный `cover:{thumbnail_url,width,height,version}`; `cover_url` сохраняется | Metadata head не должен зависеть от скачивания/декодирования всех оригиналов. URL доступен только разрешённому scope, для private covers учитывается срок доступа. |
| T11 | Sync timestamps только invalidate scopes | Добавить отдельную версию order/list snapshot или endpoint capability; старые даты оставить | Изменение last_read_at должно инвалидировать view Recently Read через progress/order version. Нельзя привязать snapshot только к membership library timestamp. |
| T12 | Позиция принимает только client timestamp | Опциональные `expected_position_version`, `event_id` и серверный position version; legacy поля работают в legacy режиме | Описанный CAS/idempotency режим включается отдельно. `stale_client` сохраняется для старого клиента; новое событие чтения не теряется автоматически из-за отклонённого старого anchor. |

### Рекомендуемая серверная сортировка

Для v2 `sort=recently_read&direction=desc` предлагается:

1. `last_read_at DESC NULLS LAST`;
2. `created_at DESC`;
3. `id ASC` как окончательный deterministic tie-break.

Это **предлагаемое** правило для одинаковых/неизвестных timestamps, не утверждение о текущем backend. Аналогично для `recently_added`/title нужны явные tie-break, язык/collation title и обработка пустого title. Query fingerprint включает scope, visibility, sort, direction и используемую collation; нельзя применять cursor одного режима к другому.

Сервер может получать top через индекс/кеш/материализованную view. Конкретный SQL и технология snapshot выбираются после проверки backend. Гарантия относится к результату, а не предписывает держать длинную DB-транзакцию весь HTTP stream.

## 8. Пример совместимого NDJSON v2

Существующий `/api/books` сохраняется; расширение включается query, который текущий proxy уже пересылает. Имена новых query/полей ниже **предлагаемые**.

```http
GET /api/books?status=all&stream=1&library_contract=2&visibility=visible&sort=recently_read&direction=desc&head_limit=6
Accept: application/x-ndjson
```

```json
{"type":"meta","contract_version":2,"snapshot_version":"opaque-snapshot-A","scope_kind":"user","scope_fingerprint":"opaque-scope-A","sort":"recently_read","direction":"desc","visibility":"visible","head_limit":6}
{"type":"books","snapshot_version":"opaque-snapshot-A","sequence":0,"phase":"head","offset":0,"items":[{"id":"book-A","title":"Example","author":null,"cover_url":null,"original_language":"EN","available_languages":["EN"],"status":"active","created_at":"2026-09-01T12:00:00.000Z","last_read_at":"2026-09-16T08:00:00.000Z"}]}
{"type":"books","snapshot_version":"opaque-snapshot-A","sequence":1,"phase":"tail","offset":1,"items":[]}
{"type":"complete","snapshot_version":"opaque-snapshot-A","returned_count":1,"has_more":false,"next_cursor":null}
```

Пример намеренно содержит 1 книгу, чтобы показать корректный head меньше 6; в реальном полном списке пустой tail batch не нужен. Сообщения по одной JSON-строке; optional whitespace не меняет framing.

| Поле/событие | Обязательная договорённость v2 |
| --- | --- |
| `meta` | Приходит до books; подтверждает negotiated contract и scope/order context. Не раскрывает bearer/share token. При неправильной сессии не слать «валидную guest meta» вместо user; вернуть конкретный auth failure до публикации приватной view. |
| `snapshot_version` | Непустой opaque token; совпадает во всех сообщениях одного ответа и cursor продолжениях. Не parseDate и не автоматически тот же token, что legacy `/sync/status`. Входит progress/order состояние, не только состав книг. |
| `sequence` | Последовательный номер batch, старт 0, без пропусков и повторов. |
| `offset` | Количество ранее выданных элементов этого перечисления; при cursor continuation договориться о глобальном offset или сохранить его внутри cursor. |
| `phase` | Первый реальный batch `head`, остальные `tail`. Для empty library — `head` с `items:[]`, затем complete 0. |
| `items` | Старые обязательные поля `ApiBook` остаются. Новые timestamps/null передаются явно. Не повторять ID в пределах snapshot. Все items уже разрешены для запрашивающей identity. |
| `complete` | Только он подтверждает завершённость данного режима ответа. В stream-all `has_more:false`; в page mode может быть true с next_cursor. До complete нельзя сохранять частичный поток как полную библиотеку. |
| `error` | Совместимая основа `{"type":"error","message":"..."}`, v2 добавляет `code`, `retryable`, `snapshot_version` если известен. После error не слать complete как успех. |
| `next_cursor` | Опциональный режим paging; подписанный/непрозрачный cursor привязан к user/share scope, query fingerprint и snapshot. Нельзя доверять клиентскому cursor как разрешению на книгу. |
| Истёкший snapshot | Например typed `snapshot_expired`/409 **в согласованном v2 контракте**; клиент начинает новый snapshot, не дописывает старый tail к новому. Точный HTTP status требует backend-согласования. |
| `total_count` | Необязателен; не ждать дорогого COUNT всей библиотеки ради первого head. Если отправлен — принадлежит тому же scope/filter/snapshot. |

Старый parser проигнорирует неизвестные meta/complete и дополнительные поля books, однако **нельзя полагаться на это как на полную поддержку v2**: он не проверит целостность/версии и ожидает полный список на EOF. Поэтому pagination и новый JSON envelope выдаются только клиенту, явно согласовавшему contract2.

JSON fallback без opt-in остаётся `ApiBook[]`. Для opt-in можно отдельно согласовать `{contract_version:2,snapshot_version,items,has_more,next_cursor}`; текущие `fetchBooks`/`fetchBook` такую shape не поддерживают и должны сохранять legacy path до обновления.

## 9. Семантика `last_read_at`, offline и конфликтов — принять до реализации

| Тема | Предлагаемая политика / обязательное решение |
| --- | --- |
| Что считается чтением | Reader действительно открыт/готов пользователю или принят meaningful progress/open event. Выбрать одно чёткое определение и назвать его; navigation click, не дошедший до Reader, не должен незаметно считаться тем же событием. Время фонового GET никогда не подходит. |
| Clock source | Канонический last_read_at обновляется сервером по принятому событию. Сохранять отдельно `occurred_at_client` и `received_at_server`; решить допустимое clock skew и обработку offline задержки. Нельзя слепо брать `max` произвольных будущих client timestamps. |
| «Читал вчера офлайн, синхронизировал сегодня» | Нужно заранее выбрать: recency по времени действия, скорректированному/проверенному сервером, либо по времени приёма. Для UX Recently Read предпочтительно время действия, но тогда нужны explicit clock/offline rules. Не объявлять получение события сегодня доказательством чтения сегодня. |
| Повторы | Event ID уникален и идемпотентен: повторная доставка не двигает last_read_at на время retry. Старый offline event не должен оттеснять реальное более свежее чтение другого устройства. |
| Position conflict | `stale_client` не делает server position менее актуальной. Обновить/reconcile baseline и учитывать последующее локальное действие. Не форсировать запись древнего anchor и не решать конфликт максимумом block_position: перечитывание назад легитимно. |
| Разделение полей | `position_updated_at`/`position_version` — версия/свежесть anchor; `last_read_at` — recency события; `fetched_at` — время кеша; `snapshot_version` — консистентное перечисление. Не использовать их взаимозаменяемо. |
| Только локальное событие | Пока event не подтверждён, frontend может временно поднять известную книгу локальным overlay. Это локальная желаемая view, не доказанный серверный глобальный top. После acknowledgement overlay снимается по event ID/версии. |
| Offline очередь | Нужен durable outbox с scope, event ID, исходным occurred_at, pending/sent/ack/rejected, backoff и поведением при logout. Сейчас изученный pendingAnchor этого не гарантирует. Не обещать полную offline синхронизацию без отдельной реализации. |
| Same-user device consistency | Все online устройства, получившие один snapshot_version с одинаковыми query, должны увидеть одинаковый server order. Локальный pending overlay может временно отличаться и должен быть явным исключением. |

## 10. Что может исправить frontend без нового backend

| Можно в текущей frontend-стабилизации | Нельзя честно обещать одним frontend |
| --- | --- |
| Не возвращать карточки к старому snapshot при каждом array reference/batch; восстановить локальные order+timestamps согласованно | Знать last-read отсутствующей в полученном префиксе книги на другом устройстве |
| Не заменять свежую сеть поздним IDB; не публиковать идентичный список как новое состояние | Получить глобальный top 6 из произвольно упорядоченного stream, не дождавшись данных, необходимых для сортировки |
| Явно разделять auth-loading/user/guest/share; отменять применение старого scope результата | Исправить cookie/backend identity race серверным подтверждением, которого нет в контракте |
| Показать кеш/head быстро, не блокируя на всех N progress GET; изменения высот и геометрии не входят в текущую задачу | Гарантировать snapshot consistency across batches/курсорные страницы без версии и серверной изоляции |
| Не записывать hydration time как lastRead; использовать реальные локальные reading timestamps | Узнать неподтверждённое offline чтение другого устройства |
| Стабильно добавлять tail в рамках выбранной UX-политики, показывать partial/failure корректно | Назвать локально зафиксированный порядок окончательным серверным Recently Read при неизвестных данных |

Компромисс должен быть явным: стабильная доступная view с последующим согласованием лучше мерцания, но **стабильность порядка не равна полной актуальности**. Не маскировать это ожиданием всей библиотеки: такой барьер ухудшит первый экран и отменит смысл stream. Серверный head/top+last_read_at решает именно недостающую информацию.

## 11. Порядок миграции без поломки текущих клиентов

1. Backend-команда подтверждает реальные endpoint payloads, auth principal, visibility/deletion semantics, смысл `updated_at` и текущий order. Сверяет это с исходниками/тестами, а не только с этой frontend-таблицей.
2. Добавляет optional `last_read_at` и capability v2 при неизменном legacy массиве/NDJSON. Старые apps продолжают работать без новых query. Не менять legacy scope timestamp на opaque string.
3. Реализует server sort/filter+head и единый snapshot token, bounded tail serialization. Замеряет время до head отдельно от complete; проверяет payload size/cover cost.
4. Frontend/proxy включают opt-in, проверяют meta identity/version/sequence, умеют partial/retry/expiry; используют server order. Exact reading-position запросы остаются в Reader, а не в критическом пути списка.
5. Отдельно реализуются cursor paging/cover thumbnails и durable offline events, если они нужны. Нельзя считать их готовыми после одного добавления `last_read_at`.
6. Удалять старый unconditional auth-workaround только после проверенных гарантий сессии/нового bounded retry; не ждать 1200 мс перед показом корректного head.

## 12. Приёмка нового серверного контракта

| Сценарий | Критерий |
| --- | --- |
| Cold online, 1000 книг | Первые 6 появляются после head без ожидания complete и без N individual positions; tail не меняет уже выданный server prefix того же snapshot. |
| Самая недавно читанная книга физически в конце текущего storage/order | Она входит в head по server sort; тест не ограничивается библиотекой из 6 книг. |
| Same timestamp / null timestamps | Детерминированные tie-break дают одинаковый результат при повторе/на двух устройствах. |
| Изменение progress между head и tail | Старый snapshot остаётся последовательным; новая версия обнаруживается отдельно. Ни дублей, ни пропусков от смешивания snapshot. |
| Early EOF / malformed batch / sequence gap | Клиент не объявляет ответ complete, сохраняет usable head как partial и может повторить, не стирая библиотеку. |
| Auth unknown → ready / logout / guest-share → user | Ответ старого scope не публикуется в новом; user request не получает тихий guest success; токен share не логируется. |
| Visible/hidden/all + archive/restore/delete | Правильный разрешённый набор до head_limit; после удаления карточка не возрождается из старого tail/cache; archived остаётся отдельной семантикой от deleted. |
| Cursor изменён/истёк/другой scope | Явный отказ или restart; никакого доступа к чужому набору и смешивания результатов. |
| Locale/title sort | Указанная collation, детерминированные ties, query-aware cursor; change sort не использует cursor предыдущего режима. |
| Offline read / повтор event / device clock в будущем | Принятая documented recency policy; repeat не выдаёт новое чтение; future clock не закрепляет книгу навечно первой. |
| Stale position PUT | `persisted:false` различается с success transport; authoritative GET/reconcile, без blind overwrite и без ложного увеличения last_read_at от retry. |
| Legacy client | Старый JSON массив и stream `books/items` работают; `fetchBook(id)` list fallback не сломан; отсутствие v2 не блокирует первый экран. |

Этот документ не объявляет перечисленные приёмочные сценарии пройденными. Для текущей задачи подтверждено чтение frontend-кода и создание спецификации; server v2, его benchmarks и authenticated end-to-end проверки остаются отдельной работой.
