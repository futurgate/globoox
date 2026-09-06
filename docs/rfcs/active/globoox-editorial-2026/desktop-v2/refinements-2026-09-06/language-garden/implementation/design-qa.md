# Orchard language block — desktop design QA

**final result: passed**

Reviewed 6 September 2026. No open P0, P1 or P2 findings in this language-block refinement. This is a local 1440px desktop sign-off, not a new mobile or whole-product audit.

## Visual truth and evidence

- Source: [target.png](target.png), the amended Orchard mock generated before implementation, with miniature future-language paper cards. Original copy and HTML-label contract override raster text details.
- Implementation: [desktop-final.png](desktop-final.png), captured from `http://127.0.0.1:3000/landing-editorial#languages` after final card-position correction.
- Full-view and focused-region comparison: [comparison-full.png](comparison-full.png), captured from [comparison.html](comparison.html). Both artifacts are visibly present together. The lower pair enlarges branches, paper edges, labels and both miniature-card rows.
- Source pixels: 1683×935. Browser screenshot: 1440×935 pixels at a measured 1440×935 CSS viewport, effective screenshot density 1 pixel/CSS pixel. Source is normalized to a 1440px page width in the comparison; its resulting height is approximately 800px. Source canvas and browser viewport padding differ, so empty canvas height is not treated as UI drift. Focused crops share 1440px image width.
- Same state: light ivory theme, static language section, English marketing copy, all ten names visible, cookie banner dismissed. No selected-language or interactive card state exists.
- [Browser measurements](browser-verification.json) and [asset manifest](asset-manifest.json) provide loaded-image, semantic, text, size and alpha evidence.

## Findings and comparison history

1. **P2, corrected — future cards competed with current cards.** Earlier browser layout had overly large future papers and loose grouping compared with the source. Reduced the upcoming group to 460px and cards to approximately 130–175px, with 15px live type. Current cards remain approximately 200px with 30px type. See [second capture](desktop-second.png) and final comparison for the restored hierarchy.
2. **P2, corrected — seedling stems intruded between miniature rows.** The second capture showed lower stems as disconnected marks in the gap. Restored the asset's natural aspect ratio and masked the lower quarter behind the paper group. Final comparison shows clean separation between both rows.
3. **P2, corrected — French paper crossed the main trunk.** Independent visual review found the trunk interrupted at the lowest card. Moved French from `top:337px` to `top:286px`, then from `right:48px` to `right:20px`. The final capture shows a continuous trunk and the card supported by a right branch. [Earlier focused comparison](comparison-focus-before-final.png) is explicitly historical; the final combined capture is authoritative.

Early cookie-overlay/incorrect-zoom captures were discarded as final evidence. `desktop-first.png` remains iteration history, not a valid final desktop comparison.

## Required fidelity surfaces

| Surface | Assessment |
| --- | --- |
| Fonts / typography | Pass. Existing local Newsreader and DM Sans match the editorial direction. 64px regular heading, 18px/1.8 description, 30px current names and 15px future names preserve hierarchy. The original heading wraps to three balanced lines. No truncation or duplicate native/English labels. Live text remains sharper than rasterized mock lettering. |
| Spacing / layout rhythm | Pass. Retains the landing's 1160px container and aligns copy with the tree/young-shoot composition. Main cards have nearly square paper edges, weak contact shadows and slight rotations. Upcoming cards form a subordinate two-row group. Corrected French position exposes the trunk. No unrelated horizontal separator or pill component added. |
| Colors / tokens | Pass. Existing pine ink `#20382f`, muted body text and ivory canvas remain. Warm ivory, soft white and extremely pale sage paper differences are restrained. Text contrast remains strong against all paper surfaces. No arbitrary status color or gradient added. |
| Image quality / assets | Pass. All seven production files are real RGBA PNGs; all 12 image instances loaded in the browser. Natural tree proportions, sparse foliage and contemporary paper match the selected direction. No visible checkerboard or colored transparency fringe on the actual ivory background at delivered size. PNG art was generated, not replaced with CSS/SVG approximations. User explicitly selected PNG paper plus HTML labels. |
| Copy / content | Pass. Heading, paragraph, label, current names, original “soon” and all future strings come directly from canonical messages. DOM content matches. Section order remains hero → how-it-works → quality → languages → team → start. |

## Semantics, behavior and engineering

- All ten language names are selectable HTML spans inside two semantic lists. Current list has an accessible label; future list is labelled by the visible “soon” text.
- All art has empty alternative text and `aria-hidden="true"`; no decoration intercepts pointer input.
- Cards are informational, without misleading button semantics or hover affordances. No new input or backend behavior is needed.
- Languages header link tested: navigates to `#languages` with the section top approximately 32px from viewport top. All current/future cards fit within the intended view.
- No horizontal page overflow at 1440px. Section height is approximately 821px.
- Browser session showed the existing local PostHog missing-token message; no language-component error was observed. Analytics configuration is outside this refinement.
- Scoped ESLint passes; scoped TypeScript passes with zero diagnostics. No full repository build was rerun for this presentational edit; previously recorded legacy backup-route type failures remain outside scope.

## Open questions and follow-up polish

No blocking ambiguity. Two P3 differences are accepted: separately generated tree leaves have somewhat more naturalistic shading than the full mock, and German's young sprout is more concealed than its neighbors. Neither compromises text or the mature/upcoming relationship. Mobile/tablet refinement remains deferred by explicit user instruction; fallback CSS is not a mobile QA claim.

## Implementation checklist

- [x] Amended visual target generated before implementation.
- [x] Seven transparent production assets generated and individually inspected.
- [x] Canonical live text and block order preserved.
- [x] Full and focused combined visual comparisons inspected.
- [x] All actionable P2 findings corrected and recaptured.
- [x] Desktop image loading, navigation, semantics, overflow, lint and types checked.
- [x] Earlier baseline, explorations, prompts and project documents preserved.

**final result: passed**
