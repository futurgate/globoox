---
type: index
status: current
owner: reader
last_verified: 2026-09-01
---

# Reader Reference

These documents describe current Reader behavior. Historical implementation plans live in `docs/archive/`; future behavior lives in `docs/rfcs/`.

- [Architecture](architecture.md)
- [Pagination rules](pagination.md)
- [Rules register](rules-register.md)
- [Typography and hyphenation](typography.md)
- [Caching and versioning](caching.md)
- [Translation architecture](../architecture/translation.md)
- [Debugging runbook](../../runbooks/reader-layout-debugging.md)

The durable reading position is a logical block/fragment anchor. Pages are derived from content, language, typography, and viewport geometry; see [ADR-0002](../../decisions/ADR-0002-logical-reader-anchor.md).
