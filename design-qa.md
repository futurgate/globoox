# Current language garden QA — 6 September 2026

**final result: passed**

Orchard is now implemented at `/landing-editorial#languages`: seven transparent PNG assets with canonical live HTML names and miniature upcoming-language cards. [Current report](docs/rfcs/active/globoox-editorial-2026/desktop-v2/refinements-2026-09-06/language-garden/implementation/design-qa.md) records the source, 1440×935 browser capture, normalized full/focused visual comparison, all five fidelity surfaces, corrected P2 findings, interactions and engineering checks. [Final desktop screenshot](docs/rfcs/active/globoox-editorial-2026/desktop-v2/refinements-2026-09-06/language-garden/implementation/desktop-final.png) · [Combined comparison](docs/rfcs/active/globoox-editorial-2026/desktop-v2/refinements-2026-09-06/language-garden/implementation/comparison-full.png).

All 12 rendered image instances load; ten labels and original marketing text are preserved; no horizontal overflow at 1440px; Languages navigation works; scoped ESLint and TypeScript pass. No open P0/P1/P2 in this block. Remaining P3: slightly more naturalistic leaf shading and a mostly concealed smallest sprout. Responsive refinement remains deferred. The original landing/product/shared styles were not changed in this refinement. Earlier language baseline and V1/V2 captures below are historical for this block.

---

# Globoox editorial landing — current Desktop V2 QA

**Update, 2026-09-06: language exploration is active.** The user retained the newly implemented paper index as a baseline only and requested further ImageGen options. Three unselected studies and actual baseline/founder captures are in the [refinement record](docs/rfcs/active/globoox-editorial-2026/desktop-v2/refinements-2026-09-06/README.md). Founder cards now borrow the original compact geometry. Scoped lint/TypeScript pass; visual captures are 1395 CSS px, with additional 1440px DOM geometry checks. The older full-page/language/team captures below are historical for those two changed sections; earlier “passed” notes are not approval of the ongoing language design.

**Passed for the requested 1440px desktop view on 2026-09-05.** The authoritative current report is [Desktop V2 QA](docs/rfcs/active/globoox-editorial-2026/desktop-v2/QA.md), with [full-page evidence](docs/rfcs/active/globoox-editorial-2026/desktop-v2/evidence/desktop-final.png) and [selected section studies](docs/rfcs/active/globoox-editorial-2026/desktop-v2/index.html). All 63 original-copy checks and 30 tests pass; scoped lint/TypeScript pass. V2 replaces the old walkthrough, comparison scrolling, language interaction and founder presentation. Responsive refinement is deferred.

The following report is preserved unchanged as **historical V1 evidence**. Its mobile sign-off, interaction descriptions and screenshots do not describe V2.

---

# Globoox editorial landing — final design QA

**Visual / interaction result: passed.** Reviewed 2026-09-05 at `/landing-editorial`. No open P0, P1 or P2 issues in the new landing within the checks below. Production compilation succeeds; repository-wide type validation remains blocked by an unchanged legacy backup route.

## Source and intent

Primary contract: [DIRECTION](docs/rfcs/active/globoox-editorial-2026/DIRECTION.md). Final design follows the user's Muse reference for literary atmosphere, with original Globoox text, app icon and actual product media. The generated reader is an archived composition study and does not ship.

- [Reference / implementation comparison](docs/rfcs/active/globoox-editorial-2026/qa/reference-comparison.png)
- [Desktop, 1440px](docs/rfcs/active/globoox-editorial-2026/qa/desktop-final.png)
- [Mobile, 390px](docs/rfcs/active/globoox-editorial-2026/qa/mobile-final.png)
- [Tablet, 768px](docs/rfcs/active/globoox-editorial-2026/qa/tablet-final.png)
- [Finished visual moodboard](docs/rfcs/active/globoox-editorial-2026/qa/moodboard-final.png)

Muse and final Globoox were inspected together. Intentional differences: Globoox retains its longer original heading and six-block structure; a real app recording replaces Muse's surrounding fiction excerpts. Original app typography remains visible inside media. Botanical framing stays behind/outside the recording. No reference screenshot or invented reader appears on the landing.

## Visual checks

- Desktop hierarchy: original title, upload action, large product recording. Supporting typography, paper/pine palette, fine rules and repeated spacing remain consistent through all six sections.
- Walkthrough uses intentional crops of the three original screenshots; each opens uncropped in a native dialog. Original app controls are preserved in the images.
- Full original quality passages remain available in individually scrollable areas. The dark language section separates the product demonstration from the real team portraits and closing action.
- Viewports 320, 390, 768, 1024 and 1440px: no page horizontal overflow or overflowing headings. Desktop and mobile whole-page screenshots inspected; individual walkthrough, quality, team and hero views inspected.
- Small-text contrast gaps found during independent review were corrected. Decorative art is noninteractive and hidden from assistive technology; source screenshots retain their own original appearance.
- All landing image assets load. No browser console warnings/errors in the final landing session. Three fonts are served locally.

## Functional checks

- Device tabs switch the actual Desktop / Tablet / Phone source. Only one video element exists. Arrow keys, Home and End update selected state and keyboard focus. The panel is keyboard-focusable.
- Explicit Play advances the real recording; Pause stops it. Leaving the hero pauses playback. The observed reduced-motion preference defaults to a still, with explicit playback available.
- Screenshot dialog opens the selected original image; Escape closes it and native dialog semantics contain focus.
- Mobile navigation expands/collapses; anchor selection closes it. Language navigation remains available on mobile and at 1024px.
- Show original removes/restores the RU panel while retaining EN; language buttons update the native language name and selected state.
- Necessary-only consent dismisses the banner and uses the original consent contract. The additive analytics route matcher includes the preview before hydration.
- Original CTA links target `/my-books`; team profile destinations and canonical six-section order are preserved. Preview metadata is `noindex, nofollow`.
- Moodboard lightbox opens reference evidence, changes images with ArrowRight, and closes with Escape; desktop/mobile layout has no overflow or broken source images.

## Engineering evidence and limits

- Original-copy audit: **59/59 checks passed**, including exact Unicode hero title.
- Existing test suite: **30 tests passed**.
- Scoped ESLint passed for new route/components and the consent path change.
- Scoped TypeScript: **0 errors** across 1,442 transitive files.
- Webpack production compilation completed successfully in 3.9 minutes. `npm run build -- --webpack` then exited 1 at unchanged `src/app/landing-backup-2/page.tsx:66`, which omits the existing required `compare` prop. Global TypeScript also reports six other existing missing-prop errors in the two legacy backup pages. Those unrelated routes were not edited.
- Existing app/current landing/shared visual components remain untouched. The only shared code change adds `landing-editorial` to the existing analytics-consent path regex. The pre-existing billing RFC edit is unrelated and preserved.

This is a local implemented preview, not a deployment or a claim of complete production/browser-matrix certification. QA screenshots may include Next.js's local development badge; it is not landing content.
