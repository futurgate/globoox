---
type: archive
status: archived
owner: design-engineering
last_verified: 2026-09-06
---

# Implemented Orchard language block — 6 September 2026

**Historical implementation; superseded on 2026-09-07.** User feedback rejected this composition and its miniature “soon” cards. The new revision uses a compact 460×420px canopy with 192px current-language papers, copy aligned independently with the crown, and two 18px HTML rows of upcoming names with middots beside three small growing sprouts (`seedlings-growth.png`). Read the [new revision record](../../../refinements-2026-09-07/README.md) and [new QA record](../../../refinements-2026-09-07/design-qa.md); this notice does not claim final QA approval.

All layout and QA results below apply only to the preserved 2026-09-06 mini-card implementation. Local checkpoint `0d22c81` retains that editorial state and excludes the unrelated billing RFC. Preserve all assets, screenshots, and prompts. Original copy, block order, and isolated `/landing-editorial#languages` route remain unchanged. Existing project visuals remain secondary references; the current focus is 1440px desktop. No deploy or push.

**Current state: implemented and desktop QA passed.** Open [the local block](http://127.0.0.1:3000/landing-editorial#languages). The approved tree direction now replaces the live paper-index baseline only in the isolated editorial landing. All earlier baseline snapshots and visual explorations remain preserved.

- [Final browser screenshot, 1440×935](desktop-final.png)
- [Selected amended mock](target.png) · [exact prompt](target-prompt.txt)
- [Source/browser comparison](comparison-full.png) · [comparison page](comparison.html)
- [Detailed QA](design-qa.md) · [browser measurements](browser-verification.json) · [asset metadata and hashes](asset-manifest.json)

## Production assets

All seven PNGs live in `public/redesign/language-garden/`. They were generated separately with the built-in ImageGen tool, visually inspected, and copied unchanged. They have genuine alpha transparency. Paper surfaces contain no words; canonical language names are selectable HTML laid over them, as explicitly agreed with the user.

| Asset | Dimensions | Role | Exact prompt / provenance |
| --- | --- | --- | --- |
| tree.png | 1182×1330 | Sparse mature tree behind four current language cards | [Tree](tree-prompt.txt) |
| seedlings.png | 2172×724 | Three young shoots behind the miniature future cards | [Seedlings](seedlings-prompt.txt) |
| paper-ivory.png | 2172×724 | Warm ivory paper, English and French | [Final prompt](paper-ivory-fresh-prompt.txt), [attempt record](paper-ivory-provenance.md) |
| paper-sage.png | 2172×724 | Very pale sage paper, Spanish | [Prompt](paper-sage-prompt.txt) |
| paper-soft.png | 2172×724 | Soft off-white paper, Russian | [Prompt](paper-soft-prompt.txt) |
| paper-mini.png | 1746×901 | Five compact future-language papers | [Prompt and attempts](paper-mini-prompt.txt) |
| paper-mini-wide.png | 2101×748 | Wider paper for “and dozens more” | [Prompt and attempts](paper-mini-wide-prompt.txt) |

Earlier transparency attempts produced RGB checkerboards and were rejected. The successful final assets have alpha channels, verified in the manifest and against the actual ivory page background. Pillow was used only to inspect metadata, never to draw or edit assets. Next Image serves appropriately sized versions; original PNG masters remain available.

## Implementation and composition

Only `LanguagesSection.tsx` and its CSS Module changed in source during this refinement. They consume `getLandingMessages('en').supportedLanguages` directly. The existing 1160px landing container, editorial fonts and color tokens remain. The 1440px view uses a 505px copy column, 82px gutter and 573px art column; tree canopy is capped at 500×454px. Current names use 30px Newsreader; future labels use 15px DM Sans. Three large surfaces and two miniature surfaces supply quiet material variation without rounded pill styling.

Cards are deliberately positioned on branches. The lower French card was moved up and right after visual review so the main trunk remains continuous. Upcoming names form a compact two-row group under the original “soon” label. Seedling roots are masked behind the papers in CSS; the tree itself retains its natural aspect ratio. Slight rotations and baked thin contact shadows belong to the paper composition, without added hover effects or fake controls.

Every original label, heading, description, language name and future-language string is preserved. Available and future languages use semantic lists; decorative images are hidden from assistive technology. The existing Languages navigation anchor works. No product demonstration, founder card, shared style, original landing route, or canonical message file changed in this refinement.

## Validation and limits

Visual QA compares the generated source and browser result together at normalized desktop width, including a larger detail comparison. All 12 rendered image instances load, all 10 labels remain readable HTML, and the page has no horizontal overflow at 1440px. Original six-section order is unchanged. Scoped ESLint passes and TypeScript returns zero diagnostics. No new tests were added for this presentational block.

Desktop-only sign-off, as requested. Responsive fallback rules remain, but mobile/tablet visual refinement was not part of this round. The tree's separately generated leaf shading differs slightly from the full mock; German's smallest sprout is more concealed. These are documented P3 refinements, not blockers. Earlier whole-page QA is historical for the language block; use this record and `desktop-final.png` for its current appearance.

Existing project styling and old planning remain secondary visual references. Current user instructions, this amended mock, actual original copy/media and the implementation record take precedence. Do not restore the live paper index from older status text after compaction.

---

## Preserved authorization / initial work record

# Language garden — asset production and implementation

User now explicitly approved making the assets and implementing the block. Latest contract: Orchard tree; upcoming names also live on miniature but readable paper cards beside young shoots. Use generated transparent PNG paper surfaces with HTML text, not pill-shaped controls. Produce three related large surfaces and two miniature surfaces, tree and seedling assets. Original canonical copy and section order remain unchanged. Existing paper-index snapshots remain historical baseline, no need to retain them live after this authorization.

Root generates the amended full-section mock before implementation, then measures the target and produces assets. Work isolated to LanguagesSection.tsx, its CSS Module and public/redesign/language-garden/. Existing project remains a secondary visual reference; original messages, media and app icon are authoritative. Preserve all older exploration files.

Current state: generating amended mock and assets; implementation/QA pending.
