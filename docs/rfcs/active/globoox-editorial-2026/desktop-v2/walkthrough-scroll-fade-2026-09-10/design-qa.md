---
type: reference
status: historical
owner: design-engineering
last_verified: 2026-09-10
---

# Scroll-driven fade QA — 2026-09-10

final result: blocked

Implementation and static checks completed; browser capture/interaction verification is blocked by a browser-plugin runtime mismatch after update. The trusted worker imports the deleted old browser-service.mjs path. See README.md for exact attempted recovery and checks still required. HTTP200 and ESLint are not browser QA. Earlier280ms fade screenshots do not verify the new scroll-driven behavior.
