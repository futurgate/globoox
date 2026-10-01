---
type: reference
status: implemented
owner: library
created: 2026-10-01
last_verified: 2026-10-01
---

# Upload feedback refinement: приёмка

Выпущено на **dev**: frontend application `93ec25b`, backend main `74e977b`, production additive RPC `catalog_v2_retry_upload`. Production frontend main остался `bff9935`. [Deployment](deployment.json), [backend](backend-deployment.json), [RPC и ACL](upload-retry-prod-migration.json).

379 unit / 31 files PASS; browser recovery26 + story17 + races15 + notifications7 PASS. TypeScript и обе production builds PASS. Scoped lint: 0 errors, 2 прежних unused-helper warnings BookCard. Backend: 68 targeted + 39 native PostgreSQL checks PASS. Полный backend suite: 419 PASS / 11 FAIL из-за четырёх отсутствующих исторических EPUB; зелёным целиком его не считаем. Native PostgreSQL15 на Mac проверяет корректность SQL, не производительность production PostgreSQL17.

[Галерея всех 14 состояний](index.html). Локальные скриншоты используют реальные page/card/modal/Sonner и CSS сборки, с управляемыми ответами API и тестовыми книгами. Готовая The Test Book показывает прежний FallbackCover; новый генератор обложек не добавлялся. Дополнительно проверена [светлая узкая версия320](mobile-320/06-unknown.png), рядом сохранены DOM и размеры. Независимый визуальный review согласованных состояний пройден. Старое название сценария07 в capture.log содержит слова recovery toast; фактический сценарий и скриншот показывают только верхний баннер.

[Загрузка](screenshots/01-uploading.png), [обработка](screenshots/02-processing.png), [готовность](screenshots/03-ready.png), [дубликат](screenshots/04-duplicate.png), [ошибка](screenshots/05-failed.png), [неизвестная готовность](screenshots/06-unknown.png), [верхний баннер](screenshots/07-ready-order.png), [восстановление](screenshots/08-reconnected.png), [потерянный ответ](screenshots/09-receipt-unknown.png), [сверка](screenshots/10-receipt-modal.png), [archiveerror](screenshots/11-archive-failed.png), [403](screenshots/12-access403.png), [вход](screenshots/13-auth-required.png), [отклонённый файл](screenshots/14-upload-rejected.png).

Ручная проверка на живом dev **PASS**: отмена Upload again сохраняет ошибку; исправленный EPUB заменяет ошибочную книгу; одна готовая карточка наверху сохраняется после reload; оригинальный EN-текст открывается; обычная повторная загрузка готового файла сохраняет единственную готовую книгу. Обе QA-записи после UI cleanup отсутствуют в БД, на полке снова шесть исходных книг без offline. [Точные входы и результаты](live-acceptance.json), [SQL проверки](live/database-checks.json), [готовая книга](live/retry-live.jpg), [текст](live/reader-live.jpg), [очистка](live/cleanup-live.jpg). Проверялись только собственные 81B malformed / 1904B repaired EPUB, без LLM и чужих изменений.

Защиты: сервер допускает замену только собственной error-записи под row lock; новая попытка получает новый ID, поэтому поздние chapter/block writes старого worker не попадут в неё. Вставка новой и удаление старой записи — одна транзакция. Ready/processing/чужие записи и существующий путь файла отвергаются. Функция доступна только service_role; обычные API вызовы не требуют нового параметра. Отмена до отправки файла ничего не удаляет. Повтор при неизвестном результате начинается со сверки полки. Фоновый toast не дублирует постоянный banner и не перекрывает чужой диалог; принятый ready отменяет устаревшую отложенную ошибку.

Откат: dev на предыдущий `0a4a793` (application `865354a`); backend revert `74e977b` поверх актуального main, сохраняя новые коммиты коллеги. После прекращения вызовов RPC можно применить `supabase/rollback/catalog_v2_upload_retry.sql`: удаляется только новая функция. Откат не восстанавливает старые failed-записи и не удаляет успешно повторённые книги. Старый Storage-файл намеренно не удаляется без надёжного подтверждения владения объектом.

Остаются прежние инфраструктурные ограничения: длительная недоступность БД/очереди не устранена durable outbox; общая отмена уже выполняющегося worker не добавлена. Защита нового содержимого проверена, но это не полный протокол отмены всех возможных побочных действий старого worker. Очень большие EPUB в этой приёмке не нагружали.

Adverse outcomes: отказ от same-ID backend прототипа из-за гонки поздних childwrites; исправлены потеря retryassociation после неизвестного receipt, устаревший deferredtoast после подтверждённого ready и ложная failedкарточка после barecompleted. Старый racesmock возвращал undefined на refresh; исправлен под реальный catalogview. Production память больших EPUB не измерялась.

Tracked logs normalize line endings, trailing whitespace and NUL formatting bytes only; original outputs remain in ignored worktree .local files.
