---
type: rfc
status: accepted
owner: library
created: 2026-10-01
last_verified: 2026-10-01
implementation_status: in-progress
---

# Загрузка книги: карточка, метаданные и порядок полки

## Текущее состояние

Цель создана по прямому запросу пользователя. Реализация и локальные gates завершены; 2026-10-01 10:18 UTC production DB получила аддитивную migration. Старые books/reading_progress строки проверены неизменными в транзакции. Backend candidate `ed7b30d` подготовлен к автоматическому Render release; frontend dev ещё прежний, ручная live-приёмка впереди. Единственный изменяемый статус — этот файл в основном frontend checkout. Проверенная исходная версия: frontend dev `01e2fe2`; frontend main `bff9935` / production `88d3a4c` (старый лендинг); backend main `b993ec3` (включает новые fiction prompts разработчицы). Frontend production в этой цели не выпускаем. Перед каждым push повторно fetch upstream; интегрируем новые backend commits с повторением затронутых проверок.

Работа в существующих чистых worktrees `.local/reader-recovery-20261001` обоих репозиториев, branch `feat/upload-story-dev-20261001`; зависимости переиспользуются. Старые `feat/catalog-speed`, dirty worktrees и пользовательские AGENTS/billing/library/landing изменения сохраняются. В Render подтверждён один активный backend `globooks-eu` (общий dev/production), deployed `b993ec3`; старый Oregon service suspended. Отдельный платный сервис не создаём. После локальных gates — совместимый выпуск общего backend/DB в рамках уже данного разрешения; frontend только dev. До gates никаких cloud writes.

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

## Промежуточные доказательства

- Native PostgreSQL: 74 проверки прошли (старые строки/порядок/progress неизменны, metadata gates, owner scope, service-only ACL, конкурентные upload/read, idempotency, rollback). Итог backend после реальных EPUB и SDK correction: 389 PASS / 11 прежних missing-fixture failures, 46 upload checks PASS; повторный production build PASS. Native service integration 7 PASS с настоящими PostgreSQL/PostgREST/Redis и synthetic Auth/Storage, без облака/LLM.
- Production preflight (до migration), read-only: 193 books, 1 прежний pending/processing; новых upload полей/RPC на preflight не было. Production manifest body совпадает с rollback; действующий ограниченный cover trigger не меняем.
- `docs:check` в clean release worktree: PASS, 130 governed files. В основном dirty checkout остались 3 прежние ошибки у двух untracked historical release README; они не включаются в выпуск.
- Dev browser вход и системный выбор EPUB доступны. На localhost вручную проверены skeleton → metadata → cover → Ready и порядок после reload; это контролируемый transport, не live скорость. Созданы свои маленькие синтетические файлы с отличающимся filename/title, без cover/title и malformed; cloud uploads ещё не выполнялись.
- Независимое review выявило race polling/canonical ID, неоднозначный ответ записи ready и опасный reset chapters. Они исправляются до release; это не результаты успешного prod-теста.

## Остаток планов для обзора

| Статус | Остаток | Владелец / следующий шаг |
|---|---|---|
| Текущая реализация | Upload story и dev-приёмка | Этот план; выпуск production frontend — отдельно после обзора |
| Передано разработчице, не закрыто | Скорость API: полный trace, auth reuse внутри запроса, IP write вне ожидания, thumbnails и лишние DB roundtrips | Датированный `catalog-speed-2026-09-25/developer-handoff-2026-09-30.md`, §6; подтвердить актуальность на её новом main и измерить |
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
