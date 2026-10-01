---
type: reference
status: in_progress
owner: library
created: 2026-10-01
last_verified: 2026-10-01
---

# Upload feedback refinement: приёмка

Пока локально: 379 unit/31files PASS; browser recovery26 +story17 +races15 +notifications7 PASS. TypeScript/build/docs PASS. Scoped lint: 0errors,2 прежних unusedhelperwarnings BookCard. Локальные screenshotcases используют реальные page/card/modal/Sonner и CSS сборки, fakeAPI/книги. Синтетической отдельной обложки больше нет: готовая The Test Book показывает прежний FallbackCover.

[Загрузка](screenshots/01-uploading.png), [обработка](screenshots/02-processing.png), [готовность](screenshots/03-ready.png), [дубликат](screenshots/04-duplicate.png), [ошибка](screenshots/05-failed.png), [неизвестная готовность](screenshots/06-unknown.png), [верхний баннер](screenshots/07-ready-order.png), [восстановление](screenshots/08-reconnected.png), [потерянный ответ](screenshots/09-receipt-unknown.png), [сверка](screenshots/10-receipt-modal.png), [archiveerror](screenshots/11-archive-failed.png), [403](screenshots/12-access403.png), [вход](screenshots/13-auth-required.png), [отклонённый файл](screenshots/14-upload-rejected.png).

Live/dev и server/database deployment ещё не завершены. OwnQA failedID b9ee213d-2b8c-485f-b486-ac44f673e389 создан через прежний dev для проверки upgrade→retry. Только собственные 81B malformed/1904B repaired EPUB; original EN, без LLM.

Adverse outcomes: отказ от same-ID backend прототипа из-за гонки поздних childwrites; исправлены потеря retryassociation после неизвестного receipt, устаревший deferredtoast после подтверждённого ready и ложная failedкарточка после barecompleted. Старый racesmock возвращал undefined на refresh; исправлен под реальный catalogview. Production память больших EPUB не измерялась.

Tracked logs normalize line endings, trailing whitespace and NUL formatting bytes only; original outputs remain in ignored worktree .local files.
