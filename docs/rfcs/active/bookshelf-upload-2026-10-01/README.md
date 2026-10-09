---
type: rfc
status: implemented
owner: library
created: 2026-10-01
last_verified: 2026-10-09
implementation_status: feedback_refinement_released_on_dev
---

# Bookshelf upload: уточнение обратной связи и повтор загрузки

**Git-интеграция — 2026-10-09:** завершённые upload feedback, безопасный Upload again и исправление тени skeleton включены в согласованный код main/dev. Main уже получил bookshelf-изменения в `f908945`; эта синхронизация сохраняет их вместе с последующими admin/library-исправлениями main. Ниже записана историческая dev-приёмка и оставшаяся работа; интеграция Git сама по себе не подтверждает новый live-выпуск.

**Dev-приёмка — 2026-10-01:** уточнённый upload feedback и безопасный Upload again реализованы и проверены на dev, application `93ec25b`. Backend main `74e977b` и additive RPC были установлены в production; production frontend на том checkpoint оставался `bff9935`. [Приёмка, скриншоты, ограничения и откат](evidence/feedback-refinement-2026-10-01/README.md). Предыдущий законченный выпуск — в [архивном отчёте](../../../archive/2026-10-01-bookshelf-feedback/README.md); первоначальная upload story — в [предыдущем отчёте](../../../archive/2026-10-01-bookshelf-upload/README.md).

Проверки приёмки 2026-10-01: frontend 379 unit / 65 browser scenarios, backend 68 targeted / 39 native SQL checks PASS; TypeScript и обе сборки PASS. Полный backend suite: 419 PASS / 11 FAIL из-за четырёх отсутствующих старых EPUB. [Live dev приёмка](evidence/feedback-refinement-2026-10-01/live-acceptance.json): ошибочная книга → отмена → успешный повтор → reload → Reader → обычный дубликат → cleanup. После очистки снова шесть исходных книг, тестовые строки отсутствовали в БД. Rollback того dev-выпуска — `0a4a793`, backend — revert `74e977b`; SQL rollback удаляет только новую функцию после отката её вызывающего кода.

## Завершённая доработка — 2026-10-01

Авторизовано пользователем после просмотра 14 скриншотов: убрать крестик toast, текст Reading progress is safe; одинаковые компактные 2:3 карточки неизвестной готовности/ошибки без иконки; индикатор внутри обложки; одно сообщение вместо banner+toast. Исправить обнаруженные 403/повторное уведомление/отложенное уведомление под чужим диалогом/подписи recovery. Связать Upload again с исходной failed-книгой, чтобы новая попытка не оставляла старую ошибочную запись после reload. Сначала проверки и dev; production frontend не менять.

- Frontend: общая рамка 2:3 для unknown/error, без иконки, компактный текст; spinner32 внутри обложки. Toast без крестика, Reading progress is safe; ошибки archive/delete/restore без дублирующего page banner. Сбой обновления полки — только верхний banner. Новый генератор обложек не добавлялся.
- Backend: optional retry_book_id; малая additive SQL RPC под row lock атомарно заменяет собственную error-запись новой pending с новым ID. Старые chapter/block writes не могут попасть в новую книгу; ready/processing/чужие записи защищены. Отвергнут same-ID reset: одного file_path fence недостаточно для уже начатых child inserts зависшего worker. Native PostgreSQL проверяет транзакцию/конкуренцию/FK перед production migration и push main.
- Контроль: unit/API/processor/notification; browser fixtures с потерей сети, повтором/отменой/двумя запросами/сменой аккаунта/reload; TS, scoped lint, production build. Скриншоты actual UI 320/390/desktop, dark/light, увеличенный текст, без дублирующих баннеров и растянутых cover slots. Живой dev — только собственные маленькие EPUB, удаление QA-книг после приёмки.
- Хорошо: одна карточка повторяемой книги, готовая canonical-книга и чтение сохранены, ошибка/неизвестность различаются, действие тоста совпадает с подписью, явный повтор сообщает свой исход, тихие poll не спамят. Плохо/стоп: повреждение чужой/ready книги, старый worker меняет новый повтор, скрытая ошибка без recovery, ложный offline, две карточки после принятого retry, переполнение/недоступная кнопка.
- Локальные transport fixtures доказывают UI-переходы, а mocked backend — guards; они не доказывают Supabase/BullMQ поведение. После backend deploy проверить реальный retry/reload и защиту готовой QA-книги. Нагрузку больших EPUB не тестировать на общем production.
- Исходные checkpoints: frontend dev 0a4a793 (application 865354a), backend main deeb312. Перед push повторно fetch и интеграция программистки. Откат: frontend предыдущий dev артефакт; backend revert текущего самостоятельного изменения. SQL rollback удаляет только новую функцию; структуры/данные обычных книг не мигрируются. Проверенный same-ID прототип не выпускается.

Текущий статус: внедрение и приёмка завершены. Vercel deploy application93ec25b успешен; live backend содержит новый контракт, SQL ACL разрешает RPC только service_role. В настоящем dev новая попытка получила новый ID, старый failed исчез, готовая книга открылась и пережила reload. Тестовые данные удалены. Проблемы связи/403/неизвестный receipt/mutation errors проверялись управляемыми transport fixtures, без создания сбоев общего production.

## Что действительно осталось

| Работа | Статус и следующий шаг |
|---|---|
| Память/размер EPUB | [Preflight и ограниченный протокол](evidence/feedback-2026-10-01/memory-preflight.json) готовы; 0 импортов/0 пар. Нет сопоставимой Linux-среды с лимитом512MiB. Измерить там; безопасный предел в MB не установлен. Не нагружать общий production экспериментальными большими файлами. |
| Серверные/Reader оптимизации | Переданы разработчице; датированный `catalog-speed-2026-09-25/developer-handoff-2026-09-30.md` в основном checkout. Наш backend `74e977b` поверх `deeb312` добавляет только безопасный upload retry, эти оптимизации не закрывает. |
| Атомарный импорт, ограниченная память, fencing workers | Отдельный backend контракт после измерения. Не возвращать старую реализацию одним огромным JSON. |
| Монотонный ACK позиции между устройствами | Отдельная работа; frontend guards не решают все конфликты client clock. |
| Billing portal feedback / перенос Reader banner | Открытые отдельные UX-задачи; текущий релиз не меняет платежи и логику перевода. Единый toast теперь доступен для последующей интеграции. |
| Другие предложения | Typography, translation orchestration, unified state, offline/versioned sync — [индекс RFC](../../README.md); не реализованы этим выпуском. |

Уведомления используют один Sonner `polite` live region; assertive-канала нет. Исчезновение toast не убирает постоянную кнопку восстановления. Потерянный job ID/404 может оставаться неоднозначным: сначала сверка полки, затем явный повтор. Refresh принимает порядок сервера, не обещает исправить recency. Закрытие страницы во время передачи может прервать upload.

Исключённые пользователем отмена обработки, надёжное распознавание DRM, новые durable upload tasks, приоритетная очередь обложек и проект смешанных frontend не возвращаются в обязательный объём.

## Решение о завершении

2026-10-01: текущая доработка завершена на dev; подтверждения хранятся в feedback-refinement-2026-10-01, прежние завершённые планы остаются историческими отчётами. Product worktree — `.local/reader-recovery-20261001`. Этот checkpoint — единственный изменяемый статус оставшейся работы; исторические отчёты не служат активными чеклистами.
