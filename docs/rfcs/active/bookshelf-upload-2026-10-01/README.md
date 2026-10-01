---
type: rfc
status: implemented
owner: library
created: 2026-10-01
last_verified: 2026-10-01
implementation_status: released_on_dev
---

# Bookshelf upload: завершённый dev checkpoint и оставшаяся работа

**Upload feedback и общие уведомления реализованы и проверены на dev**, application `865354a`. Production frontend не обновлялся; backend/DB для этого выпуска не изменялись. Завершённый план, решения, приёмка и откат — в [архивном отчёте](../../../archive/2026-10-01-bookshelf-feedback/README.md). Первоначальная upload story — в [предыдущем отчёте](../../../archive/2026-10-01-bookshelf-upload/README.md).

[Проверки и скриншоты](evidence/feedback-2026-10-01/README.md): 370 unit, 46 browser/page, 4 mobile visual PASS; TypeScript/build/docs PASS; scoped lint без ошибок (2 прежних warning). Ручные локальные recovery-сценарии и live dev success/dedup/failure/Reader/archive/restore/reload/cleanup выполнены. Точные [live результаты](evidence/feedback-2026-10-01/live-acceptance.json) и [deployment proof](evidence/feedback-2026-10-01/deployment.json) сохраняют границы проверок. Rollback dev — `426b9ba`, без отката БД.

## Что действительно осталось

| Работа | Статус и следующий шаг |
|---|---|
| Память/размер EPUB | [Preflight и ограниченный протокол](evidence/feedback-2026-10-01/memory-preflight.json) готовы; 0 импортов/0 пар. Нет сопоставимой Linux-среды с лимитом512MiB. Измерить там; безопасный предел в MB не установлен. Не нагружать общий production экспериментальными большими файлами. |
| Серверные/Reader оптимизации | Переданы разработчице; датированный `catalog-speed-2026-09-25/developer-handoff-2026-09-30.md` в основном checkout. Свежий backend main `deeb312` касается admin fiction overwrite, эти оптимизации не закрывает. |
| Атомарный импорт, ограниченная память, fencing workers | Отдельный backend контракт после измерения. Не возвращать старую реализацию одним огромным JSON. |
| Монотонный ACK позиции между устройствами | Отдельная работа; frontend guards не решают все конфликты client clock. |
| Billing portal feedback / перенос Reader banner | Открытые отдельные UX-задачи; текущий релиз не меняет платежи и логику перевода. Единый toast теперь доступен для последующей интеграции. |
| Другие предложения | Typography, translation orchestration, unified state, offline/versioned sync — [индекс RFC](../../README.md); не реализованы этим выпуском. |

Уведомления используют один Sonner `polite` live region; assertive-канала нет. Исчезновение toast не убирает постоянную кнопку восстановления. Потерянный job ID/404 может оставаться неоднозначным: сначала сверка полки, затем явный повтор. Refresh принимает порядок сервера, не обещает исправить recency. Закрытие страницы во время передачи может прервать upload.

Исключённые пользователем отмена обработки, надёжное распознавание DRM, новые durable upload tasks, приоритетная очередь обложек и проект смешанных frontend не возвращаются в обязательный объём.

## Решение о завершении

2026-10-01: UI-план завершён на dev и архивирован; доказательства остаются по прежним путям. Product worktree — `.local/reader-recovery-20261001`. Этот checkpoint — единственный изменяемый статус оставшейся работы; исторические отчёты не служат активными чеклистами.
