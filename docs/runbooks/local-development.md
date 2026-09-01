---
type: runbook
status: current
owner: engineering
last_verified: 2026-09-01
implementation:
  - package.json
  - src/app/(app)/api/_proxy.ts
---

# Local Development

## Required configuration

Create `.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
API_URL=https://your-backend.example.com
```

`API_URL` is preferred because it remains server-only. `NEXT_PUBLIC_API_URL` is supported as a fallback.

Optional integrations use:

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_GOOGLE_ALLOWED_ORIGINS`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_PRO_PRICE_USD`
- `SENTRY_AUTH_TOKEN` for Sentry release/build integration

Never commit `.env.local`.

## Install and run

```bash
npm install
npm run dev
```

The development server is available at `http://localhost:3000` unless Next.js selects another free port.

## Checks

```bash
npm run lint
npm run docs:check
npx tsc --noEmit
npm test
npm run build
```

Additional commands:

```bash
npm run test:watch
npm run start
```

`npm run start` requires a successful production build first.

## Request path

In the browser, `src/lib/api.ts` calls relative `/api/*` URLs. Route handlers under `src/app/(app)/api/` use `_proxy.ts` to:

1. read the Supabase session from cookies;
2. attach its bearer token;
3. forward the request to `API_URL`;
4. preserve streaming and binary responses.

A missing backend URL produces `503`. An unreachable backend produces `502`.
