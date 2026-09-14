---
type: reference
status: historical
owner: design-engineering
last_verified: 2026-09-10
---

# Design QA — mobile portrait chapters, 2026-09-10

**Final result: passed for this implementation.** No actionable P0/P1/P2 mismatch remains against the selected composition plus the user's divider/sticky amendments. This scope does not certify unrelated landing sections or physical-device Safari behavior.

## Target and normalization

Source: `../mobile-portrait-options-2026-09-10/01-continuous-chapters.png`, displayed option 1, explicitly selected by the user. Native output is 848×1855px, despite the prompt's 390×1120 CSS-px framing. Normalize source width to 390px without distortion. Actual capture is 390×1120px, device scale 1, light theme, same route/section and first-step state.

`source-comparison.png` places these side by side in one comparison input, with unused source height gray. Both were visually reviewed together. This is concept fidelity, not a pixel-cloning claim: the mock changes app pixels/proportions; real 788:1705 sources and current fonts/icon are explicitly authoritative. Actual header is the retained 84px header. The larger true portrait and newly requested title padding/rule make the first chapter taller than the generated concept. Whole image and next caption are visible in the tall capture.

## Required fidelity surfaces

- Typography: existing loaded Editorial Newsreader headings and Editorial DM Sans labels retained. Section title 40px (35px below 360px); episode titles 32px (29px below 360px). Long Step 2 remains fully readable across two lines at standard mobile widths. No rewritten copy.
- Layout: one text column with centered full portraits, 60px episode gaps / 52px narrow override. Content rule inset; no extra separator between episodes. At 320px, both title and frame fit without horizontal overflow. At 768/800px, maximum widths avoid oversized portrait media.
- Colors: existing paper #f7f5ed, forest #20382f, sage and #dadccd rule; opaque sticky heading prevents media bleeding through its text.
- Images: original upload, language-menu and translated-reader WebPs, all 788×1705; proportional `height:auto`, no source crop/stretch. 300px frame maximum, 298px image content inside its border; 280/278px at 320px viewport. Real image quality/rounding verified visually in full-size captures, including source bottom home indicators.
- Content: exact How it Works / Three simple steps / Step 1–3 labels and original descriptions. Original alt text retained. No invented product interface.

At 390px full-width side-by-side review, headings, thin frame and UI details are sufficiently readable; no extra isolated crop is needed. The Step 2 and Step 3 full-size captures provide focused checks of long text and sticky release.

## Scroll and viewport verification

Chrome viewport matrix, all device scale 1:

| Viewport | Layout | Result |
| --- | --- | --- |
| 320×780 | Mobile, 35px heading / 280px frame | Fits; pins at 84px; pushes/reverses with 52px clearance |
| 390×600 | Short mobile viewport | Native page scroll; complete images remain in flow; 60px clearance |
| 430×932 | Mobile | Fits; pins/pushes/reverses correctly |
| 768×1024 | Mobile tablet width | Centered 420px text column / 300px frame; correct sticky behavior |
| 800×1000 | Last mobile width | Mobile chapters visible; desktop stage hidden |
| 801×1000 | First desktop width | Existing two-column sticky Fade/Stack stage; mobile lists hidden |
| 1440×1000 | Desktop | Existing composition, motion controls and stronger selected step intact |

All seven entry screenshots were opened and inspected. `geometry.json` records seven scroll states at each of five mobile sizes (entry, first/second pinned, third push, +40px, reverse40px, released), plus desktop computed layout states. Heading stays exactly at84px during Steps1/2. During release,40px of page scroll moves the heading40px; reversing40px restores the previous coordinates exactly. Heading bottom stays52/60px above Step3 label. Zero document horizontal overflow in every viewport.

Additional390×844 screenshots show Step2, Step3 approach, push and release;390×1120 shows the full first chapter and following caption. Screenshot sets include the local Next developer indicator, which is not landing UI. Browser error console is empty. Mobile menu navigation from Step3 back to How it Works was also exercised: menu closes, the page scrolls smoothly (sampled positions2009→1511→1274→1154→1081.5→1046.5), and the section settles108px below the top.

Native HTML semantics checked in the accessibility snapshot: one section h2, three ordered step h3s, complete original alt text, no hidden desktop tabs exposed on mobile. Two valid lists (`role=list`, final `start=3`) are a minor semantic tradeoff for a native containing-block boundary; labels preserve the full Step1/2/3 sequence. Independent source review found no blocking accessibility/scope/desktop regression.

## Checks and limitations

- Scoped ESLint: passed.
- `git diff --check` on edited component/CSS/AGENTS: passed.
- Local Next route rendered and images loaded.
- Whole-project `tsc --noEmit` still fails only in existing duplicate `.next/types/routes.d 2.ts` declarations and missing props in `landing-backup` / `landing-backup-2`. No new diagnostic points to this component. Those unrelated files were not changed.
- Chromium emulation only; no physical iOS/Safari verification claimed.

No deploy. Earlier square-crop QA is superseded only for mobile How it Works; prior desktop motion evidence remains valid.
