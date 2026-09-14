---
type: archive
status: archived
owner: design-engineering
last_verified: 2026-09-06
---

# Five contemporary language-card variants

Created on 2026-09-06 in response to the user's selected manuscript-slips image.

## Authority and scope

The user reattached `~/Desktop/download-1.png` and explicitly preferred that composition. They requested five variants, with contemporary rather than vintage cards; one with pleasant decoration on the cards, another with a lightweight background object. [Selected source](selected-reference.png) is preserved unchanged. It is a visual composition reference; the user's message supplies the instructions.

All five images are exploratory and unimplemented. The live paper-index baseline and its saved component/style snapshots remain untouched. Original source marketing copy, language labels and section order remain authoritative.

## Deliverables in their actual displayed order

Exactly five independent built-in ImageGen calls were made, without batching. Each resulting image was displayed once in the main conversation. Numbering below follows that displayed order, not a parallel job order.

| Displayed variant | PNG | Exact prompt | Distinction |
| --- | --- | --- | --- |
| 1 | [variant-1.png](variant-1.png) | [prompt-1.txt](prompt-1.txt) | Clean white strips, thin edges, almost flat material |
| 2 | [variant-2.png](variant-2.png) | [prompt-2.txt](prompt-2.txt) | Soft tonal cards: warm white, sage, blush and mist |
| 3 | [variant-3.png](variant-3.png) | [prompt-3.txt](prompt-3.txt) | Small botanical contour drawings printed on the cards |
| 4 | [variant-4.png](variant-4.png) | [prompt-4.txt](prompt-4.txt) | A light wire paperclip partly hidden behind plain cards |
| 5 | [variant-5.png](variant-5.png) | [prompt-5.txt](prompt-5.txt) | Shorter landscape cards in a tighter interleaved composition |

[Visual gallery](index.html) includes all five complete PNGs and the user's source image. All calls received the actual inspected local source image as a reference.

## Art-director inspection

- All five keep the original two-column hierarchy and four completely readable current names, with one quiet upcoming group. No generated product UI, native-name duplication, fake button, additional claim or changed source copy is needed for these concepts.
- 1 is the most direct contemporary refinement: cleaner paper and lighter depth. The generated outlines still vary slightly in strength; any eventual implementation should be consistent.
- 2 differentiates the stock and softens the shapes. The generated pastel tint is a little stronger than requested, and the card group is tall. If selected, keep the palette restrained relative to the product.
- 3 meets the on-card decoration request. The motifs are quiet and coherent, although the generator added more leaf detail than the requested two or three strokes. Reduce that detail and preserve readable text spacing if selected.
- 4 meets the background-object request. The wire silhouette is light and related to the paper composition; its upper loop is larger than requested and could be reduced. It should remain behind the cards rather than becoming a central illustration.
- 5 explores a different card proportion. The generator interpreted the clipped corner as a small folded corner despite the prompt. This is a visible deviation, not an implementation requirement; favor a crisp cut edge if this direction is refined.

After the user asked for the root's opinion: **recommend developing 3**, with 2 as the reserve direction. The small drawings connect with the landing's existing botanical language while the cards themselves feel contemporary. Further refinements would simplify the drawings, reduce the shadows and trim excess card height. The shared staircase is still a little mechanical. Variant 4's paperclip reads more as stationery than reading and adds limited value; variant 5's folded-corner treatment moves toward sticky-note UI. This is the root's critique, not a user selection. No final variant is selected in this round yet.

## Preservation

No landing components, CSS, app behavior, original page or product media changed during this five-image round. Existing founder corrections remain intact. Earlier explorations and the rejected ornate book are preserved as history in the parent folder.

## Gallery verification

All six gallery images load, retain their natural aspect ratios and are linked to their complete PNGs. All 36 gallery links resolve; IDs and five exact prompt files were checked. Browser review found no horizontal overflow at the native viewport. The live language component and styles still exactly match the saved baseline snapshots. The gallery is open locally at `http://127.0.0.1:8770/desktop-v2/refinements-2026-09-06/card-variations/index.html`.
