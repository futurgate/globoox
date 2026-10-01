---
type: rfc
status: implemented
owner: library
last_verified: 2026-09-30
superseded_by: docs/rfcs/active/bookshelf-upload-2026-10-01/README.md
---

# Bookshelf: промежуточный выпуск завершён

Новый bookshelf опубликован на dev и production: код `8e7879d`, ветки синхронизированы на `67700e2` (только отчёт и возврат main=false). Backend и база в этом выпуске не менялись. [Проверки, ограничения и откат](evidence/checkpoint-2026-09-30/README.md).

Предыдущий изменяемый план сохранён целиком в [историческом архиве](../../../archive/2026-10-01-reader-recovery/catalog-speed-plan-through-release.md). Evidence остаётся на прежних местах для проверки решений и отката; это не текущие задания.

Исправления повторного перевода и защиты позиции выпущены в [завершённом Reader checkpoint](../reader-recovery-2026-10-01/README.md). Первичная загрузка прошла [dev-приёмку](../../../archive/2026-10-01-bookshelf-upload/README.md); текущая работа — [статусы загрузки и общие уведомления](../bookshelf-upload-2026-10-01/README.md). Серверные оптимизации скорости из датированного handoff разработчице (`developer-handoff-2026-09-30.md`, сохранён в основном checkout) сохраняются как отдельный согласованный backlog; они не считаются выполненными этим выпуском.
