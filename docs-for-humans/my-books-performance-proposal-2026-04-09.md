# Proposal: ускорение `my-books` без потери консистентности

## Summary

Проблема `my-books` выглядит не как одна локальная деградация рендера, а как накопившаяся архитектурная перегрузка стартового сценария. По фактическим трассировкам страница быстро показывает оболочку и skeleton, но долго доходит до состояния, когда пользователь видит реальные карточки книг. Основной bottleneck находится не в первом paint, а в цепочке клиентских перезапросов, инвалидаций и фоновых синхронизаций после старта.

По текущим данным нельзя честно утверждать, что именно `4 апреля` создало проблему с нуля. Наоборот, валидные full trace показывают, что и `1 апреля`, и `4 апреля`, и текущая версия проходят через похожую многосоставную клиентскую цепочку. Разница в том, что `4 апреля` в локальном валидном прогоне даже быстрее доводит страницу до реальных карточек, чем `1 апреля` и текущая версия. Это значит, что корневая причина глубже и старше, чем конкретный UI-рефактор `4 апреля`, хотя крупные изменения app shell и темы могли заметно усилить субъективную тяжесть страницы в реальной среде.

Главная практическая рекомендация: не идти сразу в большой rewrite. Сначала имеет смысл сделать фазу быстрого ускорения, которая срежет самые дорогие причины задержки без полной смены модели данных. Затем, если команда согласна на системную работу, переходить ко второй фазе: новой server-driven оркестрации `my-books` через единый snapshot и строгий контракт синхронизации между локальной памятью и БД.

Этот документ делит предложение на две фазы:

1. Быстрая фаза: сильное ускорение критического пути без глобального рефакторинга.
2. Настоящая фаза: правильная архитектура для действительно быстрого и устойчивого `my-books`.

## Что именно мы измерили

Ниже перечислены только валидные артефакты, где в итоге действительно появились карточки книг, а не ложный `No books yet`.

### Full browser trace

1. `1 апреля`:
   [docs-for-humans reference unavailable, source trace JSON in workspace]( /Users/user/Documents/github/globoox_frontend/temp/browser-traces/2026-04-01-c95fe58-mybooks-trace-1775695294646.json )
2. `4 апреля`:
   [docs-for-humans reference unavailable, source trace JSON in workspace]( /Users/user/Documents/github/globoox_frontend/temp/browser-traces/2026-04-04-bc9f2ad-mybooks-trace-1775695359447.json )
3. `Текущая версия`:
   [docs-for-humans reference unavailable, source trace JSON in workspace]( /Users/user/Documents/github/globoox_frontend/temp/browser-traces/2026-04-09-aa9af0c-mybooks-trace-1775694175045.json )

### Краткий итог по этим trace

1. `1 апреля`: в `3s` и `6s` виден только skeleton; реальные карточки появляются к `10s`.
2. `4 апреля`: в `3s` виден skeleton; к `6s` уже видны реальные карточки.
3. `Текущая версия`: в `3s` и `6s` виден skeleton; реальные карточки появляются к `10s`.

Вывод: текущая проблема не сводится к тому, что `4 апреля` якобы единолично сделало страницу медленной. По валидным локальным full trace `4 апреля` даже быстрее доводит `my-books` до реального списка. Но все версии демонстрируют архитектурно тяжелый стартовый сценарий, который надо упрощать.

## Подтвержденные находки

### 1. Проблема не в первом paint

По trace первый paint и first contentful paint происходят быстро. Пользователь видит shell страницы почти сразу. Долгая часть начинается после этого: пока страница пытается согласовать auth, список книг, sync state и reading progress.

### 2. `my-books` построен как клиентская цепочка, а не как готовый первый ответ

Текущий путь загрузки по сути такой:

1. открыть `my-books`
2. загрузить shell
3. определить auth
4. сходить за книгами
5. проверить sync status
6. возможно инвалидировать кеши
7. еще раз сходить за книгами
8. поштучно дотянуть `reading-position`

Это и дает долгий хвост перед появлением реальных карточек.

### 3. Есть `guest -> auth -> refetch` логика

На фронте `scopeKey` зависит от `useAuth()`, а список книг зависит от `scopeKey`.

См.:

1. [src/app/(app)/my-books/page.tsx]( /Users/user/Documents/github/globoox_frontend/src/app/(app)/my-books/page.tsx )
2. [src/lib/hooks/useAuth.ts]( /Users/user/Documents/github/globoox_frontend/src/lib/hooks/useAuth.ts )
3. [src/lib/useBooks.ts]( /Users/user/Documents/github/globoox_frontend/src/lib/useBooks.ts )

На практике это означает, что страница может сначала стартовать как `guest` и дернуть `status=active`, а затем после определения пользователя перейти к authenticated scope и дернуть `status=all`.

### 4. Есть startup sync invalidation

`useSyncCheck` вызывает `/api/sync/status` и при более новой серверной версии инвалидирует books cache.

См.:

1. [src/lib/hooks/useSyncCheck.ts]( /Users/user/Documents/github/globoox_frontend/src/lib/hooks/useSyncCheck.ts )
2. [src/components/SyncCheckClient.tsx]( /Users/user/Documents/github/globoox_frontend/src/components/SyncCheckClient.tsx )

Сам запрос `/api/sync/status` легкий, но последствия тяжелее: он может дать еще один круг обновления списка.

### 5. Есть forced reload через cache epoch bootstrap

Для нового browser context `SyncCheckClient` может очищать кеши и делать `window.location.reload()`.

См.:

1. [src/components/SyncCheckClient.tsx]( /Users/user/Documents/github/globoox_frontend/src/components/SyncCheckClient.tsx )

Это осознанный механизм миграции storage, но на cold start он добавляет лишний полный цикл загрузки.

### 6. Есть per-book fanout по `reading-position`

Когда книги уже пришли, фронт начинает веер запросов `/api/books/{id}/reading-position` по отдельности.

Это усиливает сетевой шум и добивает стартовую фазу, даже если не всегда является главным виновником первого появления карточек.

### 7. Backend уже частично агрегирует библиотеку, но не до конца

Просмотр backend-кода показывает:

1. [server/api/books.get.ts]( /Users/user/Documents/github/globoox/server/api/books.get.ts ) уже агрегирует список книг, effective visibility semantics и `selected_language`.
2. [server/api/sync/status.get.ts]( /Users/user/Documents/github/globoox/server/api/sync/status.get.ts ) отдает sync version по scopes.
3. [server/api/books/[id]/reading-position.get.ts]( /Users/user/Documents/github/globoox/server/api/books/%5Bid%5D/reading-position.get.ts ) умеет вернуть reading position, но только по одной книге за раз и с дополнительной логикой валидации anchor.

Вывод: backend уже близок к нужному snapshot-подходу, но текущий контракт все еще дробит первый экран на несколько сетевых шагов.

## Почему сейчас медленно

Если ужать проблему до сути:

`my-books` медленно не потому, что тяжело рисуется, а потому что слишком долго договаривается сам с собой, что именно надо показать`.

Основные причины в порядке практической важности:

1. `guest -> auth -> refetch`
2. startup sync invalidation
3. forced reload при cache epoch mismatch
4. per-book `reading-position` fanout
5. дополнительная auth stabilization логика внутри `useBooks`

## Фаза 1. Быстрое ускорение без глобального рефакторинга

### Цель

Убрать самые дорогие причины задержки в критическом пути и сократить время до первых реальных карточек без смены всей модели данных.

### Ожидаемый результат

1. Карточки книг появляются заметно раньше.
2. Уходит часть лишних refetch и перезапусков страницы.
3. Локальная память, sync и БД сохраняют текущую семантику.
4. Риски ограничены и локализованы.

### Шаги

#### Шаг 1. Убрать hard reload из cache epoch bootstrap

Что менять:

1. [src/components/SyncCheckClient.tsx]( /Users/user/Documents/github/globoox_frontend/src/components/SyncCheckClient.tsx )

Что требуется:

1. Сохранить механизм epoch-based invalidation storage.
2. Убрать обязательный `window.location.reload()`.
3. После очистки storage продолжать работу в том же lifecycle.

Почему это безопасно:

1. Сама миграция storage сохраняется.
2. Убирается только лишний повторный старт страницы.

Риск:

1. Если какой-то кусок кода не ожидает работу сразу после очистки storage, возможны edge-case баги в инициализации.

Требование к валидации:

1. Проверить cold start на чистом storage.
2. Проверить, что после epoch migration страница не зависает в пустом состоянии.

#### Шаг 2. Не стартовать list fetch как `guest`, пока auth не определен

Что менять:

1. [src/app/(app)/my-books/page.tsx]( /Users/user/Documents/github/globoox_frontend/src/app/(app)/my-books/page.tsx )
2. [src/lib/hooks/useAuth.ts]( /Users/user/Documents/github/globoox_frontend/src/lib/hooks/useAuth.ts )
3. [src/lib/useBooks.ts]( /Users/user/Documents/github/globoox_frontend/src/lib/useBooks.ts )

Что требуется:

1. Для authenticated сценария не запускать первый `guest` fetch, если auth еще в состоянии `loading`.
2. Сразу использовать корректный scope после определения пользователя.

Почему это важно:

1. Срежет двойной проход `active -> all`.
2. Уменьшит вероятность ненужных refetch до первого нормального списка.

Риск:

1. При неаккуратной реализации guest-пользователь может получить лишнюю задержку или сломанный first load.

Требование к валидации:

1. Отдельно проверить guest path.
2. Отдельно проверить authenticated cold start.

#### Шаг 3. Ослабить startup invalidation от sync check

Что менять:

1. [src/lib/hooks/useSyncCheck.ts]( /Users/user/Documents/github/globoox_frontend/src/lib/hooks/useSyncCheck.ts )
2. [src/lib/useBooks.ts]( /Users/user/Documents/github/globoox_frontend/src/lib/useBooks.ts )

Что требуется:

1. Не делать агрессивный reset списка сразу после mount, если уже есть валидные книги на экране.
2. Переходить к background refresh вместо UI-disruptive invalidation.

Почему это важно:

1. Sync должен подтверждать свежесть данных, а не ломать first render.

Риск:

1. Можно показать слегка устаревший список на короткое время.

Требование к валидации:

1. Проверить, что более новый серверный state в итоге доходит до UI.
2. Проверить, что книги не исчезают и не превращаются во второй skeleton-cycle.

#### Шаг 4. Убрать per-book `reading-position` из критического пути первого экрана

Что менять:

1. [src/app/(app)/my-books/page.tsx]( /Users/user/Documents/github/globoox_frontend/src/app/(app)/my-books/page.tsx )

Что требуется:

1. Карточки книг должны появляться до старта fanout по `reading-position`.
2. Для первого экрана progress может быть отложен или предварительно взят из локального persisted cache.

Почему это важно:

1. Карточка книги важнее точного процента прогресса в первые сотни миллисекунд.

Риск:

1. На короткий момент progress на карточках может быть пустым или слегка устаревшим.

Требование к валидации:

1. Убедиться, что list появляется раньше, а progress дотягивается уже после.

#### Шаг 5. Пересмотреть auth stabilization retry в `useBooks`

Что менять:

1. [src/lib/useBooks.ts]( /Users/user/Documents/github/globoox_frontend/src/lib/useBooks.ts )

Что требуется:

1. Сузить или убрать дополнительный retry с паузой там, где он больше не нужен.
2. Оставить только минимально оправданную стабилизацию.

Риск:

1. Если proxy/session path реально нестабилен в первые миллисекунды, можно вернуть редкие race condition.

Требование к валидации:

1. Проверить cold authenticated load на нескольких сессиях подряд.

### Требования к фазе 1

1. Без изменения backend-контрактов.
2. Без регрессии hidden/deleted semantics.
3. Без регрессии guest path.
4. Без регрессии локального восстановления progress.
5. Без массовой смены структуры persisted storage.

### Критерии успеха для фазы 1

1. На валидном authenticated cold start реальные карточки появляются раньше, чем сейчас.
2. Число запросов до first real cards уменьшается.
3. Уходит forced reload cycle.
4. Список не исчезает при startup sync check.

## Фаза 2. Настоящая архитектура

### Цель

Сделать `my-books` server-driven: первый экран должен строиться из одного canonical snapshot, а локальная память должна быть ускоряющим и офлайн-устойчивым слоем, а не источником сложной оркестрации.

### Архитектурный принцип

Первый экран должен загружаться по схеме:

1. Сервер определяет пользователя.
2. Сервер собирает единый library snapshot.
3. Страница рендерится сразу из snapshot.
4. Клиент хранит snapshot как baseline.
5. Локальные pending mutations накладываются поверх snapshot.
6. Background revalidate обновляет snapshot мягко, без сброса UI.

### Что нужно сделать

#### Шаг 1. Ввести единый snapshot-контракт

Минимально достаточный контракт:

```ts
type LibrarySnapshot = {
  userId: string | null
  generatedAt: string
  syncVersion: {
    library: string | null
    progress: string | null
    settings: string | null
  }
  books: Array<{
    id: string
    title: string
    author: string | null
    coverUrl: string | null
    status: 'active' | 'hidden'
    createdAt: string
    selectedLanguage: string | null
    isOwn: boolean
    readingPositionPreview: {
      chapterId: string | null
      blockId: string | null
      blockPosition: number | null
      updatedAt: string | null
    } | null
  }>
}
```

#### Шаг 2. Добавить backend endpoint или server-side composition

Варианты:

1. Новый backend endpoint `GET /api/library-snapshot`.
2. Или server-side composition в самом Next frontend, который агрегирует существующие backend endpoint на сервере.

С учетом увиденного backend-кода правильнее всего рассматривать новый агрегированный endpoint поверх существующих логик из:

1. [server/api/books.get.ts]( /Users/user/Documents/github/globoox/server/api/books.get.ts )
2. [server/api/sync/status.get.ts]( /Users/user/Documents/github/globoox/server/api/sync/status.get.ts )
3. [server/api/books/[id]/reading-position.get.ts]( /Users/user/Documents/github/globoox/server/api/books/%5Bid%5D/reading-position.get.ts )

#### Шаг 3. Перевести `my-books` на server-loaded initial state

Что менять:

1. [src/app/(app)/my-books/page.tsx]( /Users/user/Documents/github/globoox_frontend/src/app/(app)/my-books/page.tsx )

Что требуется:

1. Первый рендер карточек идет из server snapshot.
2. Client-side fetch используется только как revalidate/update path.
3. Skeleton нужен только если нет snapshot вообще.

#### Шаг 4. Отделить `server snapshot`, `pending local mutations`, `background sync`

Нужны три явных слоя:

1. `lastServerSnapshot`
2. `pendingLocalMutations`
3. `currentMergedView`

Тогда UI строится как:

`currentMergedView = merge(lastServerSnapshot, pendingLocalMutations)`

#### Шаг 5. Перевести sync-check на version-aware refresh

Что требуется:

1. `sync/status` больше не сносит книги слепо.
2. Он только говорит: snapshot устарел или нет.
3. Если устарел, делается ровно один controlled background refresh snapshot.

#### Шаг 6. Упростить first-screen progress

В initial snapshot нужен preview-level progress.

Полный anchor resolution для reader-grade точности не должен быть частью критического пути library page для всех книг.

### Требования к фазе 2

1. БД и backend остаются authoritative source для synced state.
2. Local storage используется как acceleration layer и офлайн-буфер.
3. Merge server/local state идет по явным monotonic rules.
4. UI никогда не откатывает более новый локальный progress к более старому server snapshot.
5. Hidden/deleted semantics полностью сохраняются.
6. Recently Read ordering остается детерминированным.

### Основные риски фазы 2

1. Регрессия консистентности progress.
2. Регрессия hidden/deleted semantics.
3. Слишком тяжелый snapshot endpoint.
4. Рост нагрузки на БД при наивной агрегации.
5. Сложность rollout-а и merge-правил.

### Как снижать риски

1. Делать rollout по флагу.
2. Сначала переводить только `my-books`.
3. Сначала отдавать только preview-level progress.
4. Оставить fallback path на старую логику.
5. Добавить telemetry:
   1. time to first real book card
   2. refetch count per load
   3. snapshot age
   4. sync invalidation count
   5. number of reading-position requests before first real cards

## Инварианты и anti-regression требования

Это обязательные условия для обеих фаз.

1. Hidden/deleted semantics должны совпадать с backend.
2. Progress не должен откатываться назад.
3. Recently Read не должен хаотично прыгать.
4. Sync invalidation не должен приводить к пустому экрану.
5. Offline/poor network поведение должно сохранять last good snapshot.
6. Optimistic updates не должны вспыхивать назад после revalidate.

## Что рекомендуется команде

### Если нужен быстрый выигрыш

Идти в фазу 1 и забирать большую часть эффекта без глобального рефакторинга.

### Если нужен правильный долгосрочный результат

После фазы 1 переходить к фазе 2 и переводить `my-books` на snapshot-driven модель.

### Что не рекомендуется

1. Не пытаться “победить” проблему только косметическими оптимизациями UI.
2. Не продолжать расширять startup orchestration на клиенте.
3. Не запускать большой rewrite без telemetry и fallback path.

## Практический вывод

Текущая медленность `my-books` — это не просто проблема рендера и не одна неудачная правка. Это следствие того, что первый экран собирается через несколько клиентских источников истины и несколько волн синхронизации. Самый рациональный путь для команды: сначала быстро разгрузить критический путь, затем — если эффект подтвердится и мотивация сохранится — перевести `my-books` на единый server-driven snapshot.