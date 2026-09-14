---
type: reference
status: current
owner: design-engineering
last_verified: 2026-09-13
---

# Languages optical alignment and upcoming order — 2026-09-13

Implemented and visually reviewed at 1440, 1100, 901, 801, 800, 390 and 320px. This record covers only Languages; Pricing and the bottom CTA are owned by the parent task.

## User request and implementation

- Lower the four available-language names optically within their existing paper cards. The label's 4px bottom padding is now 4px top padding: visible text moves down by 4px, while the centered label box, paper/card dimensions, rotation and tree geometry stay unchanged.
- Swap the complete upcoming copy group and seedlings left to right. The DOM now places `upcomingCopy` first and `seedlingsFrame` second. The `soon` heading and both upcoming language rows stay together, with existing grouping and canonical words.
- Preserve current assets, font families, section copy, spacing and other sections. No ImageGen generation or asset changes were needed.

Exact original source snapshots are in [before/LanguagesSection.tsx.txt](before/LanguagesSection.tsx.txt) and [before/LanguagesSection.module.css.txt](before/LanguagesSection.module.css.txt). The original project remains only a secondary visual reference; these explicit corrections and the established editorial direction are current authority.

## Verification

Used a fresh anonymous, headless Chrome context through installed Playwright against `http://localhost:3000/landing-editorial`. The available Browser client was retried first and failed importing the removed versioned `browser-service.mjs`; this fallback did not access any existing browser profile or session. Screenshots and geometry were written exclusively under `/tmp/globoox-language-balance-2026-09-13/` during QA, then copied here after verification to avoid development style reloads.

All seven after screenshots were visually inspected. Before/after measurements confirm exact canonical text equality, unchanged bounding boxes for all four cards, unchanged section heights, copy-first/seedlings-second DOM order and no horizontal document overflow. No page errors were reported. Scoped ESLint and `git diff --check` passed.

| Width | Visual result |
| --- | --- |
| 1440 | All four labels sit evenly within the visible paper surfaces; upcoming names align left of the seedlings beneath the canopy. |
| 1100 | Compact two-column layout remains balanced; labels and upcoming rows fit without collision. |
| 901 | Existing tree/cards preserved; complete upcoming group left and seedlings right remain distinct. |
| 801 | Narrow desktop columns retain their original wrapping; upcoming group fits and card labels are centered. |
| 800 | Single-column layout preserves the large canopy; upcoming copy and seedlings stay centered as a combined group. |
| 390 | All labels fit their existing cards; both upcoming text rows remain readable alongside the seedlings. |
| 320 | All cards remain legible. Upcoming copy keeps the pre-existing third wrapped line; no new wrap or overflow was introduced. |

Screenshots: `evidence/languages-{width}-before.png` and `evidence/languages-{width}-after.png`. Measurements: [preservation-checks.json](evidence/preservation-checks.json), [before-geometry.json](evidence/before-geometry.json), [after-geometry.json](evidence/after-geometry.json).

No commit, push or deployment. Earlier docs and all artwork remain preserved.
