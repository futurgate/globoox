---
type: reference
status: current
owner: design-engineering
last_verified: 2026-09-13
---

# Static menu transit and botanical reassignment

Authorized current work: (1) user REJECTED faster sticky transit; implement compact static How it Works during menu navigation, compensating viewport position. (2) Generate conifer/cones and seedpod botanicals matching the exact early compact-centered reference for CTA. (3) Move existing CTA drawing unchanged to Quality. (4) Redraw lower-left pricing sprig with the upper-right drawing's larger leaves/stem weight, tangent to lower-left corner. Upper-right pricing asset AND styling/placement must not change.

**Implemented and checked at `/landing-editorial`.** Existing fonts/copy/media, other block structure, isolated route and prior artifacts remain. Existing project visuals are secondary. No commit, push or deployment. Prior transit smoothness/3× approval is superseded by user rejection; it is historical evidence, not the current implementation.

## Current result

1. Menu travel temporarily removes How it Works' sticky runway. It moves past as one ordinary static section, with its screen frozen. Collapse/restoration compensate the viewport position before paint. Manual Stack resumes afterward. A visit to How it Works starts at Step 1. [Implementation and motion verification](navigation/README.md).
2. CTA uses a conifer twig with cones on the left and a seedpod stem on the right, generated from the exact early mock attached by the user. The conifer took three iterations; the baked checkerboard and overly golden candidates were rejected. [Generation prompts and provenance](cta/provenance.yaml).
3. The previous CTA pair, `closing-v2-b-refined.png`, is preserved byte for byte and now decorates Quality. The opaque book sits above the drawings. At widths up to 1350px, both complete silhouettes sit below the comparison instead of becoming thin accidental fragments in its margins. Copy, fonts and wipe behavior remain unchanged.
4. Pricing uses the selected new lower-left sprig B. Its three leaves and thicker curved stem match the approved upper sprig; it grows around the corner along the bottom and left edges. The upper-right PNG, JSX and every `.sprig` CSS rule remain byte-identical. [Candidates, prompts and preservation checks](pricing/README.md).

## Assets and placement

| Asset | Role | Rendering |
| --- | --- | --- |
| `public/redesign/closing/cta-conifer-v3.png` | CTA left | 1254×1254 RGB PNG; 270px wide at desktop, 235px at ≤1100, 205px at ≤900, 158px at ≤540 |
| `public/redesign/closing/cta-seed-sprig-v3.png` | CTA right | 1024×1536 RGB PNG; 210px wide at desktop, 180px at ≤1100, 150px at ≤900, 128px at ≤540 |
| `public/redesign/closing/closing-v2-b-refined.png` | Quality pair, unchanged old CTA drawing | Two complementary clipped instances of the same original canvas; 1000px canvas in desktop margins, 520px maximum below the comparison at ≤1350 |
| `public/redesign/pricing/free-sprig-v3-b.png` | Free lower-left | 1536×1024 RGB PNG; 168×112px desktop, 126×84px mobile |

New assets have near-white opaque backgrounds, not alpha. CSS multiply blends them with the existing paper. Quality supplies an explicit paper backdrop within its isolated stacking context, avoiding the white rectangle found in the initial layout. All decorative images have empty alt, `aria-hidden`, and no pointer events. The book and controls sit above its decoration.

Below 681px the CTA reserves an additional lower illustration area, so the conifer never crowds the action. This placement change keeps the existing drawing sizes; the original ≤540px size rules still apply. The original icon, heading, description and CTA remain live HTML.

## Evidence and acceptance

- [CTA desktop](evidence/cta-1440-final.png), [phone](evidence/cta-390-final.png), and [narrow tablet](evidence/cta-541-final.png).
- [Quality desktop](evidence/quality-1440-final.png), [901px correction](evidence/quality-901-final.png), and [phone](evidence/quality-390-final.png).
- [Pricing desktop, full margins](evidence/pricing-1440-final.png) and [phone](evidence/pricing-390-final.png).
- [Integrated navigation recording](evidence/navigation-integrated.webm) and [sampled frames](evidence/navigation-motion-contact.png). Instant moves at the start are capture setup; the three menu activations are forward to Quality, back to How it Works, and onward to Start. Deliberate pauses separate those activations.

The three illustration sections were reviewed at 1440, 1100, 901, 801, 800, 768, 390 and 320px. Quality was additionally inspected at 1600, 1351, 1350 and 1280px. CTA boundary captures cover 681, 680, 641, 640, 600, 541 and 540px. Full-width pricing screenshots include the artwork outside the section bounds. No text/action collisions or visible PNG background boundaries remain in the final captures. Initial narrow-margin crops and the first incorrect blend are retained in `initial-layout/` as superseded history.

Navigation QA checks actual panel movement against scroll position, not just the speed of `scrollY`: nine routes/cancellations at 1440×1000 and 1440×1200 have zero stationary compact frames and no direction reversals. Additional repeat-click, resize, keyboard, mobile and manual Stack checks passed. The small permanent blank tail on tall displays prevents the next heading appearing and disappearing on restoration while leaving the original grid content and 220svh manual runway unchanged. Detailed limitations and frame measurements are in the navigation record.

Quality Hide/Show, keyboard slider control, expansion and collapse passed after the transfer. At 1440px the section expands from 961.06px to 1217.06px and returns to its exact previous height; ArrowRight moves the slider from 50 to 52. See [interaction measurements](evidence/quality-interaction-results.json).

Six focused geometry tests, scoped ESLint, scoped TypeScript from the landing entry point and geometry tests, and `git diff --check` passed. SHA256 checks preserve the upper pricing art, transferred old CTA art and unrelated dirty billing RFC; exact font-rule checks preserve both Quality type settings. The original application, existing landings and shared styles were not edited for this round. This is a scoped landing verification, not a checkout/backend or native-device certification.

The repository documentation check initially found nine older walkthrough records without YAML metadata. Required historical metadata was prepended with their original 2026-09-10 verification date; their bodies remain verbatim. `npm run docs:check` now passes for all 110 governed files. No old designs or evidence were replaced. Current implementation notices are pinned in AGENTS, both direction files, the product reference and root QA record.
