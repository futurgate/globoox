---
type: reference
status: historical
owner: design-engineering
last_verified: 2026-09-10
---

# Stronger selected tabs — 2026-09-10

User requested a clearer selected state. Only HowItWorksSection.module.css changed.

- Selected Fade / Stack: forest #20382f and ivory #faf8ef; selected hover keeps ivory text and uses #29473b. Both labels retain identical weight/geometry.
- Current step: sage #e3e9dc background and3px terracotta marker, both continuously weighted by existing scroll progress. Step labels are600 weight in all states; no selection-driven reflow.
- Screenshot mapping, frame sizes, original copy, mobile episodes and all other sections unchanged.

Browser inspected1440×1000 (both mode selections, stable Step2 and the half-transition) and900×900 (Stack, Step3). Selected hover retains light text, pointer focus clears, no horizontal overflow; at midpoint the two row backgrounds and markers have matching~0.5 alpha and0s CSS transitions. Scoped diff check passed. Independent CSS review checked hover specificity and motion continuity. No new tests needed for this isolated style change; no deploy.

Current selected-state evidence: desktop-fade.png and narrow-stack.png. Parent final-* screenshots remain evidence of motion/layout before this color refinement.
