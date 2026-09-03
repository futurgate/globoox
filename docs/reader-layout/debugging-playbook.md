# Debugging Playbook

## 1) Reproduce with stable inputs
- fix viewport width,
- fix font size / line-height,
- use the same chapter/page anchor.

## 2) Confirm cache invalidation
- verify current `PAGINATION_ALGO_VERSION`,
- force hard reload,
- if needed clear site data (IndexedDB/localStorage).

## 3) Inspect rendered block boundaries
- check `.flow-root` order on problematic page,
- confirm block types (`data-block-type`),
- confirm heading adjacency assumptions.

## 4) Check geometry match
- compare probe width vs visible column width,
- ensure spread constraints are applied as expected.

## 5) Validate rule path in paginator
- trace whether the case goes through:
  - heading-run atomic placement,
  - paragraph keep-with-next,
  - paragraph split + widow/orphan guards.

## 6) Regression checks after fix
- single mode and spread mode,
- chapter/language switch,
- reload with cache restore,
- anchor restore and progress consistency.
