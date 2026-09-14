---
type: rfc
status: verified
owner: design-engineering
last_verified: 2026-09-08
---

# Design QA — mobile vertical walkthrough

**Source:** ../mobile-walkthrough-imagegen-2026-09-08/01-vertical-episodes.png, selected by user.
**Implementation:** http://127.0.0.1:3000/landing-editorial#how-it-works
**final result: passed**

## Evidence and normalization

Source board 1477×1065; its three roughly 463×1032 mobile crops normalized uniformly to 390px wide (about 870px tall), without stretching. Live main captures are 390×844 CSS px and image pixels at DPR1, same three step states. Gray padding in comparisons marks unequal source crop height rather than page content. Existing actual sticky header is 84px, intentionally preserved rather than rebuilding generated chrome.

- comparison-step-1.png: reference left, final browser state right.
- comparison-step-2.png: reference left, final browser state right.
- comparison-step-3.png: reference left, final browser state right.
- 390-step-1-final.png / 390-step-2-final.png / 390-step-3-final.png: uncombined final browser states.
- 320/430/600/768/800/801/1440-step-2-final.png: individually viewed width checks.
- 390-low-height.png: 390×600, normal native flow; screenshot continues below fold.
- All comparison images opened and judged together in the same input. Additional focused crops unnecessary: three single-state comparisons show actual caption/menu/upload detail legibly at original mobile width.
- Initial localhost tab inherited 75% browser zoom, giving 520 CSS px for requested390. Not used as 390px evidence. Actual checks use 127.0.0.1 at DPR1; geometry.json records measured dimensions.

## Findings / corrections

- [P2, fixed] Existing page margin reset overrode the new single-class paragraph/title margins. The initial browser view had caption nearly touching media. Increased only local selectors to .section .episodeLabel / .section .episodeTitle. Final captures verify 10px/24px spacing.
- [P2, fixed] Secondary Next image compression softened already compressed product text. Mobile images now use original local WebP files directly; final geometry records the direct source paths.
- No actionable P0/P1/P2 findings remain in the changed block.

## Required fidelity surfaces

- Typography: retained Newsreader and DM Sans. Canonical heading/step words retained. Long step 2 wraps naturally to two lines at sampled phone widths; no ellipsis or truncation.
- Spacing/layout: chosen vertical caption-then-product hierarchy retained; 342px frame at390 and 280px at320. Natural60px episode gaps, no added horizontal rules. Real header height and slightly different source typography mean exact vertical pixel positions differ.
- Colors/tokens: original ivory/pine/sage palette and fine warm border retained. No new decoration, shadow stack or card surface around whole episode.
- Imagery: real upload/menu/Spanish reading media. Purposeful 788:1240 crops shorten the full-height mock while preserving all task-essential upload/menu controls. Third source generated board invents a book toolbar absent from real screenshot; implementation correctly retains actual source instead.
- Copy: original usage.label, heading and all three step descriptions rendered from getLandingMessages('en'), unchanged. Screenshot text remains original raster content. No new claims.
- Accessibility: native ordered-list content and h3 captions on mobile; desktop-only tabs/panel display:none on mobile, so no hidden keyboard stops or duplicate accessible tab content. Meaningful original image alt text. Navigation arrival leaves pointer focus on BODY. No full assistive-technology audit claimed.

## Behavior checks

- Widths 320,390,430,600,768,800: all three episodes in document flow, no visible tabs, no horizontal overflow.
- Widths 801,1440: sticky desktop composition restored, mobile list hidden. No horizontal overflow.
- 390×600: no viewport-height shrinking of text/media or scroll trap.
- Native desktop scroll sequence 1→2→3→2→1 confirmed after manual first-step selection; saved desktop-scroll.json.
- Mobile How it works and Quality menu links tested; menu closes and targets land below sticky84px header (How it works top108px), retaining smooth navigation.
- Browser console: pre-existing PostHog missing-token messages only observed; no new walkthrough runtime errors.
- ESLint: edited TSX passed. Whole-project tsc --noEmit failed on unrelated backup landing props and duplicate generated route declarations. No edited-component errors reported. Production build not claimed.

## Intentional differences / follow-up polish

The selected mock is a layout reference, not authority to replace actual app media or site header. Upload crop prioritizes complete form over full library toolbar; other crops shorten long reading text. No lower section rule added; the user previously rejected unnecessary separators. Development badge in captures is a local Next overlay, not shipped design. Physical iOS/Android hardware and screen-reader QA were not performed.

## Implementation checklist

- [x] Apply selected vertical mobile direction with original content/media.
- [x] Retain desktop scroll interaction and scoped navigation.
- [x] Fix caption spacing and image recompression.
- [x] Visually inspect all three states and eight widths plus short viewport.
- [x] Save comparisons, measurements, code validation and durable authority notices.

