# Reader / Translation Cleanup Inventory (Mar 7)

Этот файл фиксирует, что в текущей реализации выглядит как:

- реально мертвый код
- transitional / legacy слой
- избыточность, которая оправдана
- что можно удалять уже сейчас без регрессий
- что пока лучше не трогать

## Короткий вывод

Сейчас в reader/translation surface почти нет большого объема по-настоящему "мертвого" кода.

Основная избыточность не мертвая, а transitional:

- compat-поля в `ContentBlock`
- legacy endpoint `translate-status`
- старый IDB migration layer
- memory cache + IDB cache одновременно

То есть главный cleanup pass — это не массовое удаление, а аккуратное сужение compat surface.

## Что можно считать реально лишним или почти лишним

### 1. `translate-status` как frontend path

Файл:
- `globoox/server/api/chapters/[id]/translate-status.post.ts`

Текущее состояние:
- фронт его больше не использует;
- Reader reconcile идет через `POST /blocks/text`;
- endpoint живет только как compat layer на том же helper.

Вердикт:
- не нужен для текущего frontend runtime;
- но не стоит удалять автоматически, пока не принято решение по внешней совместимости и openapi.

Статус:
- `keep for now`, но это кандидат на удаление.

### 2. `content-version` endpoint

Файл:
- `globoox/server/api/chapters/[id]/content-version.get.ts`

Текущее состояние:
- usage со стороны текущего frontend не видно;
- в docs/openapi endpoint остался;
- возможно это старый API для polling/staleness.

Вердикт:
- очень вероятный cleanup candidate;
- но без проверки внешних клиентов / ручных инструментов удалять рискованно.

Статус:
- `keep for now`, кандидат на отдельный removal pass.

### 3. `translate-range`

Файл:
- `globoox/server/api/chapters/[id]/translate-range.post.ts`

Текущее состояние:
- usage в текущем frontend не видно;
- endpoint все еще описан в openapi;
- может использоваться старыми тестами, ручными сценариями или legacy tools.

Вердикт:
- не выглядит частью текущего Reader v2 path;
- удаление без отдельной проверки делать не стоит.

Статус:
- `keep for now`, сильный кандидат на future cleanup.

### 4. `clearCachedChapterLayouts`

Файл:
- `globoox_preview/src/lib/contentCache.ts`

Текущее состояние:
- экспорт существует;
- usage в коде сейчас не найден.

Вердикт:
- это маленький helper без runtime вреда;
- можно удалить, но пользы почти нет;
- полезен как будущий invalidate tool.

Статус:
- `safe to keep`, удаление не приоритетно.

## Transitional surface, которая еще нужна

### 1. `isTranslated` / `is_pending` / `targetLangReady`

Файлы:
- `globoox_preview/src/lib/api.ts`
- `globoox_preview/src/lib/contentCache.ts`
- `globoox_preview/src/lib/hooks/useViewportTranslation.ts`
- `globoox_preview/src/lib/reader/mergeDisplayBlocks.ts`
- `globoox_preview/src/lib/translationState.ts`
- `globoox/server/api/chapters/[id]/content.get.ts`

Текущее состояние:
- primary frontend logic теперь идет через `targetLangReady`;
- `fetchContent()` нормализует серверный payload в этот compat flag при входе;
- compat shape все еще везде присутствует, но `translationState.ts` больше не fallback'ится на `isTranslated`.

Почему это пока не мертвое:
- это все еще совместимость между новым cache/reconcile path и старым `ContentBlock` runtime shape;
- резкое удаление приведет к крупному рефактору и высокому регрессионному риску.

Статус:
- `narrowed, keep for now`

Что уже сделано:
- `targetLangReady` сделан единственным primary frontend ready-flag;
- `isTranslated` и `is_pending` остались только как совместимый shape / derived payload.

Что будет финальным cleanup:
- позже убрать и `isTranslated` / `is_pending` из общего runtime shape там, где это безопасно;
- затем решить, нужен ли вообще отдельный compat field сверх assembled text presence.

### 2. Legacy IDB store `chapter_content`

Файлы:
- `globoox_preview/src/lib/contentCache.ts`

Текущее состояние:
- store `STORE_CHAPTER_CONTENT_V1` еще существует;
- on-demand migration из него в новую схему тоже еще существует.

Почему это пока не мертвое:
- это migration bridge для старых локальных баз;
- после достаточно длинного времени жизни релиза его можно будет убрать.

Статус:
- `keep for now`

Что будет safe removal:
- после одного-двух релизных циклов;
- когда backward compatibility with old IDB schema перестанет быть нужна.

## Избыточность, которая сейчас оправдана

### 1. Memory `paginationCache` + IDB `chapter_layout`

Файлы:
- `globoox_preview/src/components/Reader/ReaderView.tsx`
- `globoox_preview/src/lib/contentCache.ts`

Почему это не лишнее дублирование:
- memory cache нужен для мгновенного возврата внутри одной живой сессии;
- IDB нужен для reload/remount и повторного открытия.

Вердикт:
- это нормальная двухуровневая cache strategy;
- убирать одну из них сейчас не нужно.

### 2. `/content` snapshot + `/blocks/text` reconcile + `/translate` stream

Это не избыточность, а разные уровни:
- `/content` — snapshot/fallback
- `/blocks/text` — truth/reconcile
- `/translate` — push mechanism

Вердикт:
- это намеренная трехслойная модель;
- удалять что-то из этого нельзя без смены архитектуры.

## Что реально можно удалить уже сейчас без регрессий

На текущем проходе таких больших сущностей практически нет.

Безопасно удалить можно только мелочи уровня:
- truly unused helper после дополнительной точечной проверки;
- старые comments / docs references;
- локальные временные debugging artifacts, если они не нужны.

Но заметного упрощения системы это не даст.

Итог:
- сейчас не время для "массовой чистки";
- правильнее сначала сузить compat contracts, а уже потом удалять старые endpoint/store paths.

## Recommended Cleanup Order

### Pass 1

Сузить compat surface без удаления API:

1. убрать зависимость `translationState.ts` от `isTranslated` как fallback;
2. в runtime мыслить ready только через target text presence / `targetLangReady`;
3. оставить `isTranslated` только как server compat output.

Статус:
- `done`

### Pass 2

Проверить external usage server endpoints:

1. `translate-status`
2. `content-version`
3. `translate-range`

Если внешнего usage нет:
- удалить endpoints;
- почистить openapi;
- обновить docs.

### Pass 3

Убрать старый IDB migration layer:

1. `STORE_CHAPTER_CONTENT_V1`
2. `makeLegacyChapterKey`
3. on-demand migration branch in `getCachedChapterContent`

Делать только после того, как backward compatibility with old user caches перестанет быть нужна.

## Offline Reality

Полного offline mode сейчас нет.

Что реально работает:
- книги могут подниматься из IDB cache;
- глава может подниматься из cached content;
- reading position хранится локально;
- chapter layout теперь тоже может подниматься из IDB.

Что не поддерживается как полноценный offline режим:
- первая загрузка новой книги/главы без сети;
- новый перевод без сети;
- background sync / service worker queue;
- guaranteed offline app shell behavior.

Правильная формулировка:
- сейчас поддерживается `offline-first cache reuse`;
- не поддерживается `full offline reader mode`.

Дополнение:
- Reader startup path теперь идет `memory -> IDB -> network`, поэтому локально закэшированная книга не должна ломаться из-за позднего network miss.

## Bottom Line

Без регрессий сейчас стоит считать:

- cleanup surface есть, но она в основном transitional, а не мертвая;
- немедленный безопасный выигрыш от удаления кода небольшой;
- главный следующий cleanup pass — это сужение compat logic, а не агрессивное удаление файлов.
