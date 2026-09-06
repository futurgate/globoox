---
type: rfc
status: active
owner: design-engineering
last_verified: 2026-09-05
---

# Team section — desktop v2 selected layout proposal

This is a new ImageGen layout proposal for the existing Team block, prepared before implementation. It follows the latest user direction to generate a new mock for every block and make art-direction decisions autonomously. It does not authorize changes to the block order, original marketing text, real faces, or existing product pages. See [the active direction](../../../DIRECTION.md).

## Selected proposal

[team-v2-cards.png](team-v2-cards.png) uses four substantial horizontal portrait cards in a two-column, two-row grid. The intro preserves the original heading and full description, arranged as a balanced editorial header. Natural-color portraits, clear names, readable roles, and explicit LinkedIn links form one coherent identity unit per person.

The selection restores the original cards' clear grouping while improving portrait presence, text scale, spacing, and the relationship to the new literary visual direction. The warm ivory surface, pine serif type, restrained copper links, and fine card edges are derived from the user's supplied `download.png` visual reference. The small outer botanical fragment is decorative; it does not replace content.

## Why v1 regressed

The canonical `src/components/landing/FoundersSection.tsx` groups each photo, name, role, and link inside a horizontal card. Its names use 28px type, roles 12px, and LinkedIn links 13px. Photographs retain natural color. Its two-column structure gives each identity enough width.

The first editorial implementation turned this into a four-column portrait strip, converted all photos to grayscale, reduced names to 25px, roles to 9px, and links to 10px, and detached the information from a strong card surface. The larger photographs did not compensate for the weaker role/action hierarchy. The grayscale treatment also removed the warm, human variation present in the supplied source photos. This observation was grounded in the canonical component, all four original photographs, and the saved v1 desktop capture.

V2 preserves the useful grouping of the original. It does not return to the old overall landing style. It replaces the narrow monochrome strip with generous, readable cards that fit the new ivory/pine composition.

## Generation and source provenance

- Tool: built-in ImageGen; one requested independent team-section mockup.
- Exact generation prompt: [prompt.txt](prompt.txt).
- Target design viewport: 1440px desktop; requested section canvas 1440 × 960.
- Actual returned file: 1536 × 1024 PNG, RGB, 1,515,353 bytes. The returned canvas has the same 3:2 ratio. The native image is preserved; this is a 1440px-desktop layout reference, not a falsely claimed exact-size browser screenshot.
- Style reference attached to the generation: the user's `download.png`. Its fabricated hero copy, logo, and screen were explicitly excluded as content sources.
- All four actual photographs were inspected and attached individually, in this order: `public/images/founders/tatiana.webp`, `public/images/founders/anton.webp`, `public/images/founders/kondrat.webp`, `public/images/founders/maxim.webp`.
- Original content authority: `getLandingMessages('en').founders` in `src/lib/landing-i18n/index.ts`.
- No code or existing assets were edited while preparing this proposal.

## Content and identity constraints for implementation

The four founders remain in canonical reading order:

| Position | Name | Role | Link text | Actual image |
|---|---|---|---|---|
| Top left | Tanya Melnikova | Developer & CTO | Tanya's LinkedIn | `public/images/founders/tatiana.webp` |
| Top right | Anton Lomovski | CEO | Anton's LinkedIn | `public/images/founders/anton.webp` |
| Bottom left | Kondrat Kondratenko | Designer | Kondrat's LinkedIn | `public/images/founders/kondrat.webp` |
| Bottom right | Maksim Ilichev | Linguistics Expert | Maksim's LinkedIn | `public/images/founders/maxim.webp` |

Use the source photographs unchanged in the final page. The faces rendered inside the generated mock are layout-reference pixels and must never replace the real files. Preserve the existing profile destinations from the canonical data.

Render the original label, full heading, description, names, roles, and link labels from the existing messages as live HTML. Generated text is a placement reference and is not the source of truth for punctuation or copy.

## Visual inspection and handoff

The returned mock was inspected after generation. It includes all four founders in the requested order, the full original introduction, names, roles, and LinkedIn labels. The photos are in natural color and have equal status; the cards are substantially more legible than the v1 strip. No extra navigation, marketing block, biography, statistics, or invented credentials were introduced.

The overall proposal is selected for art-director review and implementation translation. At the 1440px implementation pass, refine the generated card proportions to the shared page grid, use the original photo crops, and avoid blindly copying ImageGen's larger-than-requested heading size. The intended direction is strong identity cards with readable supporting information, not an oversized heading or a portrait gallery.
