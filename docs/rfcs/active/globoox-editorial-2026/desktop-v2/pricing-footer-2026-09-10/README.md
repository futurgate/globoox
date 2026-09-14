---
type: rfc
status: implemented
owner: design-engineering
last_verified: 2026-09-10
---

**Later user selection — implemented:** User explicitly selected displayed option 4 with the small bottom note centered like option 1. [Implementation and passed visual QA](../pricing-implementation-2026-09-10/README.md). Earlier root-preference/no-selection statements below are preserved exploration history. No deploy.

# Pricing studies, footer review and menu refinement — 2026-09-10

## Current outcome and authority

User requested: critique the current footer; locate existing pricing and generate/refine alternatives until root likes the result; slightly increase menu text. Four built-in ImageGen outputs are complete, reviewed and displayed once each. Root selects the fourth as the preferred design basis. This is root preference, not a later user selection. Prices remain design studies in this round; footer remains audit-only. Menu +1px is implemented and browser verified. No deploy, push or commit.

The current request allows a pricing block to be introduced despite the earlier locked block-count instruction. Preserve the relative order and contents of existing sections. Proposed eventual insertion: Team → Pricing → Start → Footer. This placement is a proposal, not implemented or user-selected. Existing project visuals are secondary; original words/current editorial fonts/palette/real media remain authoritative.

## Actual displayed order

1. `01-open-columns.png` — open comparison columns.
2. `02-shared-paper.png` — one shared paper surface.
3. `03-editorial-rows.png` — asymmetrical introduction and pricing rows.
4. `04-shared-paper-refined.png` — refinement of displayed2; **root preference**.

The numbers refer to the actual generated-image display order in the conversation, not hypothetical prompt order. All are independent built-in ImageGen calls; fourth uses the second as an edit target. Exact prompts are the four *-prompt.txt files. First three attach the captured live `languages-style-reference.png`; fourth attaches that plus02. Output images are1487×1058 despite prompts requesting1440×1024: these are composition mocks, not measured implementation specs. Use real fonts/icon in code. The generator added “Note:” in04; that prefix is not canonical text and should not be carried into code automatically.

## Art-direction review

1 is clear but feels generic: oversized price emphasis and isolated grass decoration outweigh the calm product tone. Buttons came out serif, another reason not to choose it.
2 has the best common comparison grid, modest Premium emphasis and continuity with Languages. Problems: overlong single-line subheader and three purposeless short divider dashes.
3 is compact and distinct, but price/allowance/action split across several horizontal alignments; comparing plans requires more eye movement. Custom pricing makes the last row awkward.
4 fixes2's subheader width and unnecessary dashes, moderates price scale, keeps action baselines consistent and supports the palette/italic heading already used on the landing. It is the preferred mock. No additional features or decorative imagery need to be invented. Its small botanical remains a composition reference; a future asset must be isolated/generated if used, not cropped into a whole raster pricing block.

## Pricing source audit

Old rendered component: `src/components/landing/Pricing.tsx` and `PricingGrid.tsx`, preview route `/landing/pricing-preview`. That prototype shows Free $0, Scholar $12, Unlimited $29 and false/outdated trial/feature claims. It is not current commercial authority. `pricing-future.tsx` is another explicitly archived Pro/$20 version; do not revive it.

The current approved working copy is in `docs/rfcs/active/billing-entitlements-and-translation-access.md:96–124`:

- READING WITHOUT BORDERS
- A plan for every reader
- From the occasional reader to the professional editor, find the plan that fits how you read.
- Free — $0 / forever — 2 books per month — Current Plan
- Premium — €5.90 / month — 6 books per month — Get Started
- Editorial — Custom pricing — Unlimited books — Contact Us

A quiet nearby explanation is required: the allowance uses a rolling30-day reading window starting at first translated open, not a calendar month or the payment renewal date. This study's explanatory line is a presentation proposal grounded in that contract. No trial, no Pro public plan, no made-up feature list. €5.90 is the approved base price; do not invent tax-inclusive checkout totals.

Current implementation truth: `/pricing` redirects to `/settings`. Settings and Reader still show Premium checkout coming soon. Legacy createCheckout plumbing does not establish working Premium checkout. Editorial contact delivery is unresolved. `support@globoox.co` exists for support, not an approved sales workflow. Anonymous Free/Current Plan wording is an open question in the RFC. Preserve the approved working copy in the mock, but resolve contextual CTA behavior before making a live commercial block. The billing RFC was read only; the user's pre-existing changes were not touched.

## Footer audit

Evidence: `footer-before.png` at1440×1000 and `footer-mobile.png` at320×780, captured from the current local page, saved and visually reviewed.

1. CTA→footer ending: weak composition. Approximately190px between the CTA button and footer brand on desktop; the ending feels disconnected. The same emptiness is noticeable on mobile.
2. Footer body: brand left, small14px mission paragraph far right. The paragraph reads like a disclaimer instead of an intentional final statement. Copyright/Back to top are readable but visually detached. There are no overlaps or horizontal overflow in captured states.

Recommended next design: an inset1px rule to mark the page ending; reduce CTA-to-rule gap to88–104px and use40px below the rule. Preserve all text. Set mission around17px/1.6, maximum420–460px; retain two columns with balanced visual weight, then a compact copyright/Back to top row32–36px below. Do not add decorative branches by default. Consider removing the icon above the final CTA because header/CTA/footer currently repeat it three times. This is a recommendation only; no footer or CTA code changed.

Screenshot review does not certify accessibility. Small muted footer copy is a readability concern; there was no new contrast/assistive-technology audit in this footer scope. Existing valid smooth-scroll Back to top behavior is preserved.

## Menu implementation and checks

Only isolated `EditorialLanding.module.css` changed in live code. Desktop nav13→14px; compact desktop12→13px; header locale/CTA13→14px; mobile entries15→16px and locale row13→14px. All copy, routes, alignment, sticky header, icon and behavior retained.

Browser QA:1440px desktop,901px last narrow desktop,320px open mobile menu. No horizontal overflow, all links fit. Computed sizes14/13/16px confirmed, mobile locales14px. Actual captures: menu-desktop-final.png, menu-mobile-final.png. Browser error console empty. `git diff --check` passed. No new tests or whole-project TypeScript pass claimed for this CSS-only adjustment.
