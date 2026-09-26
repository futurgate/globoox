---
type: reference-and-proposal
status: current-contract-with-proposed-extension
owner: library
last_verified: 2026-09-26
backend_proposal_status: implemented-locally-not-deployed
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

**Назначение:** требования и исходный аудит контракта библиотеки. На 26 сентября отдельные v2 library/cover/activity маршруты и новый bookshelf реализованы локально; рабочая БД и deployments ещё не обновлены. Фактическая реализация, проверки и оставшиеся шаги ведутся в плане ниже. Исторические описания legacy и более широкие предложения snapshot/paging сохранены как исходные материалы, а не описание текущего локального v2.

Порядок реализации, текущий статус, решения о масштабе и критерии скорости ведутся в одном [отдельном плане быстрого каталога](../../rfcs/active/catalog-speed-2026-09-25/README.md). Уточнения 26 сентября в решениях D12–D14 этого плана имеют приоритет: короткий reuse подтверждённого индекса, FIFO без viewport-приоритетов, локальный placeholder загрузки без долговечного восстановления. Этот reference хранит факты/требования и более широкий проект API; перечисленные здесь варианты snapshot/paging не являются обязательным объёмом первой итерации.

## 1. Границы проверки и статус

| Вопрос | Ответ / степень доказанности |
| --- | --- |
| Что проверено непосредственно | Frontend/proxy/cache и, 25 сентября, исходники соседнего `globooks` на `402b93ed8ef7424be121f44a719b255be8e353b3`. Frontend HEAD `182ac9ff93d338a2b79da18e746daf2c00942a34`. Backend checkout отстаёт от локального `origin/main` на 2 коммита; их diff касается stylistic revision, не каталога. Это аудит кода и SQL-файлов, не проверка установленной схемы production БД. |
| Что доступно из runtime | [Диагностика 15 сентября](../../rfcs/active/library-loading-stability-2026-09-16/audit-2026-09-15.md) описывает гостевую библиотеку из 6 книг на dev. Там наблюдались `x-authenticated: false`, около 2,84 МБ тела списка и около 4,9 с запроса. Это отдельные гостевые лабораторные прогоны, не SLA и не доказательство поведения любой пользовательской библиотеки. |
| Чего здесь нет | Подтверждения SHA удалённого backend, фактически установленных индексов/миграций и SQL query plans; authenticated cross-device benchmark. Локальный код backend теперь доступен: уточнения ниже заменяют прежнее предположение, что серверная сортировка вообще отсутствует. |
| Текущая frontend-реализация | На 16 сентября стабилизация `my-books/page.tsx`, `useBooks.ts`, progress queue и scoped metadata реализована локально; итоговый build/deploy проверяется отдельно. [Implementation record и QA](../../rfcs/active/library-loading-stability-2026-09-16/README.md) описывает текущие исходники и ограничения доказательств. Последовательности, явно помеченные **baseline до этой правки**, сохранены для объяснения причин, а не как утверждение, что прежний баг остаётся в итоговом UI. |
| Статус предлагаемого сервера | Отдельные v2 library/cover/activity API реализованы локально и проверены на fixtures; аддитивная миграция проверена в изолированном Postgres, в production не применена. Старые маршруты сохранены. Snapshot/cursor и negotiated v2 в старых ручках не вводятся. Текущий статус — в активном плане; остальные строки таблицы описывают исходный аудит. |
| Что сохранить | Старые JSON/NDJSON ответы, приватность/права, `active`/`hidden`/удаление, реальные данные и все существующие документы. Этот файл добавлен отдельно; старые RFC и billing-документы не изменялись. |

Связанные материалы: [действующая архитектура API/sync](api-and-sync.md), [исторический RFC server snapshot](../../rfcs/active/my-books-server-snapshot.md), [offline-first RFC](../../rfcs/active/offline-first-sync.md). Утверждения старого RFC о backend требуют повторной проверки в его репозитории; здесь они не считаются свежим серверным доказательством.

> Пути к исходникам ниже — от корня frontend-репозитория. Неизменяемая копия исходной диагностики хранится по `docs/rfcs/active/library-loading-stability-2026-09-16/audit-2026-09-15.md`: тело сохранено байт в байт, перед ним добавлен frontmatter с SHA-256. Исходный исследовательский файл сохранён отдельно.

### Уточнение по backend и приоритетам — 25 сентября 2026

**Исторический статус на момент обсуждения 25 сентября:** runtime-код, БД, ветки и deployments тогда не изменялись. Текущая локальная реализация описана в активном плане. Этот раздел и раздел 11 фиксируют требования; более широкий v2 ниже остаётся проектом, не обязательным объёмом первой итерации. Backend-пути в этом разделе даны от корня соседнего `globooks`.

| Наблюдение в backend | Практическое следствие |
| --- | --- |
| `server/api/books.get.ts:337`: head получает до 12 progress rows по `last_read_at DESC`; индекс объявлен в `supabase/schema.sql:147`. `mapBook` на строке 61 это поле не возвращает. | Переиспользовать существующие данные и индекс; добавить last_read_at в компактную выдачу и научить frontend использовать серверный порядок. Одной сортировки backend недостаточно: frontend сейчас пересортировывает ответ. |
| В head `limit(12)` применяется до фильтра hidden/deleted; tail на строке 438 сортируется по `created_at`. JSON path не повторяет head order. | Пока это не единый глобальный Recently Read. В новом запросе проверка доступа и effective visibility должны предшествовать LIMIT; null/ties, непрочитанные и публичные книги требуют общего правила. |
| `streamGuest` на строке 307 сначала ждёт `getPublicBooks`, который выбирает весь публичный каталог вместе с cover_url (`server/utils/books-cache.ts:32`), затем режет массив. В authenticated tail также читаются все own/public books и progress. | Текущий stream не равен серверной пагинации. Для первой страницы выбирать ограниченный набор непосредственно в БД, без предварительной загрузки всех обложек и prefs в Node. Curated share сохраняет свои правила доступа/состава. |
| EPUB parser создаёт data URI (`server/utils/epub-parser.ts:362`); job сохраняет его в `books.cover_url` (`server/jobs/epub-processor.ts:83`); список возвращает значение целиком. | Главный подтверждённый источник размера ответа — оригиналы обложек в metadata. V2 должен исключать это тяжёлое поле из SELECT и wire payload, а не добавлять thumbnail рядом с тем же base64. |
| PUT позиции ставит last_read_at и updated_at по времени приёма; PATCH language тоже двигает last_read_at. Legacy Nuxt reader пишет last_read_at с часов клиента (`composables/useReadingProgress.ts:15`). | Сейчас last_read_at не строгое «пользователь читал». Ускорение чтения каталога можно внедрять отдельно; новые гарантии offline/idempotency требуют отдельного совместимого write-контракта, проверки всех writers и явного перехода. |
| Position GET валидирует block/делает fallback-запросы; PUT не обновляет legacy progress_percentage. | Компактные данные для карточки брать из batch/join, не вызывать N position endpoints. Не выдавать устаревший progress_percentage за корректный процент книги; определить поддерживаемую summary или вернуть unknown. Reader restore сохраняет старый endpoint. |
| Sync metadata содержит timestamps, но не snapshot. В проверенной миграции library trigger касается books, не user_book_preferences; публичные изменения не получают пользовательский bump. | Catalog revision должен учитывать prefs/deletion, публичный/curated набор, metadata и recency. Текущие scope timestamps нельзя просто переименовать в snapshot_version. |

**Один ограниченный runtime probe:** `GET https://dev.globoox.co/api/books?status=active&stream=1`, без credentials/share, `Accept: application/x-ndjson`, `Accept-Encoding: identity`, timeout 25 с, лимит чтения 8 MiB, без повторов. 25 сентября в 16:07:59 UTC получены HTTP 200, `x-authenticated:false`, 6 книг, сообщения `books` и `done`. Размер тела **3 804 711 байт**, строки cover_url — **3 802 722 байт (99,948%)**. JSON-массив после замены значений cover_url на null — **1 959 байт**. Заголовки получены через 4533 мс, полный ответ обработан через 5326 мс. [Точный запрос, метод подсчёта, результаты по книгам и ограничения](../../rfcs/active/library-loading-stability-2026-09-16/evidence/catalog-payload-probe-2026-09-25.json).

Это размер декодированного тела при явно запрошенном identity encoding, не универсальный размер сжатого сетевого трафика. Отдельные thumbnail-запросы тоже потребуют байтов; 1959 байт не являются размером всей будущей загрузки. Один прогон не даёт p50/p95 и не доказывает, что 4,5 с до заголовков вызваны исключительно обложками. Перед оптимизацией снять auth/DB/serialization timings на backend и сравнить прямой backend с proxy; после — время первых шести пригодных карточек и их обложек в тех же условиях.

**Целевой контракт после этапа пагинации:** новый `GET /api/v2/library`, компактная первая страница по 6–12 книг, canonical order, last_read_at, честная reading summary, thumbnail reference и размеры, has_more/next_cursor. Старые `/api/books` JSON-массив и полный NDJSON сохраняются без изменения обработчиков. Для compact mode нужен отдельный DTO: legacy base64 cover_url в него не копируется. SQL/RPC должен объединять разрешённые own/public/interacted/curated данные и prefs до sort/limit; один HTTP RPC сам по себе не доказывает быстрый план SQL. Проверять индекс и EXPLAIN на реальном распределении данных. [PostgreSQL об ORDER BY/LIMIT и индексах](https://www.postgresql.org/docs/15/indexes-ordering.html).

**Совместимость со старыми фронтендами — последнее уточнение обсуждения:** пользователь предлагает просто добавить новые ручки, вообще не переделывая старые под новый параметр. Текущий рекомендуемый вариант — отдельный `/api/v2/library`; старые `/api/books`, JSON/NDJSON, поля, сортировка и обработчики не меняются. Параметр выбора версии в старый endpoint не добавляется. Новые фронтенды явно вызывают новый маршрут. Это проект решения, не разрешение считать его реализованным.

- V2 реализуется новыми route/service файлами; не переписывать legacy алгоритм или общие helpers так, чтобы менялось поведение старых ручек. Новый frontend получает собственный proxy route/client loader; явно поддержать передачу account/share context, поскольку старый share helper привязан к префиксу /api/books. Новая projection читает те же books/progress/preferences, чтобы действия старых клиентов были видны новому. Сохранение позиции, archive/delete и другие существующие write-контракты не меняются автоматически вместе с list v2. Если для thumbnails понадобится новая image-ручка, добавить её отдельно; не расширять старые обработчики ради выдачи картинок.
- Добавить только optional поля в общий старый ответ недостаточно для ускорения: оригинальный base64 останется. Его исключают из SELECT и ответа **только v2**; legacy cover_url сохраняется. В новом frontend один DTO/загрузчик/формат кеша каталога, без постоянного выбора между версиями. Отдельный storage key/store отделяет новый формат от прежнего; внутри ключа нужны account/share scope и параметры запроса. Неполная страница не считается полным сохранённым каталогом.
- Новый ответ явно подтверждает `contract_version:2` и identity/revision. Отсутствующий новый маршрут/неверный формат означает несовместимость deployment; не принимать HTML или другой HTTP 200 за согласованный индекс. Несовместимость контракта и отказ авторизации не маскируются сообщением о потере сети.
- Развёртывание: сначала backend с добавленными маршрутами, затем отладка нового frontend на dev и его замена в production после приёмки. В новом frontend не поддерживать параллельно старый загрузчик/feature flag для выбора API. Сбой нового API следует пользовательскому timeout/cache/Retry сценарию; не вводить runtime fetch старого тяжёлого списка как fallback. Откат релиза — предыдущая сборка frontend, без обратной миграции пользовательских данных. Это обсуждаемый порядок выпуска, не команда публиковать сейчас.
- Проверки совместимости используют неизменённые старые запросы и старые клиенты: JSON/NDJSON, guest/user/share, hidden/delete, Reader restore/save. Дополнительные DB поля/таблицы, если понадобятся, не требуют новых обязательных данных от старых writers и не удаляют/переименовывают старые поля. V2-сортировка/события не должны молча менять общую семантику last_read_at для действующих клиентов.

**Упрощение кеша и выпуска по последнему уточнению пользователя:** долговременная поддержка двух frontend-путей/версий кеша не нужна. Но публикация новой сборки сама не удаляет старые localStorage/IndexedDB. Предлагается один раз перенести пригодный scoped список/snapshot в новый формат для аварийного offline показа, затем работать только с новым store. Старое изображение/текст книги и несинхронизированная позиция не удаляются при этой миграции. Если старый список невалиден или его account/share scope нельзя подтвердить, не угадывать владельца: новый индекс создаётся после успешного server GET; отсутствие пригодного кеша обрабатывается явно. Простое удаление всего кеша создаст регрессию первого запуска offline после релиза, поэтому blanket cache reset не подходит. Разовый перенос — миграционная задача, не постоянный выбор API/версий на каждом запросе. Проверка свежести списка/обложек и привязка к аккаунту остаются независимо от формата кеша. Старые серверные ручки сохраняются, пока нужны другим фронтам/открытым старым клиентам; замена основного production frontend сама не доказывает отсутствие этих потребителей.

Первая итерация compact stream ещё возвращает **весь** каталог порциями и сохраняет текущие local filter/sort и защиты порядка; она не обрезает ответ до 6–12 книг и не обещает нового глобально правильного head. Начальную порцию не задерживать до сбора хвоста. Добавленная batch recency позволяет убрать fanout именно для выяснения порядка после проверки frontend-совместимости; неизвестную/неподдерживаемую progress summary пока обслуживает существующий путь. Только этап true paging вводит ограниченные страницы, server-side filter/sort и гарантию глобального head. Режимы stream-all/page должны явно различаться в negotiation; неподдерживаемую пагинацию нельзя молча имитировать обрезанным списком.

Thumbnail создаётся при импорте; существующие книги получают его возобновляемой фоновой обработкой, без удаления исходной обложки и без обработки всех файлов внутри list GET. До готовности thumbnail v2 может вернуть отдельный защищённый image URL для текущей обложки; первые видимые изображения загружаются приоритетно. Для приватных книг сохраняются права: защищённая выдача или временный signed URL, а не общий public bucket. [Официальная модель доступа Supabase Storage](https://supabase.com/docs/guides/storage/buckets/fundamentals). Истечение image URL не должно инвалидировать весь каталог; offline cache сохраняет ранее скачанные thumbnails в scope аккаунта. Откат frontend на legacy не требует обратной миграции данных.

При настоящей пагинации фильтры/поиск/все поддерживаемые сортировки должны работать по всему разрешённому набору на сервере; фильтрация лишь загруженных страниц была бы регрессией. Кеш хранит query/scope, страницы и признак полноты, не подменяет полную библиотеку первой страницей. Cursor привязан к identity/query и версии порядка. Просто timestamp или keyset с изменяемым last_read_at не гарантирует snapshot: до выпуска выбрать реализацию фиксированного перечисления либо явно обнаруживать смену revision и перезапускать список. Последнее — более слабая гарантия, её нельзя выдавать за snapshot разделов 7–8.

**Следующий шаг после согласования реализации:** подготовить compact metadata + thumbnails + batch recency; включать новый пользовательский путь только после готовности серверного порядка и описанного ниже server-first поведения. Компактный payload сам по себе не выполняет новое требование к первому показу. Полный durable offline protocol остаётся отдельной задачей, но возврат из Reader с ещё не подтверждённым чтением должен быть согласован до включения server-first. Сейчас никакой v2-код, миграция, нагрузочный тест или новый deployment не выполнены.

### Целевое отображение по уточнению пользователя — 25 сентября 2026

**Действующее требование пользователя:** на входе сначала skeleton и получение компактного серверного списка/порядка. Сохранённый набор не показывается до ответа. Кеш становится источником состава/порядка только при таймауте или недоступности сервера; тогда нужны уведомление об ограниченном/offline режиме и кнопка повторной попытки. Прежняя рекомендация cache-first отклонена. Это обсуждаемый целевой UX, **не уже работающий v2**.

1. На входе показать skeleton первого экрана и начать попытку получения актуального списка для определённого account/share scope. Параллельно можно читать локальный кеш в память, но не публиковать его состав/порядок. Общий срок ожидания должен быть ограничен, включая восстановление identity и получение пригодного списка; точный budget ещё не выбран.
2. Получить компактный ответ в серверном порядке: ID, названия/авторы, effective status/права, thumbnail reference/version и данные чтения. Ни изображения, ни EPUB, ни главы в этот ответ не входят. Для небольшого каталога возможен полный текстовый индекс; для большого — согласованные порции. Малый payload не устраняет задержки auth, DB или сети; новый путь надо измерить до назначения timeout.
3. Проверить identity, query, revision и актуальность попытки. После валидного ответа опубликовать **один серверный набор/порядок**, сразу заполняя его места актуальными локальными обложками. Название/автор уже видны; placeholder остаётся только в области недостающей обложки. Сравнивать metadata/thumbnail versions, а не только наличие ID. Пустой успешный серверный список — валидная пустая библиотека, не основание возвращать старый кеш.
4. При timeout/ошибке связи показать доступный кеш этого scope и уведомление «Не удалось связаться с сервером. Показана сохранённая библиотека. Некоторые функции недоступны», с действием «Попробовать снова». Без кеша показать явное состояние недоступности с повтором; skeleton не остаётся навсегда. Timeout не доказывает отсутствие интернета: 401/403 и ошибки доступа обрабатываются отдельно от сетевой недоступности.
5. **Предлагаемое правило против повторной смены набора:** после fallback завершить прежнюю попытку логически; поздний её ответ не публикуется. Новый набор применяется после успешной отдельной повторной попытки. Во время нажатого Retry сохранённая библиотека остаётся видимой с индикатором повтора; не заменять её опять общим skeleton. Автоматическое возвращение из fallback пока не согласовано, его не внедрять как неявную фоновую перестановку. Дополнение к toast: компактный постоянный индикатор режима/Retry, чтобы действие не исчезало вместе с toast; это рекомендация, не принятое пользователем оформление.
6. Загружать недостающие thumbnails асинхронно, с приоритетом видимого экрана. Результат связывать с book ID + thumbnail version + scope, не с индексом места; поздний image response не вставляет обложку другой книги. Ошибка картинки даёт fallback обложки и ограниченный retry, не меняет набор и не переводит всю библиотеку в offline.
7. Первый экран готов независимо от незагруженных страниц/обложек вне экрана и EPUB/глав. Кеш карточки не доказывает доступность книги для offline Reader. Ограничения offline режима должны соответствовать реально доступным локальным данным и существующим очередям записи; пока durable outbox не реализован, нельзя обещать последующую доставку любых offline мутаций.

**Возврат из Reader:** server-first требует, чтобы ответ уже учитывал завершённое локальное чтение/мутации. Текущее touchLastRead само не сообщает серверу о чтении. До включения нового UX нужен согласованный барьер подтверждения: сначала server ack для влияющего на порядок действия, затем серверный индекс, либо эквивалентная операция read-your-writes. Ожидание входит в общий timeout. Если подтвердить/согласовать не удалось, использовать описанный fallback, а не показывать старый серверный порядок и затем снова переставлять книгу после позднего PUT. Это условие корректности предлагаемого пути, не уже реализованный write-протокол.

Для одинакового ответа сохранять карточки и не показывать общий skeleton заново. React identity остаётся book ID. Для новой revision публикация атомарна; tail старого перечисления не дописывается к новому. Logout, другой account и другой share scope не переиспользуют чужие локальные данные. Сохранить существующую защиту от поздних list GET после archive/delete; server-first не отменяет эту защиту.

Приёмка: до ответа не видны stale cached books; быстрый валидный ответ даёт один набор без промежуточного кеша; timeout и поздний ответ; Retry после fallback без скрытия кеша; ошибка при отсутствии кеша; успешный пустой список; отдельные auth/access ошибки; Reader → Library с delayed/failed position/activity write; те же ID с изменёнными title/status/cover version; смена попытки/порядка во время загрузки картинки; недоступный/истёкший image URL; удаление/архивирование во время head/tail; разные account/guest/share scopes; чтение на втором устройстве. Измерять время карточек и обложек, долю timeout/fallback и время возврата из Reader. Изменение высоты/геометрии карточек остаётся вне отдельной текущей задачи.

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
| B08 | Конец потока | EOF завершает Promise; завершающая строка без `\n` также обрабатывается | Backend выдаёт `type:'done'` (`books.get.ts:270`), но frontend его не проверяет. Чистый ранний EOF всё ещё принимается за успешное завершение. |
| B09 | Batch semantics | Первая строка `type:'books'` вызывает `onBatch(items,true)`; следующие false; batches накапливаются в массив | Проверенный backend HEAD_LIMIT=12; auth head по last_read_at с последующей фильтрацией, guest head после загрузки полного public набора, tail по created_at. Это не единый snapshot/order всего перечисления. |
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
| Server `ReadingPosition.updated_at` | Timestamp, присланный GET/PUT позиции; проверенный PUT ставит server receipt time | Клиент использует как свежесть anchor и иногда как last-read proxy. Отдельное last_read_at уже есть в БД, но отсутствует в этом GET и ApiBook. Language PATCH и legacy writer могут менять last_read_at без обновления updated_at. |
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
| T01 | Массив книг без declared sort | Новый `/api/v2/library`; server `sort`/`direction` с documented tie-break | Старый endpoint/handler сохраняет прежнюю shape. Новый backend-путь сортирует разрешённый полный набор **до выбора head**. |
| T02 | `status=active/all` + local hidden filter | В v2 отдельный `visibility=visible|hidden|all`, согласованный с текущими effective visibility rules; legacy `status` сохраняется | Сервер фильтрует до limit, не выдаёт скрытые карточки внутри visible head. Правила `status !== hidden` vs `active` должны быть проверены по backend, не угаданы. |
| T03 | Auth head до 12 progress rows до visibility filter; guest режет весь public набор | `head_limit=6` для первого экрана; head определён как первые 6 **или меньше, если меньше доступно** | Эти 6 глобально первые в snapshot, не произвольные первые записи БД. Head не ждёт сериализации tail/всех cover blobs. |
| T04 | Для сортировки нужны per-book positions | В каждый v2 item добавить `last_read_at:string|null`, а при необходимости компактный `reading_progress` | Первый экран не требует fanout GET для определения порядка. GET reading-position остаётся для точного Reader restore. |
| T05 | Server updated_at смешивается с чтением | `last_read_at` = последнее принятое сервером **реальное reader activity/open** событие по определённой ниже политике | Metadata edit, list GET, position GET, sync, cache hydration не обновляют last_read_at. `null` = server не знает принятого события, не «время сейчас». |
| T06 | Head и tail могут отражать разное состояние | `snapshot_version` opaque token + query/scope fingerprint; единая последовательность на всё перечисление | Все batches/cursors относятся к одному порядку. Изменение progress посередине не вставляет новую книгу перед уже выданным head данного snapshot. |
| T07 | EOF считается успехом без маркера | V2 `meta`, `books` с sequence/offset/phase и обязательный `complete` либо `error` | Сетевая тишина/ранний EOF не превращают частичный список в полный. Уже показанный валидный head можно оставить, но состояние остаётся partial/retryable. |
| T08 | Все книги передаются сразу; UI6 лишь slice | В v2 два явных режима: полный streamed enumeration по умолчанию и опциональный cursor paging | При streaming первый head доставляется сразу, tail фоном. При paging limit/cursor реально ограничивают ответ; legacy клиенты продолжают получать полный массив/stream. |
| T09 | Auth retry после каждого first result | До первого v2 meta server/proxy подтверждают действительную identity; при несовпадении ожидаемого auth user — явная ошибка/refresh auth | Нельзя показать guest fallback как личную библиотеку. Retry только по определённому recoverable auth/network condition с лимитом, не на всякий случай + 1200 мс. |
| T10 | Inline base64 cover без размеров | В compact v2 — `cover:{thumbnail_url,width,height,version}` без оригинального base64; `cover_url` сохраняется в legacy контракте | Thumbnail рядом с неизменным base64 не уменьшит ответ. Compact SELECT тоже не читает оригинал. URL доступен только разрешённому scope; для private covers учитывается срок доступа. |
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

Существующий `/api/books` и его обработчик сохраняются. Новый контракт обслуживает отдельный `/api/v2/library` с новым frontend proxy route; query ниже управляют только новым endpoint. Имена новых query/полей ниже **предлагаемые**.

```http
GET /api/v2/library?stream=1&visibility=visible&sort=recently_read&direction=desc&head_limit=6
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
| `items` | Legacy ApiBook сохраняется в старом контракте. Compact v2 использует отдельный DTO без inline base64: metadata, новые timestamps/null и cover reference передаются явно. Не повторять ID в пределах snapshot. Все items уже разрешены для запрашивающей identity. |
| `complete` | Только он подтверждает завершённость данного режима ответа. В stream-all `has_more:false`; в page mode может быть true с next_cursor. До complete нельзя сохранять частичный поток как полную библиотеку. |
| `error` | Совместимая основа `{"type":"error","message":"..."}`, v2 добавляет `code`, `retryable`, `snapshot_version` если известен. После error не слать complete как успех. |
| `next_cursor` | Опциональный режим paging; подписанный/непрозрачный cursor привязан к user/share scope, query fingerprint и snapshot. Нельзя доверять клиентскому cursor как разрешению на книгу. |
| Истёкший snapshot | Например typed `snapshot_expired`/409 **в согласованном v2 контракте**; клиент начинает новый snapshot, не дописывает старый tail к новому. Точный HTTP status требует backend-согласования. |
| `total_count` | Необязателен; не ждать дорогого COUNT всей библиотеки ради первого head. Если отправлен — принадлежит тому же scope/filter/snapshot. |

Старый parser не используется для нового endpoint: он не проверяет целостность/версии и ожидает полный список на EOF. Новый frontend получает отдельный v2 parser; старые клиенты продолжают обращаться к прежним ручкам.

JSON старого `/api/books` остаётся `ApiBook[]`. Для нового `/api/v2/library` можно отдельно согласовать `{contract_version:2,snapshot_version,items,has_more,next_cursor}`; текущие `fetchBooks`/`fetchBook` такую shape не поддерживают и сохраняют legacy path. Новый route/client не требует изменения старых обработчиков.

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

1. Подтвердить deployed backend/schema и baseline: body bytes, auth/DB/serialization timing, первые 6 карточек и их обложки. Код уже проверен 25 сентября; runtime пока ограничен одним гостевым GET. Не записывать все multi-second задержки на SQL без измерения.
2. Подготовительный этап: новый endpoint с compact stream без base64, thumbnails с фоновым backfill, last_read_at и поддерживаемая batch reading summary. Старые route handlers, JSON/NDJSON и оригиналы обложек сохраняются. Сам этот этап не выполняет новый server-first UX: до готовности согласованного серверного порядка и fallback его нельзя объявлять завершённым пользовательским решением. Не обрезать полный список до первой страницы без negotiated continuation.
3. Серверный индекс в согласованном порядке и новый путь показа: skeleton → валидный индекс → заполнение мест из локальных данных; timeout/сбой → scoped cache + ограниченный режим + Retry. Решить подтверждение предшествующего чтения/мутаций до публикации индекса. Для true paging — весь разрешённый набор, включая текущие search/filter/sort функции, стабильные ties и явная политика конкурентных изменений. Проверить guest/new-user/hidden/share и доступ до limit. Не называть обычный version stamp настоящим snapshot. Подтвердить SQL plan; head не ждёт tail или COUNT. Точный timeout выбрать по измерению нового пути, а не по размеру JSON.
4. Conditional refresh: отдельная catalog revision, учитывающая recency/prefs/public/share изменения; ETag/If-None-Match/304 сквозь proxy с корректной auth scope. Сначала обеспечить invalidation; затем экономить повторные ответы. Старые /sync/status даты сохраняются. На входе/возврате выполнять лёгкую проверку актуальности, а не ждать пятиминутного TTL.
5. Убирать полный auth retry через 1200 мс только после проверки browser → proxy → backend identity и явных ошибок/ограниченных повторов. Текущий x-authenticated от proxy не является независимым подтверждением backend. Ошибки не заменяют рабочий кеш пустой библиотекой.
6. Отдельная итерация write-контракта: подтверждённое реальное открытие/чтение, event_id, replay/ack, политика часов и offline, при необходимости atomic position CAS. Учесть legacy Nuxt writer и language PATCH; не менять их семантику молча. Один новый frontend-путь заменяет прежний после dev-приёмки; откат выполняется предыдущей сборкой, не постоянной поддержкой двух загрузчиков в новом коде.

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

Этот документ не объявляет перечисленные приёмочные сценарии пройденными. На 25 сентября подтверждены аудит frontend/backend исходников и один public guest payload probe. Server v2, его benchmarks и authenticated end-to-end проверки остаются отдельной работой.
