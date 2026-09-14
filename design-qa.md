**Current implementation — pricing, Languages and CTA balance, 2026-09-13:** Pricing now uses separate shared-style frames with18px desktop/22px vertical gaps and balanced56/52/48px numeric prices. Lower-left art follows the whole group: Free horizontally, Editorial when stacked; it sits lower with an outward desktop offset and a viewport clearance limit on narrow screens. Upper-right−30° placement/assets remain. Language labels move4px down; upcoming copy is left of seedlings. Bottom Upload your first book CTA has no arrow. Nine-width pricing review, seven-width Languages review, fresh-mobile/expansion checks and scoped lint/TypeScript passed. Current authority: `docs/rfcs/active/globoox-editorial-2026/desktop-v2/pricing-language-balance-2026-09-13/README.md`. Preserve canonical words, type families, clean Quality/CTA, navigation, all prior artifacts and unrelated edits. Existing project visuals remain secondary. No deploy.

**Current implementation — cleaner Quality/CTA, larger navigation/footer, 2026-09-13:** Quality and the bottom CTA render NO botanical art. Assets and prior compositions are retained for reuse in `docs/rfcs/active/globoox-editorial-2026/desktop-v2/chrome-cleanup-2026-09-13/retired-artwork.md`; do not delete them as unused. Header menu is16px (15px compact desktop /18px expanded menu), Open App has more separation, logo icon is28px and wordmark is lowered3px. Footer copyright/Back to top are16px with a vertical arrow. Menu compacts at1200px and collapses at1000px, while header heights still change at900px. Upper-right pricing sprig now rotates counterclockwise30° and follows the corner; this expressly supersedes its old placement lock. Asset pixels and lower-left pricing art remain unchanged. Final authority and screenshot QA: `docs/rfcs/active/globoox-editorial-2026/desktop-v2/chrome-cleanup-2026-09-13/README.md`. Original words/type families/media, other blocks and latest static menu-transit behavior remain. Existing project visuals are secondary. Preserve all historical artifacts and unrelated edits. No deployment.

**Current implementation — static menu travel and botanical reassignment, 2026-09-13:** Menu navigation temporarily compacts How it Works into one static section and compensates scroll position before paint; the rejected 3× sticky transit below is history. Manual Stack remains, with a small permanent blank tail only on tall screens. CTA now uses the generated conifer/cones and seedpod pair from the exact early mock. Its old pair is preserved unchanged in Quality (margins on wide desktop, complete silhouettes below at ≤1350px). Pricing lower-left uses the new tangential three-leaf sprig; upper-right image, JSX and CSS are locked and unchanged. Current authority, prompts and evidence: `docs/rfcs/active/globoox-editorial-2026/desktop-v2/static-navigation-botanicals-2026-09-13/README.md`. Eight-width illustration review plus boundary captures, nine navigation routes/cancellations, lifecycle/manual checks, scoped tests/lint/TypeScript and preservation hashes passed. Existing typography/canonical copy/media/isolated route remain. Existing project visuals are SECONDARY; preserve all historical artifacts and unrelated edits. No commit, push or deployment.

**Menu travel refinement — implemented, 2026-09-13:** navigation smoothly accelerates through the desktop How it Works sticky interval (3× core speed, eased boundaries) in both directions, keeping document geometry and frozen Stack. Direct visits prepare Step1 before arrival; manual scrolling remains unchanged. Four-width/20-trip browser checks, interruption, remaining menu targets, six route tests and scoped lint/TypeScript passed. This supersedes native menu-scroll timing only. Current evidence: `docs/rfcs/active/globoox-editorial-2026/desktop-v2/navigation-transit-2026-09-13/README.md`. Preserve prior artifacts, canonical copy, isolated route and current typography; existing project visuals stay secondary. No deploy.

**Current Quality tracking refinement — implemented, 2026-09-13:** Russian comparison prose now uses Source Serif470 and−0.15px tracking; size20.2px, baseline and32px leading remain. English and Russian chapter typography are unchanged. Desktop preview6/6 lines; full390px40/40; full desktop still14/13. Nine-width measurements and visual/control checks passed. This supersedes the prose450/normal-spacing setting below. Current evidence: `docs/rfcs/active/globoox-editorial-2026/desktop-v2/font-tracking-2026-09-13/README.md`. Original copy, isolated route and all prior artifacts remain; existing project visuals stay secondary. No deploy.

**Quality optical typography — implemented, 2026-09-11:** Russian comparison prose/chapter now use Source Serif 4; English prose retains Newsreader with calibrated optical size, weight and baseline. Mobile Russian prose uses native dictionary hyphenation; canonical copy is unchanged. Full excerpt: 14/13 lines at1440px, 41/40 at390px. Nine-width visual review, actual-font verification, text equality, stable wipe geometry and controls passed. Current authority: `docs/rfcs/active/globoox-editorial-2026/desktop-v2/font-optical-2026-09-11/README.md`. Earlier EB Garamond recommendation and discussion-only notices are superseded. Other typography, real media, interaction code, route isolation and block structure remain. Existing project visuals stay secondary; preserve all history and unrelated edits. No deploy.

# Latest illustration and Quality review — 2026-09-10

Visual scope passed. The old lower Free sprig is rejected and superseded; Quality now uses a wipe slider with Hide/Show translation. See [current detailed QA](docs/rfcs/active/globoox-editorial-2026/desktop-v2/illustration-quality-2026-09-10/design-qa.md) for all three before/after comparisons, eight-width matrices, interaction evidence and existing check limitations. Preserve earlier reviews below as history; their aesthetic approval of the old Free sprig no longer applies. No deploy.

---

# Latest pricing/footer refinement QA — 2026-09-10

All evidence filenames below are in [`pricing-refinements-2026-09-10`](docs/rfcs/active/globoox-editorial-2026/desktop-v2/pricing-refinements-2026-09-10/README.md).

**Final result: passed**

No actionable P0/P1/P2 findings remain in the requested changes. The visual target is the previous pricing implementation plus the user's four explicit amendments; the older ImageGen option is not authority for keeping Current Plan, one sprig or 4px pricing corners.

## Comparison and review

- Before: `pricing-before.png`; after: `pricing-1440-settled.png`. Both are 1440×1024 CSS/pixel screenshots, DPR1, English light theme, pricing below the sticky header, Premium notice closed.
- `pricing-before-after.png` puts both states together at equal size; opened and directly compared. Macro layout, existing typography, original upper sprig, allowance copy, button positions and centered note are preserved. Changes are the requested CTA label, second lower-left botanical and harmonized external frame.
- Full-size source/render screenshots were also opened. No further crop was needed for the small illustration and outline: they were readable at full size, and computed styles provide exact border/radius/shadow verification.
- `footer-before.png` versus `footer-desktop.png` confirms removal of the footer logo, with original mission text now occupying the left column's start. Copyright and the remaining Back to top action are preserved. `footer-mobile.png` confirms the same at390px. The icon in Start is a separate block and intentionally stays.
- Earlier rapid viewport captures sometimes occurred during font/layout settling. `*-settled.png` files are authoritative where present. They were recaptured after fonts loaded and viewport reflow settled; no CSS change was needed for this capture timing issue. All earlier images remain historical evidence.

## Fidelity surfaces

- **Typography/content:** actual Newsreader and DM Sans loaded; no font/size rewrite. Free reads exactly “Start for free” and keeps `/my-books`. Other marketing/pricing words unchanged. Note remains centered.
- **Framing/spacing:** hero, Quality, pricing and desktop/mobile walkthrough now compute the same `1px solid rgb(201,199,185)`, `10px` corners and two-layer shadow. Variables live only in the editorial page stylesheet. Pricing internal rules remain lighter; section dimensions and motion logic are unchanged.
- **Color:** existing warm paper, forest ink and sage Premium remain. The original hero shadow was extracted without changing its appearance, then reused for the other panel outlines.
- **Artwork:** existing upper sprig unchanged. New complementary ImageGen PNG uses a near-white RGB background with CSS multiply; it is not an alpha asset. Inspected against both warm paper and the sage Premium surface: no visible checkerboard, halo or white rectangle. No code-made illustration or background cutout.
- **Interaction/accessibility:** both botanicals have empty alt, aria-hidden and pointer-events:none; no decorative focus target. Free label/href and zero footer images verified in DOM. Existing Premium flow and footer Back to top handler remain unchanged. Scoped ESLint passed, no browser console errors, diff whitespace check passed.

## Responsive positioning

Viewed pricing at320,390,768,800,801,901,1100 and1440px. All captured widths have document scroll width equal to viewport width. Both images load and stay visible. Free owns its lower sprig, so it remains attached to that plan after the grid stacks at800px.

- Desktop lower sprig:90×120 CSS box, left−28/bottom−80 relative to Free; left−16 below1101px.
- Mobile lower sprig:72×100, left−12/bottom−68. Tips begin below the Free button, while its stem crosses the lower-left border into empty margin beside Premium.
- Bounding boxes do not overlap the Free action or Premium heading at any tested width. Minimum vertical box clearance from Free button:4px on mobile,6px on compact desktop; visible art has additional internal white margins.
- At801px, lower sprig right edge is107px; actual centered note glyphs begin at226.5px. No overlap with the note despite its wider paragraph container.
- Desktop/tablet/mobile frame examples were opened: `hero-frame.png`, `quality-frame.png`, `walkthrough-frame.png`, `walkthrough-mobile-frame.png`.

No full checkout/backend test was appropriate: this request changes presentation and a link label only. The known repository-wide TypeScript/older documentation failures from the previous round are outside this change; no billing file was edited. No commit, push or deployment.


---

# Pricing implementation QA — 2026-09-10

**Final result: passed**

No actionable P0/P1/P2 findings remain in this scoped pricing implementation. Premium checkout remains unavailable as already established in the product; its honest frontend response is verified. This is not a billing-release or full-site accessibility certification.

## Comparison state and evidence

- Source truth: [option 4](docs/rfcs/active/globoox-editorial-2026/desktop-v2/pricing-footer-2026-09-10/04-shared-paper-refined.png), with user amendment to center the small bottom note like option 1.
- Implementation: `/landing-editorial#pricing`, collapsed Premium notice, English marketing content, light theme, sticky header visible.
- Source PNG: 1487×1058. Normalized proportionally with contain to 1440×1024; negligible edge padding. Render: 1440×1024 CSS px and screenshot pixels, deviceScaleFactor 1. No browser/device frame included.
- Initial comparison: [comparison-initial.png](docs/rfcs/active/globoox-editorial-2026/desktop-v2/pricing-implementation-2026-09-10/comparison-initial.png), source left/render right.
- Post-fix comparison: [comparison-final.png](docs/rfcs/active/globoox-editorial-2026/desktop-v2/pricing-implementation-2026-09-10/comparison-final.png), source left/render right. Both were opened as combined images and judged directly.
- Final implementation: [desktop-final.png](docs/rfcs/active/globoox-editorial-2026/desktop-v2/pricing-implementation-2026-09-10/desktop-final.png), opened separately at full size for typography and fine illustration-edge inspection. No additional focused crop was needed: individual 1440px screenshots made the pricing labels, borders, footnote and 110px decoration readable. The combined comparison established proportions, then full-size source/render views confirmed details.

## Comparison history

| Iteration | Finding | Correction and evidence |
| --- | --- | --- |
| Initial — blocked | P2: heading/body/actions too small; table approximately 421px high instead of roughly 451px in normalized mock. | Heading 60→72px, body 18→20px, names 34px, actions 16px; adjusted price area/card padding to produce a 455px shared table. |
| Initial — blocked | P2: missing botanical while asset generation was pending; browser cached the initial missing asset. | Generated/extracted a real transparent PNG, rejected RGB checkerboard version, verified direct and optimized URLs, reloaded cache and inspected real cream-background rendering. |
| Implementation review — blocked | P2: Premium feedback below the entire group would be missed on mobile. | Moved feedback directly beneath Premium button; [mobile-premium-notice.png](docs/rfcs/active/globoox-editorial-2026/desktop-v2/pricing-implementation-2026-09-10/mobile-premium-notice.png) shows the complete response in view. |
| Post-fix — passed | No substantive drift left. Intro initially wrapped “professional editor” across lines. | Explicit desktop line break after the comma; normal responsive wrapping on mobile. Re-captured `desktop-final.png` and `comparison-final.png` after this correction. |

## Required fidelity surfaces

- **Typography:** confirmed loaded `Editorial Newsreader` / `Editorial DM Sans`, no fallback substitution; regular display weight and sage italic retained. Hierarchy and line breaks follow the source. Approved existing fonts take precedence over imprecise generated letterforms. Small explanatory text is intentionally quieter/centered as requested.
- **Layout:** 1200px table at x120, three aligned columns and 54px controls at 1440px. Shared fine border, 4px radius, no invented card shadows. Sprig has clear space from labels/buttons. At 801px all three buttons share the same y-position and remain 192–193px wide. Pricing is inserted between Team and Start; prior relative order is unchanged.
- **Colors:** existing paper #f7f5ed, forest #20382f, muted #657060 and sage #718168 retained. Premium uses flat #edeee4 rather than copying ImageGen's accidental surface gradient. Forest CTA and muted text remain legible. Decorative borders are intentionally subtle.
- **Imagery:** real existing app icon, new three-leaf botanical matching the selected subject and Languages drawing manner. Full silhouette, contained aspect ratio, no visible rectangle/checkerboard/halo on page. No CSS/SVG approximation or fake product media.
- **Copy:** selected pricing heading/description/plans/allowances retained, cross-checked against approved billing working copy. Note centered without generator-added “Note:”. Existing marketing messages remain unchanged. No invented plan features or trial.

Acceptable deviations: existing live header includes the newly useful Pricing link; UI uses actual project fonts; Premium fill is flat; bottom note follows the explicit option-1 amendment. Mobile stacking is a responsive extension because the source mock is desktop-only. Next development badge appears in captures and is not production content.

## Responsive and interaction verification

| Width | Visible result |
| --- | --- |
| 320 | Two-line display heading, three vertically stacked plans, no overflow, 222×54px actions. |
| 390 | Compact single-line heading; complete first plan. Premium response and Editorial/note captured separately. |
| 768, 800 | Single 600px-wide group; 340px actions, clear decorative corner. |
| 801 | Three-column layout starts; prices, labels and buttons fit without overlap. Mobile navigation remains appropriate. |
| 901 | Full desktop navigation including Pricing fits on one line; cards and note remain aligned. |
| 1100, 1440 | Shared comparison surface, consistent rhythm and centered explanation. |

All eight widths visually reviewed. Measured document scroll width equals viewport at every responsive loop width; no pricing descendant extends beyond viewport. This checks the pricing change, not a rerun of the previous hero/device matrix.

- Desktop Pricing click from hero produced many intermediate scroll positions over approximately 1.48 seconds, arrived with section top about120px below the sticky header and cleared the navigation pause flag. No abrupt jump.
- Mobile menu Pricing click closed the menu and arrived with about108px header clearance.
- Free link points to existing `/my-books`; Editorial link has the existing support mailto. Hrefs verified; no email sent and no payment flow invoked.
- Pointer Premium activation sets `aria-expanded=true`, shows a polite live-region response under the button and releases pointer focus. At 390px response bounds were y435–498 in the viewport.
- Keyboard Tab reaches Get Started with a visible 2px outline; Enter opens the same message and retains keyboard focus. No new animation introduced; reduced-motion disables button transition.
- No browser console errors after final reload.

## Code checks and limits

Scoped ESLint passed for PricingSection and EditorialLanding. Independent read-only component review found no remaining blockers after the mobile feedback fix. Full `tsc --noEmit` reports 12 existing diagnostics in duplicate generated route declarations and backup landing components; none in the new pricing files. No global or original landing fixes were attempted. `git diff --check` passed at handoff. Documentation validation passes for this round after adding required metadata and portable asset provenance; the full docs check still reports nine older missing-frontmatter issues in other motion/mobile rounds.

Checklist: source/render compared; first-pass drift corrected and re-compared; artwork inspected on page; all pricing content/states checked; desktop/mobile navigation checked; responsive captures saved; durable authority updated. No deployment, push or commit.


---

# Latest scoped QA — menu text, 2026-09-10

Menu +1px passed browser review at1440px,901px and320px open mobile menu; no horizontal overflow or console errors. Diff whitespace check passed. Footer is audit-only and pricing results are ImageGen concepts, not implemented QA. [Current evidence](docs/rfcs/active/globoox-editorial-2026/desktop-v2/pricing-footer-2026-09-10/README.md). No deploy.

# Latest QA — Stack only, 2026-09-10

Passed scoped lint, exact Stack equivalence across1,001 progress samples and browser boundary/reverse/desktop layout checks. [Evidence and archived alternative](docs/rfcs/active/globoox-editorial-2026/desktop-v2/stack-only-2026-09-10/README.md). Left selection is discrete; Fade/Stack controls are removed. Mobile retains its approved portrait/sticky behavior. No deploy.

# Latest QA — mobile portrait option 1, 2026-09-10

**Final result: passed for the mobile portrait implementation.** Selected ImageGen source and actual render compared side by side. Native heading pins through Steps1–2 and is pushed away by Step3;35 measured mobile scroll states across five sizes plus801/1440px desktop regression views, and390px detailed captures reviewed. Full real788:1705 images, original copy/fonts and desktop motions preserved. [Current evidence](docs/rfcs/active/globoox-editorial-2026/desktop-v2/mobile-portrait-implementation-2026-09-10/design-qa.md). Scoped lint/diff pass; existing unrelated generated-route and backup-page TypeScript failures remain. Earlier square mobile evidence is superseded. No deploy.

# Latest QA — Fade / Stack comparison, 2026-09-10

**Final result: passed for the implemented comparison.** Fresh Chrome browser verification covers both linear scroll modes, stops/reverse motion,38 desktop states across five viewports, three mobile episodes, keyboard and menu navigation. [Current evidence](docs/rfcs/active/globoox-editorial-2026/desktop-v2/walkthrough-motion-options-2026-09-10/design-qa.md). Scoped lint/diff and independent mapping checks pass; whole-project TypeScript still has unrelated generated-route/backup-page errors. Prior blocked QA below is historical. No deploy.

# Latest QA — scroll-driven fades, 2026-09-10

**final result: blocked**

Code updated from timed fades to scroll-position-driven opacity. ESLint and diff checks passed; local HTTP200. Browser verification could not run because the updated plugin worker imports the removed prior browser-service.mjs path. [Current verification status](docs/rfcs/active/globoox-editorial-2026/desktop-v2/walkthrough-scroll-fade-2026-09-10/design-qa.md). Previous passing QA below covers earlier implementations only.

# Latest QA — mobile vertical walkthrough, 2026-09-08

**final result: passed**

Selected source: `docs/rfcs/active/globoox-editorial-2026/desktop-v2/mobile-walkthrough-imagegen-2026-09-08/01-vertical-episodes.png`. [Full current QA report](docs/rfcs/active/globoox-editorial-2026/desktop-v2/mobile-walkthrough-implementation-2026-09-08/design-qa.md) records source/browser side-by-side comparisons for all three390px steps, eight widths320–1440, low-height390×600, typography/layout/colors/media/copy review, fixed spacing/recompression findings, original-copy preservation, native desktop scroll sequence and menu navigation. [Evidence gallery](docs/rfcs/active/globoox-editorial-2026/desktop-v2/mobile-walkthrough-implementation-2026-09-08/index.html). ESLint passed; whole-project TypeScript remains blocked by unrelated backup-route/generated-route errors. Existing local PostHog missing-token messages remain. No deployment. Earlier QA below is preserved as history.



**Latest correction — smooth navigation and pointer focus, 2026-09-08:** user rejected instant jumps. Menu/home links now scroll smoothly while walkthrough steps are paused; normal step tracking resumes on arrival or input interruption. Pointer-clicked demo tabs blur; pointer-opened language selector avoids a stuck ring, including Escape dismissal; keyboard focus remains visible. [Implementation](docs/rfcs/active/globoox-editorial-2026/desktop-v2/smooth-navigation-2026-09-08/README.md) · [Browser evidence](docs/rfcs/active/globoox-editorial-2026/desktop-v2/smooth-navigation-2026-09-08/design-qa.md). Earlier instant-navigation claims below are superseded history. Current visual design/copy/media/botanicals remain; isolated route only, no deploy/push.



**Latest controls/navigation update — 2026-09-08:** hero CTA arrow removed; sticky header now has a1px divider aligned to its inset inner container. How it works switches its three original steps/screens with native page scroll in both directions; its inner composition sticks below the header. Manual/keyboard step shortcuts remain. Menu and home links jump directly to targets, bypassing the walkthrough sequence. Desktop/mobile scroll, all desktop destinations, keyboard and low-height fit visually/browser verified. [Current implementation](docs/rfcs/active/globoox-editorial-2026/desktop-v2/scroll-walkthrough-2026-09-08/README.md) · [QA](docs/rfcs/active/globoox-editorial-2026/desktop-v2/scroll-walkthrough-2026-09-08/design-qa.md). Latest botanical lower-only fade remains; prior click-only walkthrough descriptions below are history. Preserve original words/media/fonts/block order and isolated route. Existing project visuals are secondary. No push/deploy.



**Latest correction — 2026-09-08, natural tops and lower fade:** user rejected the prior upper crop/fade. Now BOTH fixed-size plants retain natural tops; minimum top offsets lower them beside short recordings. Only the last100px above the frame bottom fades, behind the opaque demo; nothing protrudes below. All15 cells visually reviewed again, plus320px extras and separate boundary measurements. [Current rules](docs/rfcs/active/globoox-editorial-2026/desktop-v2/hero-bottom-fade-2026-09-08/README.md) · [New15-cell gallery](docs/rfcs/active/globoox-editorial-2026/desktop-v2/hero-bottom-fade-2026-09-08/index.html) · [QA](docs/rfcs/active/globoox-editorial-2026/desktop-v2/hero-bottom-fade-2026-09-08/design-qa.md). Prior matrix screenshots and upper-mask approval claims below are superseded history. Preserve all earlier artifacts. Original words/fonts/italic/sage/media/icon/section order and isolated route remain. Existing project visuals stay secondary. No push/deploy.



**Current authority — 2026-09-08:** BOTH full-size branches are now visible in all15 device × width-band cells. Root visually reviewed a labeled screenshot for EACH cell; see [current matrix and rules](docs/rfcs/active/globoox-editorial-2026/desktop-v2/hero-matrix-2026-09-08/README.md), [15-cell gallery](docs/rfcs/active/globoox-editorial-2026/desktop-v2/hero-matrix-2026-09-08/index.html) and [QA](docs/rfcs/active/globoox-editorial-2026/desktop-v2/hero-matrix-2026-09-08/design-qa.md). Fixed240×480 mirrored ginkgo /320×640 grass; composition uses offsets, frame occlusion and clipping, never hiding or miniaturizing. Narrow Desktop/Tablet frame widths reserve botanical margins. Extra320px views and boundary geometry are separate checks. Prior39 meant geometry measurements, not39 visual matrix cells; previous hiding rules and full-coverage claims below are superseded history. Preserve original copy/fonts/italic/sage, real media/icon, block structure, sticky header, initial/manual device logic and all artifacts. Existing project visuals remain secondary. No deploy/push.

# Current botanical composition QA — 7 September 2026

**final result: passed**

The left ginkgo is mirrored. Full-size240×480 /320×640 botanicals now anchor to each selected recording, with device × breakpoint visibility/overlap rules. The user-rejected miniature approach is archived, not current design authority. [Full current QA](docs/rfcs/active/globoox-editorial-2026/desktop-v2/hero-botanical-layout-2026-09-07/design-qa.md) · [composition matrix](docs/rfcs/active/globoox-editorial-2026/desktop-v2/hero-botanical-layout-2026-09-07/README.md) · [Desktop](docs/rfcs/active/globoox-editorial-2026/desktop-v2/hero-botanical-layout-2026-09-07/desktop-final.png) · [wide Phone](docs/rfcs/active/globoox-editorial-2026/desktop-v2/hero-botanical-layout-2026-09-07/1440-phone.png) · [narrow Phone](docs/rfcs/active/globoox-editorial-2026/desktop-v2/hero-botanical-layout-2026-09-07/390-phone.png).

All39 combinations of three selected devices at13 widths passed geometry checks: no horizontal overflow, no unwanted scaling, correct visibility. Root and independent visual review passed composition; a loading-state capture was replaced with a ready, playing recording. Scoped lint/TypeScript and documentation validation pass. No production-build or deployment claim. Earlier reports remain historical for their revisions.

---

# Current hero implementation QA — 7 September 2026

**final result: passed**

The selected ginkgo hero with the requested meadow grass is implemented at `/landing-editorial`. [Full current QA](docs/rfcs/active/globoox-editorial-2026/desktop-v2/hero-implementation-2026-09-07/design-qa.md) records source normalization, all five fidelity surfaces, measured 1440×1100 geometry, corrected findings, generated asset provenance, sticky/anchor checks and initial device detection. [Final screenshot](docs/rfcs/active/globoox-editorial-2026/desktop-v2/hero-implementation-2026-09-07/desktop-final.png) · [normalized comparison](docs/rfcs/active/globoox-editorial-2026/desktop-v2/hero-implementation-2026-09-07/comparison-final.png).

Original copy, Newsreader/DM Sans, italic/sage emphasis, real app media and icon are preserved. Initial Phone/Tablet/Desktop selection passes both media-query boundaries; manual selection survives resizing. Sticky header and mobile menu pass; scoped ESLint/TypeScript and documentation validation pass. No open P0/P1/P2 in this hero revision. Local analytics logs a missing-token configuration error; no hero runtime exception observed. No production-build claim, deployment or push. Earlier reports below remain history for their respective revisions.

---

# Current language composition QA — 7 September 2026

**final result: passed**

User feedback supersedes the previous mini-card composition. The corrected isolated block uses a compact tree/card assembly, independently aligned copy, and two18px upcoming-language rows with small growing sprouts on the left. [Full current QA](docs/rfcs/active/globoox-editorial-2026/desktop-v2/refinements-2026-09-07/design-qa.md) records the amended ImageGen source,1440×935CSS/pixel browser evidence atDPR1, normalized full/focused comparison, all five fidelity surfaces, corrected findings and residualP3 notes. [Final screenshot](docs/rfcs/active/globoox-editorial-2026/desktop-v2/refinements-2026-09-07/desktop-final.png) · [combined comparison](docs/rfcs/active/globoox-editorial-2026/desktop-v2/refinements-2026-09-07/comparison-final.png).

All current/future names and original copy preserved; six image instances load; Languages anchor works; no1440px horizontal overflow; scoped ESLint/TypeScript pass. NoP0/P1/P2 remain in this revision. Mobile refinement deferred. Prior checkpoint committed as0d22c81 before editing; no push/deploy. Previous reports below remain historical for the language block.

---

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
