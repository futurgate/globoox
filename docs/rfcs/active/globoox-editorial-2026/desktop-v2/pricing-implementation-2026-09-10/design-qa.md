---
type: rfc
status: implemented
owner: design-engineering
last_verified: 2026-09-10
---

# Pricing implementation QA — 2026-09-10

**Final result: passed**

No actionable P0/P1/P2 findings remain in this scoped pricing implementation. Premium checkout remains unavailable as already established in the product; its honest frontend response is verified. This is not a billing-release or full-site accessibility certification.

## Comparison state and evidence

- Source truth: [option 4](../pricing-footer-2026-09-10/04-shared-paper-refined.png), with user amendment to center the small bottom note like option 1.
- Implementation: `/landing-editorial#pricing`, collapsed Premium notice, English marketing content, light theme, sticky header visible.
- Source PNG: 1487×1058. Normalized proportionally with contain to 1440×1024; negligible edge padding. Render: 1440×1024 CSS px and screenshot pixels, deviceScaleFactor 1. No browser/device frame included.
- Initial comparison: [comparison-initial.png](comparison-initial.png), source left/render right.
- Post-fix comparison: [comparison-final.png](comparison-final.png), source left/render right. Both were opened as combined images and judged directly.
- Final implementation: [desktop-final.png](desktop-final.png), opened separately at full size for typography and fine illustration-edge inspection. No additional focused crop was needed: individual 1440px screenshots made the pricing labels, borders, footnote and 110px decoration readable. The combined comparison established proportions, then full-size source/render views confirmed details.

## Comparison history

| Iteration | Finding | Correction and evidence |
| --- | --- | --- |
| Initial — blocked | P2: heading/body/actions too small; table approximately 421px high instead of roughly 451px in normalized mock. | Heading 60→72px, body 18→20px, names 34px, actions 16px; adjusted price area/card padding to produce a 455px shared table. |
| Initial — blocked | P2: missing botanical while asset generation was pending; browser cached the initial missing asset. | Generated/extracted a real transparent PNG, rejected RGB checkerboard version, verified direct and optimized URLs, reloaded cache and inspected real cream-background rendering. |
| Implementation review — blocked | P2: Premium feedback below the entire group would be missed on mobile. | Moved feedback directly beneath Premium button; [mobile-premium-notice.png](mobile-premium-notice.png) shows the complete response in view. |
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
