---
type: implementation
status: implemented
owner: marketing-engineering
last_verified: 2026-10-30
---

# Selected author trial and contact sections

final result: passed

Scope: accepted section 04 (trial) and section 06 (contact plus footer), implemented only on `/authors`. Review by the implementer, followed by root's independent review of both desktop source/render pairs and both 390px captures. No actionable P0/P1/P2 findings remain. Other section concepts are proposals; the elaborate language round was rejected and the typography-only replacement round awaits selection.

## Source and rendered evidence

| Region | Selected source | Browser render | CSS width / density |
| --- | --- | --- | --- |
| Trial | [04.png](../images/04.png), 1832×859 | [selected-trial-1832.png](selected-trial-1832.png), 1832×861 | 1832px / DPR1 |
| Contact plus shared footer | [06.png](../images/06.png), 1639×960 | [selected-contact-footer-1639.png](selected-contact-footer-1639.png), 1639×938 | 1639px / DPR1 |

The source and actual render were opened together in the same comparison input for each section, at identical widths and pixel density. These are section crops without browser chrome or the fixed shared header; the contact crop includes the complete semantic footer. State: Russian canonical copy, loaded fonts/images, cookie banner dismissed, controls at rest. Heights were not stretched to force equality. The small contact/footer height difference retains the shared footer's native typography and spacing.

Additional actual renders were visually reviewed at 320,390,768,1024 and1536px: `selected-trial-{width}.png` and `selected-contact-footer-{width}.png` in this directory. [Trial 390](selected-trial-390.png), [contact/footer 390](selected-contact-footer-390.png), [trial 320](selected-trial-320.png) and [contact/footer 320](selected-contact-footer-320.png) show stacked mobile content and fully visible books. Full-size desktop images made the lettering, linen, rules and button edges readable; separate focused crops were unnecessary. Generated standalone assets were also inspected before placement.

## Comparison and fixes

- Initial trial review found an extra body line at source width and a section roughly 73px taller than the reference. Reduced image/frame spacing and widened the desktop paragraph; the final 1832×861 render restores a single body line, two-line heading and source-like action position. Intermediate widths use balanced paragraph lines; measured text ends before the image at 768/1024/1536/1832.
- Initial contact review found copy about 40px high and the book about 4% small. Adjusted copy placement and image size/offset. The final source-width render aligns the title, action, full book and inset footer rule closely with 06.
- Revised desktop source/render pairs were compared again. Mobile and tablet renders show no copy/book overlap, clipped controls, horizontal overflow or excessive illustration scale. Root independently accepted the final proportions and responsive stacking.

## Required fidelity surfaces

- **Typography:** existing Lora headings and Inter prose/actions remain native HTML. Hierarchy and wrapping follow the selected mocks; small generated-versus-real glyph differences are accepted. Image-bound `Глава 1`, `Ваша книга` and `Globoox` remain inside the generated artwork.
- **Spacing/layout:** parchment trial with inset upper/lower rules, left copy/action and right chapter proof; forest closing with left cream headline/action, upright book and rightward arcs. The existing footer keeps its fleuron/copyright below one inset rule. Mobile stacks copy before the illustration with clear margins.
- **Color/tokens:** native parchment, forest and terracotta tokens remain. Root accepted flat CSS backgrounds instead of baked mock texture; slightly brighter closing arcs do not warrant another iteration.
- **Image quality:** two built-in ImageGen reference edits provide actual RGBA transparency, faithful linen/embossing, chapter sheet/ribbon and book/arcs. Rendered on light/dark backgrounds without a rectangular background or visible halo. No handcrafted decorative SVG or CSS drawing was substituted. Exact prompts, generated source paths, alpha bounds and hashes: [asset-trial.json](asset-trial.json), [asset-contact.json](asset-contact.json). Combined assets: 4,009,045 bytes.
- **Copy/content:** exact canonical trial/contact headings, description and button labels are retained. No invented marketing/legal text, footer mission or wordmark. Team, publishers, main landing, hero, archive and unselected sections remain preserved.

## Functional evidence and limits

[selected-checks.json](selected-checks.json) records 14 layout cases, six mouse/Enter/touch activations with the correct `lomovski@globoox.co` contact/trial subjects, visible keyboard focus, four paragraph-clearance checks and publisher/main/archive isolation. Mailto URIs were intercepted before opening any external application; no message was sent. No browser page errors, horizontal overflow or copy/book overlap. Scoped ESLint and diff checks passed.

The preferred in-app browser host was unavailable; actual headless Chrome rendering and interactions provided the evidence. No production build, broad regression rerun, commit, push or deployment was performed. Prior repository-wide type/lint limitations remain outside this scoped change. No further visual fix is required; later language selection is separate work.
