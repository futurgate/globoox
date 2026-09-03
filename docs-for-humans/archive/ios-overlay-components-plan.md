# iOS Overlay Components Plan

Документ фиксирует целевую систему модалок / sheets / alerts для `globoox_preview` так, чтобы:

- внешний вид был максимально близок к iOS;
- реализация была корректно привязана к текущему стеку (`Tailwind` + `shadcn/ui` style + `Radix`-уровень поведения);
- существующие кастомные окна можно было пересобрать без визуального дрейфа;
- alert про длительный перевод больше не был “кастомной плавающей плашкой”, а стал нормальным iOS-style alert с кнопкой `OK`.

## 1. Что есть сейчас

Сейчас эти поверхности в основном самописные:

- `src/components/UploadBookModal.tsx`
- `src/components/SignInToUploadModal.tsx`
- `src/components/Store/DeleteBookConfirmDialog.tsx`
- `src/components/Reader/ReaderSettings.tsx`
- `src/components/Reader/TableOfContents.tsx`

Плюс reader/menus/dropdowns сделаны через собственный `useAdaptiveDropdown`.

Это визуально живёт в теме нормально, но архитектурно это пока не “правильные shadcn/Radix primitives”.

## 2. Целевой набор reusable компонентов

Реально достаточный и чистый набор:

### 2.1. `IOSModalShell`

Базовый низкоуровневый слой.

Отвечает за:

- `Portal`
- overlay / backdrop
- blur / dimmed background
- enter/exit animation
- `Esc`
- outside click
- body scroll lock
- focus management
- safe-area offsets
- z-index policy

Это не компонент “для использования бизнес-экраном напрямую”, а общая основа.

### 2.2. `IOSDialog`

Centered modal card.

Подходит для:

- upload
- delete confirm
- desktop/tablet settings
- desktop/tablet sign-in prompt

Это основной reusable паттерн для centered modal content.

### 2.3. `IOSSheet`

Bottom / side / full-height sheet.

Подходит для:

- mobile sign-in prompt
- mobile settings
- table of contents
- mobile upload flow при необходимости

### 2.4. `IOSAlertDialog`

Специализированный alert-паттерн поверх `IOSDialog`.

Нужен для:

- destructive confirm (`Delete book?`)
- informational alert (`Translation takes time`)
- любые короткие blocking alerts с 1-2 actions

Важно:
- это не отдельная “совсем другая система”, а preset / specialized wrapper поверх dialog shell;
- но в API и в дизайне это надо мыслить как отдельный reusable компонент, потому что поведение и композиция у alert отличаются от обычного dialog.

## 3. Почему именно 4, а не 3

Без translation-time alert было бы достаточно:

- `IOSModalShell`
- `IOSDialog`
- `IOSSheet`

Но после решения:

- alert про длительный перевод должен быть стилизован как alert;
- у него должна быть кнопка `OK`;
- он больше не должен быть floating glass notice поверх reader;

появляется отдельный reusable сценарий alert/dialog.

Поэтому практический итоговый набор: `4`.

## 4. Translation-time alert

## 4.1. Что это теперь

Это больше не “status overlay” и не “toast”.

Это должен быть обычный **iOS-style informational alert**:

- centered;
- с заголовком;
- с коротким текстом;
- с одной кнопкой `OK`;
- визуально близкий к `UIAlertController`/system alert ощущению.

## 4.2. Текстовая задача

Смысл alert:

- первые страницы перевода могут занять около 30 секунд;
- дальше перевод продолжится незаметно в фоне;
- пользователю безопасно выйти из reader и вернуться позже.

То есть это теперь не transient notice, а одноразово подтверждаемое пользователем объяснение.

## 4.3. Поведение

Рекомендуемая модель:

- показывать alert только когда пользователь впервые входит в такой wait-state для конкретной `(bookId, chapterId, lang)` комбинации;
- после `OK` не показывать его повторно бесконечно на каждом page turn;
- при этом сам glow/state ожидания может продолжать жить отдельно от alert.

Иными словами:

- `alert` = объяснение;
- `glow` = визуальный индикатор, что reader ещё догружает перевод.

## 5. Responsive стратегия

Не нужно дублировать каждый экран в отдельные `MobileUploadModal`, `DesktopUploadModal`, и т.д.

Правильная модель:

- один content component;
- разные presentation modes через `IOSDialog` / `IOSSheet`.

### Рекомендуемая матрица

#### Upload

- mobile: `IOSSheet` или compact `IOSDialog`
- desktop: `IOSDialog`

#### Sign in to upload

- mobile: `IOSSheet`
- desktop: `IOSDialog`

#### Reader settings

- mobile: `IOSSheet`
- desktop: `IOSDialog`

#### Table of contents

- mobile: `IOSSheet`
- desktop: `IOSSheet` (side sheet / large panel) или большой `IOSDialog`, в зависимости от UX

#### Delete confirm

- mobile: `IOSAlertDialog`
- desktop: `IOSAlertDialog`

#### Translation takes time

- mobile: `IOSAlertDialog`
- desktop: `IOSAlertDialog`

## 6. Привязка к `shadcn` / `Tailwind`

## 6.1. Что значит “корректно привязано”

В этом проекте “корректно” означает:

- стили через Tailwind utilities + существующие CSS variables (`--system-blue`, `--separator`, `--bg-grouped-secondary`, и т.д.);
- примитивы поведения строятся на Radix-уровне, а не через ad-hoc `div + fixed inset-0` в каждом новом окне;
- кнопки, typography, spacing, separators и surface tokens берутся из уже существующей темы и UI foundations.

## 6.2. Что не надо делать

Не надо:

- плодить ещё больше вручную собранных overlay-компонентов;
- отдельно руками решать `Esc`, focus trap, outside click и portal в каждом файле;
- делать “Apple-like” визуально, но без нормального modal behavior.

## 7. Маппинг текущих компонентов на целевые

### Оставить как content, пересобрать presentation

- `UploadBookModal.tsx` -> content inside `IOSDialog` / `IOSSheet`
- `SignInToUploadModal.tsx` -> content inside `IOSDialog` / `IOSSheet`
- `ReaderSettings.tsx` -> content inside `IOSDialog` / `IOSSheet`
- `TableOfContents.tsx` -> content inside `IOSSheet`

### Оставить как сценарий, но пересобрать на reusable alert

- `DeleteBookConfirmDialog.tsx` -> `IOSAlertDialog`
- translation-time alert -> `IOSAlertDialog`

## 8. Внешний вид: что считать “1:1 iOS”

Не пытаться копировать пиксель в пиксель UIKit screenshot.

Нужно соблюсти:

- centered alert proportions;
- большие скругления;
- приглушённый blurred backdrop;
- typography близкая к iOS (`headline`, `body`, secondary label);
- разделение destructive / default action;
- правильные touch target sizes;
- нормальные safe-area отступы;
- animation без тяжёлых spring-переборов.

Для alert особенно важно:

- не делать его “маркетинговой glass-card плашкой”;
- не делать кастомную floating banner-механику;
- держаться ближе к обычному iOS alert.

## 9. Практический итог

Если считать только действительно нужные reusable overlay-компоненты, целевой набор такой:

1. `IOSModalShell`
2. `IOSDialog`
3. `IOSSheet`
4. `IOSAlertDialog`

Этого достаточно, чтобы:

- привести существующие окна к одному стандарту;
- иметь нормальную desktop/mobile адаптацию;
- корректно оформить translation-time explanation как alert с `OK`;
- не плодить новые кастомные modal-ветки.

## 10. Decision

Для `globoox_preview` считать canonical overlay system такой:

- **Dialogs / centered modals** -> `IOSDialog`
- **Sheets / TOC / mobile surfaces** -> `IOSSheet`
- **Confirm + info alerts** -> `IOSAlertDialog`
- **Общее поведение overlay** -> `IOSModalShell`

Alert “translation takes time” входит в `IOSAlertDialog`, а не в отдельный toast/banner family.
