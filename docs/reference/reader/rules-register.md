---
type: reference
status: current
owner: reader
last_verified: 2026-09-01
---

# Reader Rules Register

This register contains current rules only. Proposed changes belong in RFCs.

| Area | Current rule | Detail |
|---|---|---|
| Durable position | Block/fragment anchor, never numeric page | [ADR-0002](../../decisions/ADR-0002-logical-reader-anchor.md) |
| Layout modes | Single and spread; active spread anchor is left page | [Architecture](architecture.md) |
| Paragraphs | May split with widow/orphan and tiny-fragment guards | [Pagination](pagination.md) |
| Lists | Normalize to item-level blocks; require two items at page start | [Pagination](pagination.md) |
| Other blocks | Heading, quote, image, hr, and list item move whole | [Pagination](pagination.md) |
| Heading runs | Start on a new page and remain atomic when possible | [Pagination](pagination.md) |
| `h1 -> h2` | Standalone `h1` page plus hard break | [Pagination](pagination.md) |
| Paragraph keep | Keep paragraph with following hr/list/quote when possible | [Pagination](pagination.md) |
| Heading keep | No mandatory heading-plus-paragraph rule | [Pagination](pagination.md) |
| Typography | Visible and measurement surfaces share scale and theme weights | [Typography](typography.md) |
| Hyphenation | Browser-managed; no manual intra-word page split | [Typography](typography.md) |
| Layout cache | Memory + IndexedDB, invalidated by algorithm version | [Caching](caching.md) |

Open design work such as language-aware column width lives in the [adaptive typography RFC](../../rfcs/active/reader-adaptive-typography.md).
