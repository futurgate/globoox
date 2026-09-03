---
type: policy
status: current
owner: engineering
last_verified: 2026-09-01
---

# Documentation Policy

## Document types

| Type | Purpose | Allowed statuses |
|---|---|---|
| `reference` | Describes behavior that exists now | `current`, `deprecated` |
| `runbook` | Gives a repeatable operational procedure | `current`, `deprecated` |
| `adr` | Records a decision and its rationale | `proposed`, `accepted`, `rejected`, `superseded` |
| `rfc` | Proposes a future change | `draft`, `active`, `accepted`, `rejected`, `superseded`, `implemented` |
| `postmortem` | Records the outcome and lessons of an attempt or incident | `complete`, `incomplete` |
| `archive` | Preserves historical context | `archived` |
| `index` / `policy` | Navigates or governs documentation | `current` |

## Required metadata

Current reference, runbook, ADR, RFC, and postmortem documents start with:

```yaml
---
type: reference
status: current
owner: engineering
last_verified: YYYY-MM-DD
---
```

Use these optional fields when relevant:

```yaml
supersedes: docs/path/to/older-document.md
superseded_by: docs/path/to/newer-document.md
implementation:
  - src/path/to/code.ts
evidence:
  - docs/path/to/artifact.md
```

`last_verified` means the document was compared with the referenced code, not merely edited.

## Source-of-truth rules

1. A reference document contains only current behavior. Roadmaps and “to-be” sections belong in RFCs.
2. There must be no more than one current reference for one subsystem contract.
3. An RFC cannot silently become current documentation. When implemented, update the reference, record the decision, and mark the RFC `implemented`.
4. An ADR is append-only after acceptance. Replace a decision with a new ADR and connect both through `supersedes` / `superseded_by`.
5. Rejected alternatives stay in the ADR or RFC with the actual reason. Unknown rationale is written as unknown; it is never reconstructed as fact.
6. Archive documents are preserved as historical snapshots. Their old code paths and links may remain stale, but the archive index must point to the current replacement.

## File placement

- `reference/`: current architecture and product contracts.
- `runbooks/`: commands, debugging, recovery, and operational checklists.
- `decisions/`: numbered ADRs.
- `rfcs/active/`: work still under consideration or implementation.
- `rfcs/accepted/` and `rfcs/rejected/`: resolved proposals when keeping them outside the chronological archive is useful.
- `archive/`: immutable historical source material and superseded plans.
- `templates/`: templates only; templates are exempt from document metadata validation.

## Review cadence

- Update references in the same change as the behavior.
- Re-verify high-change architecture documents at least quarterly.
- Review active RFC status monthly.
- Never refresh `last_verified` without comparing the document to code or an authoritative external contract.
