---
type: rfc
status: implemented
owner: design-engineering
last_verified: 2026-09-10
---

**Latest user refinements — implemented, 2026-09-10:** Free now reads Start for free; footer logo removed; second ImageGen sprig at Free lower-left; pricing/hero/Quality/walkthrough external frames share border/radius/shadow. Eight-width visual review passed. These supersede older Current Plan, single-sprig, footer-logo and pricing-frame choices below. Original other words/media/motion preserved, existing project remains secondary. [Current result and QA](../pricing-refinements-2026-09-10/README.md). No deploy/commit.

# Pricing option 4 — implemented, 2026-09-10

User selected displayed option 4 and requested the small explanatory text centered as in option 1. This implementation supersedes pricing exploration/no-selection notices. Visual source: [04-shared-paper-refined.png](../pricing-footer-2026-09-10/04-shared-paper-refined.png). Existing project visuals remain secondary; the selected mock and this amendment are current authority.

Local preview: `http://127.0.0.1:3000/landing-editorial#pricing`.

## Result

- Added isolated `PricingSection.tsx` / `PricingSection.module.css` after Team and before Start. Existing sections, original words, typography, app media and footer are preserved.
- One shared, lightly outlined surface, three equal columns, a quiet sage Premium fill, aligned prices/actions and a separate generated three-leaf PNG at the upper-right corner. No rasterized text or generated product screens.
- Newsreader heading with sage italic, DM Sans UI/body; 1200px table at 1440px. Bottom explanation is 14px and centered. The generated “Note:” prefix is omitted.
- At ≤800px, plans become a single vertical group. Controls are 54px high, all content stays in the normal reading order, and Premium feedback appears immediately beneath its button.
- Added Pricing to desktop/mobile navigation. Compact desktop menu gap is 14px so the added item fits at 901px; the previous +1px menu typography is retained. Existing smooth section navigation is reused.

## Truthful actions and commercial scope

Approved working copy comes from the user-edited `docs/rfcs/active/billing-entitlements-and-translation-access.md`, lines 96–124. That document was read only during this task.

| Plan | Displayed price | Allowance | Current action |
| --- | --- | --- | --- |
| Free | $0 / forever | 2 books per month | Current Plan → `/my-books` |
| Premium | €5.90 / month | 6 books per month | Get Started → inline checkout-coming-soon message and free reading link |
| Editorial | Custom pricing | Unlimited books | Contact Us → existing `support@globoox.co` mailto with Editorial subject |

This is a marketing preview, not an account entitlement dashboard. “Current Plan” follows the selected mock/approved working copy and does not query the visitor's actual plan. No checkout, entitlement mutation, trial, legacy Pro/Scholar pricing, or new contact backend has been wired. Mailto opens the visitor's mail client; no message was sent by the agent.

The rolling 30-day reading allowance and its start event are stated in the centered note. Billing renewal and the reading usage window are not equated in code.

## Assets and evidence

- Production asset: `public/redesign/pricing/sprig.png`, actual RGBA, generated separately. See [provenance and rejected first output](sprig-provenance.md).
- Final CSS art box: 110×150px desktop, 76×105px mobile, `object-fit: contain`. This supersedes the earlier approximate intended dimensions in asset provenance; source ratio is preserved.
- [Desktop screenshot](desktop-final.png), [same-size source/render comparison](comparison-final.png), [QA report](design-qa.md).
- Mobile: [first plan](mobile-390.png), [Premium response](mobile-premium-notice.png), [Editorial and centered note](mobile-editorial-note.png), [menu](mobile-menu.png).
- Width captures: 320, 768, 800, 801, 901, 1100; desktop 1440 and mobile 390 separately. Every capture was opened for visual inspection; measurements are archived in `responsive-measurements.json`.

Scoped ESLint passed. Full TypeScript remains blocked by existing duplicated `.next/types/routes.d 2.ts` declarations and backup landing prop errors; no diagnostic names the new component. No tests mirroring CSS were added. No commit, push or deployment.
