---
type: reference
status: current
owner: design-engineering
last_verified: 2026-09-06
implementation:
  - src/app/landing-editorial/page.tsx
  - src/components/landing-editorial/EditorialLanding.tsx
  - src/components/landing-editorial/ProductRecording.tsx
  - src/components/landing-editorial/HowItWorksSection.tsx
  - src/components/landing-editorial/QualitySection.tsx
  - src/components/landing-editorial/LanguagesSection.tsx
  - src/components/landing-editorial/TeamSection.tsx
evidence:
  - design-qa.md
---

# Globoox editorial landing preview

**Current language implementation, 2026-09-06:** `/landing-editorial#languages` now renders Orchard: a sparse tree bearing four available-language cards, with miniature upcoming-language cards beside seedlings. Seven transparent PNG assets supply three large paper surfaces, two miniature paper surfaces, the tree, and seedlings; every name remains live HTML from `getLandingMessages('en')`. This is a static illustration and semantic availability list, with no language-selection control. Read the [implementation record](../../rfcs/active/globoox-editorial-2026/desktop-v2/refinements-2026-09-06/language-garden/implementation/README.md) and [current language QA record](../../rfcs/active/globoox-editorial-2026/desktop-v2/refinements-2026-09-06/language-garden/implementation/design-qa.md) for verification status. This notice does not assert QA sign-off.

All older no-implementation, paper-index-baseline-live, and language-selection descriptions below are historical and superseded. Their snapshots and evidence remain preserved. The replacement is isolated to the language block; canonical copy, section order, the original landing, and the product remain unchanged. Existing project visuals stay secondary design references, and 1440px desktop remains the current focus.

**Active refinement, 2026-09-06:** the language section now uses a simple paper availability index, retained by the user as a **baseline only**, while three further ImageGen compositions are being explored. It uses canonical language strings as HTML, without a generated illustration or duplicated native names. Upcoming names share one “soon” label. Founder cards now borrow the original compact 78px portrait layout at the user's request. See the [current record and baseline snapshots](../../rfcs/active/globoox-editorial-2026/desktop-v2/refinements-2026-09-06/README.md). Earlier language/team descriptions and captures below are historical.

**Current: Desktop V2, verified at 1440px.** Read the [V2 direction](../../rfcs/active/globoox-editorial-2026/desktop-v2/DIRECTION.md), [selected decisions](../../rfcs/active/globoox-editorial-2026/desktop-v2/DECISIONS.md) and [current QA](../../rfcs/active/globoox-editorial-2026/desktop-v2/QA.md). Responsive refinement is deferred. The description below preserves the original V1 record; superseding behavior is listed here.

- Header and hero retain all original copy; the only additive marketing eyebrow is “A world of books. Open to you.”
- Device tabs sit above the real recording, with separate Play/Pause and a thin warm contour.
- `HowItWorksSection` shows one complete original screenshot beside three directly selectable steps, with keyboard navigation and an original-size modal viewer. No scroll-driven progression.
- `QualitySection` initially shows two complete sentences from each canonical excerpt. One control expands both full original passages in page flow; there are no nested excerpt scrollers. Show original remains.
- Languages are a static availability list. No name-switching interaction.
- `TeamSection` uses natural-color original portraits in two-by-two horizontal cards.
- Footer and closing CTA use the full original text; botanical framing is restrained.

## Historical V1 implementation record

The following text and referenced V1 evidence are retained for history. For current behavior, use the V2 specification above.

`/landing-editorial` is an isolated English presentation of the canonical Globoox landing. It consumes `getLandingMessages('en')` verbatim and preserves Header → hero → how-it-works → quality → languages → team → start → Footer. It uses the original app icon. `/`, localized landings, and the reading app keep their existing visual implementation.

## Authority and implementation

Read [the task direction](../../rfcs/active/globoox-editorial-2026/DIRECTION.md) and [specific brief](../../rfcs/active/globoox-editorial-2026/DESIGN-BRIEF.md) before changing the design. The task-specific direction is the visual authority; older brandbook/planning material is a secondary visual reference. Original copy, actual media, routes, and behavior remain authoritative. Generated product concepts are archived and must not replace the real recordings.

`EditorialLanding` owns the header, responsive menu, six content sections, native screenshot dialog and consent presentation. Dedicated CSS Modules contain the visual rules. `ProductRecording` renders one selected original H.264 file with its existing poster, keyboard device tabs and Play/Pause. Narrow screens initially select the phone recording. Automatic playback pauses offscreen/when hidden and respects reduced motion.

Walkthrough images come unchanged from `/images/how-it-works/`. The quality comparison uses the original Luria passages. Language selection changes the displayed native language name. Original team photographs/links and upload destinations are retained.

Newsreader and DM Sans fonts, their licenses, and the generated decorative botanical PNG live under `/redesign/`. No generated screen, cover, or reference-site screenshot is loaded by the landing. Metadata marks the preview `noindex, nofollow`.

The necessary shared infrastructure change is one additional `landing-editorial` alternative in `src/instrumentation-client.ts`'s existing landing-consent regex. Original route matches remain unchanged. The isolated banner uses the existing consent utility and PostHog opt-in/out APIs, so consent is respected before hydration as well as after a choice.

## Review locally

Run `npm run dev -- --webpack --port 3000`, then open `http://localhost:3000/landing-editorial`. Webpack was used because this environment's initial Turbopack dev process did not answer HTTP requests.

The portable [moodboard](../../rfcs/active/globoox-editorial-2026/moodboard.html) includes actual reference captures, source links, type/color directions, and unchanged product stills. Serve its folder with `python3 -m http.server 8766 --directory docs/rfcs/active/globoox-editorial-2026` and open `http://127.0.0.1:8766/moodboard.html`.

[Final QA](../../../design-qa.md) records responsive/interaction evidence and the unrelated existing legacy backup TypeScript errors that stop the repository-wide production build after successful compilation.
