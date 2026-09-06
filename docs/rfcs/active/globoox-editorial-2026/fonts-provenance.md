---
type: reference
status: current
owner: design-engineering
last_verified: 2026-09-05
implementation:
  - public/redesign/fonts
---

# Editorial landing font provenance

These fonts belong only to the isolated `/landing-editorial` direction. They do not change the existing landing, app, or reader font system. The task-specific [direction](DIRECTION.md), moodboard, and brief remain the primary visual authority; existing project typography is a secondary reference.

## Files and roles

| File | Intended role | Variable axes | Size |
|---|---|---|---|
| `public/redesign/fonts/newsreader-roman.woff2` | Literary headings and demonstrative reading text | Weight 200–800; optical size 6–72 | 131,848 bytes |
| `public/redesign/fonts/newsreader-italic.woff2` | Restrained editorial emphasis | Weight 200–800; optical size 6–72 | 147,060 bytes |
| `public/redesign/fonts/dm-sans.woff2` | Navigation, controls, labels, and supporting copy | Weight 100–1000; optical size 9–40 | 62,556 bytes |

Total font payload is 341,464 bytes (about 333 KiB). All three are the official Google Fonts Latin WOFF2 subsets, downloaded on 2026-09-05 without modification. These are real variable fonts, including optical-size axes; they are not generated illustrations or font imitations.

## Official sources

- [Newsreader family, Google Fonts](https://fonts.google.com/specimen/Newsreader); [roman WOFF2](https://fonts.gstatic.com/s/newsreader/v26/cY9AfjOCX1hbuyalUrK4397yjIJFJpc.woff2); [italic WOFF2](https://fonts.gstatic.com/s/newsreader/v26/cY9CfjOCX1hbuyalUrK439vCjohCBJWxZA.woff2).
- [DM Sans family, Google Fonts](https://fonts.google.com/specimen/DM+Sans); [roman WOFF2](https://fonts.gstatic.com/s/dmsans/v17/rP2Hp2ywxg089UriCZOIHTWEBlw.woff2).
- The exact Google Fonts CSS request used: `https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&family=DM+Sans:opsz,wght@9..40,100..1000&display=swap`. A modern Chrome user agent returned the variable WOFF2 subset URLs above.

## Licenses

Both families use SIL Open Font License 1.1. Unmodified license files are distributed beside the fonts:

- [Newsreader-OFL.txt](../../../../public/redesign/fonts/Newsreader-OFL.txt), retrieved from the [official Google Fonts repository](https://raw.githubusercontent.com/google/fonts/main/ofl/newsreader/OFL.txt). Copyright 2020 The Newsreader Project Authors.
- [DM-Sans-OFL.txt](../../../../public/redesign/fonts/DM-Sans-OFL.txt), retrieved from the [official Google Fonts repository](https://raw.githubusercontent.com/google/fonts/main/ofl/dmsans/OFL.txt). Copyright 2014 The DM Sans Project Authors.

## Integration and coverage

Declare normal and italic Newsreader faces separately, using `font-weight: 200 800`; declare normal DM Sans with `font-weight: 100 1000`. Use `font-display: swap` and `font-optical-sizing: auto`. Apply the families through the new page's `--ed-serif` and `--ed-sans` tokens, without editing shared styles or the established product typography.

These Latin subsets cover English and common French/Spanish accented letters. Cyrillic and other unbundled scripts must use the explicit system/serif fallback in the conceptual reader. A future language expansion should acquire and document an appropriate licensed face; do not imply that this font delivery adds a product language.

## Verification

All files passed the `wOF2` binary-signature check, the operating system `file` check, and parsing with `fontTools.ttLib.TTFont`. The parsed family names, styles, and `fvar` axes match the requested fonts. No HTML or download error pages were saved as fonts.

| File | SHA-256 |
|---|---|
| `newsreader-roman.woff2` | `01817351be3edfc1714fe6d60ddea6a22a169a5ebd033b50c7f9495e5d9c386a` |
| `newsreader-italic.woff2` | `a99fb127682b9af538780d21420037452197b0d37dfd273eb108f8a3665d5501` |
| `dm-sans.woff2` | `aa530716b0d351866af7dbfa3eee4120fb36f2d071baff8c234185141865c7ff` |
