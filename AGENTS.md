# Current language implementation — 2026-09-06

**Orchard is implemented at `/landing-editorial#languages`.** The isolated language block uses seven transparent PNG assets: three large paper surfaces, two miniature paper surfaces, a sparse tree, and seedlings. All available and upcoming language names remain live HTML from the canonical `getLandingMessages('en')` copy; upcoming names are miniature readable cards. Read the [implementation record](docs/rfcs/active/globoox-editorial-2026/desktop-v2/refinements-2026-09-06/language-garden/implementation/README.md) and [current language QA record](docs/rfcs/active/globoox-editorial-2026/desktop-v2/refinements-2026-09-06/language-garden/implementation/design-qa.md).

This notice supersedes every older no-implementation or baseline-live statement below. Keep earlier mocks, prompts, baseline snapshots, and decisions as historical material. Original copy and block order remain locked, the existing project remains a secondary visual reference, and the focus remains the 1440px desktop view. Desktop language QA passed on 2026-09-06; the linked language QA record and its final screenshot are current evidence.

# Latest language exploration — 2026-09-06

**IMPLEMENTATION AUTHORIZED:** user approved tree direction and now says make assets and build the block. Upcoming names must also be miniature readable cards. Hybrid: generated PNG paper surfaces + live HTML names, three large surface variants/two mini variants, transparent tree and seedlings. Read `desktop-v2/refinements-2026-09-06/language-garden/implementation/README.md`. Prior no-implementation/baseline-live instructions below are historical and superseded; preserve their snapshots, implement only isolated language block.

**Newest result:** eight new ImageGen concepts plus two refinements are complete. Root favors `desktop-v2/refinements-2026-09-06/language-garden/orchard.png` (natural sparse tree + upcoming seedlings); `little-editions.png` is the alternate direction. Review `language-garden/README.md` and `index.html`. Both later orchard refinements are historical, not selected. User has not approved implementation; live baseline and earlier selected mock remain intact.

**Newest request:** single twig behind the cards was rejected. Generate more alternatives including at least two trees bearing mature language cards with upcoming languages as seedlings/sowings. Root selects favorites and shows variants. Active round: `desktop-v2/refinements-2026-09-06/language-garden/README.md`. Preserve all earlier mocks and live baseline; no implementation requested in this exploration.

**Latest selected mock:** user delegated an autonomous ImageGen → visual critique → refinement loop developing card variant 3. Root selected iteration 7 after seven cycles. See `desktop-v2/refinements-2026-09-06/card-refinement/README.md` and `selected.png`. Compact modern cards, irregular overlap, small clipped olive-leaf details, original text. This is the root-selected visual target, not yet implemented; the live paper-index baseline remains intact. No fixed option count or user-selection pause was required.

**Latest steering:** user prefers the Manuscript slips image (`/Users/user/Desktop/download-1.png`) and requests five further card-based ImageGen variants: contemporary cards, not vintage; one variant with small on-card decoration and one with a light object behind the cards. Current round lives in `desktop-v2/refinements-2026-09-06/card-variations/`. Preserve the live paper-index baseline during this exploration; do not interpret the reference preference as selecting a final implementation.

Read `docs/rfcs/active/globoox-editorial-2026/desktop-v2/refinements-2026-09-06/README.md` after the Desktop V2 direction. User rejected the generated ornate book/bookmarks as “too AI-looking.” The simple paper language index is retained as a BASELINE ONLY; user says “not quite it, keep searching.” Preserve that baseline while exploring further ImageGen compositions. It is not final design approval. Founder cards now borrow the original compact 78px portrait layout, explicitly requested by the user.

# Current design authority — Desktop V2

Read `docs/rfcs/active/globoox-editorial-2026/desktop-v2/DIRECTION.md` FIRST. User rejected the earlier level of finish and requests one exceptional1440px desktop view, ImageGen mockups for EVERY section before implementation, better founder cards, light screen framing, separate controls ABOVE the screen, and a redesigned how-it-works interaction. Responsive refinement is deferred. Root selects/iterates as art director autonomously. Existing copy/block/media/icon rules remain; a small additive eyebrow is now allowed. V2 implementation and desktop QA are now complete: read `docs/rfcs/active/globoox-editorial-2026/desktop-v2/QA.md` and use `desktop-v2/evidence/*-final.png`. Earlier V1 “complete/passed” notes and mobile captures are historical, not current visual authority.

# Active Globoox landing redesign — read after every context compaction

For the landing redesign requested on 2026-09-05, read `docs/rfcs/active/globoox-editorial-2026/DIRECTION.md` before design or implementation work.

- The user's prompt, supplied conceptual images, captured Muse reference, new moodboard and design brief are PRIMARY design authority.
- Existing project design, brandbook, old planning material and landing backups are SECONDARY visual references only. Do not revert this redesign to old styling.
- Existing code remains authoritative for routes, truthful functionality/content and current landing block order.
- Preserve current `/en` structure: Header → hero → how-it-works → quality → languages → team → start → Footer; cookie consent is an overlay. Legacy `/landing` is not the canonical structure.
- Implement only at `/landing-editorial`, with separate components, CSS Module styles and assets. Do not modify the app, shared styles or existing landing pages. The one documented infrastructure exception adds this route to the existing analytics-consent path matcher in src/instrumentation-client.ts; original path behavior remains unchanged.
- Product screens supplied by the user are AI-generated concepts, NOT evidence of implemented features. Use actual existing recordings/screenshots for product demonstrations; the generated reader is archived composition inspiration only.
- Preserve all existing docs and user edits. The pre-existing edit to `docs/rfcs/active/billing-entitlements-and-translation-access.md` is outside this task.
- Complete research, screenshot-based moodboard, specific brief, implementation, responsive/interaction QA and durable documentation before handoff. Track current state in DIRECTION.md.

## User correction — mandatory, 2026-09-05

DO NOT rewrite any original Globoox landing text. Preserve `getLandingMessages('en')` marketing copy verbatim: original hero, all headings/descriptions, 3 steps, comparison sample, languages, team, CTA, footer and navigation. Change presentation only. Use the existing project app icon (`public/icon.svg`) for brand identity. This supersedes shortened/rephrased copy in earlier brief or generated mock. Generated mock is composition-only reference; its invented copy MUST NOT ship.

## Latest user correction — use actual product evidence

Use the existing product screen recordings in `public/screenrecordings/` and actual screenshots in `public/images/how-it-works/`. The polished conceptual reader is not implemented in the actual product. Do NOT ship it as the landing's product demonstration. Preserve the new art direction and original copy, but replace fabricated product screens with real videos/screenshots. User supplied this steering after seeing the first implementation. Generated botanical framing is still approved; generated screen and book cover are concept/reference artifacts only.

## Completed implementation and evidence

The isolated landing is implemented. Read `docs/reference/product/landing-editorial.md` for current behavior and `design-qa.md` for final evidence. Final screenshots end in `-final.png`; initial screenshots and `hero-concept.png` are historical, not final product authority. The existing backup-route TypeScript failures are outside this redesign.
