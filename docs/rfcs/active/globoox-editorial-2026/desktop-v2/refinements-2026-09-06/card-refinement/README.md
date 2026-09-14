---
type: archive
status: archived
owner: design-engineering
last_verified: 2026-09-06
---

# Language cards — autonomous art-direction loop

## Follow-up: single twig behind the cards

User requested an ImageGen study of one delicate twig behind the selected composition. [Branch study](branch-behind-v1.png) · [exact built-in ImageGen prompt](branch-behind-prompt.txt). Generated from selected.png and visually inspected. Clean card faces replace the four printed motifs; one thin sage twig peeks from lower left and upper right, with the composition and copy retained. The upper tip is slightly more exposed than initially envisioned, but the overall treatment is light and coherent. This is a follow-up mock for review, not an implemented replacement. Selected.png and the live baseline remain intact.

## Selected result and authority

**Root selected iteration 7 after seven independent ImageGen generation/review cycles.** [Selected PNG](selected.png) · [last edit prompt](selected-prompt.txt) · [review page](index.html). This is the root's chosen visual mock, as explicitly requested by the user; it has not yet been implemented. The live paper-index baseline is preserved.

User approved the proposed refinement of card variant 3 and explicitly requested repeated ImageGen generation, inspection and revision until the root is satisfied, then showing the selected result. This overrides a fixed number of options or an approval pause. Work is a visual-mockup refinement; the live paper-index baseline stays intact.

Source: [variant 3](../card-variations/variant-3.png). Original source text, block order, real product evidence and existing icon rules remain. No new marketing text, flags, fake UI or implied language restrictions.

## Selection criteria

1. Contemporary paper cards: fresh edges, no aging, antique texture, curls or ornamental borders.
2. Compact group: card height reduced about15–20%, subtle varied widths and unequal but deliberate overlaps; readable language names and sufficient breathing room.
3. One coherent printed botanical motif system, restrained at the card edges, rather than four unrelated clipart illustrations. Fine consistent stroke, few details, occasional edge crop.
4. Quiet tonal palette: milk and grey-sage only; weak short contact shadows. No additional background object.
5. Original left headline/description and current/future names intact. The “soon” group remains quiet and readable beneath the composition.
6. Final result must be visibly preferable to the source. Record concrete weaknesses and corrections for every iteration; do not pick a result merely because a fixed generation count was reached.

## Iterations and decisions

All seven images were generated with the built-in ImageGen tool, then individually opened and visually inspected before the next prompt. Source images were attached through local file paths. Exact prompts below preserve the full chain; the last prompt alone is not a complete reproduction recipe.

| Iteration | Image / exact prompt | Finding and next action |
| --- | --- | --- |
| 1 | [PNG](iteration-1.png) · [prompt](prompt-1.txt) | Fresher surfaces, but repeated two-leaf seedlings became four matching logos. Vertical rhythm remained too regular. Rejected; replace complete icons with small clipped fragments and loosen the rhythm. |
| 2 | [PNG](iteration-2.png) · [prompt](prompt-2.txt) | Better coherent leaf fragments and real edge crops. Cards spread into two disconnected pairs with excessive horizontal offsets. Rejected as a full section; keep its drawing treatment as a reference. |
| 3 | [PNG](iteration-3.png) · [prompt](prompt-3.txt) | Narrower silhouette became a nearly aligned stack of input-like rows. Lost the preferred paper-fragment character. Rejected; restore more deliberate stagger and test the graphic separately. |
| 4 | [PNG](iteration-4.png) · [prompt](prompt-4.txt) | Focused widget study recovered irregular overlap and unified linework. A useful component reference. The art was still too large to drop into a full section at that scale. |
| 5 | [PNG](iteration-5.png) · [prompt](prompt-5.txt) | Full-section compositing regressed to the old four different botanical motifs despite the prompt. Rejected. Remove the old complete section from image inputs to avoid restoring its right-hand artwork. |
| 6 | [PNG](iteration-6.png) · [prompt](prompt-6.txt) | Rebuilt full section from iteration 4 only, correctly preserving clipped leaf fragments and original wording. The right group was too large relative to the headline and paragraph. Use a focused optical scale pass. |
| 7 | [PNG](iteration-7.png) · [prompt](prompt-7.txt) | Selected. Smaller, lighter card group retains deliberate irregular overlaps and all readable names. Botanical fragments act as printed edge details. The original headline has clear priority; the upcoming note balances the paragraph below. |

## Why this result is selected

- The fresh white/near-sage stock, restrained corners and short shadows are contemporary. No aged texture, heavy object, curled corners or antique illustration returned.
- Compared with original variant 3, the cards have substantially less visual mass; the right group supports the full unchanged headline rather than competing with it.
- The language order and all four words remain clear. Unequal overlaps and tiny rotations preserve the preferred composition without becoming a 2×2 collage or a straight software list.
- The art uses one thin olive-leaf contour style, cropped at the card edges. It no longer looks like four unrelated botanical cliparts. The English fragment has more leaves than the nominal brief; its scale and edge crop now make that acceptable visually.
- The small “soon” and two future-language lines remain legible and subordinate. No duplicate native-language labels, flags, pretend controls, new claims or product images were introduced.

This is a visual selection, not a claim of exact CSS measurements. The generator did not follow numeric coordinate instructions exactly; final choice follows the inspected result. Original text still comes from the project messages in any future implementation, never from OCR of a generated image.

## Preservation and deliverables

- Selected raster is copied to `selected.png`; no image was overwritten or edited with a raster script. Earlier attempts remain as labeled history.
- All prompts and the selected-reference lineage are stored locally with this record.
- Byte hashes confirm `LanguagesSection.tsx` and its CSS still match the saved live baseline snapshots. No landing, product, shared styles or other application behavior changed in this refinement loop.
- A local review page presents the selected mock first, with previous attempts tucked into a history disclosure. No user option-selection step is required by this task; root exercised the explicitly delegated art-direction judgment.
