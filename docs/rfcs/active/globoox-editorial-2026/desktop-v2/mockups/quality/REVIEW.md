---
type: reference
status: current
owner: design-engineering
last_verified: 2026-09-05
---

# Quality study — iteration and selection

`quality-v2-initial.png` was rejected for excessive ornamental rules, plant glyphs and disproportionate typography. The refinement prompt removed those devices and requested the original bilingual content in a calm paper spread. `quality-v2-selected.png` is the accepted composition target. Both exact prompts remain alongside the PNGs.

The final implementation uses live canonical text, not generated text pixels. It keeps equal 21px excerpt sizes, original metadata, a center gutter and a single shared expansion control. Two complete sentences appear initially; the untouched full text expands in normal page flow. A separate Show original control retains the comparison behavior. No nested passage scrolling remains.

Browser review aligned the introduction with Team, disabled accidental global hyphenation within this isolated landing, and inspected both collapsed and expanded states. See [actual quality evidence](../../evidence/quality-final.png) and [QA](../../QA.md).
