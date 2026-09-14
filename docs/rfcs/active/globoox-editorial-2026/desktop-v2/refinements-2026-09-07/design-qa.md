---
type: postmortem
status: complete
owner: design-engineering
last_verified: 2026-09-07
---

# Language composition correction — design QA, 7 September 2026

**final result: passed**

Scope: the isolated `/landing-editorial#languages` block, 1440px desktop. Latest user feedback supersedes the6September mini-card design and its previous composition assessment. This pass verifies the current correction, not overall product or mobile readiness.

## Source, state and comparison

Primary visual direction: the user's attached crop with three progressively growing sprouts on the LEFT of two unboxed upcoming-language lines. [target.png](target.png) is the amended full-section ImageGen composition generated before markup/CSS changes; [mock-prompt.txt](mock-prompt.txt) contains the exact prompt. The canonical original marketing strings and existing local fonts remain authoritative over generated raster lettering.

Implementation: [desktop-final.png](desktop-final.png), browser screenshot1440×935pixels at1440×935CSSpx, devicePixelRatio1, light ivory theme, English copy, `#languages`, consent previously dismissed. Source1586×992pixels is normalized to1440px width in the combined input, retaining its approximately901px height. Canvas height/padding differences and the beginning of the next section in the browser are visible and are not mistaken for design drift.

[comparison-final.png](comparison-final.png) includes the source and actual browser view together, a focused full-tree/soon comparison, and the previous checkpoint versus current result. [comparison.html](comparison.html) is the review page. Root and an independent read-only reviewer inspected the actual combined evidence.

## Findings and corrections

- **P2 corrected: competing upcoming-card grid.** Previous [before.png](before.png) gives six future names paper surfaces comparable with the four current languages. Removed all six future paper surfaces; names now form two18px text rows under the original italic “soon”, with a compact new growth illustration on the left.
- **P2 corrected: disconnected text/illustration alignment.** Prior vertical centering included the entire tree plus heavy future group. Changed to top alignment and a deliberate70px copy offset relative to the canopy. Eyebrow and upper language card now share the same region; copy no longer moves in response to the future block's height.
- **P2 corrected: oversized right-column spread and irregular card rhythm.** Canopy500×454→460×420px. Main papers206px→approximately190px. Card positions58/138/208/276px create an80/70/68px downward rhythm instead of102/62/60px. Tree retains its natural aspect ratio; main trunk stays visible. Final section height approximately732px, previously821px.
- **P3 corrected during first browser pass:** [iteration-1.png](iteration-1.png) had slightly high copy and muted17px future text. Shifted copy14px lower and made future text18px pine ink. Final screenshot and comparison show this change.

The resulting section is visibly quieter and more coherent than the checkpoint. There are no remaining actionable P0/P1/P2 findings at1440px.

## Five required fidelity surfaces

| Surface | Result |
| --- | --- |
| Fonts / typography | Pass. Existing local Newsreader64px regular heading and29px paper labels, DM Sans18px body/future names, italic Newsreader24px “soon”. Three-line headline and two untruncated future rows remain readable. Generated source uses a somewhat larger overall type scale; preserving the existing landing hierarchy is intentional. |
| Spacing / layout | Pass.1160px container,505px copy track,82px gutter retained. Compact460×420canopy and independent text alignment fix the former imbalance. Upcoming note has22px top gap and20px illustration/text gap. Card edges remain square paper, with tiny rotations and weak baked shadows; no extra divider. |
| Colors / tokens | Pass. Existing ivory/pine tokens and restrained three-paper palette. Future names use pine ink for clear18px reading; “soon” remains subdued. No gradient or arbitrary status styling added. |
| Image quality / fidelity | Pass. Reuses the original transparent tree and three main paper PNGs. New1402×1122RGBA sprouts match the requested left-side growth motif; no paper behind future names. Natural proportions, correct baseline, no visible baked background or transparency fringe at displayed116×92px. All six rendered image instances load. No CSS/SVG approximation of art. |
| Copy / content | Pass. Four current names, six future strings, label, original heading/paragraph and “soon” preserved from canonical messages. Middots are decorative separators hidden from assistive technology. No original text rewritten or future language added. |

## Browser and engineering checks

[Browser verification](browser-verification.json) records viewport/density, full text, current/future names, both future rows, all loaded decorative images, section height and six-section order. Languages header navigation was clicked and reaches the section at32px from the top. No horizontal page overflow at1440px. All artwork has empty alternative text plus `aria-hidden=true`; live names remain selectable. Two semantic future lists are grouped under the visible “soon” label; no fake interactive cards.

Scoped ESLint and TypeScript both pass, zero type diagnostics. No new tests were added for this presentational revision. Original product/landing/shared style code is unchanged in the correction; the prior unrelated billing RFC edit is preserved and excluded from commits. Existing local PostHog missing-token configuration was previously observed; this revision does not alter analytics. No repository-wide build or full interaction regression was claimed for a language-only edit.

## Remaining P3 and limits

The reused tree has a slightly long top shoot, the implementation is more compact than the new generated target, and the gap to the team section remains generous. Those are optional art-direction refinements. User-requested responsive refinement remains deferred; fallback CSS is not mobile sign-off. No push or Vercel deployment.

## Checklist

- [x] Previous complete landing checkpoint committed before edits:0d22c81.
- [x] Amended full mock generated and inspected before implementation.
- [x] New compact growth asset generated, inspected and saved unchanged.
- [x] Full and focused combined comparisons inspected after corrections.
- [x] Original content, loaded images, anchor, semantics, overflow, lint and types verified.
- [x] Old assets, prompts, baseline and QA preserved as history.

**final result: passed**
