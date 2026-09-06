---
type: reference
status: current
owner: design-engineering
last_verified: 2026-09-05
---

# Desktop V2 — design and interaction QA

**2026-09-06 refinement supersedes the language/team visuals below.** [Current record](refinements-2026-09-06/README.md) · [baseline languages, 1395px](refinements-2026-09-06/languages-baseline-browser-1395.png) · [compact original founder layout, 1395px](refinements-2026-09-06/team-browser-1395.png). The language panel is a retained baseline, not final design approval; three further ImageGen studies are unselected. Scoped ESLint and TypeScript both pass on the changed components. Original copy/order are preserved. Old full-page, language and team captures remain historical, while unaffected-section evidence below still describes V2.

**Result: passed for the requested 1440px desktop presentation.** This sign-off supersedes V1's visual review for the current implementation. Responsive refinement was explicitly deferred by the user; earlier mobile screenshots do not certify V2.

Reviewed the live `/landing-editorial` implementation in Chrome at 1440px wide, primarily with a 1100px viewport. The hero capture uses a 1250px height to include the complete header and product; the closing capture uses 760px. Section captures use their actual bounding boxes. The full page is 1440px wide. These are real browser captures, not generated mockups.

## Visual evidence

- [Complete desktop page](evidence/desktop-final.png)
- [Header and hero](evidence/hero-final.png)
- [How it works](evidence/how-it-works-final.png)
- [Quality](evidence/quality-final.png)
- [Languages](evidence/languages-final.png)
- [Team](evidence/team-final.png) · [original team for comparison](evidence/original-team-comparison.png)
- [Closing CTA and Footer](evidence/start-footer-final.png)
- [Screenshot viewer at original size](evidence/screenshot-zoom-final.png)
- [Consent overlay](evidence/consent-final.png)
- [Selected generated section studies and source references](index.html)

The first implementation pass is preserved as `evidence/desktop-first-pass.png`. It is historical, not final authority. Generated studies remain composition targets: all shipped product media, icons, copy and portraits use the original project sources.

## Art-direction review and corrections

| Area | Final assessment and intentional difference from the study |
|---|---|
| Hero | Original full heading remains three balanced lines at 64px. The additive eyebrow has a secondary role. The real recording receives a 960px stage, 1px warm contour, 10px radius and restrained shadow. This is a quiet app-window boundary; it adds no simulated hardware or product controls. Botanical art was lifted to frame the heading and screen, then faded at the bottom to remove its hard cutoff. |
| Controls | Device tabs form a centered text group above the screen. Play/Pause occupies a separate right-hand position and has its own circular symbol. Tabs and playback do not share a pill. Source media aspect ratios remain unchanged. |
| How it works | All three original instructions remain visible. A complete, uncropped source screenshot occupies the right column; selecting a step changes it directly. The selected ImageGen study showed Step 2, while the implementation intentionally opens at Step 1. Internal tab separators group the controls; arbitrary page dividers were removed. |
| Quality | The original bilingual passage uses equal 21px body sizes. The initial two complete sentences are readable at once. Both complete source texts expand together in page flow. The selected study's book metaphor is expressed as a single paper surface and center gutter, without ornaments or invented app chrome. |
| Languages | Current language names are visible simultaneously, with original English labels and no empty interaction. Upcoming names were increased to 17px, with unboxed 11px availability labels. All six future entries fit one row at 1440px. |
| Team | Four natural-color source portraits sit in substantial two-by-two horizontal cards. Names, roles and original LinkedIn actions remain one readable group. The generated portraits are not used. |
| Consistency | Quality and Team description starts were aligned near the first heading line. Section headings use 58px, descriptions 17px, labels 11px with consistent casing/spacing. A scoped override removes global automatic hyphenation from landing copy. Shared app typography was not edited. |
| Closing | Existing icon, exact original heading, description and action remain. Botanical art has a lower opacity, smaller height and a mask that keeps the inner edges quiet. Full original footer copy is present; there is no decorative divider. |

An independent visual review identified the intro alignment, upcoming-language type and excessive closing foliage. Those issues were corrected and the final captures were inspected again. No material open desktop visual issue remains from that review. Visual taste remains a design judgment, not an objective claim about a named designer's approval.

## Interaction evidence

- Desktop, Tablet and Phone select their corresponding original H.264 recordings; one video element exists. Observed tablet dimensions were 383×583 within its contour, phone 248×537; no cropping or fabricated device chrome.
- Play starts actual playback even with the browser's observed reduced-motion preference. Pause stops it. Starting playback then scrolling to Team pauses it automatically. Source files loaded to readyState 4 without media errors.
- Device keyboard navigation changes selection and focus; Home returned Phone to Desktop.
- How-it-works Step 2 click selects the source language-menu screenshot. ArrowDown advances to Step 3 and moves focus. Returning to Step 1 restores the upload screenshot.
- View screenshot opens a native modal. Zoom displays the source at 788×1705 in a scrollable viewer. The toolbar remains outside the scrolling region. Escape closes the modal and restores focus to View screenshot.
- Read full excerpt exposes both complete canonical strings; visible text equals each full underlying passage. Both article heights grew naturally to 1129px in the checked state, with scrollHeight equal to clientHeight: no inner passage scrolling.
- Show original hides/restores RU while keeping EN visible. The single-column translated layout has a 760px reading measure. Collapse returns to the initial two-sentence view.
- Original links, upload destinations, native locale choices and all six section IDs remain. Header → hero → how-it-works → quality → languages → team → start → Footer is unchanged. Consent remains an overlay using the existing contract. In a separate isolated browser context, Necessary only dismissed the banner, stored the expected choice, and persisted across reload without changing the user’s existing browser storage.

## Engineering checks

- Original-copy check: **63/63** canonical strings found in rendered markup, including the complete hidden RU/EN tails and their whitespace. The only additive marketing line is “A world of books. Open to you.”
- Scoped ESLint: passed for the editorial route/components and documented instrumentation change.
- Scoped TypeScript: passed for the editorial route/components and instrumentation.
- Existing test suite: **30/30 passed**.
- Documentation validation: **47 governed files passed** after portable-path/frontmatter corrections.
- At 1440px: document scrollWidth equals viewport width; all visible source images loaded; all three local font faces loaded; no browser console errors. Four Next development CSS preload warnings appeared after repeated hot reloads; these concern stale versioned development styles, with all final styles and fonts visibly applied.
- Only the isolated route/components/assets and task documentation were changed in this refinement. The existing analytics-consent regex exception is unchanged. Original source media, app, shared visual styles and canonical landing files remain untouched. The user's pre-existing billing RFC edit is preserved.

The previously recorded repository-wide production build error remains outside scope: legacy backup pages omit existing required props, first reported at `src/app/landing-backup-2/page.tsx:66`. V2 was verified by the running Next development compilation and scoped checks; a new complete production build is not claimed. This is a local preview, not a deployment. The small Next development badge in viewport captures is tooling, not landing content.
