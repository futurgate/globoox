---
type: rfc
status: implemented
owner: design-engineering
last_verified: 2026-09-08
---

# Smooth navigation and focus QA

**final result: passed for the requested interaction correction**

## Browser evidence

- [Upward travel samples](upward-travel.json):61 distinct scroll positions observed; Step3 remains unchanged while navigation is paused. Final separate read confirmed scrollY0, pause removed and Step1 restored.
- [Downward travel samples](downward-travel.json):60 distinct intermediate positions while travelling to Languages; Step1 remains unchanged during the trip. After settling, Languages top measured120.01px and pause=false.
- [Mobile travel samples](mobile-travel.json):62 distinct positions on390×844 navigation to Team; menu closes and step remains fixed during travel. Final read confirmed target visible and pause=false.
- [Interruption samples](interruption.json): manual wheel input cancels the active trip; final pause=false. The page remains at the user-selected position instead of continuing to its former destination.
- Return to How it works settles on Step1. A manual440px scroll then activates Step2: normal walkthrough behavior resumes.
- Pointer click on Tablet: selected=true, focused=false, focus-visible=false, outline=none. Selection underline remains intentional.
- Pointer-opened language select: outline=none while the native menu works. Initial testing found Escape restored an unwanted ring; corrected and retested: activeElement=BODY, selector outline=none after Escape.
- Keyboard Tab onto the selected Tablet tab: visible solid outline. ArrowRight selects Phone and retains the outline. Keyboard return to the language selector: activeElement=editorial-locale, solid outline.

Observations run through the browser UI. Travel observation began before the click because single post-click reads can miss animation. `desktop-travel.json` is the earlier post-click-only observation, not evidence of instant navigation; use upward/downward/mobile files for motion evidence. No claim of a repeated15-cell botanical review in this interaction-only round.

Scoped ESLint and landing-entry TypeScript pass (zero diagnostics). Documentation validation passed (76 governed files); git diff --check passed. No production build, deployment or physical-device test claimed.
