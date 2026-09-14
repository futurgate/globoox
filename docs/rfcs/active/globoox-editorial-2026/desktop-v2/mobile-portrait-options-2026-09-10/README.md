---
type: reference
status: historical
owner: design-engineering
last_verified: 2026-09-10
---

# Selection and implementation update — 2026-09-10

**User selected displayed option1 / continuous chapters and authorized implementation.** Added thin divider and native heading sticky behavior, released by Step3, per the follow-up request. Full portraits now replace rejected squares. [Current implementation and passing QA](../mobile-portrait-implementation-2026-09-10/README.md). The exploration/no-selection statements below are preserved history, not current instructions.

# Mobile How it Works — portrait alternatives, 2026-09-10

## Brief and authority

User rejects the square crops and requests ImageGen ideas with behavior descriptions, then will choose a direction. Scope is the mobile How it Works section of the existing isolated landing. The outcome is a clearer explanation of uploading an ebook, selecting a translation language, and reading the result.

This is visual exploration, not implementation authorization. The currently coded square mobile layout is a rejected baseline pending replacement; do not describe it as approved or restore it after compaction. Desktop Fade / Stack is outside this change. Existing project visuals are secondary references, while current editorial direction, original words, real media and section order remain authoritative.

No app/landing implementation changes, no commit/push/deploy in this round. Earlier mobile exploration and all prior artifacts remain preserved.

## Inputs

- Current visual context: `../walkthrough-motion-options-2026-09-10/mobile-review.png`. Its square image treatment is explicitly rejected.
- Real upload: `public/images/how-it-works/1.1.webp`.
- Real language menu: `public/images/how-it-works/2.1-en.webp`.
- Real translated page: `public/images/how-it-works/3-en-es.webp`.
- All screenshots:788×1705. At300px width, height is649px. At240px width, height is519px.
- Newsreader / DM Sans, paper#f7f5ed, forest#20382f, sage#64735e. Existing compact sticky header, original icon and inset rule.
- Exact source copy retained. Generated screenshots are composition references only: any future implementation must use the actual source files, not generated product pixels.

Built-in ImageGen; three independent generation calls, each receives all four actual reference image paths. Product Design preflight found no saved plugin context, so the supplied project/context was used. No outside-source search was needed for this focused exploration.

## Concepts and behavior

Names here identify concepts, not user-facing choice numbers. The choice mapping will be recorded after images are displayed.

### Continuous chapters

390×1120 CSS-px page slice; complete first300×649px portrait plus next chapter caption. Native vertical page scrolling, all three steps always present, original caption precedes each image. No sticky stage, nested scroll, auto-advance or required tap. Header remains sticky. Each full image can continue past the viewport as ordinary page content.

Strength: immediate comprehension, easy forward/backward reading, generous image scale. Cost: roughly2500–2800px section length on a390px phone. The reference shows only the opening portion; subsequent steps follow the same rhythm.

### Reader gallery

390×960 CSS-px section slice; one240×519px full portrait at a time, active Step2 in the mock. A three-step selector above gives direct access. The original caption has a reserved two-line region; previous/next44px controls and2/3 indicator sit below the screenshot. Horizontal swipe is an additional shortcut, never the only way to navigate. Vertical scrolling always moves the page.

No auto-advance. Changing steps uses a short fade through the paper surface, or immediate replacement for reduced motion. The image frame and caption region keep a stable height. Swiping is recognized only after horizontal intent; there is no vertical scroll trap.

Strength: compact, clear selected state, all screens kept whole. Cost: smaller screenshot and the chance of skipping later steps. Visible selectors/next control reduce that risk.

### Folding chapters

390×1120 CSS-px section slice; full chapter titles, one expanded270px-ish portrait region (260px in the mock). First chapter opens initially; mock shows the second open to test the longest caption and the language picker. Tapping another title closes the old chapter and opens that one. Maintain the tapped heading's viewport position during height changes, below the sticky header; no jump to section start.

No auto-switch on page scroll. Each open image is ordinary page content with no internal scrolling. Expanded/collapsed state uses one minus/plus cue, not redundant arrows and tabs. Original titles remain visible as navigable rows.

Strength: direct access with less repeated media and every step named. Cost: more tapping and a presentation closer to help content than an uninterrupted product story.

## Generated and visually reviewed

All3 outputs were visually reviewed and each displayed once in the main conversation. **Authoritative displayed order:**

1. Continuous chapters — `01-continuous-chapters.png`.
2. Reader gallery — `02-reader-gallery.png`.
3. Folding chapters — `03-folding-chapters.png`.

This mapping comes from actual displayed results, not planned call order. None is user-selected or implemented. Prompts are saved as the three named `*-prompt.txt` files in this folder. All three were generated through the built-in ImageGen tool with the reference paths listed above.

Root preference:1. It restores a coherent complete upload screen and gives the product generous scale with the simplest scrolling model.2 is the compact alternate when page length matters.3 is functional but reads more like help content and needs careful scroll-position handling.

Visual review:

-1: clear full-height upload context, readable landing headings, quiet thin frame; next chapter title makes the continuation apparent. The longer page is an intentional tradeoff.
-2: selected step is immediately legible; one portrait, stable caption area and reachable lower controls. Less generous product scale and more navigation chrome than1. The generator slightly compresses the intended portrait and omits the source home indicator: do not use its product pixels or infer exact dimensions from this render.
-3: all original chapter titles visible, open state distinguished without heavy card nesting. The large image causes a tall expanded section. Looks more like an accordion/help page than1. Keep the proposed stable-heading behavior if chosen.

Generated aspect ratios/type metrics do not exactly match the requested CSS-pixel dimensions. These are composition concepts, not pixel-perfect specs or evidence of a working interaction. Original portrait ratio788:1705, actual sources and original app icon must win over generated approximation during implementation. Do not ship generated product pixels. Header divider remains inset in code even where a generated mock draws it too wide.

No live page changes this round. The square mobile baseline remains rejected and awaiting the user's choice of replacement. Desktop motions and stronger selected tabs remain untouched.


