---
type: rfc
status: implemented
owner: design-engineering
last_verified: 2026-09-05
---

# Desktop V2 — selected design decisions

The selected desktop refinement is implemented and verified at 1440px. This decision record retains the rationale and rejected directions; [QA.md](QA.md) records the completed visual, interaction and engineering checks. Read [DIRECTION.md](DIRECTION.md) first. The [visual review](index.html) pairs the generated studies with actual implemented captures and links the [complete desktop page](evidence/desktop-final.png). Responsive refinement remains deferred; earlier V1 mobile captures do not certify V2.

## Authority and scope

- Completed one polished 1440px desktop view at `/landing-editorial`. Mobile and broader responsive refinement remain deferred in this pass.
- Preserve Header → hero → how-it-works → quality → languages → team → start → Footer. The consent UI remains an overlay.
- Preserve all original English marketing text from `getLandingMessages('en')`, including full passages, names, role labels, links and punctuation. The one selected additive marketing eyebrow is **“A world of books. Open to you.”** It supplements the original hero heading. It does not authorize replacement headlines or a new tagline elsewhere.
- Keep the existing `public/icon.svg`. Use actual `public/screenrecordings/`, source device posters, walkthrough screenshots and founder photographs. Generated pixels do not replace those assets.
- User direction, saved composition reference, current moodboard and these selected studies are the visual authority. Existing project styling and old plans remain secondary. Existing code still governs truthful functionality, source content and block order.
- Keep all changes isolated to the editorial route and its components/styles/assets. The previously documented consent-path exception remains the only shared infrastructure change; this review does not authorize further shared changes.

## Decisions by section

| Block | Selected presentation | Reason and implementation boundary |
|---|---|---|
| Hero | Approximately 1px warm contour, modest radius and shadow; actual recording dominates. Device tabs centered above the screen, Play/Pause visually separate on the same external control row. | The 8px dark pine frame is rejected: it reads as a heavy hardware bezel and competes with the app. Controls above the screen follow the user's latest instruction and supersede the earlier below-screen research suggestion. Preserve the real video and source aspect ratio; do not paint new app chrome over it. |
| How it works | One large complete source screenshot beside three persistent original step instructions. Direct, keyboard-accessible selection changes the image; Step 1 is the initial state. | Both scroll-driven hidden state and three severely cropped screenshots are rejected. No scroll hijacking, sticky progression, auto-advance or forced page movement. All three instructions stay discoverable and normal scrolling remains normal. |
| Quality | Calm facing-text composition with aligned heading/body hierarchy, the existing original/translation relationship, and clear access to the complete source excerpt. | Avoid two unrelated small scroll areas. Every source word and Show original behavior are preserved; both complete passages expand in normal page flow. Generated excerpt pixels and punctuation are not copy authority. Final control behavior is verified in [QA.md](QA.md). |
| Languages | A static, readable availability list of English, Español, Русский and Français, with original English labels and all original future-language labels. | Empty name-switching interaction is rejected. The section communicates availability directly, with equal treatment of current languages. No fake translation example, tab state or added product screen. |
| Team | Four substantial horizontal identity cards in a two-column, two-row layout, using the original natural-color portraits in canonical order. | The grayscale four-column strip is rejected. Each source portrait, name, role and LinkedIn action forms one readable group. Keep real photos and destinations; generated faces are composition-reference pixels only. |
| Start and Footer | A compact closing invitation on the same paper surface, the existing icon and action, restrained botanical echoes and a deliberate footer grouping. | Preserve the full CTA and footer text. Reduce the generator's oversized icon, button and botanical fragments. Avoid a second oversized hero or an arbitrary divider. |

## Shared visual system

Use Newsreader for supporting literary hierarchy and DM Sans for body and controls. The working palette remains paper `#f7f5ed`, pine `#20382f`, sage `#8a967a` and sparing copper `#b87956`. Match the final type scale and spacing across sections in the actual browser; ImageGen output is not an exact font-metrics specification. Keep the product demonstration visually primary. Botanical marginalia frame it from the edges and remain quieter elsewhere.

Use alignment, spacing and measured tonal differences to separate content. Do not introduce arbitrary horizontal rules, repeated card backgrounds or ornamental glyphs throughout the page. Founder cards have a specific grouping purpose; that decision does not imply a card grid for every section.

## Primary-site references

These sites were reopened on 2026-09-05; the local desktop screenshots were captured earlier that day and visually inspected. Observations below are specific compositional references, not claims that each site uses the same playback UI.

- [Bear](https://bear.app/) separates Mac / iPhone / iPad into a lightweight row and presents the editor without an extra dark bezel. This supports independent device selection and a quiet app-window frame. The position above the Globoox screen is the user's chosen placement.
- [Craft](https://www.craft.do/) places a light app window in front of paper collage. Borrow decoration behind the product and the refined serif/sans relationship, while giving Globoox's actual screen more immediate prominence.
- [Readwise Reader](https://readwise.io/read) gives its reading interface substantial visual scale. Borrow product visibility; avoid its overlapping phone/desktop hardware composition and dark color treatment for this direction.
- [Muse](https://sudowrite.framer.website/muse) remains the original primary visual reference for literary consistency and composition. See the [earlier research](../RESEARCH.md) and [moodboard](../moodboard.html) for captured evidence.

## Selected generated studies

1. [Hero](mockups/hero/hero-v2.png)
2. [How it works](mockups/how-it-works/how-it-works-stage.png) · [critique and provenance](mockups/how-it-works/REVIEW.md)
3. [Quality](mockups/quality/quality-v2-selected.png)
4. [Languages](mockups/languages/languages-v2-selected.png) · [critique and provenance](mockups/languages/README.md)
5. [Team](mockups/team/team-v2-cards.png) · [critique and provenance](mockups/team/README.md)
6. [Start and Footer](mockups/start/start-footer-v2.png) · [critique and provenance](mockups/start/README.md)

All six are AI-generated visual studies retained as composition references. Their dimensions vary; none is labeled a 1440px browser screenshot. The completed implementation uses canonical live text and original assets, not generated text, icons, reconstructed product content or reconstructed faces. Actual final browser captures are separately stored in `evidence/` and labeled as implemented results in the review page.

## Verified desktop result

The actual 1440px landing was captured and inspected section by section and as a complete page. Hero device selection/playback, direct walkthrough selection and keyboard access, screenshot enlargement, full excerpt expansion, Show original, source portraits, links and full-page rhythm were verified. Original-copy checks passed for 63/63 canonical strings plus the one additive eyebrow; scoped lint/TypeScript and all 30 existing tests passed. No desktop horizontal overflow was observed.

See [QA.md](QA.md) for the detailed evidence and limits, including [the complete desktop capture](evidence/desktop-final.png), [screenshot enlargement](evidence/screenshot-zoom-final.png) and [original team comparison](evidence/original-team-comparison.png). This is a local desktop implementation, not a deployment or a responsive sign-off. The pre-existing legacy backup-route production TypeScript failures remain outside this task; a new complete production build is not claimed.
