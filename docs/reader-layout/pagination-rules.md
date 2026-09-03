# Pagination Rules

## Core
- Pages are formed from normalized blocks.
- Paragraphs may split across pages; non-paragraph blocks are moved whole.

## Heading rules
- Heading run start (consecutive heading chain start) begins on a new page.
- Consecutive headings are placed atomically when possible.
- Special case: `h1` followed by `h2`:
  - `h1` is forced to a standalone page,
  - hard page break is inserted after `h1`.

## Paragraph split constraints
- Tiny paragraph fragments are avoided.
- Widow/orphan guard is applied on paragraph split:
  - minimum lines at bottom of current page,
  - minimum lines at top of next page.

## Keep-with-next (paragraph)
If a paragraph is immediately followed by one of:
- `hr`
- `list`
- `quote`

then paragraph+next are kept together when possible to avoid awkward page starts.

## List start guard
- Prevent list from starting at page bottom with only one item when next list item would overflow.
