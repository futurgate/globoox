---
type: reference
status: current
owner: design-engineering
last_verified: 2026-09-14
---

# Dev landing deployment

The user explicitly requested publication on dev.globoox.co after the local activation and origin/dev push. This supersedes older no-deploy instructions for this dev domain only. The source is immutable commit019c71779f3e9b1e3165dcc0a71ddae54b6b5370 from GitHub futurgate/globoox, branch dev.

## Verified deployment target

- Vercel team: lomovski (globoox-team); project: globoox.
- Project ID: prj_HshEGaCzZpwdbiz36jSL3T9A4uyY.
- dev.globoox.co is a verified project domain mapped to Git branch dev, with no custom environment. Its environment is Preview (API target:null).
- Main and www domains are separate production aliases. Both retain deployment dpl_9CBYCvJw17PXcwiaBgZjxAgaXUKU; production was not redeployed or reassigned.

## Published result

Deployment dpl_DG3VN1LbyZUXKfJNCQDooVPHrLuM is READY with no build or alias error. Vercel automatically assigned dev.globoox.co and globoox-git-dev-lomovski.vercel.app to it. The immutable deployment URL is https://globoox-iuo6dm8mw-lomovski.vercel.app.

The authenticated POST /v13/deployments request used only the verified project and GitSource type/repoId/ref/sha. Target was omitted to use the documented Preview default. No project settings, environment values, automatic deployment policy or production aliases were overridden. vercel.json continues to disable commit-triggered deployments for dev and main. Explicit API creation worked with that policy unchanged.

The remote build used Git source. No files from the local working tree, env files or Tanya's uncommitted billing RFC changes were uploaded. The prepared detached worktree was not needed for deployment.

## Verification and limits

- Vercel reports READY, exact commit019c717, Preview target and successful alias assignment.
- Authenticated alias reads confirm dev moved to the new deployment while both production aliases retain their pre-deployment IDs; see verified-aliases.json.
- Root's public GET of https://dev.globoox.co/ returned200 at /en and includes the new editorial hero marker. The rejected How wait explanation remains absent.
- The source commit already passed a fresh production build, full TypeScript,122 tests and desktop/mobile browser QA before push; see ../dev-activation-2026-09-14/README.md. No implementation change was made for this deployment.
- Terms/Privacy remain visibly marked review drafts with pending operator/backend details, as documented before activation.

Independent public HTTP verification passed:11/11 pages and8/8 sampled assets. Four published locales return200 with the editorial hero, exactly one locale-correct WebApplication declaration and the expected canonical path. All five previews and both legal drafts retain noindex/nofollow and zero WebApplication declarations. How it Works matches the canonical source exactly in all four languages. CSS, JavaScript, PNG/SVG and all three MP4s return200/206 with correct content types. The configured canonical host remains https://www.globoox.co. Evidence: public-http-report.json; reproducible script: verify-public-http.py. These are HTTP checks; prior desktop/mobile interaction and visual QA remains the evidence for the unchanged source.

## Authentication and future deployment

The initial CLI account condrat did not have access to this project. The user confirmed lomovski-2958 through Chrome using an isolated local Vercel CLI configuration, after disabling automatic browser opening for device login. No credentials are stored in this record. Deployment state and local authentication-config location remain under .git/codex-safety/dev-deployment-2026-09-14/state.json.

Future release work must verify this dev domain/project/environment mapping again. Do not assume the default local Vercel account owns Globoox, and do not choose production to reach the dev subdomain.
