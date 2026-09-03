# Offline-First Roadmap

Этот документ фиксирует далёкий план по offline-first режиму для `globoox_preview`.

Важно:

- это не обещание “полного оффлайна для всего приложения”;
- это ТЗ на максимально реалистичный offline-first режим;
- фокус не на фантазии “всё работает без сети”, а на том, что действительно можно сделать хорошо.

Главная цель:

- Reader и Library должны быть максимально полезны без сети;
- при возвращении сети система должна спокойно ре-синкаться;
- нельзя обещать пользователю то, что принципиально требует сервера/LLM.

---

## 1. Короткий вывод

### Реально достижимо

Можно сделать очень хороший `offline-first reader`:

- уже открытые книги доступны без сети;
- уже скачанные главы доступны без сети;
- уже переведённые блоки доступны без сети;
- уже свёрстанные главы доступны без повторной перевёрстки;
- reading position сохраняется локально;
- TOC / title / author доступны из локального кэша;
- Library может открываться как локальный snapshot.

### Не полностью достижимо

Нельзя честно обещать offline для:

- новых переводов;
- первичной загрузки книги/главы;
- real-time multi-device sync;
- server truth updates без сети;
- signup/login/reset password;
- server-driven account screens.

Иными словами:

- **Reader + Library:** да, сильный offline-first
- **остальное приложение:** частично cached snapshot / degraded mode

---

## 2. Что уже есть сейчас

Сейчас уже существует частичный offline-first фундамент:

### Reader / content

- cached books list
- cached book meta
- cached chapter content
- cached translated block texts
- cached chapter layouts
- cached reader metadata bundle
- local reading anchors
- cached reading position

### Sync / reconnect

Есть лёгкий `revalidate`-механизм:

- при mount;
- при `visibilitychange`;
- через `GET /api/sync/status`.

Если сервер новее:

- library cache инвалидируется;
- reading-position cache инвалидируется;
- следующая загрузка идёт уже за свежим серверным состоянием.

### Чего уже нет

Пока нет:

- полноценной очереди offline writes;
- automatic replay всех локальных изменений при возвращении сети;
- service worker/PWA offline shell;
- гарантированной background sync модели.

---

## 3. Целевой offline-first уровень по экранам

### 3.1. Reader

Это главный приоритет.

Целевое поведение:

- уже открытая книга доступна оффлайн;
- уже открытая глава доступна оффлайн;
- already cached translated target text доступен оффлайн;
- already cached layout доступен оффлайн;
- language switch на уже ранее загруженный язык работает из локального cache;
- TOC / title / author работают из локального bundle cache;
- reading position сохраняется локально;
- reconnect не ломает локальную позицию.

### 3.2. Library

Тоже high priority.

Целевое поведение:

- открывается из локального snapshot;
- видно список книг;
- видно continue reading;
- виден last known progress;
- stale snapshot допустим, если помечен как такой.

### 3.3. Store

Средний приоритет.

Целевое поведение:

- открывается последний cached catalog snapshot;
- cover/title/author видны;
- действия, требующие сети, disabled или с пояснением.

### 3.4. Profile / account pages

Низкий приоритет.

Целевое поведение:

- можно показать last known profile data;
- server actions disabled без сети.

### 3.5. Auth

Offline не является реальной целью.

Нельзя обещать:

- login
- signup
- password reset

без сети.

---

## 4. Что должно считаться “готовым offline-first Reader”

Reader можно считать хорошо подготовленным к оффлайну, когда:

1. уже посещённая книга открывается без сети;
2. уже посещённая глава открывается без сети;
3. уже переведённые блоки открываются без сети;
4. уже свёрстанная глава открывается без скрытой перевёрстки;
5. TOC / metadata bundle открываются из кэша;
6. reading position локально сохраняется всегда;
7. reconnect не выбрасывает пользователя в начало;
8. локальные действия не теряются при кратковременном исчезновении сети.

---

## 5. Что обязательно должно оставаться online-only

Следующие вещи нужно честно считать online-only:

1. новый перевод текста;
2. первичный перевод TOC / metadata;
3. первичная загрузка новой книги;
4. первичное получение главы, которой ещё нет в кэше;
5. multi-device sync в реальном времени;
6. server truth reconciliation, если устройство вообще ни разу не видело эту книгу;
7. auth flows.

---

## 6. Архитектурная модель offline-first

### 6.1. Reader truth hierarchy

Для Reader offline-first truth должна быть такой:

1. memory cache
2. IDB
3. server reconcile
4. server translate

То есть:

- без сети используем 1 и 2;
- при появлении сети догоняем 3 и 4.

### 6.2. Offline mode не должен создавать новую истину

Локальный offline cache — это не отдельная truth-модель.

Он должен быть:

- локальной репликой уже известных данных;
- а не новым независимым источником конфликтующей истины.

Особенно это важно для:

- reading position
- translation readiness
- chapter layouts

---

## 7. Самые важные недостающие куски

### 7.1. Offline write-back queue

Сейчас reconnect больше работает как `pull`, а не как полноценный `push-back`.

Нужно в будущем добавить очередь локальных изменений:

- reading position writes
- возможно settings writes
- возможно library mutations

Требования:

- локальное действие записывается в queue;
- если сеть упала, queue не теряется;
- при возвращении сети queue replay-ится;
- conflict resolution не ломает более новую серверную позицию.

### 7.2. Better network awareness

Нужен отдельный lightweight network-awareness слой:

- `navigator.onLine`
- `online/offline` events
- maybe ping-less health flag

Цель:

- явно понимать degraded mode;
- не долбить сервер бессмысленно;
- корректно запускать replay queue.

### 7.3. Snapshot semantics for non-reader pages

Нужно явно различать:

- live data
- cached snapshot

Особенно в:

- Library
- Store
- Profile

---

## 8. Service Worker: нужен или нет

### Короткий ответ

Не обязателен для первой волны offline-first.

### Почему

Основная ценность уже достигается через:

- IDB
- app-level caches
- local restore logic

Service Worker имеет смысл позже, если понадобится:

- app shell caching;
- static asset resilience;
- background sync;
- explicit offline page routing.

### Рекомендация

Первая волна offline-first:

- без Service Worker

Вторая волна:

- рассмотреть Service Worker для app shell и background sync

---

## 9. Reconnect semantics

### 9.1. Что должно происходить при возвращении сети

Когда сеть вернулась, система должна:

1. понять, что reconnect произошёл;
2. revalidate server sync versions;
3. инвалидировать stale local caches по scope;
4. replay-нуть локальные pending writes;
5. подтянуть более новую серверную truth;
6. не ломать локальный UX при конфликте.

### 9.2. Сейчас уже есть

Сейчас уже есть:

- `GET /api/sync/status`
- invalidation библиотечного cache
- invalidation reading-position cache

### 9.3. Чего не хватает

Нет полноценного:

- replay queue
- online-triggered resubmission layer

---

## 10. Recommended roadmap

### Stage 1 — Harden current Reader offline-first

Сделать максимально надёжным то, что уже почти есть:

- Reader content cache
- translated block cache
- chapter layout cache
- reader metadata bundle cache
- local reading anchor restore

Цель:

- уже посещённая книга должна читаться без сети как можно лучше.

### Stage 2 — Library offline snapshot

Улучшить:

- cached books list
- cached progress
- continue reading

Цель:

- Library должна оставаться полезной без сети.

### Stage 3 — Offline write queue

Добавить:

- pending writes store
- replay on reconnect
- conflict-safe reading-position sync

Это ключевой шаг для настоящего offline-first поведения, а не только “cached read-only mode”.

### Stage 4 — Explicit offline UX

Добавить:

- offline badge / offline mode signal;
- понятные disabled states для online-only actions;
- stale snapshot semantics.

### Stage 5 — Optional Service Worker / PWA layer

Только после первых четырёх стадий:

- app shell caching
- optional background sync
- optional installable PWA shell

---

## 11. What not to do

Следующие вещи лучше не делать рано:

1. Не обещать “полный оффлайн для всего приложения”.
2. Не делать Service Worker до того, как app-level cache model станет понятной.
3. Не смешивать offline cache с отдельной truth-моделью.
4. Не запускать aggressive replay без conflict handling.
5. Не пытаться сделать offline translation generation без сервера.

---

## 12. Short target definition

Правильная далёкая цель:

- `Reader` и `Library` работают как сильный offline-first слой;
- всё уже однажды загруженное и переведённое доступно локально;
- при возвращении сети система не теряет локальные изменения;
- server truth и local truth спокойно reconcile-ятся;
- остальные страницы имеют честный degraded mode, а не ложное обещание полного оффлайна.

Если коротко:

- не “весь продукт оффлайн”;
- а “Reader-first offline-first architecture with graceful reconnect”.
