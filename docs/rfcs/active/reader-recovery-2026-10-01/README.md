---
type: rfc
status: implemented
owner: reader
created: 2026-10-01
last_verified: 2026-10-09
implementation_status: released
superseded_by: docs/rfcs/active/bookshelf-upload-2026-10-01/README.md
---

# Reader: выпуск завершён

Исправления перевода и позиции выпущены: backendddbc32f; frontendproduct4200ccc, production9e4ac7d. Последующий откат только production-лендинга88d3a4c сохраняет эти исправления; в этом историческом выпуске dev оставался с editorial. Полный отчёт с проверками, adverse результатами, ограничениями и откатом сохранён в [архиве](../../../archive/2026-10-01-reader-recovery/reader-release-and-upload-audit.md). Evidence остаётся в этом каталоге по прежним ссылкам.

Текущая работа — [статусы загрузки и общие уведомления](../bookshelf-upload-2026-10-01/README.md). Только этот план содержит изменяемый статус и оставшиеся задачи. Первичная upload story прошла отдельную [dev-приёмку](../../../archive/2026-10-01-bookshelf-upload/README.md); последующие feedback и безопасный retry реализованы и проверены в checkpoint `93ec25b`, финальный skeleton follow-up — `b0c66e8`. Их код уже включён в main; оставшиеся задачи ведутся в указанном плане.
