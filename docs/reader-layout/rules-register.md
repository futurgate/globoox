# Reader Layout Rules Register (As-Is / To-Be)

Этот документ сводит в одном месте текущие правила вёрстки ридера и целевое состояние.
Каноничные источники деталей остаются в `pagination-rules.md`, `typography-and-hyphenation.md`, `architecture.md` и коде.

| Rule Area | Rule | As-Is (Now) | To-Be (Target) | Source |
|---|---|---|---|---|
| Pagination core | Формирование страниц из нормализованных блоков | Реализовано | Keep as-is | `docs/reader-layout/pagination-rules.md`, `src/lib/paginatorUtils.ts` |
| Pagination core | `paragraph` может делиться, не-параграфные блоки переносятся целиком | Реализовано | Keep as-is | `docs/reader-layout/pagination-rules.md`, `src/lib/paginatorUtils.ts` |
| Headings | Старт цепочки заголовков (`heading run start`) всегда с новой страницы | Реализовано | Keep as-is | `docs/reader-layout/pagination-rules.md`, `src/lib/paginatorUtils.ts` |
| Headings | Подряд идущие заголовки ставятся атомарно, если влезают | Реализовано | Keep as-is | `docs/reader-layout/pagination-rules.md`, `src/lib/paginatorUtils.ts` |
| Headings | Спецкейс `h1 -> h2`: `h1` на отдельной странице + жёсткий разрыв после `h1` | Реализовано | Keep as-is (переоценить на UX-проверке) | `docs/reader-layout/pagination-rules.md`, `src/lib/paginatorUtils.ts` |
| Headings + paragraph | Keep-with-next для `heading + next paragraph` | Не реализовано как отдельное правило | Decision needed: оставить без правила или ввести ограниченный keep-with-next для коротких heading | `src/lib/paginatorUtils.ts` |
| Paragraph split | Запрет tiny-фрагментов абзаца при разрыве | Реализовано | Keep as-is | `docs/reader-layout/pagination-rules.md`, `src/lib/paginatorUtils.ts` |
| Paragraph split | Widow/Orphan guard (минимум строк внизу/вверху) | Реализовано | Keep as-is (вынести пороги в конфиг) | `docs/reader-layout/pagination-rules.md`, `src/lib/paginatorUtils.ts` |
| Keep-with-next | Для `paragraph + (hr/list/quote)` | Реализовано | Keep as-is | `docs/reader-layout/pagination-rules.md`, `src/lib/paginatorUtils.ts` |
| Lists | Guard против старта списка внизу страницы с 1 пунктом | Реализовано | Keep as-is | `docs/reader-layout/pagination-rules.md`, `src/lib/paginatorUtils.ts` |
| Typography | Скейл заголовков (`h1..h5`) зависит от reader font size | Реализовано | Keep as-is | `docs/reader-layout/typography-and-hyphenation.md`, `src/components/Reader/ContentBlockRenderer.tsx`, `src/lib/paginatorUtils.ts` |
| Typography | Скейл одинаков в visible-render и measurement probe | Реализовано | Keep as-is | `docs/reader-layout/typography-and-hyphenation.md` |
| Margins | Убирается верхний margin у заголовка, если он первый на странице | Реализовано | Keep as-is | `docs/reader-layout/typography-and-hyphenation.md`, `src/app/globals.css` |
| Margins | Убирается верхний margin для `heading` после `heading` | Реализовано | Keep as-is | `docs/reader-layout/typography-and-hyphenation.md`, `src/app/globals.css` |
| Hyphenation | Ручной intra-word split-hyphenation отключен | Реализовано | Keep as-is | `docs/reader-layout/typography-and-hyphenation.md` |
| Hyphenation | Browser hyphenation (`hyphens: auto`) с ограничениями | Реализовано | Keep as-is | `docs/reader-layout/typography-and-hyphenation.md`, `src/app/globals.css` |
| Chapter title page | Lone `h1` центрируется на выделенной странице | Реализовано | Keep as-is | `src/app/globals.css`, `src/components/Reader/ReaderView.tsx` |
| Spread layout | Геометрия spread (брейкпоинт/ширина колонки/gap/padding) | Реализовано | Keep as-is (параметризовать токенами при redesign) | `docs/reader-layout/architecture.md` |

## Notes
- Вопрос про «заголовок обязательно прилеплен к следующему абзацу» сейчас относится к строке `Headings + paragraph`: отдельного обязательного правила нет.
- Этот реестр фиксирует текущую картину и явные решения по целевому состоянию; если команда хочет изменить поведение, обновляется сначала этот файл, затем `pagination-rules.md` и код.
