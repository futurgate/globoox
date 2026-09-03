# Typography and Hyphenation

## Heading typography scale
Heading size is based on reader font size.

- `h1`: `1.6em`, `font-weight: 500`
- `h2`: `1.35em`, `font-weight: 500`
- `h3`: `1.18em`, `font-weight: 500`
- `h4+`: `1.06em`, `font-weight: 400`
- `h4/h5`: italic

This scale is applied in both:
- visible render (`ContentBlockRenderer`),
- measurement probe (`paginatorUtils`) to keep pagination consistent.

## Heading margins
- Top margin is removed when heading is first on page.
- Top margin is removed for heading after heading (using block wrapper selectors).

## Hyphenation policy
- Manual intra-word page-split hyphenation is disabled.
- Browser hyphenation is used (`hyphens: auto`) with stricter CSS constraints for line-level behavior.
- Additional text normalization removes legacy wrapped hyphen artifacts from source text where possible.
