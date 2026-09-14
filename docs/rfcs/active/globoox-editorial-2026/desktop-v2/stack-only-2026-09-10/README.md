---
type: reference
status: historical
owner: design-engineering
last_verified: 2026-09-10
---

# Stack selected; Fade archived — 2026-09-10

User selects Stack as the sole live desktop walkthrough and requests immediate left-step selection at a scroll boundary. Implemented only in the isolated landing components.

## Live behavior

Stack retains the exact previous scroll mapping, opacity, translation and scale. Left steps switch instantly at progress 0.265 and 0.735 (the transition midpoints). Background, text, marker and arrow all follow aria-selected; computed transition duration is 0s. There is no continuous step-weight interpolation. Forward and reverse selection use the same boundaries.

Removed the comparison controls, mode state/type/argument, Fade branch and mode-specific styles/attributes from live code. Screenshot size remains the same; the stage centers naturally without the control row. Original media, words, fonts, desktop tab navigation and mobile portrait/sticky structure are retained.

## Archive and restoration

The three *.before.txt files are exact pre-edit snapshots of HowItWorksSection.tsx, its CSS Module and walkthroughMotion.ts. They include the complete working Fade/Stack comparison, and are documentation artifacts outside the runtime import graph. Earlier walkthrough-motion-options-2026-09-10 contains the original motion QA and screenshots.

To experiment with Fade later, port the archived Fade mapping and deck styling into an isolated experiment. If restoring the complete comparison UI, merge the archived three files together rather than overwriting current files blindly; preserve any subsequent mobile and navigation corrections. No restoration is authorized by this record.

## Verification

- Scoped ESLint passed for component and mapping.
- Compared 1,001 progress samples: live Stack card values match archived Stack exactly.
- Browser checked 0.264/0.266 and 0.734/0.736, reverse to0.734, steady0.5 and0.95: only one selected background/marker, instantaneous selection, continuous Stack geometry.
- Only three step buttons remain in desktop section; no comparison buttons.
- Visually reviewed1440×1000 and801×700: stack edges and full frame fit. No horizontal overflow in narrow desktop. desktop-final.png records final third step.
- Mobile390px regression retains full portraits and native sticky heading.
- No new whole-project TypeScript pass claimed; existing generated-route/backup-page errors are documented in the previous round.

No commit, push or deployment. Earlier statements that both modes remain live are superseded history. Existing project visuals remain secondary references.
