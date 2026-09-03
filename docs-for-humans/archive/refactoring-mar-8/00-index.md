# Refactoring Inventory (Mar 8)

Эта папка фиксирует отдельный cleanup/refactoring pass поверх уже сделанного Translation v2 / reading+sync patch.

Задача этих документов:

- выписать обнаруженный legacy и потенциально мертвый код;
- разделить реально мертвое, transitional и просто старую архитектурную поверхность;
- зафиксировать безопасный порядок удаления;
- не потерять контекст по тому, что уже было сделано в Translation v2;
- оставить понятный backlog для следующих cleanup-pass без повторного ручного расследования.

## Файлы

1. `01-legacy-inventory.md`

Список обнаруженных legacy / dead / transitional частей по двум репозиториям:

- `globoox_preview`
- `globoox`

С классификацией по риску.

2. `02-cleanup-playbook.md`

Практический метод проверки перед удалением:

- grep
- runtime instrumentation
- staged disable
- окончательное удаление

3. `03-translation-n-sync-transition-summary.md`

Сводка того, что уже было сделано по:

- Translation v2
- reading position
- pagination
- IDB/layout cache
- recovery/reconcile

4. `04-supabase-signup-audit-checklist.md`

Отдельный audit checklist по живой Supabase схеме и signup path:

- что уже проверено;
- какой drift уже найден между репо и живой БД;
- что именно нужно проверить в auth/signup path перед любым fix;
- какие выводы уже можно делать, а какие пока нельзя.

5. `05-ideal-state-machine-spec.md`

Отдельное ТЗ на целевую state machine для Translation/Reader:

- отдельно backend state machine;
- отдельно frontend state machine;
- какие должны быть entity contracts;
- какие transitions и recovery semantics обязательны;
- почему derived pagination/layout objects не должны становиться новой истиной.

6. `06-offline-first-roadmap.md`

Отдельное ТЗ на дальний offline-first режим:

- что реально достижимо;
- что должно считаться offline-first Reader/Library;
- что должно оставаться online-only;
- reconnect semantics;
- staged roadmap без ложного обещания “полного оффлайна”.

## Связанные старые документы

Основные документы прошлого прохода:

- `../translation-n-sync-patch-mar-7/translation-v2-final-implementation-and-deviations.md`
- `../translation-n-sync-patch-mar-7/translation-v2-reconcile-api.md`
- `../translation-n-sync-patch-mar-7/translation-v2-migration-and-test-checklist.md`
- `../translation-n-sync-patch-mar-7/dom-first-pagination-plan-mar-7.md`
- `../translation-n-sync-patch-mar-7/reader-translation-cleanup-inventory-mar-7.md`

## Короткий вывод

После перехода на новый Reader/Translation surface осталось два разных класса cleanup:

1. Локальные хвосты в `globoox_preview`

- legacy parser hooks;
- compat fields;
- старые migration branches;
- proxy/endpoint legacy surface.

2. Большой legacy-пласт в `globoox`

- старый Nuxt/Vue frontend;
- старый epubjs-based reader;
- старые composables/stores, которые могут больше не входить в целевую архитектуру, если `globoox` теперь фактически backend repo.

В этих документах это разделено и описано как отдельные removal passes, а не как одна “массовая чистка”.
