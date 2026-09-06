---
type: rfc
status: implemented
owner: design-engineering
last_verified: 2026-09-06
---

# Desktop V2 — current art direction

## Current language implementation — 2026-09-06

**Orchard is implemented at `/landing-editorial#languages`.** Seven transparent PNG assets provide three large paper surfaces, two miniature paper surfaces, the tree, and seedlings. Available and upcoming names remain live HTML using canonical `getLandingMessages('en')` copy; upcoming names are miniature readable cards. See the [implementation record](refinements-2026-09-06/language-garden/implementation/README.md) and [current language QA record](refinements-2026-09-06/language-garden/implementation/design-qa.md) for verification status; this notice does not assert QA sign-off.

All older no-implementation and baseline-live language statements below are superseded history. Preserve their snapshots, prompts, and rejected studies. Only the isolated language block is replaced; original copy and block order stay locked, existing project visuals remain secondary references, and 1440px desktop remains the current design focus. Earlier V1/V2 QA does not establish verification of this replacement.

## Active refinement — 2026-09-06

**Latest user approval:** create assets and implement Orchard with miniature paper cards for upcoming languages. PNG paper surfaces with HTML labels, transparent tree/seedlings, contemporary fresh paper. See [implementation record](refinements-2026-09-06/language-garden/implementation/README.md). This supersedes no-implementation status below. Keep baseline snapshots and old exploration history; replace only isolated LanguagesSection.

**Newest completed result:** eight concepts plus two refinements reviewed. Root's favorite is [Orchard](refinements-2026-09-06/language-garden/orchard.png), with [Little editions](refinements-2026-09-06/language-garden/little-editions.png) the alternate direction. Both follow-up Orchard edits remain rejected history. [Full critique and gallery](refinements-2026-09-06/language-garden/README.md). This is a visual recommendation, no implementation yet; earlier selected cards and live baseline remain preserved.

**Newest steering:** user rejected the single twig behind cards. Explore eight further compositions, including four tree/growth studies; root will inspect, choose favorites, and show the variants. See [language-garden record](refinements-2026-09-06/language-garden/README.md). This supersedes the earlier no-background-object criterion. Preserve the live baseline and all earlier mocks.

**Art-direction loop completed:** root selected [iteration 7 / selected mock](refinements-2026-09-06/card-refinement/selected.png) after seven generations and critiques. See [decision and full prompt chain](refinements-2026-09-06/card-refinement/README.md). This now supersedes the five-variant comparison as the visual target. The mock is not yet implemented; the live paper-index baseline remains untouched.

**Current goal:** user approved the proposed development of variant 3 and explicitly delegates repeated ImageGen generation/review until root selects a result it likes, then presentation of that result. Compact modern cards, subtler overlap rhythm, simpler unified botanical detail, soft milk/sage tones, weak contact shadows, quiet unchanged “soon” group. No additional background object. Read [the active iteration record](refinements-2026-09-06/card-refinement/README.md). This supersedes a fixed-count selection workflow; keep the live baseline intact.

**Latest selection of a direction:** the user prefers the Manuscript slips composition and supplied `/Users/user/Desktop/download-1.png`. Explore five variants of those staggered cards, with contemporary surfaces rather than vintage paper. Include one with small decoration on the cards and one with a lightweight object behind them. Keep the implemented paper-index baseline until a final variant is chosen. See [this round](refinements-2026-09-06/card-variations/).

The language block is under renewed exploration. User rejected the ornate generated book/bookmarks as “too AI-looking”, then kept the simple paper index as a **baseline only** and asked to keep searching. Do not label the baseline or prior V2 language captures as final approval. See [current refinement record](refinements-2026-09-06/README.md). The baseline is implemented and saved separately; further explorations must remain separate until selected. Founder cards now use the original compact layout by explicit user request, while retaining editorial colors/type and all original portraits/copy.

**Implemented and desktop QA passed on 2026-09-05.** Read [QA.md](QA.md), [selected decisions](DECISIONS.md), and [visual review board](index.html). Current browser evidence is in `evidence/*-final.png`; V1 and `desktop-first-pass.png` are historical. Responsive refinement remains deferred. Preserve this V2 direction in later work.

Latest user instruction overrides earlier completion status. Work until one excellent desktop view is finished; responsive refinement is deferred. Target: 1440px desktop, full scrollable landing. User saved visual reference: [saved-hero-reference.png](saved-hero-reference.png) (composition only; original logo/copy/media remain authoritative).

## Required changes

- Generate and art-direct an ImageGen mockup for every section BEFORE implementing that section. Root may select/iterate autonomously; user explicitly delegated art-director judgment, so no option-selection approval pause.
- Improve founder cards using original grouping and actual portraits; v1 grayscale strip is rejected.
- Replace 8px dark video bezel with a subtle 1px warm contour and modest shadow. Controls above the recording: device group centered, Play/Pause visually separate.
- Redesign how-it-works as an understandable three-step product explanation. Avoid scroll-driven hidden state and three severely cropped screenshots. Original step text/order stays.
- Restore consistency down the page: common type/spacing/tone, no arbitrary horizontal dividers or decoration.
- Preserve original marketing copy and all six content blocks. User now permits carefully considered additive eyebrow/support microcopy; this does not authorize rewriting original headings. Proposed only new marketing line: “A world of books. Open to you.”
- Real recordings/screenshots only; generated images are composition targets, not replacement product screens or portraits.

## Mockup ownership

Hero and quality: root. How-it-works: reader_component. Team and closing/footer: structure_audit. Languages: reference_research. Save prompts and critiques alongside each PNG. Each mock uses consistent paper/pine palette, Newsreader + DM Sans typography, original copy, and restrained botanical margins.

## Verification

Must capture and inspect the implemented 1440px page, compare with selected section mockups, test hero playback/device controls and how-it-works navigation, inspect founder cards and full-page rhythm. Do not label a blank/failed browser capture as evidence. Existing billing RFC edit and legacy backup-route TypeScript errors remain outside scope.

## Completed state

All six blocks were generated and critiqued before their implementation. Quality and Languages received a second generated iteration. Final code uses only original live copy/media/portraits and the existing icon, plus the single selected eyebrow. Browser review corrected botanical transitions, header alignment, label consistency, future-language readability, and scoped hyphenation. Original copy checks passed 63/63, tests 30/30, and scoped lint/TypeScript passed. See QA.md for actual interaction evidence and desktop-only limits.
