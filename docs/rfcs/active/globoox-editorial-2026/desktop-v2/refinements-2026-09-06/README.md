# Languages and founders — active refinement, 6 September 2026

**Superseding revision, 2026-09-07:** user feedback rejected the Orchard composition and miniature “soon” cards documented below. The current block uses a compact canopy and current-language papers, independently aligned copy, and two readable HTML rows of upcoming names with middots beside three small growing sprouts. [New revision record](../refinements-2026-09-07/README.md) · [New QA record](../refinements-2026-09-07/design-qa.md). Final QA approval is not asserted here.

All mini-card layout and QA statements below are historical; preserve them and their assets. Checkpoint `0d22c81` retains the previous editorial state, excluding the unrelated billing RFC. Original copy, block order, and the isolated `/landing-editorial#languages` route remain unchanged; desktop at 1440px remains the focus, with existing project visuals as secondary references. No deploy or push.

**Current implementation, 2026-09-06:** Orchard is implemented at `/landing-editorial#languages` with seven transparent PNG assets: three large paper surfaces, two miniature paper surfaces, a sparse tree, and seedlings. Canonical language names remain live HTML; upcoming names use miniature readable cards. [Implementation record](language-garden/implementation/README.md) · [Current language QA record](language-garden/implementation/design-qa.md). This notice records implementation, not QA sign-off.

All no-implementation and baseline-live statements below are historical and superseded. Keep all baseline snapshots and exploration material. Changes remain isolated to the language block; original copy and block order are locked, existing project visuals are secondary references, and the current focus is 1440px desktop.

**Newest exploration:** user rejected the single twig behind cards and requested more variants, including trees with mature language cards and upcoming seedlings. Eight concepts plus two refinements are complete; root favors [Orchard](language-garden/orchard.png). [All variants and critiques](language-garden/index.html) · [decision record](language-garden/README.md). This supersedes older visual-selection status below; live baseline remains intact, no implementation performed.

**Latest result:** the user delegated further autonomous ImageGen iteration on variant 3. After seven generation/review cycles, root selected [this refined mock](card-refinement/selected.png). [Decision and exact prompt chain](card-refinement/README.md) · [selected-result page](card-refinement/index.html). This supersedes the earlier option-selection discussion. The selected mock has not been implemented; the live baseline is preserved.

## Latest request — five contemporary card variants

The user preferred the Manuscript slips composition (previous exploration 1), reattached it as `/Users/user/Desktop/download-1.png`, and requested **five more variants**. Keep the staggered card idea, reduce vintage styling, vary the cards meaningfully. One variant should include tasteful decoration on the cards; another should put a lightweight background object behind them. [Current round](card-variations/index.html) · [preserved selected reference](card-variations/selected-reference.png). This is a preference for an exploration direction, not a final implementation selection. The live paper-index baseline remains intact.

## Current authority

User feedback in order:

1. Borrow the original founder-card layout.
2. Replace the giant native/English language list with an illustration or calm Muse-like widget. Generate an ImageGen mock first. Redesign upcoming language presentation too.
3. Ornate open-book/bookmark proposal: **rejected, “too AI-looking.”**
4. Simple paper index: **retain as baseline, “not quite it; keep searching.”**

The live `/landing-editorial#languages` currently uses the paper index baseline. It is not final approval. Continue exploring distinct, restrained compositions while preserving this baseline. No original text or block order changes; no fake product screen. All language strings still come from `getLandingMessages('en')`.

## Baseline

- [Generated mock](languages-paper-index-mockup.png), created using the built-in ImageGen tool.
- [Exact prompt](paper-index-prompt.txt).
- [Component snapshot](LanguagesSection.tsx.baseline.txt) and [style snapshot](LanguagesSection.module.css.baseline.txt).
- One flat paper panel, available names in 2×2 arrangement with small status ticks, one italic “soon” label and a 2-column future list. HTML/CSS, no generated raster shipped.
- Art-director critique: clear hierarchy and restrained treatment, but too conventional to count as the final direction. User explicitly kept this only as a baseline.
- [Actual browser baseline](languages-baseline-browser-1395.png), 1395 CSS px viewport; the same 1160px content container as at the target 1440px.

## Further exploration — unselected

These are three independent built-in ImageGen calls, each shown once in chat. Numbering follows their displayed order in this exploration round. They do not replace the live baseline. See [visual comparison](index.html).

1. [Manuscript slips](exploration-1-manuscript.png) — [exact prompt](exploration-1-prompt.txt). Stepped paper fragments borrow Muse's spatial device directly. Stronger material character than the baseline, but the strips are too tall in the generated mock and the highlighted Spanish creates an arbitrary preference. If selected, reduce the strip height/shadows and reconsider the accent.
2. [Marginalia](exploration-2-marginalia.png) — [exact prompt](exploration-2-prompt.txt). Unboxed labels and thin arcs around the actual app icon free up the composition. The generated icon is oversized and subtly restyled; any implementation must use the real project SVG unchanged. Arrows risk suggesting specific language pairs; any final diagram must avoid implying restrictions.
3. [Folded language sheet](exploration-3-folded.png) — [exact prompt](exploration-3-prompt.txt). One connected sheet introduces a different silhouette. More architectural than the first two, but the generated folds are almost invisible and the four blank panels need a stronger compositional reason. No raster would need to ship if this were selected.

All prompts attached the inspected Muse comparison image; the second also attached the actual project icon PNG. The original copy and source language strings remain authoritative over generated text. The user subsequently preferred the first study as a direction for five further variants; none of these initial studies was chosen as a final implementation.

## Rejected artifacts — historical only

- `languages-bookmark-mockup.png` and `mockup-prompt.txt`: ornate book with botanical bookmarks. Rejected by user; do not restore.
- `rejected-language-bookmarks-asset.png`, `asset-prompt.txt`, `asset-background-prompt.txt`: associated raster work, archived outside `public/`. Not used by the landing.

## Founder cards

The user's specific request makes the original founder-card geometry authoritative for this component: 2×2 grid, 28px gaps, 20×18px card padding, 78px square original portraits, 16px image/text gap, top alignment, 28px names, small uppercase roles and underlined profile links. Editorial paper/pine palette and Newsreader remain. Original texts, photographs and profile destinations remain intact. Shared/original founder component is untouched. [Verified browser capture](team-browser-1395.png) shows all four cards at 1395 CSS px; DOM measurements confirm each card is 566×134px and every portrait is 78×78px.

## Verification so far

Scoped ESLint passed for `LanguagesSection`, `TeamSection` and `EditorialLanding`. Scoped TypeScript with the project compiler configuration and full imported dependency graph returned zero diagnostics. No tests were added for these presentational changes.

Browser DOM confirms exact current/future language strings and original section order. At 1440 CSS px the language panel is 555×369px and section 589px tall. Browser viewport emulation produces invalid screenshots in this Chrome session; native captures are accurately labeled 1395px. Temporary viewport override has been reset. Browser logs show the existing local PostHog missing-token configuration error; no language/founder component error was observed. This visual refinement does not change analytics setup.
