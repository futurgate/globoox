---
type: archive
status: archived
owner: library
created: 2026-10-01
last_verified: 2026-10-01
implementation_status: released
---

> Исторический снимок завершённого dev-выпуска и обсуждения после него, сохранён 2026-10-01. Статусы и «следующие шаги» ниже относятся к моменту снимка и не являются текущими заданиями. [Действующий план уведомлений и восстановления](../../rfcs/active/bookshelf-upload-2026-10-01/README.md).
>
> Причина хранения: точные release/rollback refs, положительные и adverse проверки, ограничения и собственные EPUB fixtures. 28 исходных evidence-файлов (101 674 байта) остаются на прежнем пути без изменений; ссылки на них ниже исправлены относительно архива. Private snapshots и временные сборки сюда не копировались. Последующий dev commit `426b9ba` менял только документы; проверенный application code остаётся `edea9ed`.


# Загрузка книги: карточка, метаданные и порядок полки

## Текущее состояние

**Dev-приёмка завершена.** Frontend application `edea9ed` (Vercel READY, исходная story `80819d9`), общий backend `ed7b30d` (Render Live), production DB migration применена 2026-10-01 10:18 UTC. Живые upload/reload/dedup/Reader/фильтры/ошибки прошли. Найденный вручную бесконечный skeleton после ошибки и пустое название в delete confirmation исправлены и повторно проверены на dev. Все четыре собственные QA-книги удалены; прежние 13 книг / 18 progress / 19 recency фактического владельца сохранились без изменений в проверенном интервале.

Frontend production в этой цели не выпускали: deployed `88d3a4c`, прежний лендинг подтверждён сравнением артефактов. Единственный изменяемый статус — этот файл в основном frontend checkout. Последующее обновление только документов в dev не меняет проверенный application code. Следующее решение пользователя — выпуск frontend на production либо выбор пункта из остатка ниже.

Рабочие ветки: `feat/upload-story-dev-20261001` в существующих чистых `.local/reader-recovery-20261001` worktrees обоих репозиториев. Backend основан на latest programmer main `b993ec3`, fiction prompts v11 сохранены; повторный fetch после выпуска подтвердил main `ed7b30d`, более новых commits нет. Старый `feat/catalog-speed` с atomic/auth/IP экспериментами не переносился. Dirty AGENTS/billing/library/landing изменения пользователя сохранены. Render `globooks-eu` общий для dev/production; отдельный платный сервис не создавали. Оба backend commits отправлены в main, frontend только в dev.

## Согласованная история пользователя

1. Нажатие «Загрузить»: сразу первая карточка под модалкой; skeleton обложки, названия и автора, статус загрузки. Имя файла остаётся только в модалке.
2. Парсер извлёк реальные metadata: заполняем каждый готовый элемент той же карточки через существующий polling; не ждём окончания всех глав ради названия. Никаких новых приоритетных очередей обложек: существующая FIFO/max4.
3. Пока обработка не завершена, карточка не открывает Reader. Отсутствующие в EPUB title/author/cover получают конечный fallback после установления отсутствия; вечных skeleton нет.
4. Сервер фиксирует событие добавления в существующем механизме recency текущего пользователя. Stable server timestamp не обновляется polling/retry/reload. Позиция, проценты, главы и translations не меняются; исторические книги массово не пересортировываются.
5. После успеха/reload/возврата книга остаётся в Recently Read согласно серверной активности. Последующее настоящее чтение другой книги имеет обычное право поднять её. Повторный upload одного произведения даёт одну canonical карточку и сохраняет прежний прогресс.
6. Закрытие модалки сохраняет загрузку на открытой странице. Закрытие страницы может прервать передачу по прежнему соглашению; новую инфраструктуру долговечных загрузок не строим. Уже известное серверу processing состояние отображается безопасно после возврата.
7. Ошибки записи/парсинга видимы, не превращаются в ложное Ready; старые готовые данные и canonical EPUB не удаляются новой веткой обработки ошибок.

## Контракт и минимальные изменения

- Backend: optional parser callback для ранних metadata, compatible job.book preview, owner authorization, processing fields в v2 index. Существующий job polling и версия обложки используются повторно.
- DB: новый аддитивный migration, не повторный add_catalog_v2.sql (он возвращает broad cover trigger). Nullable metadata-ready flag необходим для однозначного reload/error состояния; NULL legacy ready отображается как готовое. Новый added_at не нужен. Upload recency service RPC обновляет конкретный actor/book и activity_version атомарно, сохраняет old order/reading_progress. Никаких новых job tables или массового metadata backfill.
- Frontend: skeleton текста, partial preview, один слот local/server/canonical ID, processing-card gate, завершённая карточка следует серверному порядку; scope/late callbacks guarded. Старый production-лендинг сохраняется; dev editorial сохраняется.
- Полный atomic EPUB import из старой ветки не входит: его память и отдельный production gate не решены. Новая задача не является поводом переносить тот эксперимент.

## Распределение

| Владелец | Ограниченный участок |
|---|---|
| Root | План/архив, интеграция, release gates, разрешённый rollout, ручная dev-приёмка, итог и backlog |
| Frontend agent | UI/hooks/API DTO, реальные page-level integration tests, frontend suite |
| Backend agent | Parser/jobs/upload handlers, authorization, backend tests/OpenAPI/types |
| Evidence agent | Ревизия backlog, SQL migration/rollback/native fixtures, независимый review |

## Проверки и критерии до выпуска

| Сценарий | Хороший результат | Стоп/плохой результат |
|---|---|---|
| Start → metadata → cover → Ready | Одна первая карточка; filename нигде в карточке; раннее настоящее название; обложка появляется отдельно | Дубль, прыжок, файл вместо title, преждевременное открытие Reader |
| Complete → reload/leave/return без чтения | Серверный top, те же ID/title; остальные книги в прежнем взаимном порядке | Новая книга уходит ниже прочитанных; old order/position изменились |
| Dedup старой книги / concurrent jobs / retry | Одна canonical карточка, stable addition time, сохранённый progress/translations/original | Пустой дубль, повторное поднятие от polling, удаление original или потеря ready |
| Pending/error metadata + malformed EPUB + missing fields | Конечные понятные состояния; ошибка DB не даёт Ready; отсутствующая обложка не крутится вечно | Бесконечный skeleton, ложный успех, открытие неполной книги |
| Scope/auth/deletion/hide/late replies | Чужие metadata недоступны; stale callbacks не воскресают в другом scope/после delete | Утечка, stale card или поздний результат закрыл новую модалку |
| SQL/native + rollback | Existing rows/order/progress идентичны; privileges/service-only; idempotent version; rollback восстанавливает functions | Любая чужая запись/старый прогресс изменён, широкая блокировка или сброс cover trigger |
| Existing flows | Полный frontend/backend suite, TypeScript/build, docs, targeted reader/cache/cover cases | Новый необъяснённый FAIL; старые missing EPUB tests явно отдельно |

Budget: начать существующими 8 upload component cases + новыми named regressions; один финальный production build на каждую кодовую базу после freeze, повтор только при изменении/ошибке. Локальные данные/HTTP/Redis/SQL синтетические, без LLM и cloud writes. Native PG/PostgREST/Redis — отдельные принадлежащие задаче loopback-порты. Свободно 35 GiB на старте; evidence ≤5 MiB кроме полезных raw build logs/cache. Перед крупными сборками повторно проверить место.

Ручная dev-приёмка: собственные маленькие EPUB с отличающимся filename/title, с обложкой и без; upload под модалкой/закрытие модалки; title/cover/Ready; reload до первого чтения; повторный upload; фильтр/сортировка; обычное чтение и возвращение; ошибка. Объекты QA помечены уникально и удаляются после проверки только после проверки ownership; реальные пользовательские книги не меняем. Задержки искусственных fixture не выдаём за live performance. Платные переводы не нужны: QA в исходном языке.

## Выпуск и откат

Порядок: локальные доказательства → migration preflight/rollback → доступный backend staging или явно зафиксированный compatible rollout общего backend → frontend dev → живые HTTP и UI проверки. Backend/DB действия уже разрешены пользователем в сессии при тестах и наличии отката; новый production frontend не входит. Root проверит фактический deployed commit, не только push. Shared DB migration только аддитивный, без массового обновления/перепарсинга. Revert поверх нового main сохраняет чужие commits; никакого force push. UI errors/500/ordering/identity нарушения останавливают rollout.

## Результаты проверок

| Уровень | Результат | Что подтверждает / предел |
|---|---|---|
| Frontend unit / TypeScript / build | 344/344; TS и production build PASS | Локальная корректность; реальные cloud policy/latency этим не доказываются |
| Реальная страница MyBooks с управляемым transport | 17/17; прежние modal races 8/8 | Порядок, partial metadata, canonical dedup, late callbacks, scope, delete/archive, polling deadline; ошибка текста воспроизведена до поправки и устранена после |
| Существующие cache/Reader регрессии | Hook 3/3, cover 5/5, Reader position 3/3 | Дополнительно проверены соседние flows; исправление origin у test runner не меняло продукт |
| Backend full suite | **389 PASS / 11 FAIL** | 11 FAIL относятся к четырём отсутствующим оригинальным EPUB fixtures. Первоначальные 38 FAIL сохранены; найденные реальные EPUB позволили выполнить ещё 27 тестов. Полный suite не называется зелёным |
| Backend targeted / build | 46 upload checks PASS; production build PASS | Parser callback, checked writes, canonical protection, ownership, lost response paths |
| Native SQL | 74/74 | Порядок/старые tuples/progress, service-only ACL, concurrency, idempotency, rollback; реальный PostgreSQL |
| Native handlers + parser + queue | 7/7 | Реальные PostgreSQL/PostgREST/Redis/BullMQ; Auth/Storage синтетические. Реальный SDK bug PromiseLike обнаружен, исправлен и перепроверен до deploy |
| Production migration | PASS | В самой транзакции старые books/reading_progress tuples неизменны; cover trigger сохранён; без backfill |
| Живая ручная dev-проверка | PASS, включая финальную ошибку после UI-поправки | Мгновенная первая карточка; close modal; готовность; reload до чтения; cover/no-cover/no-title; архив/restore; сортировка; pagination; malformed; dedup; Reader EN 0→60%→повтор→60% |
| Живая DB-сверка dedup | PASS | Тот же canonical ID и исходный файл, 1 глава/25 блоков и все их ID/данные неизменны; вся запись progress прежняя (block15/EN). Прежние 13 книг / 18 progress / 19 recency текущего владельца неизменны |
| Выпуск | Backend Live / dev READY / prod frontend unchanged | Не только push: GitHub deployment + фактические alias/artifact assets проверены |

Доказательства: [frontend](../../rfcs/active/bookshelf-upload-2026-10-01/evidence/frontend-verification.json), [unit](../../rfcs/active/bookshelf-upload-2026-10-01/evidence/frontend-unit.txt), [page](../../rfcs/active/bookshelf-upload-2026-10-01/evidence/frontend-page.txt), [backend](../../rfcs/active/bookshelf-upload-2026-10-01/evidence/backend-verification.json), [SQL](../../rfcs/active/bookshelf-upload-2026-10-01/evidence/sql-native.json), [native integration](../../rfcs/active/bookshelf-upload-2026-10-01/evidence/backend-integration.json), [SDK adverse](../../rfcs/active/bookshelf-upload-2026-10-01/evidence/backend-sdk-adverse.json), [migration](../../rfcs/active/bookshelf-upload-2026-10-01/evidence/production-migration.json), [rollout](../../rfcs/active/bookshelf-upload-2026-10-01/evidence/rollout-independent.json), [живая DB-сверка](../../rfcs/active/bookshelf-upload-2026-10-01/evidence/live-db-checks.json), [ручная приёмка](../../rfcs/active/bookshelf-upload-2026-10-01/evidence/manual-live.json), [финальная UI-поправка](../../rfcs/active/bookshelf-upload-2026-10-01/evidence/error-ui-verification.json), [финальный dev rollout](../../rfcs/active/bookshelf-upload-2026-10-01/evidence/rollout-error-fix.json), [очистка QA](../../rfcs/active/bookshelf-upload-2026-10-01/evidence/live-db-cleanup-final.json). Точные собственные EPUB сохранены в [fixtures](../../rfcs/active/bookshelf-upload-2026-10-01/evidence/fixtures/inputs.json). Полные private snapshots не публикуются: baseline первого выбранного account отклонён как неверный scope, использован отдельный снимок фактического владельца. Live-сверка старых строк относится к интервалу dedup/error, а не доказывает неизменность всей базы на протяжении каждого действия.

`docs:check` в release checkout: PASS, 130 governed files; в dirty основном checkout остаются 3 прежних замечания у двух untracked historical README, не включённых в выпуск. Контролируемая ручная localhost-проверка отдельно показала title→cover→Ready и восстановление processing после reload; маленькие live EPUB проходят слишком быстро, чтобы гарантированно увидеть каждый промежуточный poll. Искусственные задержки не выдаём за live performance.

## Риски и защиты

- **Ложное Ready / потеря готового оригинала.** Проверяются результаты записи глав/блоков; неоднозначный ответ финальной записи не переводит уже Ready обратно в error. Dedup сохраняет canonical EPUB, главы, блоки, переводы и позицию. Native injection и живая повторная загрузка это проверили.
- **Скачки порядка и вечный pin.** Новый upload фиксирует stable server timestamp в `catalog_v2_recency`; `reading_progress` не используется как поддельное чтение. Poll/retry/reload не обновляют время; готовая карточка возвращается к обычному серверному порядку. SQL concurrency/idempotency проверены.
- **Старые книги / миграция.** Аддитивные nullable поле и service RPC; без массового UPDATE и backfill. Сверка tuples в production-транзакции и native rollback проходят. Откат не должен стирать последующее реальное чтение.
- **Поздние ответы / другой scope / удаление.** Владение проверяется сервером; frontend прекращает полномочия попытки после delete/archive и смены scope. Прежние modal race tests сохранены.
- **Неполный импорт.** Полной атомарности ещё нет: частичные главы могут остаться при сбое. Автоматический destructive reset запрещён; failed attempt освобождает только свой hash и предлагает повторную загрузку. Полное fencing одновременно застрявших workers остаётся отдельной задачей.
- **Пределы доступности.** Закрытие страницы до регистрации может прервать файл (согласованное поведение). Одновременный отказ Redis+DB не покрывается новой durable-job инфраструктурой; её не добавляли. Metadata приходит через polling, а не push.
- **Пределы испытаний.** 11 missing-fixture tests остаются открыты; маленькие QA EPUB не доказывают память/скорость огромных файлов на 512MB. Deferred cleanup при dedup может оставить неиспользуемую обложку; canonical обложка сохраняется.

Откат: сначала dev frontend на `01e2fe2`, затем revert только наших backend commits поверх актуального main (`b993ec3` — база выпуска), затем при необходимости `supabase/rollback/catalog_v2_upload_story.sql`. Не force-push и не сброс чужих коммитов. SQL rollback восстанавливает прежний manifest, убирает новые RPC, оставляет nullable флаг и подтверждённую recency/version: автоматическое удаление этих времён может стереть более позднее чтение. Проверенный rollback не трогает позиции/контент.

## Остаток планов для обзора

| Статус | Остаток | Владелец / следующий шаг |
|---|---|---|
| Готово на dev; ожидает обзора | Upload story и dev-приёмка | Этот план; выпуск production frontend — отдельное решение после обзора |
| Согласовано направление, обсуждается UI | Разделить подтверждённый провал и невозможность проверить готовность/порядок. Ошибка внутри прозрачной пунктирной обложки; отдельное уведомление пользователю | Не внедрено. Пользователь запросил проверку статуса и эти изменения отображения; отмену серверной обработки и распознавание DRM исключил. Тип уведомления/точные тексты обсуждаются. Локальные скриншоты текущего дефекта: `.local/reader-recovery-20261001/.local/upload-warning-screenshot/` |
| Передано разработчице, не закрыто | Скорость API и Reader: полный trace, auth reuse, IP write вне ожидания, thumbnails/DB roundtrips; ожидания cache/layout/fonts/images и контракты partial-result/error | Датированный `catalog-speed-2026-09-25/developer-handoff-2026-09-30.md`, §6 (включая §6.4/6.6); подтвердить актуальность на её новом main и измерить |
| Отдельное исследование | Атомарный import из старой локальной ветки; память и ограниченные batch | Не выпускать старую реализацию одним JSON без проверки памяти; не входит в эту загрузку |
| Известное ограничение | Порядок сохранения позиции между устройствами при client clock / server ACK | Отдельное решение о серверной монотонной версии; выпущенные Reader guards это не заменяют |
| Предложения, не внедрены | Adaptive typography, translation orchestration, unified translation state, offline/versioned sync | Широкие RFC сохраняются в индексе; новые обязательства из них не выводим |
| Работа другого владельца | Billing / entitlements / translation access | Сохранить правки разработчицы, отдельно согласовать контракт |
| Намеренное различие окружений | Старый landing на production, editorial на dev | Не включать перенос editorial в upload release |
| Завершено и архивировано | Bookshelf v2, Reader recovery, rollback landing, прежняя streaming stability | Проверки и rollback refs сохранены; не выдавать старые шаги за текущие |

Ни один незавершённый пункт не считается выполненным только благодаря загрузке книги. Новая инфраструктура долговечных upload tasks, приоритетная cover queue и поддержка старых клиентов как отдельный проект не планируются по решениям пользователя.

## Журнал решений

- 2026-10-01: reader release и первичный upload audit архивированы; продолжаем в этом единственном активном плане. Старые evidence и rollback ссылки сохраняются.
- 2026-10-01: filename в карточке заменяется skeleton; реальный title приходит по мере парсинга. Stable shelf recency отдельно от reading_progress; новый added_at не вводим.
- 2026-10-01: latest backend b993ec3 включает fiction prompts v11, сохраняем их. Исторические atomic import/auth/IP изменения старой локальной ветки не вливаем.

- 2026-10-01: отказались от нового destructive reset chapters. Частичный импорт не перестраивается автоматическим retry; готовый контент сохраняется, failed attempt освобождает только свой hash и предлагает reupload. Полное fencing нескольких stalled workers остаётся отдельным пределом старой архитектуры.

- 2026-10-01 10:18 UTC: production migration применена успешно, без изменения прежних book/progress tuples. Gate обнаружил и помог исправить реальный SDK PromiseLike bug до публикации backend; adverse evidence сохранено.

- 2026-10-01: dev live QA завершён на `edea9ed`; error skeleton/delete title исправлены по результату ручной проверки. Все QA DB-объекты удалены, localhost manual server и принадлежащий задаче PostgreSQL остановлены; сырые проверки сохранены, дубли EPUB в Downloads удалены после сверки. Production frontend остаётся прежним.

- 2026-10-01, обсуждение после dev-приёмки: пользователь подтвердил необходимость отдельного состояния неизвестной готовности, сообщения внутри прозрачной пунктирной обложки и уведомления. Отмена обработки и надёжное определение DRM не нужны. Порог размера EPUB не установлен; текущие parser fixtures до 6,15 MB не являются нагрузочным gate для 512 MB. Код/деплой в этом обсуждении не менялись.
