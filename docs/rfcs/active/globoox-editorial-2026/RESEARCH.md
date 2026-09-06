---
type: rfc
status: implemented
owner: design-engineering
last_verified: 2026-09-05
---

# Globoox editorial redesign — reference research

## Authority and scope

Read [DIRECTION.md](DIRECTION.md) first. The user's brief, supplied conceptual images, live Muse reference, and this task's moodboard and design brief are the primary visual direction. Existing project design documents and old landing material are **secondary visual references only**. Existing code remains authoritative for real features, truthful copy, and the preserved landing block order.

**Final product-evidence authority: use the existing recordings in `public/screenrecordings/`, their posters, and the existing walkthrough screenshots. Do not ship the fictional reader or generated book cover.** Actual product media is a primary source even though older project styling remains a secondary visual reference. Botanical framing remains permitted decoration outside the real screen.

**Authoritative user correction: preserve every original marketing string from `getLandingMessages('en')` verbatim and use the existing `public/icon.svg` app icon.** This is a presentation redesign. No new tagline, shortened headline, rewritten description, or replacement brand icon is proposed. “The reading room” names the internal art direction only. Any earlier copy-rewrite suggestion is superseded by this correction.

The supplied Globoox images depict generated product ideas. They do not establish implemented features, supported formats, translation quality, or device availability. The final landing demonstrates the real product through its original recordings/screenshots, without inventing a new screen or changing the original marketing text.

Research checked live official pages on 2026-09-05. Font names below are stated only when verified in official CSS. Design transfers are our interpretation, not claims made by the reference brands.

## User-supplied conceptual images

The five attachments are valuable for the relationship between reading and interface: ivory page surfaces; pine-colored navigation; fine rules; serif book text; modest sans-serif controls; natural shadow; and a visibly aligned original/translation pair. The strongest compositions make one large reading surface dominant and use a smaller language control as supporting evidence.

The references also reveal pitfalls to avoid in composition. Several device arrangements reduce text to miniature texture. The fourth attachment includes multiple detached control panels, which can become competing focal points. The first image presents six app states; that is historical product-flow inspiration, not permission to expand the existing three-step landing section. Generated artifacts include unsupported formats and uncertain details. The earlier plan to rebuild a fictional reader in HTML is superseded: frame the actual video/screenshots without repainting their UI.

## Capture ledger

Capture target: a 1440 × 1000 desktop viewport, browser zoom 100%, normal site rendering. A reference is accepted for the visual moodboard only after its saved PNG has been opened and inspected. Full-page images may supplement a viewport but must not replace a legible product detail.

| Reference | Official URL | Local evidence | Status |
| --- | --- | --- | --- |
| Muse — primary | https://sudowrite.framer.website/muse | [Hero](references/muse-hero.png), [comparison](references/muse-comparison.png) | Inspected and accepted |
| Craft | https://www.craft.do/ | [Hero](references/craft-hero.png) | Inspected and accepted |
| Daylight | https://daylightcomputer.com/ | [Hero](references/daylight-hero.png) | Inspected and accepted for natural framing |
| Readwise Reader | https://readwise.io/read | [Hero](references/readwise-hero.png) | Inspected and accepted for product hierarchy |
| Bear | https://bear.app/ | [Hero](references/bear-hero.png) | Inspected and accepted for restraint |

All six files are actual 1440 × 1000 browser captures and were opened with `view_image`. The root agent captured them through Chrome DevTools because the in-app browser runtime was unavailable and a second agent's connector could not acquire the same browser profile. This research author inspected every saved artifact. Screenshot contents are retained as observed, including the Daylight promotional and newsletter panels.

## Selected references

### 1. Craft — tactile editorial presentation around a real workspace

[Official landing page](https://www.craft.do/).

The capture shows a black serif headline on textured sky blue, restrained sans-serif navigation, torn-paper layers, and the top of the app workspace. The paper collage surrounds the product without becoming part of its controls. The app enters low in the viewport, so this is a material/typographic reference rather than the exact desired Globoox hero proportions.

**Transfer:** an expressive serif treatment of the full original headline and quieter functional text; a large reader surface; restrained paper or book-inspired framing repeated coherently through feature sections. Make material and color belong to one system.

**Avoid:** multiple equally loud floating UI cards, excessive collage, or an ornamental hero in which visitors must search for the product.

**Accepted evidence:** the opening composition with the workspace entering the lower third. That limitation informs Globoox's earlier and larger real-media presentation.

### 2. Daylight — organic framing with a meaningful reading context

[Official landing page](https://daylightcomputer.com/). Supplementary primary attribution: [the creator's case study](https://basement.studio/showcase/daylight-simplicity-in-motion).

The capture presents a large tablet among moss, leaves, and soft shadows; its screen contains a botanical specimen. The hero headline is a light sans serif. The flared serif is visible in secondary promotional/newsletter panels; official CSS declares ABC Arizona Flare and ABC Room. The natural setting relates directly to the device's use.

**Transfer:** an organic perimeter around a precise product surface, warm light, concise typography, and one clear focus. For Globoox, a faint natural-history specimen or page shadow can direct attention inward toward bilingual reading.

**Avoid:** heavy hardware framing, a lifestyle photograph that obscures interface content, or importing this hardware product's health and display claims.

**Accepted evidence:** the opening device composition for organic framing. The screen shows a botanical specimen, so this is not treated as book-reading evidence.

### 3. Readwise Reader — category-specific product clarity

[Official landing page](https://readwise.io/read).

The hero capture uses a bold sans-serif headline, salmon emphasis, a dark blue/purple backdrop, and large desktop/mobile product views. Its official stylesheet also defines Charter, but the captured hero is not evidence of serif headline treatment. This is a useful product-scale and category-clarity reference, not Globoox's color or display-type direction.

**Transfer:** a legible view of the actual reading screen and recorded language-selection action. Use real product media at a useful scale; do not invent an aligned-column UI to imitate a concept.

**Avoid:** a large feature inventory and productivity-heavy density. Globoox's preserved structure should remain calm and specific.

**Accepted evidence:** the hero's large desktop/mobile product views. The board uses it for product scale, not Globoox's color or serif direction.

### 4. Bear — restraint and interface-led section rhythm

[Official landing page](https://bear.app/).

The page uses short headings, custom sans-serif typography, device-specific product views, and visible theme demonstrations. Official CSS declares Bear Sans and Bear Sans Headline families. Its concise feature introductions let the interface carry much of the explanation.

**Transfer:** a restrained visual treatment of the unchanged section introductions, generous separation, consistent interface crops, and theme colors demonstrated inside the product. This is a useful counterweight to the more expressive Muse and Craft references.

**Avoid:** mascot imitation, introducing new feature lists, or allowing a device bezel to become larger than the meaningful screen area.

**Accepted evidence:** the hero with device selector and visible editor, used for restraint and interface scale.

## Supporting references and rejected directions

- [Capacities](https://capacities.io/): verified current hero contains a daily-note screen with connected objects and the page explains contextual workflows. Keep as a reserve for connecting a benefit to a visible interaction. Its long problem/solution narrative is not the structure for Globoox.
- [Ulysses](https://ulysses.app/en/): a relevant literary software comparison for large product demonstrations, library presentation, and restrained sections about writing across devices. Secondary to the selected palette and illustration references.
- [mymind](https://mymind.com/) and [Are.na](https://www.are.na/): researched but excluded from the main visual board. Their conceptual/editorial emphasis risks making the exercise more about a brand manifesto or typography than a readily understood reader.

## Synthesis for Globoox

Chosen internal art direction: **The reading room**. This is a study name, not a new Globoox name or landing tagline.

Muse supplies visual coherence and marginal ornament. Craft supplies tactile editorial warmth. Daylight supplies organic framing. Readwise supplies product explanation. Bear supplies restraint. These are compositional lessons, not a set of components to copy.

1. **Actual product first.** A large existing product recording is the main visual object. Preserve its UI and aspect ratio. Original headline second; ornament third.
2. **Two landing type voices.** A literary serif for unchanged headings and original comparison text; a quiet sans for landing navigation, labels, and media controls. Do not replace fonts inside the recorded app.
3. **A small material palette.** Warm paper, deep forest ink, muted sage, and a sparing copper accent. Reading surfaces and actions determine color roles.
4. **Compositional ornament.** Outer-edge marginalia can bend or point toward the screen. No ornament behind important labels, paragraphs, or buttons. It must also crop gracefully on mobile.
5. **Consistent evidence sources.** Use the original desktop/tablet/phone recordings and their posters in the hero. Use the three actual walkthrough images for upload, language selection, and translated reading. Preserve what the sources show even when their books differ.
6. **Original copy, verbatim.** Typography and composition adapt to the existing hero, headings, descriptions, comparison sample, language content, team text, calls to action, footer, and navigation. Consume `getLandingMessages('en')`; do not shorten or paraphrase. Earlier example lines are superseded. Additional UI labels are limited to those needed to operate the new preview.
7. **Relevant generated art only.** A specified botanical specimen or book-related editorial frame can support this direction. Arbitrary landscape art, generic AI blobs, and unreadable generated UI do not satisfy the task.

## Screenshot review notes

| File | Observed evidence | Globoox decision |
| --- | --- | --- |
| `muse-hero.png` | A wreath-like perimeter of excerpt cards, paper tone, bookish serif text, delicate shadows, a clear central message and CTA. No botanical branches appear in this captured viewport. | Borrow the enclosing composition and material consistency; put a large readable screen in the center rather than a ring of prose cards. |
| `muse-comparison.png` | Two differently treated sample sheets, a shared palette, light annotations, selective yellow emphasis, and generous negative space. | One carefully chosen comparison can explain the product. Do not copy competitor claims or add a new comparison block. |
| `craft-hero.png` | Serif headline and quiet UI against textured blue; torn-paper layers frame a recognizable workspace beginning near the lower third. | Preserve type/material coherence, increase the reader's share of Globoox's opening viewport, and reduce collage complexity. |
| `daylight-hero.png` | Natural moss/leaf field, large botanical tablet screen, light sans headline, amber actions; extra panels make the perimeter busy. | A strong organic-framing reference. No claim that it demonstrates readable book UI. Keep Globoox's perimeter quieter. |
| `readwise-hero.png` | Bold sans headline, dark gradient, distinct CTA, large screen with a smaller mobile view. | Borrow obvious product hierarchy. Reject dark sci-fi gradients and heavy feature density for this direction. |
| `bear-hero.png` | White canvas, modest colored marks, short sans headline, simple device choice, a large recognizable editor. | Borrow restraint and generous app scale. Bring the meaningful reader content higher than this capture's lower-half app placement. |

The source user praises botanical elements on Muse, but the two captured Muse viewports demonstrate paper-card framing and coherent ornament rather than literal branches. The board keeps that distinction explicit; Daylight provides captured botanical evidence.

## Generated composition study and preserved identity

[hero-concept.png](hero-concept.png) is an archived AI-generated composition reference, inspected locally. Only broad placement, paper tone, and botanical framing remain relevant. **Its fictional product screen, generated book cover, headline, supporting copy, navigation, CTA wording, and replacement icon are superseded. None is a product, text, or brand source.** The final layout uses actual product media, the full original landing strings, and `public/icon.svg`.

The board's [local app icon](references/globoox-icon.svg) is a byte-identical copy of `public/icon.svg`, included only so the standalone artifact remains portable. It is not a new brand asset. The invented book outline used in the first board draft has been removed.

The original [desktop board QA capture](qa/moodboard-desktop.png) was visually inspected but predates the final copy/icon/media corrections, so it is superseded evidence. The [final moodboard capture](qa/moodboard-final.png) was also opened and inspected: it shows the unchanged app icon, original-copy specimen, actual product-media row, and clearly archived generated study. Use the final artifact for evaluation.

## Actual product evidence — final selection

All six source stills below were opened and visually inspected. The board copies are byte-identical to the originals; no generated UI, replacement text, or filters were applied. The posters show the actual app reading Tocqueville in French. The walkthrough screenshots show upload, a language menu, and a Spanish reading view of Darwin. These different books are retained as genuine source content.

| Board file | Authoritative original | Observation / final use |
| --- | --- | --- |
| [mac.webp](references/mac.webp) | `public/images/device-posters/mac.webp` | Actual wide reading spread; poster for `mac_screen_record_1280w_h264.mp4` |
| [ipad.webp](references/ipad.webp) | `public/images/device-posters/ipad.webp` | Actual portrait tablet reading view; poster for `ipad_screen_record_768x1170_h264.mp4` |
| [iphone.webp](references/iphone.webp) | `public/images/device-posters/iphone.webp` | Actual phone reading view; poster for `iphone_screen_record_540x1170_h264.mp4` |
| [1.1.webp](references/1.1.webp) | `public/images/how-it-works/1.1.webp` | Actual EPUB upload modal over My Books; first walkthrough step |
| [2.1-en.webp](references/2.1-en.webp) | `public/images/how-it-works/2.1-en.webp` | Actual language menu with English, Russian, Spanish, and French; second step |
| [3-en-es.webp](references/3-en-es.webp) | `public/images/how-it-works/3-en-es.webp` | Actual Spanish translated reading view; third step |

The video paths are under `public/screenrecordings/`. `ProductRecording.tsx` was compared with this manifest and references these exact videos and posters. Playback and device switching have passed the implementation QA. The source-still inspection above remains distinct from those interaction checks; see [design-qa.md](../../../../design-qa.md).

The portable moodboard has an actual-product-evidence row and source walkthrough thumbnails before the archived generated study. That is a documentation section only; the landing block order is unchanged.

## Final implementation outcome

The isolated `/landing-editorial` route is implemented. All 59 original-copy checks pass. Real product media is integrated, and the fictional reader/cover are retained in `concepts/` outside runnable source and public assets. Final desktop/mobile screenshots were opened and inspected; the complete validation record reports no horizontal overflow at 320, 390, 768, 1024, and 1440px.

Keyboard device selection, Play/Pause, screenshot dialog, navigation, Show original comparison toggle, and language-name selection passed. The comparison has no line-by-line highlighting; the language specimen switches the native language name rather than translating prose. Scoped lint and TypeScript passed with zero errors, and all 30 existing tests passed. Production webpack compilation succeeded; the build remains blocked at production TypeScript by the unrelated existing missing `compare` prop at `src/app/landing-backup-2/page.tsx:66`.

One documented infrastructure exception adds the new route to the existing consent regex in `src/instrumentation-client.ts`; existing route behavior and consent APIs remain intact. The [QA report](../../../../design-qa.md) records this exception and the build limitation.

## Durable deliverables

- [Visual moodboard](moodboard.html): actual linked reference captures, image inspection, palette, proposed Newsreader / DM Sans pairing, annotated concept descriptions, and the chosen direction.
- [Design brief](DESIGN-BRIEF.md): the Globoox-specific implementation brief, owned by the lead agent.
- [DIRECTION.md](DIRECTION.md): persistent scope, authority, and implementation contract. Read first after context compaction.
- [Current implementation reference](../../../reference/product/landing-editorial.md): verified behavior and local review instructions for the delivered route.
