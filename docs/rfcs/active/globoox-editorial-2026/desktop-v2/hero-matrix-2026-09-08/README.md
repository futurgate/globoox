---
type: rfc
status: implemented
owner: design-engineering
last_verified: 2026-09-08
---

# Both branches — complete 5 × 3 visual matrix

Implemented at `/landing-editorial`. The latest explicit request supersedes all older rules that hide a branch. Existing project visuals remain secondary references; selected ginkgo hero plus requested grass and subsequent user corrections are primary authority.

[Open the 15-cell screenshot gallery](index.html) · [Individual review and validation](design-qa.md)

## Composition rules

- Both assets always render: mirrored ginkgo at **240 × 480 CSS px**, grass at **320 × 640 CSS px**. No breakpoint scales either drawing down or hides it.
- A dedicated noninteractive clipping window anchors both plants to the selected recording, ends at its lower edge and keeps exposed stems out of the following block. The opaque recording covers crossing stems. Horizontal viewport cropping is intentional.
- Wide layouts use bottom anchoring with 17% ginkgo / −25% grass overlap. Desktop ≤1100 uses more overlap and a top anchor for grass to preserve its seedhead.
- Desktop ≤900 uses a 32px soft upper mask and lower drawing positions. Its frame has a fluid gutter from 72px to160px, so crossing480/600px no longer makes the frame jump backwards in size.
- Portrait modes ≤600 use top anchors: ginkgo starts64px below the frame top, grass4px above it (the asset includes blank canvas above its seedhead). More overlap keeps both plants visible at full scale. Tablet ≤480 reserves80px total lateral room for its plants.
- At ≤370, Desktop artwork starts at the frame top, clearing the device tabs. This is a nested clearance adjustment within the first matrix band, not an additional matrix row.
- CSS width bands for this botanical matrix: ≤480,481–600,601–900,901–1100,>1100. Three manually selectable recordings in each gives **15 cells**. These are not a claim that the entire landing has only five media-query thresholds.

Canonical copy, Newsreader/DM Sans, italic/sage emphasis, real media/icon, block order, sticky header and initial/manual device-selection behavior are retained. All changes are scoped to ProductRecording.tsx and its CSS Module. No deployment or push.

## Evidence boundaries

Every main matrix screenshot was opened and visually reviewed, not merely measured. Representative widths:390,540,768,1024,1440; viewport height1400, screenshot clipped to hero bottom. Recordings autoplay, so captured app states differ. Additional320px visual checks and boundary geometry are reported separately, not added to the15-cell count. Old “39 combinations” was13 widths ×3 measurements; it did not mean39 visually reviewed matrix cells.

`initial/` preserves defects found during this round. Top-level width-device screenshots are the final captures; `measurements.json` records their DOM geometry. `boundary-measurements.json` records27 extra read-only measurements at320 and immediately around480/600/900/1100. The later ≤370 clearance correction affects clipping only, not those dimensions.
