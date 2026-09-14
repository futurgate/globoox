---
type: reference
status: current
owner: design-engineering
last_verified: 2026-09-13
---

**Latest follow-up:** upper-right pricing sprig lowered16px desktop /12px vertical; see [current offset correction](upper-sprig-lower/README.md). This supersedes the unchanged-upper-placement statement below.


# Pricing, Languages and CTA balance

Implemented at `/landing-editorial`. This round supersedes older joined pricing frames, oversized price figures, Free-only lower-sprig anchoring, high language labels, seedlings-first placement and the bottom CTA arrow. Existing artwork, canonical copy, type families and prior artifacts remain; the old project remains a secondary visual reference. No commit, push or deployment.

## What changed

- Three pricing cards now have separate frames using the existing shared border/radius/shadow tokens, with 18px horizontal gaps and 22px gaps when stacked at ≤800px.
- Numeric prices are 56px wide desktop, 52px compact desktop and 48px stacked; previously 76/68px. Plan names are 30/28px, custom pricing 38/36px, period 15px, allowance 17/16px and action labels 15px. The numeric price still leads, with consistent CTA baselines. Card height falls from about453px to366px on desktop and to336px in the closed vertical layout.
- The lower botanical is a sibling of the card grid, anchored to the bottom-left corner of the entire group. It sits beside Free horizontally and Editorial vertically, following group growth when Premium feedback opens. Wide desktop moves6px left and6px down. Vertical placement moves6px down; a viewport-aware horizontal limit preserves a visible margin on narrow phones. The existing upper-right−30° placement is unchanged.
- Available language labels move4px down optically without moving/resizing the paper surfaces. The complete `soon`/future-languages group now precedes the seedlings. See [Languages implementation and seven-width evidence](languages/README.md).
- The bottom CTA's Upload your first book button has no arrow. Its canonical words, destination and surrounding layout are preserved.

## Visual review and iteration

Compared before views with a first implementation at nine widths. An independent visual review agreed that the price hierarchy and card spacing were calmer, but found the lower leaf almost touching the viewport at tight widths. Final CSS reserves a small lateral margin there; wide desktop and the roomy vertical tablet composition keep the requested outward placement. Final views were inspected again.

| Widths | Reviewed result |
| --- | --- |
| 1440,1280 | Three distinct frames; quieter prices, aligned actions and both corner accents. |
| 1100,901,801 | Three-column boundary stays readable; lower leaf clears the viewport. |
| 800,768 | One-column layout, 22px gaps and lower botanical on Editorial. |
| 390,320 | Same hierarchy without text/button collisions, complete corner accent and no document overflow. |

CTA screenshots were inspected at1440/390px. Languages was independently reviewed at1440/1100/901/801/800/390/320px; root also inspected1440/390. Original text, language card bounds and section heights are preserved.

Screenshots use `evidence/pricing-{width}-final.png` and `evidence/cta-{width}-final.png`; before and v1 remain for comparison. `geometry-final.json` records dimensions and zero page errors/overflows. `interaction-checks.json` records Premium expansion and group anchoring at1440/800/390/320, retained links and absence of an SVG in the final CTA.

## Verification and preservation

Scoped ESLint and TypeScript for the editorial route/dependencies pass. Both pricing PNG hashes and the unrelated dirty billing RFC match [preservation.json](preservation.json); upper sprig CSS is unchanged. Only this round's CTA arrow was removed from EditorialLanding. Original source snapshots are under `before/`; Languages has its own snapshots.

Browser QA used fresh anonymous Chrome through local Playwright after the available Browser client failed importing its removed versioned service module. No existing browser profile/session was used. Captures were written under `/tmp` and archived after source review, avoiding development HMR during screenshots. QA scripts are retained under `qa/` as reproduction aids, not a new application test suite.

Cold mobile QA found that the local optimizer stalled only for the lower asset at128px with WebP negotiation (PNG128 and WebP256 responded immediately). The lower Image now requests sizes168px at every width, giving the126px mobile artwork a little extra source detail and selecting the working256px candidate at DPR1. CSS dimensions and PNG pixels are unchanged; native lazy loading remains. Fresh390×844 natural scrolling and the four-width fresh-context expansion checks pass.
