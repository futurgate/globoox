---
type: runbook
status: current
owner: engineering
last_verified: 2026-09-01
---

# Troubleshooting

## Backend returns 503

Set `API_URL` in `.env.local`, then restart the development server.

## Backend returns 502

The frontend proxy could not reach the configured backend. Verify the URL and backend availability. The proxy reports the failure to Sentry when configured.

## Library is empty immediately after login

1. Inspect `GET /api/books?status=all`.
2. Check the `x-authenticated` response header; it should be `true` for a signed-in user.
3. Confirm that the request is followed by the one controlled authentication-stabilization retry.
4. Check the console for `[api] /api/books responded as unauthenticated`.

The retry mitigates session propagation races; it is not a substitute for deterministic backend authentication.

## Stale library or Reader content

The application uses memory and IndexedDB caches. In browser developer tools, clear the `globoox-cache` IndexedDB database, then reload.

Do this for debugging only. A production bug that requires users to clear storage needs a cache-version or invalidation fix.

## Reader pagination differs after a layout change

Follow [Reader layout debugging](reader-layout-debugging.md). If the algorithm or measurement contract changed incompatibly, increment `PAGINATION_ALGO_VERSION` in `ReaderView.tsx` so stale memory and IndexedDB layouts are discarded.

## Canvas/image issue in Safari

Read [Safari-specific issues](safari.md) before changing the load/decode sequence.

## Port already in use

Find the process first:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

Stop the confirmed process or run Next.js on another port. Do not kill processes based only on an unverified wildcard command.
