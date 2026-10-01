---
type: archive
status: archived
owner: reader
created: 2026-10-01
last_verified: 2026-10-01
implementation_status: released
---

# Восстановление перевода и позиции Reader

## Итог и текущая версия

Ремонт реализован и выпущен после локальных проверок и двух dev smoke. Один авторитетный изменяемый статус — этот файл в основном frontend checkout; точные наблюдения и adverse результаты — в evidence. Пользователь разрешил самостоятельные исправления, проверенный dev→prod и backend/main deployment; чужие изменения сохранены.

| Слой | Выпущенный код | Подтверждение |
|---|---|---|
| Backend main / Render | `ddbc32f90be765ccb2f6840678b46c4ec7479b86` | LIVE `dep-daup2upsrm7s73b7udl0`, health/OpenAPI HTTP200 |
| Frontend dev | `4200ccc114875d5808a094a7dc305b0b800a5068` | Preview `6772135448`, READY; свежий ES перевод и reload PASS |
| Frontend production | `9e4ac7d5348f3735879b12990695d2e782110d7f` | Production `6772200366`, READY 23:13:30 UTC; www/artifact и Reader chunk совпали с repaired dev |
| База | Без миграции | Conditional UPDATE/INSERT использует существующую схему |

Продукт production идентичен проверенному `4200ccc`; release commit добавляет deployment policy и evidence. Финальный bookkeeping возвращает `dev:true/main:false` и синхронизирует ветки; это не новый продуктовый релиз. [Backend](../../rfcs/active/reader-recovery-2026-10-01/evidence/backend-live-smoke.json), [dev](../../rfcs/active/reader-recovery-2026-10-01/evidence/dev-repair-release.json), [production](../../rfcs/active/reader-recovery-2026-10-01/evidence/prod-release.json), [production browser smoke](../../rfcs/active/reader-recovery-2026-10-01/evidence/prod-live-reader-smoke.json).

## Что исправлено и почему

1. **Принадлежность переводов.** ReaderView отправлял соседние chapter IDs через endpoint текущей главы. Render logs + read-only Supabase подтвердили это для sampled ошибок: блоки существуют, но принадлежат другой главе. Текущая очередь ограничена своей главой; отдельная подгрузка следующей сохранена. [Логи](../../rfcs/active/reader-recovery-2026-10-01/evidence/render-translation-errors.json), [проверка IDs](../../rfcs/active/reader-recovery-2026-10-01/evidence/observed-block-ids-readonly.json).
2. **Восстановление.** Error/empty/omitted results больше не считаются готовым переводом. Сначала проверяется результат на сервере, затем ограниченный повтор: cooldown30s, максимум3 автоматические попытки, recovery120s; stream60s/status10s ограничены. После исчерпания — видимая ошибка и ручной Try again; при устаревших IDs — Reload chapter. Успешные блоки сохраняются.
3. **Snapshot и поздние ответы.** Содержимое связано с book/chapter/lang, запрос — также с account. Чужой snapshot stale уже в первом render. Смена владельца отменяет старую работу. Обновление той же главы сохраняет активный stream и cooldown; удалённые IDs не пишут UI/cache, свежий готовый текст не затирается.
4. **Backend ошибки.** Совместимые reason/retryable различают отсутствующие записи и DB failure. Каждый missing ID получает terminal result. Ошибка чтения кеша не запускает платную регенерацию. Chapter constraint и billing gate сохранены; OpenAPI обновлён.
5. **Позиция.** Исправлено сохранение при выборе начала текущей главы из TOC. Backend больше не делает unconditional upsert после отдельного чтения: UPDATE проверяет observed updated_at, первоначальная запись использует INSERT с conflict ACK. Stamp растёт минимум на1ms; DB failure возвращает503. Намеренное чтение назад сохраняется.

## Проверки и доказательства

| Проверка | Результат и предел доказательства |
|---|---|
| Frontend полный suite / build / TypeScript / docs | 333/333; production build PASS; TypeScript/docs/diff PASS. [Итог](../../rfcs/active/reader-recovery-2026-10-01/evidence/frontend-final-build.json) |
| Translation hooks / Reader UI | 21+5 PASS; actual Reader initial-stream regression1 PASS. Синтетические transport и геометрия. [Hook](../../rfcs/active/reader-recovery-2026-10-01/evidence/translation-candidate-21.json), [UI](../../rfcs/active/reader-recovery-2026-10-01/evidence/reader-translation-ui-after-split-5.json), [один stream](../../rfcs/active/reader-recovery-2026-10-01/evidence/reader-initial-stream-fixed.json) |
| Content / position / loading | 16 content hook,8 anchor guard,3 actual Reader position,5 Reader loading PASS. [Позиция](../../rfcs/active/reader-recovery-2026-10-01/evidence/frontend-position-summary.json), [loading](../../rfcs/active/reader-recovery-2026-10-01/evidence/frontend-reader-load-errors.json) |
| Backend полный suite / build | Build PASS;315 PASS/38 FAIL, все38 — прежний epub-parser.test.ts с отсутствующими EPUB fixtures и каскадными ошибками. Parser не менялся. Новые18 translation/position и19 HTTP fixtures PASS. [Отчёт](../../rfcs/active/reader-recovery-2026-10-01/evidence/backend-verification.json) |
| Настоящий локальный PostgreSQL/PostgREST | 6 cases PASS: конкурирующие INSERT/UPDATE, backwards save, same-ms, null stamp, user isolation, DB failure. [До](../../rfcs/active/reader-recovery-2026-10-01/evidence/position-native-baseline.json), [после](../../rfcs/active/reader-recovery-2026-10-01/evidence/position-native-cas.json) |
| Live dev | TOC→reload, next chapter, Previous→last spread→reload; реальная новая генерация ES с llmCalls>0/errors0. Повторный smoke repaired4200: новые короткие ES главы → текст → reload; проверенный Reader chunk реально загружен браузером. [Повторный smoke](../../rfcs/active/reader-recovery-2026-10-01/evidence/dev-repair-live-smoke.json) |
| Live prod | Полка без offline banner, текст открывается. После синхронизации повторные reload стабильны; новый deliberate page turn сохраняется. Проверено по block IDs, не процентам layout. [Наблюдения](../../rfcs/active/reader-recovery-2026-10-01/evidence/prod-live-reader-smoke.json) |

**Adverse результат не скрыт.** Первый dev candidate `c672dc2` дублировал initial stream при same-chapter stale-cache revalidation. Старый677 сохранял один запрос, candidate делал abort+второй identical batch. Production release был остановлен. `4200ccc` исправляет readiness/ownership split; tracked `e2e/reader-initial-stream.mjs` воспроизводит и проверяет результат. [До](../../rfcs/active/reader-recovery-2026-10-01/evidence/duplicate-initial-batch-before-fix.json), [после и команды](../../rfcs/active/reader-recovery-2026-10-01/evidence/duplicate-stream-verification.json).

Первое открытие prod после тестового изменения позиции на dev показало другой spread, чем последующий settled reload. Второй reload стабилен; deliberate production turn к исходному block19 и его reload совпали. Это сохранено как отдельное наблюдение: origin-specific кеши/layout нельзя сравнивать только по процентам. Первую разницу не выдаём за доказанный новый regression или за полностью установленную историческую причину. Read-only проверка actual server row подтвердила chapter9/block19 и updated_at23:16:23.763UTC после deliberate prod turn. [Запись](../../rfcs/active/reader-recovery-2026-10-01/evidence/prod-position-readonly.json).

## Риски и критерии при дальнейшем изменении

- Хорошо: ошибки не маскируются под готовый текст; каждый ID имеет исход; успешный перевод сохраняется; late callbacks не меняют другой scope; намеренное чтение назад переживает reload.
- Стоп выпуска: повторная платная генерация из-за гонки, вечный blur, бесконечные retries, потеря/смешение позиции, другой SHA вместо проверенного, новые необъяснённые test failures.
- Локальные tests доказывают контролируемый порядок и SQL-условия. Они не доказывают все production ограничения, задержку Render или качество модели. Live smoke ограничен несколькими обычными читательскими действиями; production fault injection не делался.
- **Осталось прежнее ограничение client-clock/server-ACK.** Conditional commit защищает от lost update, но не задаёт идеальный глобальный порядок намерений устройств с разными часами. Эту политику и схему timestamp не меняли.
- Смена chapter/book/lang/account, partial/empty/error stream, зависание, unmount, cache-write delay, same/new IDs refresh, готовый snapshot после ошибки и конкурентное чтение назад входят в регрессионный набор.

## Интеграция и сохранность

Работа сделана в clean worktrees `.local/reader-recovery-20261001` обоих репозиториев, ветки `fix/reader-recovery-20261001`. Backend основан на origin/main26ea1e5; старый local feat/catalog-speed bc30003 с незавершённым atomic EPUB import и auth/IP экспериментами не вливался. Перед каждым release origin повторно проверен; новых чужих backend commits не появилось. Force push не применялся. Dirty старые worktrees, пользовательские AGENTS/landing/billing документы, credentials и EPUB сохранены.

Завершённый bookshelf план и устаревший апрельский my-books план — в [архиве](README.md). Старые evidence остаются по стабильным ссылкам. Общие RFC новой translation orchestration/state machine остаются предложениями; полного переписывания очереди здесь нет.

Native SQL scripts/schema/config сохранены в backend `.local/reader-recovery-runtime/`; loopback PostgreSQL55591/PostgREST30591 после проверки остановлены. Зависимости переиспользованы; временные сборки и raw logs остаются в ignored `.local`, credentials туда не копировались.

## Откат

Backend: прежний Render `dep-daui9vm0tbcc7396vo40` (`26ea1e5`) либо `git revert ddbc32f` поверх актуального main. Миграции нет, позиции совместимы. Frontend: предыдущий production artifact `https://globoox-3jfe7f4vv-lomovski.vercel.app`, приложение8e7879d, Git checkpoint67700e2. Откат через revert поверх актуальной ветки с сохранением чужих commits; на production release временно main:true, после smoke вернуть main:false. Preview artifact с dev environment в prod не продвигать.

## Журнал решений

- 2026-10-01: исправляем доказанные причины существующего потока; новые постоянные upload jobs, atomic EPUB import и новый глобальный протокол позиции не добавляем.
- 2026-10-01: не ослабляем server chapter validation; принадлежность исправлена на клиенте.
- 2026-10-01: dev smoke остановил первый frontend release; readiness/ownership regression воспроизведён и устранён до production.
- 2026-10-01: после repaired dev smoke выпущен production9e4ac7d; source identical4200ccc. Дальнейшие backend commits в будущем интегрировать от актуального main и повторять затронутые checks, без force push.

## Production landing rollback

2026-10-01: user requested the old production landing after the reader release. The only application source change restores the primary localized route to the preserved `LocalizedLandingPage` implementation from production235ddff, retaining current 404 validation and JSON-LD escaping. Reader/bookshelf/backend are unchanged. Dev remains on01e2fe2 with the editorial primary landing; main intentionally diverges for this presentation choice. Local production build and69 existing landing routing/localization/consent tests passed. Local browser verified the former design, language switching and landing→bookshelf navigation with no marketing wrapper/style leaking into the bookshelf. Anonymous HTTP verified all four locales, SEO/JSON-LD and unknown-locale404. Local webpack root `/` returned a client-manifest error involving the pre-existing duplicate `src/app/(app)/page.tsx`; both root source files are unchanged. Production `/` and apex currently redirect successfully to `/en`; release verification must check this again. Production release `88d3a4c8ef4bfd389b823a861d95064d9abf6cb6` is verified: Vercel `6SUKtqSJwPD8zHyio8MdtaZP11mZ`, GitHub Production6780182216, READY2026-10-01T08:55:25Z, artifact `https://globoox-fht8j7iee-lomovski.vercel.app`. Live `/`, apex and all four locales return the restored landing with HTTP200; unknown locale404; signed-in `/en` redirects to the working bookshelf. The Reader JavaScript remains byte-identical to the verified recovery release (SHA256d217ba6d3a03b571c9b23d5bef2be651635cc6603b560548e577f7c3a2ed4638). Dev is unchanged on01e2fe2 with editorial. Final bookkeeping restores main auto-deploy=false; dev=true remains. [Local checks](../../rfcs/active/reader-recovery-2026-10-01/evidence/landing-rollback-local.json), [live checks](../../rfcs/active/reader-recovery-2026-10-01/evidence/landing-rollback-live.json).

## Upload presentation audit — 2026-10-01

User asks whether upload immediately occupies the first shelf slot, uses the parsed book title as soon as available, fills metadata/cover progressively, and remains first in Recently Read after reload/return. Read-only audit against frontend origin/main bff9935 (upload sources identical to local dev) and backend origin/main b993ec3: **partially implemented, not fixed in this audit**.

- Immediate top slot exists. `UploadBookModal` emits `uploading` before the first request; `bookshelfUploads` prepends the attempt; `my-books` renders attempts before normal cards. Closing only the modal retains the attempt; successful completion keeps that slot while this page is mounted.
- Placeholder currently renders `fileName`, with no parsed-title field. Polling only forwards numeric progress to the modal; `waitForBookJob` discards even the completed result's title/author. Shelf refresh begins on completion, then index title replaces the placeholder and cover loads independently. Intermediate metadata is not delivered to the card.
- Top placement is page-local React state. It disappears on remount/reload. Recently Read then uses server order: read timestamp descending/nulls last, then global book creation timestamp. An unread new upload therefore goes below already-read books. The archived D13 acceptance explicitly covered the current view only; this does not satisfy the user's current persistence expectation.
- Backend detail: parsed title/cover are written after the full parser returns, before chapter/block storage, but active job status exposes only state/progress. The index does not expose processing status. A non-dedup metadata UPDATE failure is logged and processing continues, so the fallback filename can survive. No consistently maintained per-user added_at exists: preference created_at can originate from another action, remain old on re-add, and be absent for a new queued upload. Last-read/progress must not be fabricated to work around ordering. Latest backend commits afterddbc32f only change fiction prompts/tests and do not repair these gaps.
- Existing `node e2e/bookshelf-upload-races.mjs` passes all8 synthetic component scenarios again. Raw result: `.local/upload-audit-20261001/upload-races.json`. The harness substitutes the shelf, so these passes do not prove real shelf sorting after reload or progressive parsed metadata. No production upload, model call, source edit or deployment was performed.

Required follow-up: neutral label until the real title exists; expose available metadata through the existing job flow; fill the same non-openable processing card; order by a user's latest addition/reading activity without fabricating reading progress, including dedup additions. Verify title distinct from filename, reload/return before first reading, delayed cover, dedup and no duplicate slots. Implementation remains proposed.
