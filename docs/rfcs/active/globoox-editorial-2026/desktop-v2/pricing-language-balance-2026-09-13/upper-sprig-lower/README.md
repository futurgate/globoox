---
type: reference
status: current
owner: design-engineering
last_verified: 2026-09-13
---

# Lower upper-right pricing sprig

Latest user asks to lower the upper-right sprig. Changed only its CSS top offset:−80→−64px above800px,−55→−43px at800px and below. Rotation−30°, horizontal placement, size, asset and lower-left sprig remain unchanged.

Root visually reviewed1440/390px; independent review covered the801/800px layout boundary. The sprig now follows the card corner more closely, without touching plan text. Computed offsets/rotation and absence of horizontal overflow are in measurements.json. Narrow captures include the consent overlay below the reviewed upper area; it does not obscure the sprig. Diff check passed.

This supersedes earlier upper-sprig vertical coordinates and the preceding statement that its placement was unchanged. Earlier evidence and all artwork remain preserved; old project visuals remain secondary. No deployment.
