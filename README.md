# Globoox Frontend

Next.js 16 and React 19 frontend for the Globoox reading application. It provides the library, paginated reader, on-demand translation, store, account, and marketing experiences.

## Quick start

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Preferred server-only backend URL.
API_URL=https://your-backend.example.com

# Optional integrations.
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
NEXT_PUBLIC_GOOGLE_ALLOWED_ORIGINS=http://localhost:3000
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

```bash
npm run lint
npm run docs:check
npx tsc --noEmit
npm test
npm run build
```

Use `npm run test:watch` while developing tests.

## Architecture at a glance

- Application routes live under `src/app/(app)/`.
- Localized marketing entry routes live under `src/app/[locale]/`.
- Browser data requests use local Next.js `/api/*` handlers.
- `src/app/(app)/api/_proxy.ts` attaches the Supabase access token and proxies requests to the configured backend.
- Reader state is local-first: short-lived memory caches, persisted IndexedDB data, and server revalidation serve different roles.
- PostHog is the active product analytics integration.

Common routes:

- `/my-books`
- `/reader/[id]`
- `/store`
- `/settings`
- `/pricing`
- `/auth`

Legacy `/library` and `/profile` URLs redirect to `/my-books` and `/settings`.

## Documentation

Start with [docs/README.md](docs/README.md). It separates:

- current reference;
- architecture decisions and rejected alternatives;
- active RFCs;
- operational runbooks;
- historical source material.

Local setup details are in [docs/runbooks/local-development.md](docs/runbooks/local-development.md), and common recovery procedures are in [docs/runbooks/troubleshooting.md](docs/runbooks/troubleshooting.md).

## Deployment

Production deployments are triggered from `main`. Configure the same required environment variables in the deployment environment; prefer `API_URL` over exposing the backend URL through `NEXT_PUBLIC_API_URL`.
