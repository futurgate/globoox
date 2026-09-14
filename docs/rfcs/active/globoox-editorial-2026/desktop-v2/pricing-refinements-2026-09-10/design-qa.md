---
type: rfc
status: implemented
owner: design-engineering
last_verified: 2026-09-10
---

# Pricing/footer refinement QA

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
