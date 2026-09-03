# API Architecture: Globoox

ЕСТЬ ВСЕГДА АКТУАЛЬНАЯ АПИ ДОКА ТУТ https://globooks-jo00.onrender.com/api/docs

## TL;DR (коротко и понятно)

**Что это?** Документ описывает, как приложение работает с данными — книги, главы, контент, переводы.

**Решение:** Всё общение с данными идёт через Next.js API Routes (`/api/*`), а routes проксируют запросы в реальный backend API. Runtime без backend не поддерживается.

**Переводы:** Контент книги — это набор блоков (абзацев). Бэкенд автоматически переводит блоки при запросе с `?lang=XX`. Переводы кэшируются в базе. При повторном запросе — возвращается кэшированный перевод.

**Кеш на клиенте:** см. `docs-for-humans/content-caching-plan.md` (IndexedDB кеш контента по блокам: скелет главы + тексты по `(blockId, lang)`).

---

## Архитектура

```
┌─────────────────────────────────────────┐
│            UI Components                │
│  (Library, Reader, Store, Profile)      │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│           Custom Hooks                  │
│  useBooks · useChapters                 │
│  useChapterContent · useTranslation     │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│           API Client                    │
│           src/lib/api.ts                │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│       Next.js API Routes                │
│       src/app/api/*                     │
└──────┬──────────────────────────────────┘
       │
┌──────▼──────────────────────────────────┐
│  Реальный backend API                   │
└─────────────────────────────────────────┘
```

Требуется `NEXT_PUBLIC_API_URL` для работы API routes.

---

## API Контракты

### Книги

#### `GET /api/books`
Список всех книг пользователя.

**Query params:** `?status=active|hidden` (опционально)

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "title": "The Venture Mindset",
    "author": "Ilya Strebulaev and Alex Dang",
    "cover_url": "/covers/venture.jpg",
    "original_language": "EN",
    "available_languages": ["EN", "RU", "ES", "FR"],
    "status": "active",
    "created_at": "2025-01-10T12:00:00Z"
  }
]
```

---

#### `GET /api/books/:id`
Одна книга по ID.

**Response:** Тот же объект `ApiBook` (см. выше), или `404`.

---

#### `POST /api/books`
Создать книгу.

**Request body:**
```json
{
  "title": "Book Title",
  "author": "Author Name",
  "cover_url": "/covers/example.jpg",
  "source_language": "EN"
}
```

**Response:** Созданный объект `ApiBook`.

---

#### `PATCH /api/books/:id`
Обновить книгу (статус, название, автора).

**Request body** (все поля опциональны):
```json
{
  "status": "hidden",
  "title": "New Title",
  "author": "New Author"
}
```

**Response:** Обновлённый объект `ApiBook`.

---

#### `DELETE /api/books/:id`
Удалить книгу.

**Response:**
```json
{ "success": true }
```

---

### Главы

#### `GET /api/books/:id/chapters`
Список глав книги.

**Response:**
```json
[
  {
    "id": "ch-venture-01",
    "book_id": "550e8400-e29b-41d4-a716-446655440001",
    "index": 1,
    "title": "Introduction: What is Saasbee and why does it matter?",
    "created_at": "2025-01-10T12:00:00Z"
  }
]
```

---

### Контент

#### `GET /api/chapters/:id/content`
Контент главы — массив блоков на запрошенном языке.

**Query params:** `?lang=EN` (опционально, если указан — возвращает перевод или авто-переводит)

**Response:** массив блоков, тип определяет форму объекта:

```json
[
  { "id": "cb-001", "position": 0, "type": "heading", "level": 2, "text": "Introduction" },
  { "id": "cb-002", "position": 1, "type": "paragraph", "text": "In November 2012..." },
  { "id": "cb-003", "position": 2, "type": "quote", "text": "Venture is a mindset..." },
  { "id": "cb-004", "position": 3, "type": "list", "ordered": false, "items": ["Item A", "Item B"] },
  { "id": "cb-005", "position": 4, "type": "image", "src": "/img/chart.png", "alt": "Chart", "caption": "Fig. 1" },
  { "id": "cb-006", "position": 5, "type": "hr" }
]
```

**Важно:** Бэкенд автоматически переводит все блоки, если запрошен язык `?lang=XX`. Нетекстовые блоки (`image`, `hr`) возвращаются без изменений.

| Тип | Переводимые поля | Поведение |
|-----|-----------------|-----------------|
| `paragraph` | `text` | авто-перевод |
| `heading` | `text` | авто-перевод |
| `quote` | `text` | авто-перевод |
| `list` | `items` (весь массив) | авто-перевод |
| `image` | `src`, `alt`, `caption` | не переводится |
| `hr` | — | не переводится |

Переводы кэшируются в базе. Повторные запросы возвращают кэшированный перевод мгновенно.

**Кеш на клиенте (front-end):**
- Для ощущения “как нативное” и уменьшения количества запросов, фронтенд дополнительно кеширует `ContentBlock[]` локально в браузере (IndexedDB).
- Реализация: `src/lib/contentCache.ts` + использование в `src/lib/hooks/useChapterContent.ts`.
- TTL по умолчанию: ~10 минут (после этого контент тихо перезапрашивается).
- Инвалидация: при обнаружении изменения `library` scope через `GET /api/sync/status` кеш контента очищается (best-effort).

**Что нужно от бэка (для идеальной свежести без лишних payload):**
- Поддержать `ETag`/`If-None-Match` (или явную `content_version`/`content_hash`) для `GET /api/chapters/:id/content?lang=XX`, чтобы фронт мог получать `304 Not Modified`.

---

### Перевод

#### `POST /api/chapters/{chapterId}/translate`
Запросить перевод конкретных блоков главы.

**Request body:**
```json
{
  "lang": "FR",
  "blockIds": ["cb-venture-001", "cb-venture-002", "cb-venture-003"]
}
```

**Response:** массив переведённых блоков в том же формате, что и `GET /content`:
```json
[
  { "id": "cb-venture-001", "position": 0, "type": "heading", "level": 1, "text": "Introduction : Qu'est-ce que Saasbee..." },
  { "id": "cb-venture-002", "position": 1, "type": "paragraph", "text": "En novembre 2012..." },
  { "id": "cb-venture-003", "position": 2, "type": "list", "ordered": false, "items": ["Élément A", "Élément B"] }
]
```

**Поведение:**
- Перевод выполняется синхронно (ответ ждёт завершения)
- Уже переведённые блоки возвращаются из кэша мгновенно
- `image` и `hr` — возвращаются без изменений
- `available_languages` книги обновляется автоматически

---

### Позиция чтения

#### `GET /api/books/{bookId}/reading-position`
Возвращает сохраненную позицию чтения пользователя для книги.

**Auth:** требует пользовательскую сессию. Для гостя возвращаются `null`-значения.

**Response:**
```json
{
  "book_id": "book-...",
  "chapter_id": "ch-...",
  "block_id": "cb-...",
  "block_position": 123,
  "lang": "EN",
  "updated_at": "2026-02-17T12:00:05Z"
}
```

**Поведение:**
- Если `block_id` удален, backend валидирует и переключает на ближайший блок по `block_position`.
- Если сохраненная позиция вышла за контент главы, backend автоматически резолвит на первый валидный блок.
- Reader на фронтенде использует local-first стратегию: сначала восстанавливает локальный anchor, затем делает условный revalidate.
- Для авторизованных пользователей revalidate вызывается только если:
  - нет локального anchor,
  - изменился `progress` scope из `/api/sync/status`,
  - истек локальный TTL revalidate (5 минут).

#### `PUT /api/books/{bookId}/reading-position`
Сохраняет/обновляет позицию чтения пользователя.

**Request body:**
```json
{
  "chapter_id": "ch-...",
  "block_id": "cb-...",
  "block_position": 123,
  "lang": "EN",
  "updated_at_client": "2026-02-17T12:00:00Z"
}
```

**Поля:**
- `chapter_id` — обязательно.
- `block_id`, `block_position`, `lang`, `updated_at_client` — опционально.

**Response (success):**
```json
{
  "success": true,
  "persisted": true,
  "book_id": "book-...",
  "chapter_id": "ch-...",
  "block_id": "cb-...",
  "block_position": 123,
  "content_version": 642,
  "total_blocks": 8400,
  "updated_at": "2026-02-17T12:00:05Z"
}
```

**Response (guest):**
```json
{
  "success": true,
  "persisted": false
}
```

**Response (stale client):**
```json
{
  "success": true,
  "persisted": false,
  "reason": "stale_client"
}
```

**Поведение:**
- Conflict resolution: last-write-wins. Если `updated_at_client` старее серверной записи, запись пропускается.
- Dev mode: допускается `user_id` override в body (только для разработки).

---

## Модели данных

### ApiBook
```typescript
interface ApiBook {
  id: string                          // UUID
  title: string
  author: string | null
  cover_url: string | null
  original_language: string | null    // "EN", "RU", "FR", "ES" (uppercase)
  available_languages: string[]       // языки, для которых есть кэш переводов
  status: string                      // "ready", "processing", etc.
  created_at: string                  // ISO 8601
}
```

### ApiChapter
```typescript
interface ApiChapter {
  id: string          // "ch-venture-01"
  book_id: string     // UUID книги
  index: number       // порядковый номер (1, 2, 3...)
  title: string       // название на языке оригинала
  created_at: string
}
```

### ContentBlock

```typescript
type ContentBlock =
  | ParagraphBlock
  | HeadingBlock
  | QuoteBlock
  | ListBlock
  | ImageBlock
  | HrBlock

interface BaseBlock {
  id: string        // "cb-venture-001"
  position: number  // порядок в главе (0-based)
}

interface ParagraphBlock extends BaseBlock {
  type: 'paragraph'
  text: string                  // текст (оригинал или перевод)
}

interface HeadingBlock extends BaseBlock {
  type: 'heading'
  level: 1 | 2 | 3             // h1, h2, h3
  text: string                  // текст (оригинал или перевод)
}

interface QuoteBlock extends BaseBlock {
  type: 'quote'
  text: string                  // текст (оригинал или перевод)
}

interface ListBlock extends BaseBlock {
  type: 'list'
  ordered: boolean              // true = <ol>, false = <ul>
  items: string[]               // элементы списка (оригинал или перевод)
}

interface ImageBlock extends BaseBlock {
  type: 'image'
  src: string                   // URL изображения (не переводится)
  alt: string                   // alt-текст (не переводится)
  caption?: string              // подпись (опционально, не переводится)
}

interface HrBlock extends BaseBlock {
  type: 'hr'                    // разделитель сцены, нет переводимых полей
}
```

### TranslateRequest / TranslateResponse
```typescript
interface TranslateRequest {
  lang: string        // "RU", "ES", "FR", "EN" — целевой язык
  blockIds: string[]  // ID блоков для перевода
}

// Response — тот же ContentBlock[], что и GET /content
// Перевод выполняется синхронно, все поля заполнены
type TranslateResponse = ContentBlock[]
```

---

## Перевод (как это работает)

**Важно:** Бэкенд выполняет перевод **синхронно**. WebSocket/SSE не требуется.

### Два способа получить перевод

#### Способ 1: GET /api/chapters/{id}/content?lang=XX

```
Пользователь переключает язык
        ↓
GET /api/chapters/{id}/content?lang=FR
        ↓
Бэкенд автоматически переводит все блоки (если не в кэше)
        ↓
Возвращает все блоки с переводом
```

#### Способ 2: POST /api/chapters/{id}/translate (конкретные блоки)

```
Фронт выбирает блоки для перевода
        ↓
POST /api/chapters/{id}/translate { lang: "FR", blockIds: [...] }
        ↓
Бэкенд переводит указанные блоки синхронно
        ↓
Возвращает переведённые блоки
```

### Кэширование

- Переводы сохраняются в базе (`content_blocks.translations`)
- Повторные запросы возвращают кэш мгновенно
- `available_languages` книги обновляется автоматически

### Рекомендация для фронта

Простой подход: использовать `GET /content?lang=XX` — всё переведётся автоматически.

Для оптимизации больших глав: `POST /translate` с конкретными blockIds.

### ContentBlockRenderer

```tsx
function ContentBlockRenderer({ block }: { block: ContentBlock }) {
  // hr и image не переводятся
  if (block.type === 'hr')    return <hr />
  if (block.type === 'image') return (
    <figure>
      <img src={block.src} alt={block.alt} />
      {block.caption && <figcaption>{block.caption}</figcaption>}
    </figure>
  )

  // Текстовые блоки — текст всегда есть (оригинал или перевод)
  switch (block.type) {
    case 'heading': {
      const Tag = `h${block.level}` as 'h1' | 'h2' | 'h3'
      return <Tag>{block.text}</Tag>
    }
    case 'paragraph': return <p>{block.text}</p>
    case 'quote':     return <blockquote>{block.text}</blockquote>
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul'
      return <Tag>{block.items.map((item, i) => <li key={i}>{item}</li>)}</Tag>
    }
  }
}
```

---

## Backend режим

Приложение работает только через backend API.

1. Установить переменную окружения:
   ```env
   NEXT_PUBLIC_API_URL=https://api.globoox.com
   ```
2. Если переменная не задана, Next.js API routes возвращают `503`.

Что НЕ меняется:
- Все хуки (`useBooks`, `useChapters`, `useChapterContent`, `useTranslation`)
- Все компоненты (`Library`, `Reader`, `ContentBlockRenderer`)
- Контракты API (форматы запросов и ответов)
- Zustand store (прогресс чтения, настройки)

---

## Файлы проекта

### Существующие (изменить)
| Файл | Что изменить |
|------|-------------|
| `src/lib/api.ts` | Добавить: `fetchChapters`, `fetchContent`, `translateBlocks` |
| `src/app/library/page.tsx` | Убрать `import demoBooks`, использовать `useBooks()` |
| `src/app/reader/[id]/page.tsx` | Переключить на `useChapters` + `useChapterContent` |
| `src/components/Reader/ReaderView.tsx` | Рендер `ContentBlock[]` |

### Создать (Next.js API Routes)
| Файл | Назначение |
|------|-----------|
| `src/app/api/books/route.ts` | GET (список) + POST (создать) |
| `src/app/api/books/[id]/route.ts` | GET + PATCH + DELETE |
| `src/app/api/books/[id]/chapters/route.ts` | GET главы книги |
| `src/app/api/chapters/[id]/content/route.ts` | GET контент главы |
| `src/app/api/chapters/[id]/translate/route.ts` | POST перевод блоков (lang + blockIds) |

### Создать (Хуки)
| Файл | Назначение |
|------|-----------|
| `src/lib/hooks/useChapters.ts` | Список глав по bookId |
| `src/lib/hooks/useChapterContent.ts` | Контент главы по chapterId + lang |

### Создать (Компоненты)
| Файл | Назначение |
|------|-----------|
| `src/components/Reader/ContentBlockRenderer.tsx` | Рендер одного блока |
