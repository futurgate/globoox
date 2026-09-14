---
type: rfc
status: implemented
owner: design-engineering
last_verified: 2026-09-08
---

# Lower-fade visual QA

**final result: passed for this correction's sampled matrix**

Root visually inspected every one of the15 final screenshots, plus three extra320px views. No independent-agent review this round. All snapshots use a1400px viewport height and crop at the hero bottom; widths below are CSS viewport pixels. Two initial Phone captures caught video loading; both were replaced with loaded recordings and reviewed again.

| Width band / sample | Selection | Individual visual finding | Evidence |
|---|---|---|---|
| ≤480 / 390px | Desktop | Оба крупных фрагмента видны; цельные верхушки ниже управления, низ плавно исчезает. | [Screenshot](390-desktop.png) |
| ≤480 / 390px | Tablet | Лист гинкго и колосок не обрезаны сверху; стебли растворяются у основания. | [Screenshot](390-tablet.png) |
| ≤480 / 390px | Phone | Обе ветки обрамляют телефон; листья не касаются переключателя, низ мягкий. | [Screenshot](390-phone.png) |
| 481–600 / 540px | Desktop | Верхний фейд удалён; лист и колосок вдоль рамки, нижние фрагменты затухают. | [Screenshot](540-desktop.png) |
| 481–600 / 540px | Tablet | Обе верхушки цельные, ветки уходят за рамку; снизу нет торчащих концов. | [Screenshot](540-tablet.png) |
| 481–600 / 540px | Phone | Обе крупные ветки видны почти полностью; нижние концы мягко скрыты. | [Screenshot](540-phone.png) |
| 601–900 / 768px | Desktop | Цельный лист слева и колоски справа; плавный нижний фейд вместо верхнего. | [Screenshot](768-desktop.png) |
| 601–900 / 768px | Tablet | Верхушка травинки выше рамки, далеко от текста управления; низ скрыт. | [Screenshot](768-tablet.png) |
| 601–900 / 768px | Phone | Травинка входит в свободное пространство рядом с переключателем, не касается его. | [Screenshot](768-phone.png) |
| 901–1100 / 1024px | Desktop | Верхушка справа сохранена; ветки вдоль экрана, нижние концы растворяются. | [Screenshot](1024-desktop.png) |
| 901–1100 / 1024px | Tablet | Обе ветки естественно обрамляют планшет, без верхнего среза и нижнего выступа. | [Screenshot](1024-tablet.png) |
| 901–1100 / 1024px | Phone | Крупные ветки вокруг телефона; расстояние до текста и кнопок сохранено. | [Screenshot](1024-phone.png) |
| >1100 / 1440px | Desktop | Обе ветки в исходном масштабе; цельные верхушки, мягкое исчезновение у нижних углов. | [Screenshot](1440-desktop.png) |
| >1100 / 1440px | Tablet | Верхушка справа выступает над рамкой в свободное место; фейд только снизу. | [Screenshot](1440-tablet.png) |
| >1100 / 1440px | Phone | Обе ветки цельные сверху, концы уходят за телефон; управление не перекрыто. | [Screenshot](1440-phone.png) |

## Additional evidence

- [320/Desktop](extra-320-desktop.png), [320/Tablet](extra-320-tablet.png), [320/Phone](extra-320-phone.png): both large fragments remain visible, natural upper tips and clear tabs; lower ends fade before frame bottom.
- `measurements.json`:15 final matrix readings; both assets loaded, no horizontal overflow, no plant canvas extending above its decorative window.
- `boundary-measurements.json`:24 extra geometry checks, three selections at480/481,600/601,900/901,1100/1101. All keep both fixed-size images, clear upper window bounds, no horizontal overflow and fade ending at the frame bottom. These are measurements, not additional visually reviewed matrix cells.
- Real media and manual device switching exercised in all15 cells. Initial-selection/autoplay/sticky behavior code is unchanged.
- Source scope: only the isolated recording CSS changed this turn. Scoped ESLint passed; docs:check passed (72 governed files); git diff --check passed. No new tests were added for this CSS-only presentation correction.

## Fidelity and limits

Layout retains selected hero composition with the explicitly requested lower placement and fade. Typography, words, italic/sage treatment, paper palette, frame, real media and asset scale are unchanged. Decorative layers remain behind the opaque recording and ignore pointer input. This is a Chromium viewport review, not testing on physical devices or a guarantee for every possible width. No build/deployment claim.
