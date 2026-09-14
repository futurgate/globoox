---
type: reference
status: active
owner: product-design
last_verified: 2026-09-10
---

# Illustration redraws and Quality comparison — current round

**Current authority:** the user strongly rejected the lower-left Free-plan botanical and requested another drawing pass. The old `public/redesign/pricing/free-sprig.png` and any earlier aesthetic “passed” statement are superseded. Preserve the old file, prompts and captures as rejected history. A technically clean background or correct dimensions did not make that composition acceptable.

Root has now selected and integrated **B refined for both the pricing corner and the closing artwork** after two independent candidates and one refinement in each exploration. This selection is the current implementation direction. The integrated visual review is complete. See [current QA and limitations](design-qa.md) for the eight-width evidence and pointer/keyboard and browser-native touch checks. This is root selection, not a claim that the user has approved the redraws.

## Current artwork and selection

| Area | Live asset | Selection and intent |
| --- | --- | --- |
| Pricing, Free lower-left | `public/redesign/pricing/free-sprig-v2-b-refined.png` | Two different compositions were generated: A, an upward fork; B, a shallow diagonal sweep. Refining B reduced stem weight and leaf-vein contrast and varied the leaves. Root selected the refined sweep to form a deliberate corner composition instead of the rejected dangling stalk. |
| Pricing, upper-right | `public/redesign/pricing/sprig.png` | Existing praised sprig is preserved. It remains the approved drawing-family reference. |
| Closing call-to-action | `public/redesign/closing/closing-v2-b-refined.png` | Two different sparse compositions were generated: A, taller asymmetric bookends; B, lower open margin branches. Root chose B's geometry for the actual closing region and a subsequent refinement made its stems thinner and sage washes quieter. |

The drawing direction follows Languages' sparse graphite stems and restrained sage watercolor handling. It does not reuse the Languages tree's full subject or replace real product media. Earlier pricing and closing candidates remain available; they must not silently replace the selected refined B assets after compaction.

Pricing prompts, candidate critiques, file metadata and multiply previews are in [pricing-art/README.md](pricing-art/README.md). Closing candidates and exact prompts are recorded in [closing-art/provenance.yaml](closing-art/provenance.yaml), with the selected treatment change in [closing-art/refinement-b.yaml](closing-art/refinement-b.yaml).

The new selected files are RGB PNGs on near-white backgrounds, **not alpha cutouts**. The isolated landing renders them with CSS multiply on its warm paper surface. Production image pixels were not redrawn or masked with code. The original approved pricing sprig retains its own existing alpha format.

## Current implementation paths

- `src/components/landing-editorial/PricingSection.tsx` and its CSS Module render the Free corner using `free-sprig-v2-b-refined.png`, preserving the upper-right sprig, established plan content and CTA behavior.
- `src/components/landing-editorial/EditorialLanding.tsx` and its CSS Module render `closing-v2-b-refined.png` as left and right decorative portions around the closing content. The eight-width review corrected the medium-width title clearance and placed the mobile decoration below the action.
- `src/components/landing-editorial/QualitySection.tsx` and its CSS Module implement the interactive comparison described below.

Work remains isolated to `/landing-editorial`. Existing section order, original canonical landing words, current Newsreader/DM Sans typography, app icon and real product media are preserved. The app, original landing and shared styles remain untouched. Existing project visual styling is a secondary reference; the current user direction and selected artwork govern this redesign. No deployment or commit is part of this round.

## Quality comparison behavior

The revised Quality block borrows the **wipe-comparison principle** from the old `src/components/landing/CompareSlider.tsx`, while keeping the current editorial presentation and canonical comparison text.

Both original Russian and translated English passages occupy the full comparison surface. A movable divider changes which layer is visible by clipping, instead of squeezing or reflowing either passage while the user drags. The initial split is 50/50. Pointer dragging and keyboard controls operate the divider; touch handling distinguishes a horizontal comparison gesture from normal vertical page scrolling.

**Hide translation** reveals the full original passage and hides the divider. It leaves the stored split position intact. **Show translation** restores that same split rather than resetting to the center. **Read full excerpt / Collapse excerpt** controls a shared expansion state for both passages, preserving their complete original text. Metadata remains separate from the clipped prose layers.

The pre-slider Quality source is archived in `quality-before-slider/QualitySection.tsx` and `quality-before-slider/QualitySection.module.css`. Those snapshots are restoration material, not current live implementation authority.

## Verification status

Root viewed all three before/after comparisons and the pricing, closing and Quality matrices at320,390,768,800,801,901,1100 and1440px. [Current QA](design-qa.md) records visual decisions, pointer/keyboard behavior, expansion, known repository check failures and the transient development-overlay capture issue. Scoped ESLint passes. Earlier assets and completion notices are historical.
