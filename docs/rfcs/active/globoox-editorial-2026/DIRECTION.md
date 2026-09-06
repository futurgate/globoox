---
type: rfc
status: implemented
owner: design-engineering
last_verified: 2026-09-06
---

# Globoox editorial landing — primary working direction

**Current revision, 2026-09-07:** user feedback supersedes the previous Orchard composition and miniature “soon” cards. The revision at `/landing-editorial#languages` uses a compact 460×420px canopy, 192px current-language paper cards, independently aligned copy, and two 18px HTML rows of upcoming names separated by middots beside three small growing sprouts (`seedlings-growth.png`). See the [new revision record](desktop-v2/refinements-2026-09-07/README.md) and [new QA record](desktop-v2/refinements-2026-09-07/design-qa.md); this notice does not claim final QA approval.

The prior mini-card layout, its QA, and all “current” notices dated 2026-09-06 below are historical and superseded. Local checkpoint `0d22c81` preserves the earlier editorial work and excludes the unrelated billing RFC. Preserve all history. Original copy, block order, and the isolated route remain unchanged; existing project visuals remain secondary references and the focus remains 1440px desktop. Do not deploy or push this revision.

**Current language implementation, 2026-09-06:** Orchard is implemented at `/landing-editorial#languages`. Seven transparent PNG assets provide three large paper surfaces, two miniature paper surfaces, a sparse tree, and seedlings. All current and upcoming names are live HTML from canonical `getLandingMessages('en')` copy; upcoming names use miniature readable cards. Read the [implementation record](desktop-v2/refinements-2026-09-06/language-garden/implementation/README.md) and [current language QA record](desktop-v2/refinements-2026-09-06/language-garden/implementation/design-qa.md) for verification status. Desktop language QA passed on 2026-09-06; use the linked record and its final screenshot as current evidence.

Every older no-implementation or baseline-live language statement below is superseded history; retain the baseline snapshots and all prior design artifacts. Work remains isolated to the language block, original copy and block order stay locked, and existing project visuals remain secondary references. The current target remains 1440px desktop; responsive refinement is deferred. Earlier V1/V2 completion and QA statements do not establish verification of the new Orchard block.

**Active follow-up, 2026-09-06:** read the [language/founder refinement record](desktop-v2/refinements-2026-09-06/README.md). Original compact founder geometry has been restored by user request. The ornate language illustration was rejected; its replacement paper index is retained only as a baseline while three new ImageGen directions are explored. Earlier completion statements do not close this active language design work.

**Current implementation is Desktop V2:** read [Desktop V2 direction](desktop-v2/DIRECTION.md) first and [its desktop QA](desktop-v2/QA.md). Section-by-section ImageGen art direction, implementation and 1440px review are complete. Responsive refinement is deferred by the user. Earlier implementation/QA status below is preserved as historical V1 material.

## Follow-up review after delivery

The user requested a candid review of remaining roughness. Read [REVIEW-2026-09-05.md](REVIEW-2026-09-05.md) alongside this direction. It identifies source-confirmed refinements to media spacing, comparison usability, screenshot inspection, and the language interaction. Fresh browser capture was blocked in that review; no new visual sign-off is claimed. The earlier QA pass establishes the checked implementation behavior, not completion of these later refinements. No redesign code was changed during the review.

## Authority (read first after context compaction)

1. Latest user instructions: **preserve all original landing copy and the existing app icon; show the actual product recordings/screenshots instead of the invented conceptual reader.**
2. Product evidence: `public/screenrecordings/`, `public/images/device-posters/`, and `public/images/how-it-works/`. Copy authority: `getLandingMessages('en')`. Brand asset: `public/icon.svg`.
3. Visual direction: live captured https://sudowrite.framer.website/muse, the task-specific moodboard/brief, and supplied concepts as composition inspiration only. Generated botanical framing remains relevant decoration.
4. New isolated implementation and its verified screenshots. Existing brandbook, archived visual plans and landing backups are SECONDARY visual references only; this does not demote the real product media, original text, or app icon.

The fictional reader and generated book cover are archived development studies, not product visuals to ship. The user requests a landing presentation redesign, not an invented or redesigned reading app.

## Non-negotiable contract

- Route `/landing-editorial`; dedicated `src/components/landing-editorial/`; CSS Modules; assets `/redesign/`.
- Existing app and current landing visuals, content, styles, and metadata stay untouched. The sole shared infrastructure change adds the new route to the existing analytics-consent path regex; see the implementation record below.
- Current canonical source is `src/components/landing/LocalizedLandingPage.tsx`, used by `/en`.
- Preserve Header → hero → how-it-works → quality → languages → team → start → Footer. Consent stays overlay, not a new content block.
- Preserve 3-step how-it-works: upload → choose → read. Supported marketing format EPUB; currently EN/ES/RU/FR. Do not import PDF/MOBI or invented feature/quality promises from generated imagery.
- All original marketing text remains verbatim, including headings, descriptions, comparison sample, language lists, team, CTA, footer, and navigation. Use the existing app icon unchanged.
- Hero uses `ProductRecording`: the actual desktop/tablet/phone H.264 videos and their existing posters. Do not overlay fictional app controls or repaint the recorded UI.
- Walkthrough uses the original `1.1.webp`, `2.1-en.webp`, and `3-en-es.webp` files from `public/images/how-it-works/`.
- Need screenshots of Muse + other real product-first typographic references; visual moodboard; Globoox-specific brief; responsive implementation and interaction QA.
- No random generated pictures. Any generated asset must have a measured role and documented prompt/provenance.

## Chosen art direction

A quiet literary workspace. Paper ivory, pine ink, muted sage, sparing warm copper. Refined serif treatment of unchanged marketing text with compact humanist sans controls. A large actual product recording is the hero; natural-history marginalia sit outside it. Preserve the real app's visible UI and typography inside every recording and screenshot. Device selection and Play/Pause control the media; they do not simulate a different app.

## Completed work

- Repo audit, reference research, and six accepted live site captures are complete. A new AGENTS file preserves the scope without overwriting older instructions.
- In-app browser was unavailable; the root Chrome DevTools connector captured source sites and the first board QA view.
- Moodboard, research, and brief are complete and reflect the final real-media direction. All six actual product posters/walkthrough screenshots were visually inspected and copied unchanged into the portable board's references directory.
- `ProductRecording.tsx` and the source walkthrough images are integrated. Final desktop/mobile landing and moodboard screenshots are saved in `qa/`; responsive, interaction, and original-copy checks are complete.
- Pre-existing modified billing RFC must be preserved.

## Superseded development directions — retain for history only

- Earlier shortened headlines, rewritten marketing copy, and replacement outline icons are superseded. `hero-concept.png` is not a text or brand source.
- The earlier instruction to code and ship a polished fictional reader is superseded. Preserve the study and generated cover as archived artifacts; do not import them into the final landing.
- Only compositional lessons and the separate botanical frame survive from the generated hero study. Current implementation authority is the contract above.

## Implementation and verification

- Implemented `/landing-editorial` with separate CSS Modules, components, local fonts and botanical asset.
- All 59 marketing-copy checks pass against original English messages. Header, six canonical content blocks, Footer, and consent-overlay roles are preserved.
- Hero uses actual Desktop/Tablet/Phone screen recordings with play/pause; walkthrough uses original screenshots and full-image lightbox. Concept reader code/cover moved into `concepts/`, outside runnable source/public assets.
- Necessary infrastructure exception: `src/instrumentation-client.ts` adds ONLY `landing-editorial` to the existing landing consent regex. This is needed because PostHog initializes globally before route hydration; the original paths and product behavior are unchanged. New visual consent component reuses existing consent utility/API.
- Responsive checks passed at 320, 390, 768, 1024, and 1440px with no horizontal overflow. Keyboard device tabs, Play/Pause, screenshot dialog, mobile navigation, Show original comparison toggle, and native-language-name selection passed.
- Scoped lint and TypeScript passed with no errors; all 30 existing tests passed. Production webpack compilation succeeded, but the build did not complete: production TypeScript stops on the pre-existing missing `compare` prop at `src/app/landing-backup-2/page.tsx:66`. Unrelated backup routes were not changed.
- See [design-qa.md](../../../../design-qa.md) for the full verification record. The final quality interaction is a Show original toggle; the language specimen switches native language names, not translated prose.
