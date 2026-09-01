# Globoox Frontend Contributor Context

Read [docs/README.md](docs/README.md) before changing a documented subsystem. It defines which documents are current and which are historical.

## Project facts

- Next.js 16, React 19, TypeScript, Tailwind, Zustand, Supabase SSR.
- Application pages and API handlers live under `src/app/(app)/`.
- Shared UI primitives live under `src/components/ui/`.
- Browser API calls must use local `/api/*` routes; direct backend calls are server-only.
- `API_URL` is the preferred backend configuration. `NEXT_PUBLIC_API_URL` is a fallback that exposes the value to the browser bundle.
- PostHog is the active analytics provider.

## Critical rules

1. Never commit `.env.local` or credentials.
2. Default to Server Components; add `'use client'` only when browser state or effects require it.
3. Use `@supabase/ssr` for server authentication and keep auth injection inside the API proxy boundary.
4. Reuse components in `src/components/ui/`; do not fork primitive behavior inside feature pages.
5. Before changing canvas/image behavior, read [the Safari runbook](docs/runbooks/safari.md).
6. Before changing Reader layout, read [the Reader reference](docs/reference/reader/README.md) and update its algorithm version when cached layouts become incompatible.
7. When behavior changes, update the current reference in the same change. Record a new ADR when the architectural decision changes.

## Commands

See [local development](docs/runbooks/local-development.md). The standard validation set is:

```bash
npm run lint
npm run docs:check
npx tsc --noEmit
npm test
npm run build
```

## Documentation map

- [API and sync](docs/reference/architecture/api-and-sync.md)
- [Translation](docs/reference/architecture/translation.md)
- [Reader](docs/reference/reader/README.md)
- [Design system](docs/reference/product/design-system.md)
- [Troubleshooting](docs/runbooks/troubleshooting.md)
- [Decision records](docs/decisions/README.md)
- [Active RFCs](docs/rfcs/README.md)
