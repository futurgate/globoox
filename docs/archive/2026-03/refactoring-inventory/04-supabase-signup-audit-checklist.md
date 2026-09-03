# Supabase Signup Audit Checklist (Mar 8)

Этот документ фиксирует текущее состояние расследования по `signup` / `new user creation` path.

Цель:

- не гадать, “сломана ли Supabase”;
- отделить проблемы живой БД/миграций от проблем текущего frontend/backend кода;
- оставить понятный checklist для точечной проверки перед любым fix.

## 1. Что уже подтверждено

### 1.1. Логин существующего пользователя не равен signup нового пользователя

Текущая картина не такая:

- “auth целиком сломан”

А такая:

- existing user login может работать;
- new user signup/create path у нас падал с `500`.

Это не противоречит друг другу.

### 1.2. Ошибка действительно была на создании нового пользователя

Наблюдавшиеся ответы:

- Admin create user:
  - `500`
  - `Database error creating new user`
- Public signup:
  - `500`
  - `Database error saving new user`

Это значит:

- проблема не в UI форме сама по себе;
- ошибка возникает уже в DB-side signup path.

### 1.3. Базовые таблицы для signup-цепочки существуют

Через service-role REST уже подтверждено:

- `profiles` существует и отвечает `200`
- `sync_metadata` существует и отвечает `200`

Значит версия “signup падает, потому что таблиц нет” не подтверждается.

### 1.4. В живой БД уже найден schema drift

В репо есть миграция:

- `globoox/supabase/migrations/add_translations_sync_scope.sql`

Она добавляет:

- `sync_metadata.translations_updated_at`

Но в живой БД запрос этой колонки дал:

- `42703`
- `column sync_metadata.translations_updated_at does not exist`

Это уже прямое доказательство:

- живая Supabase схема не полностью совпадает с SQL/миграциями в репо.

Из этого следует важный вывод:

- даже если текущий SQL в репо выглядит корректно, причина signup-падения может быть в drift’е живой БД.

## 2. Что в репо выглядит нормальным

### 2.1. `handle_new_user()`

Файл:

- `globoox/supabase/schema.sql`

Текущая логика:

1. `auth.users` insert
2. trigger `on_auth_user_created`
3. function `public.handle_new_user()`
4. insert в `public.profiles (id)`

Функция сама по себе простая:

- вставляет только `id`
- использует `ON CONFLICT DO NOTHING`

По коду в репо это не выглядит как очевидный источник падения.

### 2.2. `profiles -> sync_metadata`

Файл:

- `globoox/supabase/migrations/add_sync_metadata.sql`

Там есть:

- `sync_metadata`
- trigger `trg_profiles_sync`
- function `update_sync_settings()`

Логика тоже выглядит нормальной:

- при insert/update профиля делается upsert в `sync_metadata`

По репо это тоже не выглядит как гарантированно сломанный SQL.

## 3. Самый вероятный класс проблем сейчас

С учётом уже найденного drift, наиболее вероятны такие варианты:

1. Не все миграции из репо применены в живой Supabase БД.
2. В живой БД есть старые/ручные/вне-репозиторные объекты:
   - trigger
   - function
   - constraint
   - policy
   которые не отражены в репо.
3. Падает не `handle_new_user()` сам по себе, а следующая DB-side цепочка после создания `auth.users`.
4. Возможен конфликт между старой живой схемой и более новой логикой frontend/backend.

## 4. Что нужно проверить в живой БД перед любым fix

Это checklist именно для реальной Supabase БД, а не для чтения репо.

### 4.1. Проверить фактическую схему `profiles`

Нужно подтвердить:

- существует ли таблица `profiles`
- какие у неё реальные колонки
- есть ли неожиданные `NOT NULL`
- есть ли дополнительные trigger’ы
- есть ли отличия от `schema.sql`

Минимум проверить:

- `id`
- `is_admin`
- `created_at`
- `updated_at`

### 4.2. Проверить фактическую схему `sync_metadata`

Нужно подтвердить:

- есть ли все ожидаемые колонки
- в частности:
  - `library_updated_at`
  - `progress_updated_at`
  - `settings_updated_at`
  - `translations_updated_at`

Если `translations_updated_at` нет, это уже migration drift, который надо чинить отдельно.

### 4.3. Проверить фактические trigger’ы и functions

Нужно получить из живой БД:

- trigger’ы на `auth.users`
- trigger’ы на `profiles`
- source у функций:
  - `handle_new_user`
  - `update_sync_settings`

Важно не доверять только репо-файлам.

Нужно именно сравнить:

- SQL в репо
- SQL, реально установленный в БД

### 4.4. Проверить policies

Особенно:

- RLS на `profiles`
- RLS на `sync_metadata`

Хотя trigger’ы идут как `SECURITY DEFINER`, всё равно нужно убедиться, что в живой БД нет неожиданных policy drift’ов.

### 4.5. Проверить наличие дополнительных вне-репозиторных объектов

Нужно посмотреть:

- нет ли других функций/trigger’ов, которые тоже завязаны на `auth.users`, `profiles`, `sync_metadata`
- нет ли старых audit hooks / profile hooks / manual SQL from dashboard

Это особенно важно, если проект долго жил вручную и не все изменения проходили через миграции.

## 5. Практический порядок расследования

### Шаг 1. Снять живую схему

Из живой БД нужно выгрузить:

- описание `profiles`
- описание `sync_metadata`
- список trigger’ов на `auth.users`
- список trigger’ов на `profiles`
- тела функций:
  - `handle_new_user`
  - `update_sync_settings`

### Шаг 2. Сверить с репо

Сравнить с:

- `globoox/supabase/schema.sql`
- `globoox/supabase/migrations/add_sync_metadata.sql`
- `globoox/supabase/migrations/add_translations_sync_scope.sql`

### Шаг 3. Найти drift

Зафиксировать отдельно:

- что отсутствует в живой БД, хотя есть в репо
- что есть в живой БД, но не отражено в репо

### Шаг 4. Только потом чинить

Fix делать только после этого.

Неправильный путь:

- “вижу signup 500, давайте править `handle_new_user()` вслепую”

Правильный путь:

- сначала доказать, что именно исполняется в живой БД
- потом минимальный fix

## 6. Что можно утверждать уже сейчас

Можно утверждать:

- signup path действительно падал на DB-side;
- проблема не сводится к “нет таблицы profiles”;
- в живой БД уже есть schema drift относительно репо;
- значит root cause может быть именно в состоянии живой Supabase схемы.

Нельзя пока утверждать:

- что виноват именно `handle_new_user()`
- что виновата именно `sync_metadata`
- что fix должен быть в репо, а не в живой БД/миграциях

## 7. Recommended next step

Следующий правильный шаг:

1. сделать live schema audit по `profiles` / `sync_metadata` / trigger chain;
2. зафиксировать найденный drift;
3. только потом решать:
   - нужна ли новая миграция,
   - нужен ли one-off SQL fix,
   - или проблема вообще вне текущего репо.

## 8. Bottom line

Сейчас уже ясно главное:

- “починить signup” нельзя делать наугад;
- сначала надо сверить живую Supabase БД с репо;
- первый найденный drift уже есть: отсутствует `sync_metadata.translations_updated_at`.

Это достаточное основание считать, что расследование нужно вести как `live schema drift audit`, а не как frontend bugfix.

## 9. Audit Results So Far

Ниже зафиксировано то, что уже проверено на живой БД.

### 9.1. `profiles` в живой БД совпадает с ожидаемой базовой формой

Через service-role REST подтверждено:

- таблица `profiles` существует;
- в ней есть как минимум:
  - `id`
  - `is_admin`
  - `created_at`
  - `updated_at`

Это согласуется с `schema.sql`.

### 9.2. `sync_metadata` тоже существует и используется

Через service-role REST подтверждено:

- таблица `sync_metadata` существует;
- в ней есть как минимум:
  - `user_id`
  - `library_updated_at`
  - `progress_updated_at`
  - `settings_updated_at`

### 9.3. У всех текущих auth users есть и `profiles`, и `sync_metadata`

Через `auth/v1/admin/users` и service-role REST сверено:

- текущих `auth.users`: `11`
- текущих `profiles`: `11`
- текущих `sync_metadata`: `11`

Идентификаторы покрываются один-к-одному.

Это важный вывод:

- текущая trigger-цепочка `auth.users -> profiles -> sync_metadata` исторически работала;
- проблема signup не выглядит как “profiles trigger давно сломан вообще для всех”.

### 9.4. Подтверждён schema drift по `translations_updated_at`

В живой БД отсутствует колонка:

- `sync_metadata.translations_updated_at`

Хотя в репо есть миграция:

- `add_translations_sync_scope.sql`

Это уже подтверждённый drift между репо и живой БД.

### 9.5. Текущий narrowed conclusion

На этом этапе наиболее вероятно:

1. Базовая signup/profile/sync chain в живой БД в целом существует и ранее работала.
2. Живая схема не полностью синхронизирована с миграциями из репо.
3. Падение signup, скорее всего, связано не с отсутствием `profiles`/`sync_metadata` как таковых, а с:
   - другим DB-side drift;
   - дополнительным невидимым из репо объектом;
   - или auth-side логикой, которую нельзя увидеть через текущий REST audit.

### 9.6. Что это меняет practically

Это снимает самый грубый ложный след:

- нет оснований прямо сейчас переписывать `handle_new_user()` из репо.

И усиливает следующий правильный шаг:

- получать фактические trigger/function definitions из живой БД, а не гадать по `schema.sql`.
