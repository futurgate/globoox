---
type: rfc
status: active
owner: reader
created: 2026-10-01
last_verified: 2026-10-01
implementation_status: releasing
---

# Восстановление перевода и позиции Reader

## Цель и полномочия

Пользователь поручил обновить планы, архивировать устаревшее, самостоятельно выполнить максимум работ и учитывать параллельные изменения разработчицы бэкенда. Цель в Codex активна. Предыдущие разрешения на проверенный frontend dev→prod и backend/main deployment сохраняются. Рабочая база общая: ошибочные сценарии выполняются локально с синтетическими данными; production сначала только диагностика и штатный smoke.

Один изменяемый статус — этот файл в основном frontend checkout. Сырые наблюдения — evidence, завершённые планы — архив. Root владеет Git, интеграцией и выпуском; агенты получают непересекающиеся файлы/задачи.

## Состояние

Начато 1 октября (локальная дата). Frontend origin/main=origin/dev `67700e2`, production приложение `8e7879d`. Backend origin/main `26ea1e5`; local feat/catalog-speed `bc30003` содержит отдельный незавершённый атомарный EPUB import и в эту работу не включается. Новые worktrees `.local/reader-recovery-20261001` в обоих репозиториях, ветки `fix/reader-recovery-20261001`. При старте свободно 23 GiB; ожидаемый прирост до 2 GiB, зависимости переиспользуются. Старые dirty worktrees, пользовательские документы/секреты и исходные EPUB сохраняются.

Подтверждено read-only диагностикой 22:25–22:27 UTC: backend LIVE `26ea1e5`, Render `dep-daui9vm0tbcc7396vo40`. В видимых логах 21:52/21:55 UTC chapter 9 запрашивает 6 IDs следующей главы, а запрос chapter 10 содержит хвост предыдущей. Supabase metadata lookup подтвердил принадлежность sample IDs; глава существует, 25 блоков, dbError=null. Это доказанное несовпадение chapter/IDs для sampled запросов; удаление записей и DB timeout не являются причиной этих запросов. [Логи](evidence/render-translation-errors.json), [проверка принадлежности](evidence/observed-block-ids-readonly.json), [проверка главы](evidence/observed-chapter-readonly.json).

Кодовый источник: ReaderView добавляет next/previous chapter IDs в очередь текущей главы, а hook отправляет их с current chapter ID. Дополнительно useChapterContent может вернуть старый snapshot в первый render новой главы, сравнивая stale только по языку. Исправления и failing→passing тесты выполняются в новых worktrees. Baseline translation harness: 10 ожидаемых отказов (error/partial/transport retry, ownership, unmount); backend: 6 expected FAIL / 2 unchanged PASS (diagnostics/partial/cache-read failure). Это локальные воспроизведения, не live-метрики.

Позиция: backend check→upsert гонка воспроизведена в реальном handler с mock transport и на отдельном PostgreSQL/PostgREST. Root заменил unconditional upsert на conditional UPDATE по observed updated_at либо INSERT с conflict ACK. Stamp строго растёт минимум на 1 мс, чтобы исключить same-tick обход. Миграция не нужна. 6 handler tests и 6 native cases PASS, включая чтение назад, null stamp, user isolation и fail-closed DB error. [До исправления](evidence/position-native-baseline.json), [native после](evidence/position-native-cas.json). Ограничение: прежняя политика client-clock/server-ACK не меняется; это защита от lost update, а не доказательство глобального порядка намерений всех устройств.

Frontend chapter ownership и actual Reader DOM проверены: back из chapter B в конец A сохраняет A block и после remount; mixed chapter/IDs больше не допускаются. Synthetic DOM/geometry не заменяют финальный live browser smoke. Translation handler: 9 новых mock cases +57 соседних regression checks PASS. Frontend: 333/333 unit, 16/16 translation hook, 5/5 Reader translation UI, 16/16 content hook, 8/8 anchor guard; actual Reader position cases, TypeScript, docs check и production build PASS. Backend production build PASS; full suite 315 PASS / 38 FAIL — только прежний epub-parser.test.ts с отсутствующими EPUB fixtures; новые 18 translation/position и 19 HTTP fixtures PASS. Независимый review не нашёл блокирующих замечаний.

## План и критерии

1. Диагностика перевода: сопоставить имеющиеся UTC/job/chapter с Render logs или read-only данными. Различить несуществующие/stale IDs, DB error и частичный ответ. Бюджет первой диагностической пробы: один ошибочный batch, до 10 минут, без массовой генерации/изменений данных; остановиться при точной причине либо явно зафиксировать недостающий доступ/свидетельство и продолжить независимые локальные проверки.
2. Локальный frontend repair: failed отделён от translated/pending; ограниченный повтор только недостающих блоков; после исчерпания понятная ошибка и ручной Retry. Смена chapter/lang/account и unmount запрещают поздние callbacks, чужие обновления и бесконечные запросы. Успешный cache сохраняется.
3. Локальный backend repair после воспроизведения: раздельная диагностика отсутствующих записей и DB failure; исправить доказанную причину. Новые поля ответа только совместимые, OpenAPI обновить. Не менять схему БД без подтверждённой необходимости.
4. Позиция: детерминированно воспроизвести две сессии, задержанный GET/PUT, возврат в предыдущую главу, reload до/после flush. Сначала тест падает по найденному механизму, затем минимальное исправление. Сохранение чтения назад обязательно; нельзя заменять его максимумом прогресса. Если нужна серверная атомарность, отдельная миграция/rollback и настоящий локальный PostgreSQL.
5. Интеграция: focused tests → полный frontend suite/build → подходящие backend contract/build tests; старые parser failures отмечать отдельно. Проверить UI ошибки/Retry и стабильность текста на локальном production frontend. Backend faults используют loopback fixtures, не shared production DB/LLM.
6. Перед каждым commit/release: fetch обоих origin, проверить новые upstream commits, влить релевантный main в наши ветки без force-push, разрешить конфликты по контракту, повторить затронутые проверки. Повторно сверить upstream непосредственно перед push. Конфликтующие чужие изменения не откатывать.
7. Release только проверенного набора: backend при необходимости (автодеплой Render из main) с откатом; frontend сначала dev smoke, затем production при прохождении. Проверять exact SHA и реальные домены. После завершения вернуть прежнюю deployment policy. Реальный untranslated fragment должен восстановиться; прежний готовый текст не доказывает генерацию.

## Что считается хорошим и плохим результатом

| Область | Хорошо | Плохо / стоп выпуска |
|---|---|---|
| Перевод | После временного отказа появляются недостающие переводы; исчерпанный retry виден и повтор управляем | Ошибка считается успехом; вечный blur; шторм запросов; повторная генерация готового |
| Частичный batch | Каждый запрошенный ID имеет результат; успешные остаются в cache | Один отсутствующий ID теряется, failed маскируется под готовый |
| Изоляция | Старый chapter/lang/account не меняет новую страницу/cache | Чужой текст/позиция, stale callback после unmount |
| Позиция | Локальное намеренное чтение вперёд и назад переживает reload; stale responses не перебивают новое | Скачок главы, запрет движения назад, потеря записи при двух клиентах |
| Деплой | Tests/build и живой smoke точного SHA; upstream сохранён; rollback описан | Проверка другого SHA; Git push выдан за LIVE; неотработанный критический failure |

Локальные tests доказывают контролируемый порядок запросов, состояния очередей и контракт SQL. Они не доказывают реальную задержку Render, наличие production данных, поведение настоящей модели или точную причину прошлой ошибки. Последние требуют ограниченного live smoke/log evidence.

## Журнал решений

- 2026-10-01: закрытый план bookshelf перемещён в архив; evidence оставлено по стабильным ссылкам. Апрельский my-books план superseded. Общие RFC новой оркестрации/state machine не реализуем целиком: восстановление существующего потока — текущая задача.
- 2026-10-01: sampled translate errors вызваны смешением принадлежности блоков. Сервер не должен разрешать cross-chapter fallback; исправляем клиентскую очередь. Dedicated prefetch следующей главы остаётся. Полный сброс кешей не нужен.
- 2026-10-01: новые backend изменения базируются на origin/main; отложенный EPUB import и старые backend auth/IP эксперименты не вливаются попутно.

## Следующее действие

Backend `ddbc32f90be765ccb2f6840678b46c4ec7479b86` проверен, отправлен fast-forward в origin/main; Render LIVE `dep-daup2upsrm7s73b7udl0` подтверждён в 22:49 UTC, health HTTP200 `{status:ok}`. Frontend product заморожен и локально проверен; следующий шаг commit → dev → READY/live reader smoke → production. Production frontend пока не менялся. Перед backend commit/push origin/main повторно проверен; чужих новых commits не было. База production не менялась.
