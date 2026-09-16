---
type: implementation-record
status: deployed-and-verified
owner: library
last_verified: 2026-09-16
backend_status: unchanged
deployment_status: dev-ready
---

# Стабилизация загрузки библиотеки — 16 сентября 2026

В текущих локальных исходниках устранено переключение между разными алгоритмами Recently Read при каждом обновлении массива книг. Список сохраняет раннюю потоковую публикацию; локальный snapshot восстанавливается вместе с временными метками, поздние данные сверяются по свежести, а серверные позиции запрашиваются очередью, которая не перезапускается на каждый stream batch.

**Статус:** frontend реализован и локально проверен: 147 unit-тестов, 8 браузерных сценариев hook, 9 усиленных page fixtures на production-сборке, TypeScript и build прошли. Проверен настоящий гостевой маршрут Library → Reader → Library. Коммит `b541a767b810c0243b709fb7b110195012a6d3bc` отправлен в origin/dev и опубликован на dev.globoox.co; Vercel READY, привязка домена и настоящий гостевой маршрут проверены.

## Границы работы

| Участок | Решение |
| --- | --- |
| Основная цель | Убрать повторные ложные перестановки/сбросы состояния при гидратации, одинаковом ответе, потоке и auth retry; сохранить доступность первых книг. |
| Backend | Не изменён. Нет нового server sort, `last_read_at`, snapshot version, cursor или bulk progress endpoint. Это отдельные предложения в [контракте as-is → to-be](../../../reference/architecture/library-contract-as-is-to-be.md). |
| Поток и lazy rendering | Сохраняются: usable head показывается до хвоста; UI стартует с 6 книг и расширяет видимый набор порциями по 6. Это клиентское ограничение рендера, не серверная пагинация. |
| Auth retry | Сохраняется дополнительный JSON fetch спустя 1200 мс после первого сетевого результата authenticated scope. Первый usable список не ждёт этого retry. Guest/share не получают этот auth retry. |
| Высоты и геометрия | Явно вне задачи. Не исправлялись высоты loading/готовой страницы, сетка обложек и геометрические сдвиги. Нельзя выдавать эту работу за устранение всех видов визуального мигания. |
| Reader | Только передача scope в существующие действия/cache helpers и отметка открытия. Anchor, сохранение позиции, `stale_client` и reader layout не переписаны. |
| Старые материалы | [Диагностика 15 сентября](audit-2026-09-15.md) сохранена отдельно неизменяемым историческим телом. Существующие документы и посторонние billing-правки не входят в это изменение. |
| Публикация | `b541a76` в origin/dev; Preview deployment `dpl_4y7kuj828gZcCDErjq5KzWWC1hCV`, dev.globoox.co. Основной домен и www остались на прежнем deployment. |

## Реализованное поведение и источники

Пути исходников приведены от корня репозитория.

| ID | Изменение | Что гарантирует локальная реализация | Источник |
| --- | --- | --- | --- |
| F01 | Сессия списка привязана к scope и lifetime hook | Старый request, его `finally` и поздний IDB не публикуют данные после смены сессии или более нового ответа/мутации. Повтор A → B → A не делает старый запрос A актуальным. | `src/lib/useBooks.ts`, `src/lib/useBooksState.ts`: `BooksRequestGuard`, `sessionId`, версии request/hydration |
| F02 | Явные auth/enabled параметры | Неизвестный auth не запускает ожидающий guest-запрос страницы; authenticated пользователь получает `all`, guest/share — `active`. Scope кеша не считается подтверждением серверной identity. | `useBooks.ts`; `src/app/(app)/my-books/page.tsx` |
| F03 | Сравнение содержимого списка | Повторно десериализованный идентичный payload сохраняет reference массива книг. Настоящие изменения metadata, состава или порядка не подавляются. | `useBooksState.ts`: `sameBooks`; `useBooks.ts`: `publish` |
| F04 | Поток, disk cache и revalidation | Первый stream batch не задерживается debounce/auth retry. Если полный disk snapshot успел появиться до потока, его tail сохраняется до полного сетевого результата. После публикации сети поздний disk read не возвращает старый список. | `useBooks.ts`: hydration, `refresh`, streaming callback |
| F05 | Безопасные локальные мутации | Archive/Restore/Delete оптимистичны; старый list GET не возвращает удалённую/архивированную книгу. Rollback затрагивает только нужную книгу и не отменяет параллельную мутацию другой. После нужной серии мутаций выполняется согласующее обновление. | `useBooks.ts`: `beginMutation`, `mutateBook`, `finishMutation` |
| F06 | Одно правило Recently Read | Сопоставляются допустимые local/snapshot/server timestamps; сохранённый rank служит tie-break. Больше нет временного переключения snapshot-sort → timestamp-sort при каждом array reference. Более свежее реальное событие вправе изменить порядок. | `libraryReadingState.ts`: `newestTimestamp`, `compareRecentlyReadBooks`; `my-books/page.tsx` |
| F07 | Snapshot order + timestamps | Восстанавливаются оба поля. Идентичная сигнатура не вызывает новую запись; rank обновляется к текущему показанному порядку. Это UI snapshot, не согласованный snapshot сервера. | `my-books/page.tsx`; существующий `contentCache.ts` |
| F08 | IDB progress и свежесть | IDB читается один раз для нового ID в lifetime страницы. Поздняя более старая строка не заменяет свежую; намеренный переход назад с более новым timestamp разрешён. | `libraryReadingState.ts`: `mergeLibraryProgress`; `my-books/page.tsx` |
| F09 | Очередь серверных позиций | Очередь принадлежит scope/progress version; новые видимые ID дополняют её без отмены текущего sweep. Приоритет — отфильтрованный/отсортированный видимый prefix + lookahead 6; concurrency 4; успешные ID не повторяются в той же очереди. После dispose результаты не публикуются. | `libraryReadingState.ts`: `createLibraryProgressQueue`; `my-books/page.tsx` |
| F10 | Навигация без ложной остановки очереди | Один navigation-intent больше не уничтожает очередь: переход на текущую My Books или открытие ссылки в другой вкладке не равны unmount. Cleanup остаётся на scope/version/unmount. | `my-books/page.tsx`: effect очереди |
| F11 | Чтение отделено от фонового получения данных | `touchLastRead` пишет явные `localLastReadAt`/`localLastReadScope`. Фоновый `updateServerProgress` не создаёт `lastRead=now`; серверная метка хранится с `serverProgressScope`. | `src/lib/store.ts`, `libraryReadingState.ts` |
| F12 | Scoped position memory cache | 30-секундный position cache использует `scopeKey::bookId`; GET/PUT и существующие Reader callers передают тот же scope. Это локальная изоляция cache, не изменение HTTP-контракта или backend permissions. | `src/lib/api.ts`, `src/app/(app)/reader/[id]/page.tsx`, `src/components/Reader/ReaderView.tsx` |

## Проверки: результат и сила доказательства

| Проверка | Результат на момент записи | Доказательство / предел |
| --- | --- | --- |
| Полный unit suite | **147 passed, 14 files** | Подтверждено root по результату выполнения Vitest. Raw console log отдельно не сохранялся. Новые проверки находятся в `src/__tests__/useBooksState.test.ts`, `libraryReadingState.test.ts`, `libraryReadingStore.test.ts`, `libraryPositionScope.test.ts`. |
| Браузерный hook harness | **8 сценариев прошли** | Подтверждено root по выполнению harness. Это контролируемые async/API/cache сценарии hook; не две настоящие authenticated сессии на двух устройствах. Raw log отдельно не сохранялся. |
| Первоначальный page harness | **9/9 fixtures прошли** | Сохранён точный небольшой [summary JSON](evidence/page-fixtures-initial-summary.json) из `/tmp/globoox-library-regression-final/summary.json`. Он явно содержит `fixtureOnly:true`, `readerReturnIsRestoredState:true`. Название исходной папки `final` не отменяет эти ограничения. |
| Усиленный page harness | **9/9 на production-сборке** | [Production summary](evidence/page-fixtures-production-summary.json). Проверены единая публикация progress, сохранность DOM, отсутствие повторного skeleton, незавершённый запрос при same-route click, ошибки после мутаций и сохранённый retry через ≥1200 мс. Все API синтетические. |
| Scoped lint | **Изменённые файлы кроме ReaderView: PASS** | У полного `ReaderView.tsx` остаётся прежний `any` error на строке 317 и 2 warnings; сопоставлено с HEAD до правки. Эти строки не менялись. Проверены также оба browser harness. |
| TypeScript | **PASS** | `npx tsc --noEmit` на итоговых исходниках; также TypeScript внутри Next build. |
| Production build | **PASS** | `npm run build`, Next 16.1.1; все 49 static pages собраны. Production server запущен на IPv6 loopback 3016; чужой IPv4 listener не изменялся. |
| Локальный production smoke, настоящая guest-сеть | **Reader return PASS, наблюдались transient 502** | [Результат](evidence/real-guest-reader-return.json). 6 публичных книг; вторая открыта в Reader с настоящим текстом, после возврата первая и порядок стабилен ещё 6 с; JS exceptions нет, мутаций API нет. Первые list/sync GET вернули 502; JSON fallback списка вернул 200, главы 200. Холодная загрузка 17,7 с включает эти ошибки и не является performance benchmark. Не authenticated cross-device QA. |
| Docs validation | **Пройдено: 126 governed files** | `npm run docs:check` после добавления этих документов. |
| Deploy и проверка домена | **READY, exact SHA и alias проверены** | [Deployment evidence](evidence/deployment.json). [Настоящий гостевой smoke опубликованной версии](evidence/deployed-guest-reader-return.json): 6 книг, Reader → Library, открытая книга первая, стабильный порядок, нет JS exceptions, все наблюдённые API GET 200, нет мутаций. Холодная загрузка 15,1 с — отдельное ограничение сетевого пути, не обещание ускорения. |

### Девять сохранённых page fixtures

| Fixture | Что отражает сохранённый результат | Чего нельзя из него заключать |
| --- | --- | --- |
| `guest-first-batch` | Ранние 3 карточки, затем 6; тест прошёл | Не latency SLA реального backend. |
| `warm-identical-retry` | Тёплый список и повторный ответ; сценарий прошёл, сохранены переходы порядка | Название fixture не означает, что порядок вообще никогда не меняется: summary показывает один переход при получении иных progress данных. |
| `coherent-progress-wave` | Публикация progress sweep и переход к актуальному fixture-порядку | Не знание recency всей большой библиотеки. |
| `same-library-navigation` | Намерение перейти на ту же библиотеку не мешает последующей публикации progress | Не полный перечень keyboard/modifier/router сценариев. |
| `local-recency` | Восстановленное локальное открытие сохраняет приоритет | Это подставленное состояние после чтения, не фактический Reader → Library маршрут. |
| `legacy-local-recency` | Совместимость со старым локальным timestamp в fixture | Не доказанная identity старых данных без scope metadata. |
| `foreign-local-recency` | Явно чужой scoped timestamp не задаёт порядок текущего пользователя | Не полный аудит всех глобальных caches приложения. |
| `scope-separation` | Изоляция заданного fixture scope | Не реальная авторизация двумя аккаунтами/устройствами. |
| `archive-delete` | Зафиксированы ожидаемые PATCH `status:hidden` и DELETE, fixture прошёл | Первоначальный harness не заменяет усиленную проверку точного состава UI после каждого действия. |

`firstCardsAt` в JSON — время локального instrumented fixture-прогона. Не использовать эти числа как продуктовый benchmark, production ускорение или сравнение до/после.

## Сохраняющиеся ограничения

1. `ApiBook` не содержит отдельного `last_read_at`. На холодном старте произвольно упорядоченный stream и позиции только видимых книг не дают глобальный Recently Read. Реальное позднее событие может законно переставить книгу. Решение на сервере описано отдельно и **не реализовано**.
2. 1200-мс auth retry остаётся временным workaround. Явный frontend scope не удостоверяет principal backend; proxy/browser identity race требует отдельного контракта.
3. Старый Zustand progress без scope/provenance сохраняется для совместимости. При первой серверной гидратации старое `lastRead` без прежнего `serverUpdatedAt` переносится в явное local activity. Это миграционная эвристика, не ретроспективное доказательство аккаунта. Новые явно чужие scope не используются как текущие.
4. Сохраняются существующие cache/sync ограничения: invalidation не равен реактивной подписке всего UI; позиция/чтение/offline event не разделены на backend; pending anchor не является гарантированным durable outbox.
5. Backend, reader anchor conflict policy и геометрия loading не менялись. Успешные fixtures не подтверждают отсутствие всех возможных сетевых гонок, визуальных сдвигов или auth-проблем в production.

## История и сохранность доказательств

- [Исторический audit](audit-2026-09-15.md): исходное тело `output/library-load-audit-2026-09-15/REPORT.md` сохранено **байт в байт**; добавлен только YAML frontmatter перед ним. В теле намеренно остаются старые ссылки на baseline-код и тогдашние результаты.
- [Evidence manifest](evidence/manifest.json): SHA-256 исходного audit body и скопированного fixture summary, признаки fixture-only и статус усиления на момент фиксации.
- [Действующий контракт и предложение серверу](../../../reference/architecture/library-contract-as-is-to-be.md): as-is подтверждён текущими frontend-потребителями; backend internals не проверены, v2 proposal не реализован.

При последующем compaction этот README является текущим implementation record; audit 15 сентября — историческая диагностика, а проект серверного протокола — только предложение. Результаты build/deploy добавлять сюда, не переписывая audit body или первоначальное evidence.

## Публикация

- Runtime SHA: `b541a767b810c0243b709fb7b110195012a6d3bc`; source GitHub futurgate/globoox, ref dev.
- Vercel project globoox / team lomovski; deployment `dpl_4y7kuj828gZcCDErjq5KzWWC1hCV`, Preview (`target:null`).
- Проверенный адрес: https://dev.globoox.co/my-books. Неизменяемый адрес: https://globoox-ggbjp2nav-lomovski.vercel.app.
- Git-source deploy содержит только отправленный commit. Локальные env-файлы, AGENTS, output и billing-правки не загружались. Политика автоматических деплоев в vercel.json не менялась.
- dev alias назначен автоматически Vercel. globoox.co и www.globoox.co остались на `dpl_9CBYCvJw17PXcwiaBgZjxAgaXUKU`; main/production не публиковались.
- Независимый [HTTP smoke](evidence/deployed-http-smoke.json): 4 страницы и 6 referenced JS/CSS assets доступны; `/` корректно направляет на `/en`. Это проверка HTTP, не доказательство account authorization.
- Последующий documentation-only commit фиксирует доказательства; runtime остаётся на указанном SHA, повторная сборка для отчёта не требуется.
