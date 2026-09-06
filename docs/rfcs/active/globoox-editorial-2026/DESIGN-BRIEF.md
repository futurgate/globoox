---
type: rfc
status: implemented
owner: design-engineering
last_verified: 2026-09-05
---

# Globoox — The reading room

## Design authority

This is the specific design brief for the September 2026 landing experiment. The latest user instructions, captured Muse reference and [moodboard](moodboard.html) guide presentation. **Actual product recordings/screenshots are the sole product-demonstration authority.** Supplied AI concepts are composition inspiration only. Existing brandbook, old plans and landing backups are SECONDARY visual references; this does not demote the real product media, original copy, app icon, or block sequence. Read [DIRECTION.md](DIRECTION.md) after compaction.

**Presentation only: preserve all original `getLandingMessages('en')` marketing text verbatim and use the existing `public/icon.svg` app icon.** No new tagline, shortened headline, rewritten description, or replacement logo is proposed. “The reading room” is an internal design-study name. This user correction overrides all wording and brand marks visible in the generated concept image.

**Final product-evidence correction: use the existing videos in `public/screenrecordings/` and screenshots in `public/images/how-it-works/`. Do not ship the fictional reader or generated book cover.** The botanical frame remains decorative art, never product evidence. All earlier instructions to implement an invented reader demonstration are superseded.

## Objective and audience

Make a reader feel: “I can finally read that book in my language, in a place I want to spend time.” Address curious multilingual readers, people reading outside their first language, and people discovering books across cultures. Make the experience understandable through a large, legible recording of the real app. The main action opens the existing app to upload a first EPUB.

## Evidence and current-page improvements

The current `/en` [hero capture](references/globoox-current-hero.png) shows a long heading, a small portrait reader and a large amount of unstructured empty space. The screen text is tiny at desktop size, and the translation relationship is not visible without further exploration. Retain the heading exactly; improve its measure, line breaks, type treatment, and relationship to the screen.

1. Preserve the full original hero title, “Globoox — reading app that instantly translates e‑books into your native language.” and the original “Upload your first book” CTA. Adapt typography, line wrapping, spacing, and product scale around them. The earlier short-headline proposal is superseded.
2. Enlarge the actual desktop recording into the hero's main surface, with the real tablet and phone recordings available through keyboard-accessible device tabs. Keep the source UI and aspect ratios intact. Provide Play/Pause and the existing poster for a stable fallback.
3. Use page margins intentionally: the fern and seed stem guide the eye inward around the actual recording. Their role is literary atmosphere. No illustration may cover product text, media controls, or click targets.
4. Reduce the current 2,450px walkthrough to a deliberate three-part sequence within the SAME block. Preserve upload → choose language → read and use the existing `1.1.webp`, `2.1-en.webp`, and `3-en-es.webp` screenshots. Keep enough source context to understand each action.
5. Present the original comparison excerpt with a **Show original** toggle. It shows or hides the original column while retaining the translation; it does not perform line-by-line highlighting. Preserve the original heading, description, book sample, and metadata verbatim.
6. Use the existing language list for a specimen that switches the large native language name (English, Español, Français, Русский), its code, and selected state. It does not translate a sample phrase. Preserve the original heading, description, future-language list, and “soon” wording exactly.
7. Keep all four real team members in current order, with large consistent portrait crops, names, roles and actual existing profile links. Avoid inventing testimonials, customer counts or credentials.
8. Give the original closing CTA and footer copy a quiet literary presentation. Preserve their text, roles, links, and the consent overlay.

## References and transfer

- [Muse](https://sudowrite.framer.website/muse): consistent paper/ink/materials, illustrated margins and annotation restraint; repeat one art language through the page. Do not copy its huge ring of text cards: Globoox's screen takes that position.
- [Craft](https://www.craft.do/): expressive serif and tactile context; use a clearer, earlier reader reveal with less collage.
- [Daylight](https://daylightcomputer.com/): botanical context makes technology feel quiet. Use natural-history marginalia, not a lifestyle photograph that hides the interface.
- [Readwise Reader](https://readwise.io/read): substantial product evidence. Borrow screenshot scale and visible reading actions, not the dark gradient or long feature inventory.
- [Bear](https://bear.app/): generous spacing, economical copy, restrained controls and readable device demonstrations.

See [RESEARCH.md](RESEARCH.md) for observed details and evidence limits.

## Immutable block map

Header → `hero` → `how-it-works` → `quality` → `languages` → `team` → `start` → Footer. Consent is an overlay. No testimonials, pricing, feature grid, FAQ or new marketing block. `/landing` is legacy and must not replace the canonical `/en` structure.

| Block | Art direction | Product evidence / interaction |
|---|---|---|
| Header | Existing app icon, quiet 1px bottom rule, unchanged brand name, compact sans navigation | Original navigation and action strings; anchors; accessible small-screen menu |
| Hero | Full original title with considered line wrapping, large real recording immediately below; organic edges outside the screen | Original CTA; actual desktop/tablet/phone videos; accessible device tabs and Play/Pause; original source posters |
| How it works | Three equal editorial columns on ivory, numbered 01/02/03, no pill-label clutter | Original upload, language, and translated-reading screenshots: `1.1.webp`, `2.1-en.webp`, `3-en-es.webp` |
| Quality | Spacious introduction and full-width presentation of the original comparison text | Show original toggle reveals/hides the original column; translation remains visible; no phrase highlighting |
| Languages | Forest-green interlude with an oversized native language name and four compact selectors | Selection updates the native language name, code, English label, and active state; no translated prose specimen |
| Team | Return to warm ivory, understated intro, four portrait columns | Real names, roles, LinkedIn links |
| Start | Quiet warm paper, generous type, limited botanical echo | Single upload CTA → `/my-books` |
| Footer | Thin rule, existing app icon, unchanged brand name, full original footer copy and year | Existing destinations and original link labels only; no invented legal pages |

## Design system

- Implemented palette tokens: paper `#f7f5ed`, pine ink `#20382f`, muted text `#687167`, sage text `#718168`, and rule `#dadfd2`. The language interlude uses `#233b30` with `#f0f0df` text. The moodboard's softer sage/copper swatches remain the research palette; implementation uses darker accents where text requires them. Colors inside actual source media remain unchanged.
- Type: locally served Newsreader for unchanged headings/original comparison text and DM Sans for landing body/media controls. At the verified 1440px desktop width the hero is 66px; at mobile widths up to 600px it is 43px. The shared h2 rule reaches 58px; individual sections use 48–56px desktop and 40–42px mobile. The closing CTA is a deliberate exception at 67px desktop / 49px mobile. Very wide screens at 1600px and above use a 70px hero. Serif weight 400 with real italic accents. Preserve the source-media typography.
- Grid: content container `min(1160px, 100% - 112px)`, with 56px desktop gutters until the max width is reached. Hero media stage is at most 1060px; its desktop frame is 960px wide around the 1280 × 820 source. Tablet/phone frames are 385px/250px desktop. Mobile content gutters are 21px and hero text gutters 23px; media stage gutters are 16px. Standard section padding is 108px desktop, 78px below 900px, and 62px below 600px, with explicit section-specific adjustments.
- Surfaces: large flat paper fields and hairline dividers. Elevation reserved for the hero reader and small contextual controls. Avoid rounded-card repetition.
- Product: real, unchanged recorded UI inside a quiet surrounding frame. No simulated sidebar, invented app buttons, generated cover, or replacement reading layout. Media controls have at least 40–44px touch targets when relevant. Choose the phone recording initially on narrow screens while preserving manual device selection.
- Motion: the actual muted recording may play when visible, with explicit Play/Pause and a poster fallback. Pause offscreen/hidden content; honor reduced motion by defaulting to a still until the user chooses Play. No mandatory scrolling animation or parallax.
- Accessibility: semantic landmark/heading order, native buttons/selects where practical, visible focus ring, keyboard operation, descriptive image alternatives, decorative imagery hidden from assistive technology, no horizontal overflow.

## Image policy and provenance

The five supplied app images are AI-generated CONCEPTS. They do not establish supported PDF/MOBI formats, new languages, offline features, account controls, app release status or implemented settings. Keep them as historical visual studies; use actual recordings/screenshots in the shipped landing.

[hero-concept.png](hero-concept.png) is an archived AI-generated **composition-only** study. Only its broad placement, paper tone, and natural-history framing remain relevant. Its fictional product screen, generated book cover, headline, supporting copy, navigation, CTA wording, and replacement icon are superseded and must not ship. The real layout uses actual product media, full original marketing copy, and `public/icon.svg`. The moodboard states this next to the image and in its viewer.

Generated asset: `public/redesign/botanical-frame.png`, built-in ImageGen, 2026-09-05, 1536×1024 transparent PNG. Final slot: decorative margins outside the actual hero recording. Left bracken fern and right fine seed stem establish asymmetrical inward framing. The generated alpha is retained. This is decoration only, and no generated product screen or book cover is used as evidence.

Prompt: “Create a finished botanical marginal illustration asset specifically for the Globoox bilingual ebook reader landing page, inspired by 19th-century natural-history engravings accompanying Charles Darwin's Voyage of the Beagle. Transparent PNG, 1536×1024. Empty transparent center 70%; bracken fern lower left; slimmer botanical seed stem lower right; fine copperplate etching, sage watercolor, desaturated olive gray, faint copper seed tips. No text, UI, border, opaque backdrop, shadow, tropical leaves or thick outlines. Frame the reading demonstration without competing with it.”

This is the historical generation prompt, preserved for provenance. Its original imagined Darwin reader placement is superseded by the actual product-recording placement above.

## Final product-media manifest

| Slot | Existing source | Existing poster / still |
| --- | --- | --- |
| Desktop hero | `public/screenrecordings/mac_screen_record_1280w_h264.mp4` | `public/images/device-posters/mac.webp` — 1280 × 820 |
| Tablet hero | `public/screenrecordings/ipad_screen_record_768x1170_h264.mp4` | `public/images/device-posters/ipad.webp` — 768 × 1170 |
| Phone hero | `public/screenrecordings/iphone_screen_record_540x1170_h264.mp4` | `public/images/device-posters/iphone.webp` — 540 × 1170 |
| Upload step | `public/images/how-it-works/1.1.webp` | Actual upload modal over the library |
| Language step | `public/images/how-it-works/2.1-en.webp` | Actual EN/RU/ES/FR language menu |
| Reading step | `public/images/how-it-works/3-en-es.webp` | Actual Spanish translated reading view |

All six stills were inspected. They are copied unchanged into this study's `references/` directory for the portable moodboard; production continues to use the original public paths.

## Delivery and isolation

Implemented route `/landing-editorial`, components under `src/components/landing-editorial/`, local CSS Modules, and assets in `public/redesign/`. Existing visual styles, shared landing components, original routes, and reading app remain unchanged; no backend changes. CTAs use the current app destinations and preview metadata is noindex.

The sole shared infrastructure exception is `src/instrumentation-client.ts`: `landing-editorial` was added to the existing landing-consent regex so analytics are gated before route hydration. Existing path behavior is preserved, and the isolated consent presentation reuses the existing consent utility/API.

## Delivered and verified

Visual moodboard, inspected references, brief, isolated route, and final screenshot evidence are complete. Original-copy verification passed 59/59 strings; the canonical block order is preserved. Responsive checks passed at 320, 390, 768, 1024, and 1440px without horizontal overflow. Keyboard device tabs, Play/Pause, screenshot dialog, mobile menu, Show original, and native-language-name selection passed.

Scoped lint and TypeScript passed with no errors; all 30 existing tests passed. Production webpack compilation succeeded. The production build remains blocked by an unrelated pre-existing TypeScript error: missing `compare` on `QualityAssuranceV2` at `src/app/landing-backup-2/page.tsx:66`. See [design-qa.md](../../../../design-qa.md) for the full verification record and limitations.

## User correction — authoritative revision

The user first required original text and the existing icon to remain unchanged, then required the existing real product videos/screenshots to replace the fictional reader. The active recommendations above incorporate both corrections. Earlier shortened copy, invented reader UI, and generated cover proposals are retained only as archived study artifacts. Additional interface labels are limited to necessary media controls; they do not replace marketing copy.
