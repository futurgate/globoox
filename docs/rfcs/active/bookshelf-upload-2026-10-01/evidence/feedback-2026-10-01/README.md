---
type: evidence
status: current
owner: library
last_verified: 2026-10-01
---

# Upload feedback: release verification

Local acceptance complete; dev deployment/live acceptance pending. Frontend base `426b9ba`; backend upload contract audited at `ed7b30d`, subsequent main `deeb312` changes admin fiction overwrite only. Backend checkout fast-forwarded; no backend push, deploy or DB migration performed for this release.

## Automated evidence

| Check | Result | Evidence |
|---|---|---|
| Complete unit suite | 370 PASS / 31 files | [unit](unit.txt) |
| Upload polling API | 23 PASS (included above) | [after](api-after.txt), [adverse baseline](api-before.txt) |
| Actual shelf page | 17 PASS | [page](page.txt) |
| Upload modal races | 15 PASS | [modal](modal.txt) |
| Recovery/actions | 9 PASS | [recovery](recovery.txt), [bare completed metadata adverse](direct-metadata-before.txt) |
| Concurrent auth guard | 54 catalog/cooldown PASS (included in unit suite) | [after](auth-guard-after.txt), [before](auth-guard-before.txt) |
| Notifications | 8 unit (included above), 5 browser PASS | [unit](notifications-unit.txt), [browser](notifications-browser.txt) |
| Mobile visual assertions | 4 PASS | [mobile](mobile.txt), [unknown dark](unknown-dark-390.png), [ready/order light](ready-order-light-390.png) |
| Scoped lint / docs | 0 errors, 2 existing unused-helper warnings / 131 governed files PASS | [lint](lint.txt), [docs](docs-check.txt) |
| TypeScript / production build | PASS | [TypeScript](typescript.txt), [build](build.txt) |

Commands: `npm test`; `node e2e/bookshelf-upload-story.mjs`; `node e2e/bookshelf-upload-races.mjs`; `node e2e/bookshelf-feedback-recovery.mjs --screenshots`; `node e2e/notifications.mjs`; `npx tsc --noEmit`; scoped `npx eslint`; `npm run build`; `npm run docs:check`.

Checked-in text logs normalize trailing whitespace/newlines only; original raw logs remain in task-local verification directories.

Adverse API output includes expected DTO changes as well as recovery cases, not 13 independent production failures. Auth guard baseline reproduced three of four order/outcome scenarios. Direct metadata baseline reproduced one failing page case. Initial harness failures (obsolete timeout copy/import/screenshot transition) were corrected and are not product regressions; raw local logs retained separately.

## Manual local acceptance

Browser UI on loopback, actual MyBooks/cards/modal/AppToaster/controller, synthetic transport: start shows skeleton instead of filename; metadata fills parsed title; close modal and lose job connection shows unknown readiness inside transparent dashed cover plus toast; Check status resumes the same job; Ready keeps one readable card and Open toast. Confirmed failure shows permanent error and Upload again, opening the existing upload dialog. No live service failures were injected.

- [Ready screenshot](manual-ready.png)
- [Confirmed failure screenshot](manual-failed.png)

Four mobile visual cases at 390×844 cover unknown/Ready+order warning in light/dark App themes. Geometry assertions check no horizontal overflow or navigation overlap. Browser keyboard/focus tests exercise action lifetime and stale scope removal; these are not a manual VoiceOver hearing test.

## Live inputs and limits

[Exact own QA inputs](live-inputs.json): valid EPUB 1,902 bytes with filename deliberately different from parsed title; invalid 71-byte non-ZIP EPUB. Files are original disposable test material. Live execution/cleanup is recorded after deployment; their existence alone is not proof of upload.

[Backend contract audit](backend-contract.json) explains why no server change is required. [Memory preflight](memory-preflight.json) records exact four real fixture hashes/sizes and a bounded protocol. Imports executed: **0**, concurrent pairs: **0**; no working equivalent 512 MiB Linux/container environment. No safe EPUB size or production memory resilience is claimed. Historical backend suite 389 PASS / 11 missing-fixture FAIL was not rerun for UI changes.

Persistent recovery does not depend on a toast remaining visible. Lost job ID/404 can remain ambiguous; reconcile before explicitly re-uploading. Refresh after `order_confirmed:false` accepts the current manifest, not a guaranteed recency repair. Closing the page during file transfer can still interrupt upload. Sonner uses one polite live region; no urgent/assertive channel in this release.

Rollback dev to `426b9ba26c4197ac0fca2dc77eaaed696186d027` or revert the application commit, without reverting DB. Production frontend application `88d3a4c`/main `bff9935e` remains outside this release.
