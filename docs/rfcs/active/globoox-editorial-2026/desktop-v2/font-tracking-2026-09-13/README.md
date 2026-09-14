---
type: reference
status: implemented
owner: design-engineering
last_verified: 2026-09-13
---

# Quality: slightly tighter and darker Russian prose

Implemented at `/landing-editorial#quality` following the user's request for a little negative Russian tracking and a little more weight. This is the current refinement of the [Source Serif / Newsreader pairing](../font-optical-2026-09-11/README.md). The older round remains historical evidence.

Russian prose now uses **weight470 and letter-spacing−0.15px** (previously450 and normal spacing). Its20.2px size, optical size60, baseline overrides and32px leading are unchanged. English keeps19.3px Newsreader360/opsz10. The Russian chapter heading keeps its existing450 font; only paragraph text gets the extra weight/tracking. Original copy, layout, wipe interaction, other sections and app remain unchanged. Existing project visuals are secondary references.

The470 weight is a real static font instance, not synthetic bolding. It adds a restrained amount of ink. Negative tracking−0.15px is roughly0.0074em; the glyphs themselves are not stretched or compressed. Initial variable-font trials covered450/470/480 and tracking from0 to−0.3px. Actual shipped-font trials showed−0.1px resolves the desktop preview, while−0.15px also resolves the full390px excerpt. More negative values did not remove the full desktop's last extra line. We retained the lighter correction to preserve comfortable letter spacing.

## Browser verification

| Viewport width | Collapsed RU / EN lines | Full RU / EN lines |
|---|---:|---:|
| 320 | 10 / 11 | 55 / 55 |
| 390 | 8 / 8 | 40 / 40 |
| 430 | 7 / 7 | 35 / 35 |
| 768 | 4 / 3 | 17 / 16 |
| 800 | 3 / 3 | 16 / 16 |
| 801 | 8 / 8 | 18 / 16 |
| 1024 | 6 / 6 | 14 / 13 |
| 1440 | 6 / 6 | 14 / 13 |
| 1728 | 6 / 6 | 14 / 13 |

The desktop preview improves from7/6 to6/6. Full390px improves from41/40 to40/40, and430px from36/35 to35/35. This is optical/density calibration, not a guarantee of identical wrapping for every viewport. The full desktop remains14/13,768px retains4/3 in the preview, and the narrowest320px preview becomes10/11. Native Russian hyphenation remains browser-dictionary dependent.

Nine widths measured; representative desktop, phone, tablet and breakpoint screenshots visually reviewed. First-line text boxes still align, all original strings match prior records, no horizontal page overflow, and the actual rendered fonts are Source Serif and Newsreader. Hide/Show keeps52% split and256px passage height; Home/End reach0/100 with the same820px prose measure. No browser errors. Component source is byte-for-byte unchanged from the before snapshot; whitespace checks pass.

The prescribed Chrome browser runtime still fails to import its versioned service, so verification used a fresh anonymous installed-Chrome instance through the local Playwright dependency. An initial harness wrote screenshots into the watched repository, during which development styles reloaded and invalidated measurements. Final verification wrote all artifacts to `/tmp` and archived them only after browser completion. These final records contain the intended computed styles and actual custom fonts throughout.

- [Desktop result](evidence/quality-1440-collapsed.png)
- [Phone result](evidence/quality-390-collapsed.png) / [full excerpt](evidence/quality-390-expanded.png)
- [Translation hidden](evidence/quality-1440-hidden.png)
- [Measurements and rendered-font evidence](qa-metrics.json)
- [Spacing trials with the shipped static font](exploration/static-spacing.json)
- [Font provenance](font-provenance.json) / [reproducible build](font-build/build-source-serif-weight.py) / [outline and coverage verification](font-build/source-serif-4-comparison-w470.verification.json)

The new58,372-byte WOFF2 retains532 supported codepoints, Latin/Cyrillic coverage and the OFL license. The450 file remains for the chapter and preserves the earlier implementation. Exact pre-edit CSS/component snapshots are in `before/`. Changed implementation: QualitySection.module.css and the new isolated font only. No original landing/app, billing RFC, commit, push or deploy changes in this round.
