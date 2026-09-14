---
type: rfc
status: implemented
owner: design-engineering
last_verified: 2026-09-08
---

# Visual QA — both botanicals

**final result: passed for this botanical composition scope**

Root personally inspected all15 final captures. There was no independent-agent review in this round. This is a sampled width-band review, not proof of every pixel width or every physical device/browser.

## Individual findings

| Width band / sampled viewport | Selected recording | Visual finding | Evidence |
|---|---|---|---|
| ≤480 / 390px | Desktop | Both large edge fragments remain visible; soft upper crop clears tabs, lower stems stop at frame. | [Screenshot](390-desktop.png) |
| ≤480 / 390px | Tablet | Both plants visible; top anchor preserves grass seedhead, opaque recording covers crossing stems. | [Screenshot](390-tablet.png) |
| ≤480 / 390px | Phone | Large ginkgo left and grass right; intentional viewport crop, controls and recording clear. | [Screenshot](390-phone.png) |
| 481–600 / 540px | Desktop | Fluid 453px frame preserves both plant margins; no dangling stems or tab overlap. | [Screenshot](540-desktop.png) |
| 481–600 / 540px | Tablet | Ginkgo leaves and intact grass seedhead frame the tablet; no control overlap. | [Screenshot](540-tablet.png) |
| 481–600 / 540px | Phone | Both full-scale plants surround the narrow recording; no miniature treatment. | [Screenshot](540-phone.png) |
| 601–900 / 768px | Desktop | Fluid 624px frame keeps the product dominant; soft upper crop avoids a hard botanical seam. | [Screenshot](768-desktop.png) |
| 601–900 / 768px | Tablet | Both nearly complete plants anchor to actual tablet edges; leaves pass behind recording. | [Screenshot](768-tablet.png) |
| 601–900 / 768px | Phone | Both full-size plants; upper grass remains clear of CTA and tabs. | [Screenshot](768-phone.png) |
| 901–1100 / 1024px | Desktop | Corrected grass top anchor preserves the seedhead; both plants remain visible at viewport edges. | [Screenshot](1024-desktop.png) |
| 901–1100 / 1024px | Tablet | Both plants cluster around the actual portrait frame, with no abrupt upper clipping. | [Screenshot](1024-tablet.png) |
| 901–1100 / 1024px | Phone | Full-scale balanced cluster; heading, controls and recording remain unobstructed. | [Screenshot](1024-phone.png) |
| >1100 / 1440px | Desktop | Mirrored ginkgo and meadow grass flank the 960px real recording, matching selected direction. | [Screenshot](1440-desktop.png) |
| >1100 / 1440px | Tablet | Full-size plants surround tablet, with stable independent headline and control layout. | [Screenshot](1440-tablet.png) |
| >1100 / 1440px | Phone | Full-size plants surround phone; grass clears CTA and the source recording stays readable. | [Screenshot](1440-phone.png) |

## Corrections made during review

1. Removed exposed, abruptly cut lower stems beneath the recording by ending the artwork window at the frame bottom.
2. Preserved grass seedheads on narrow portraits and1024/Desktop using top anchors instead of clipping their tops.
3. Replaced stepped narrow Desktop frame widths with a continuous gutter; recaptured and reviewed540/Desktop and768/Desktop after that change.
4. Extra320/Desktop visual review caught ginkgo crossing the device-tab area. Removed headroom at≤370, recaptured and confirmed the tabs are clear. Both plants remain visible.

## Additional checks (separate from15 cells)

- Visually reviewed [320/Desktop](extra-320-desktop.png), [320/Tablet](extra-320-tablet.png), [320/Phone](extra-320-phone.png). Both plants remain large and visible. A manually selected Desktop recording on a small viewport naturally has small text; automatic initial selection uses Phone there.
-27 geometry measurements: three selections at320,480,481,600,601,900,901,1100,1101. No horizontal overflow, both images loaded/displayed, fixed240×480 and320×640 dimensions. Desktop frame widths across boundaries:408→408.75,498→498.75,740→741,940→941px.
- All three tabs were manually exercised across every main width. Real recordings loaded and played; final read showed muted/looping video, readyState4 and paused=false.
- Scoped ESLint and landing-entry TypeScript pass (zero diagnostics). Documentation validation passed (70 governed files); git diff --check passed. No full production build, physical-device testing, deployment or push claimed.

## Fidelity review

- **Layout:** selected source hero retained; plants adapt around the actual device frame. Narrow frame gutters intentionally amended to satisfy both-branches requirement.
- **Typography:** original families, copy, hierarchy, italic and sage ending retained; no type redesign in this round.
- **Color and material:** existing ivory/green palette, multiply-blended botanical PNGs and thin frame retained.
- **Assets:** original generated plant assets used at fixed scale, ginkgo mirrored; actual product recordings preserved.
- **Behavior:** decorative layers ignore pointer events; sticky header and initial selection logic untouched; manual device switching exercised in all15 cells.

Earlier screenshots and39-measurement claims remain historical. Only this round establishes full15-cell visual coverage for the latest both-branches requirement.
