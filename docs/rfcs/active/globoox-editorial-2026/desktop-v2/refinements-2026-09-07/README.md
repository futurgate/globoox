---
type: rfc
status: implemented
owner: design-engineering
last_verified: 2026-09-07
---

# Current result — implemented and desktop reviewed

**Language composition corrected; desktop QA passed.** [Open the local block](http://127.0.0.1:3000/landing-editorial#languages) · [final screenshot](desktop-final.png) · [source / implementation / before comparison](comparison-final.png) · [detailed QA](design-qa.md).

- Tree/current cards are a more compact460×420px assembly with calmer vertical intervals. Text aligns with the canopy independently of the lower group.
- Upcoming paper cards are removed. The original names appear in two18px HTML text rows, with three small progressively growing sprouts on the left, matching the user's supplied direction.
- New asset: `public/redesign/language-garden/seedlings-growth.png`,1402×1122RGBA, produced with built-in ImageGen and copied unchanged. [Exact asset prompt/provenance](seedlings-prompt.txt). Existing tree/paper masters and unused mini-paper files remain preserved.
- [Amended full mock](target.png) was generated before implementation; [exact mock prompt](mock-prompt.txt). It guides composition; canonical text and existing landing fonts take precedence over generated lettering.
- Original text, section order, media and app icon remain unchanged. The code correction affects only LanguagesSection and its CSS Module. Desktop focus1440px; responsive refinement remains deferred.

Checkpoint before this revision: `0d22c81` (all previous isolated landing work). No push or Vercel deployment. Unrelated billing RFC change is excluded and preserved. Prior mini-card instructions and6September QA are historical; this record is the current visual authority.

---

## Preserved initial correction record

# Language composition correction — 7 September 2026

User rejects the implemented composition as weak and asks to remove upcoming-language paper cards. Latest target: retain four current paper cards and the tree, but tighten their composition; future names return to two quiet text rows with three progressively growing sprouts on the left, matching the attached generated crop. Canonical copy and section order remain locked. Old project visuals are secondary. Desktop1440 focus remains.

Checkpoint of all prior editorial landing work: commit `0d22c81`, made before these refinements. No push or Vercel deploy. Unrelated billing RFC edit excluded from the checkpoint and preserved.

Root is generating an amended full-section mock before CSS/markup changes, then will review real1440px browser captures and compare with the target. Only isolated LanguagesSection and its assets change. All previous mocks, baseline, assets and QA are historical and preserved; prior language QA does not establish acceptance of this new revision.

Current status: in progress.
