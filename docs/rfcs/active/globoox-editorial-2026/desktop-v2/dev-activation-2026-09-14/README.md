---
type: reference
status: current
owner: design-engineering
last_verified: 2026-09-14
---

# Editorial activation on dev

The user explicitly authorized integrating origin/dev and origin/main, replacing the primary landing locally on dev, then pushing origin/dev. This supersedes earlier preview-only/no-replacement/no-push notices. Existing visuals and copy remain authoritative; the old project is a secondary visual reference. Historical docs and artwork remain intact.

## Integration and preservation

- Pre-sync local dev: 9eccc57. Fetched origin/dev: 2f7c08c; origin/main: ead6b93.
- Checkpoint 3707a0d commits the accumulated editorial implementation, original/generated assets, research and QA history, localized preview, beta access and review drafts.
- origin/dev already belongs to this history. Merge b59404d integrates origin/main without conflicts. No force merge or discarded side.
- Incoming admin/cost-lab pages and API changes, person_profiles setting, and disabled Clarity are preserved. Our icon metadata and landing analytics consent gate remain intact. Independent read-only integration review found no blocking issue.
- Main removes two obsolete backup routes. All six corresponding files are already preserved byte-for-byte in archive/landing-backups. They are not restored into the active TypeScript tree.
- The pre-existing billing RFC edit was saved as a patch and a targeted stash before integration. It is excluded from these commits and restored to the local working tree after delivery. The existing committed billing RFC is preserved.
- Local safety branches: backup/dev-before-editorial-sync-20260914 and backup/editorial-before-origin-merge-20260914. Recovery patch and command records: .git/codex-safety/dev-activation-2026-09-14/.

## Resulting behavior

The primary /en, /es, /fr and /ru routes now use EditorialLandingServer in published mode. Authenticated visitors retain the existing /my-books redirect. Original canonical/hreflang metadata and exactly one WebApplication declaration remain. Root locale-preference redirects and historical /{locale}/landing redirects remain.

/landing-editorial and its four locale previews remain available and noindex, without the published auth redirect. Locale changes stay within their public/preview route family and preserve the section hash.

No layout, illustration, canonical marketing copy or product media was changed for this activation. The added How wait note stays removed. The centered original footer tagline remains. Premium opens the approved beta explanation with explicit library navigation; there is no checkout or timed redirect.

Terms and Privacy remain visibly marked English review drafts under /landing-editorial/legal/, not final legal policies. support@globoox.co is confirmed; operator identity and backend processing/retention details remain unresolved. Privacy's Clarity wording now reflects main's disabled integration. Do not invent or imply approval of pending legal facts.

## Verification

- Fresh npm run build passed, including Next's TypeScript validation and49 generated static pages. The previous .next cache was moved intact outside the repository before building. Sentry upload credentials were unset for this local build only; no env file/config changes.
- Full npx tsc --noEmit --incremental false passed.
- npm test:122 tests across10 files passed, including published/preview SEO, auth redirect, unsupported locale and consent coverage.
- Scoped ESLint, npm run docs:check and git diff --check passed.
- Fresh anonymous Chrome against the production build on localhost:3000:13 route checks, four root redirect cases and all four legacy locale redirects passed. All public/preview canonical and hreflang paths, noindex boundaries, JSON-LD counts and block order matched expectations. Unknown public/preview locales returned404.
- All four public locales checked at1440px and390px: no horizontal overflow, correct initial Desktop/Phone selection, real screenrecording assets and library CTA. Screenshots saved below; English desktop hero/pricing/footer and beta dialog, Russian mobile hero, English mobile How/footer were visually reviewed.
- Autoplay advances without a gesture. Public and preview locale changes preserve hashes. Menu navigation reaches Languages with the correct active state. Beta dialog contains focus, closes with Escape, restores trigger focus, and its real library CTA reaches /my-books. No browser page errors.
- Run check-production.cjs from the repository root while the production server is running; it writes temporary output under /tmp/globoox-dev-activation-qa. Evidence/qa.json records the accepted run.

## Delivery boundaries

Target is origin/dev only. No main push or force push. vercel.json still disables automatic deployment for both dev and main; no separate Vercel deployment is performed. The final activation commit and verified remote SHA are reported in the task handoff; Git history supplies the durable delivery identity.

Production screenshots and route/interaction metrics are in evidence/. Existing detailed design/motion and15-combination hero QA remain in prior records; this activation does not change their CSS or assets.
