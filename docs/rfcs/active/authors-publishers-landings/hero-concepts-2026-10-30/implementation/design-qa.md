---
type: verification
status: passed
owner: marketing-engineering
last_verified: 2026-10-30
---

# Authors hero comparison QA — 2026-10-30

final result: passed

## Scope and evidence

Selected visual targets: `../gallery/images/04.png` and `../gallery/images/05.png`, both 1536×1024. Live `/authors` contains the current hero followed by these two concepts. The shared sticky header appears once, as requested; the comparison bars are review labels, not part of the original mockups.

Compared both source images and corresponding final `hero-concept-04-1536.png` / `hero-concept-05-1536.png` together in the same inspection input. Implementation viewport 1536×1024 CSS px, DPR1, light theme, fonts ready, cookie notice dismissed. Component captures exclude the shared sticky header/development badge and include each whole hero; their height follows the live content. The source header is excluded conceptually from body-composition comparison. Additional captured widths: 1440, 1024, 900, 768, 390 and 320. References show desktop only; mobile is a responsive adaptation.

## Findings and corrections

- P1, concept04 at1024: diagram min-height inflated its intrinsic aspect width and pushed marketplace logos outside the viewport. Removed that minimum and set min-width:0; post-fix capture and actual image-bound assertions now show all seven marks.
- P2, initial04 desktop heading: final word orphaned. Adjusted scale and kept the emphasized phrase together; revised1536/1440/1024 and mobile captures are clear.
- P2, initial store assets: white image backgrounds visibly broke the paper surface. Applied multiply blending against the actual paper diagram background; revised official marks integrate cleanly.
- P2,320px labels: small store names. Widened the narrow-screen destination column, increased labels/icons, added NOOK below the unchanged B&N wordmark and adjusted line endpoints. Final320/390 captures show readable labels without overlap or clipping.
- Evidence-only issue: one900px capture caught a focused skip link. Blur before normalized captures; actual keyboard focus behavior remains unchanged.

Root and independent visual review of final desktop/tablet/mobile captures found no remaining P0/P1/P2 issues. No source/image placeholders remain.

## Fidelity surfaces

- Typography: established Lora headings and Inter interface/body; loaded font faces and computed family verified. Exact canonical copy and smaller secondary line retained. Generated mock typography is translated using the main landing's existing font system rather than new typefaces. No extra promotional copy.
- Layout:04 keeps proposal → upright book → stores with thin vertical rules;05 keeps a wide upper heading, lower-left contact copy and an angled book. Books and copy do not intersect. On mobile, copy precedes the diagram; stores stay to the right.
- Color: existing parchment, forest ink, muted text and terracotta tokens. One common header; no Open App CTA in these business pages.
- Images: each reference book generated separately as an alpha PNG; clean Cyrillic title, linen texture, correct pose and embossed detail. Local official logos replace generated approximations. The05 asset's near-transparent red RGB fringe is invisible on parchment (alpha median1/255, max8/255); the actual rendered book is clean.
- Copy/interaction: one h1; concept h2 headings repeat exact canonical title. All three contact buttons use the same protected mailto handler. Seven round dots per hero move automatically, including reduced-motion preference as explicitly requested. No animation toggle or moving dashes.

## Verification limits

`checks.json` records21 hero/width cases, six live-clock motion cases, six intercepted mouse/Enter email activations, section navigation, publisher/main isolation and zero page errors. No mail was sent. Focused ESLint/diff checks pass. Full TypeScript remains blocked only by seven previously recorded missing-prop errors in unrelated backup routes. No production build/deployment claim. Browser QA used local headless Chrome after the in-app browser was unavailable; local server remains running.
